/**
 * Phase 2: AI Backend Logic - Invoice Processing
 *
 * AI-powered invoice reconciliation and PO matching using Gemini 2.5 Pro.
 * Extracts data from invoices and matches with purchase orders with:
 * - Precise financial calculations
 * - Multi-line item reconciliation
 * - Discrepancy detection and analysis
 * - High-accuracy data extraction
 */

import { createClient } from '@/lib/supabase/server';
import { generateJSONPro } from '@/lib/gemini';

/**
 * Extracted invoice data
 */
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorId?: string;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Invoice reconciliation result
 */
export interface InvoiceReconciliation {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: number;
  vendorName: string;
  vendorId: string | null;
  matchedOrderId: string | null;
  matchedOrderNumber: string | null;
  status: 'matched' | 'discrepancy' | 'no_match';
  matchConfidence: number; // 0-1
  amountDifference: number;
  quantityDiscrepancies: QuantityDiscrepancy[];
  priceDiscrepancies: PriceDiscrepancy[];
  missingItems: MissingItem[];
  extraItems: ExtraItem[];
  aiNotes: string;
  recommendedAction: string;
}

export interface QuantityDiscrepancy {
  productId: string;
  productName: string;
  invoiceQuantity: number;
  orderQuantity: number;
  difference: number;
}

export interface PriceDiscrepancy {
  productId: string;
  productName: string;
  invoicePrice: number;
  orderPrice: number;
  difference: number;
}

export interface MissingItem {
  productName: string;
  quantity: number;
}

export interface ExtraItem {
  productName: string;
  quantity: number;
}

/**
 * Extract invoice data from text using AI
 * In production, this would use OCR for PDF/image invoices
 */
export async function extractInvoiceData(invoiceText: string): Promise<InvoiceData> {
  const prompt = `Extract structured data from this invoice:

${invoiceText}

Extract the following information:
1. Invoice number
2. Invoice date (YYYY-MM-DD format)
3. Vendor/supplier name
4. Total amount
5. All line items with: product name, SKU (if available), quantity, unit price, total price

Respond with JSON:
{
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "vendorName": "string",
  "vendorId": "string or null",
  "totalAmount": number,
  "lineItems": [
    {
      "productName": "string",
      "productSku": "string or null",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ]
}`;

  const invoiceData = await generateJSONPro<InvoiceData>(prompt, {
    temperature: 0.1, // Very low temperature for precise financial data extraction
    maxTokens: 2000,
    systemPrompt: 'You are a financial data extraction expert. Extract invoice data with absolute precision, ensuring all numbers and calculations are accurate.'
  });

  return invoiceData;
}

/**
 * Find matching purchase order for an invoice
 */
export async function findMatchingOrder(
  invoiceData: InvoiceData
): Promise<{ orderId: string; orderNumber: string } | null> {
  const supabase = await createClient();

  // Parse invoice date
  const invoiceDate = new Date(invoiceData.invoiceDate);
  
  // Search for orders within ±30 days of invoice date
  const startDate = new Date(invoiceDate);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(invoiceDate);
  endDate.setDate(endDate.getDate() + 30);

  // Get orders in date range
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      created_at,
      order_items(
        product_id,
        quantity,
        price,
        products(name, sku)
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .in('status', ['submitted', 'processing', 'shipped', 'delivered']);

  if (error || !orders || orders.length === 0) {
    return null;
  }

  // Score each order based on similarity
  let bestMatch: { orderId: string; orderNumber: string; score: number } | null = null;

  for (const order of orders) {
    let score = 0;

    // Check total amount similarity (within 5%)
    const amountDiff = Math.abs(order.total - invoiceData.totalAmount);
    const amountDiffPercent = (amountDiff / order.total) * 100;
    if (amountDiffPercent <= 5) {
      score += 50; // High weight for matching total
    } else if (amountDiffPercent <= 10) {
      score += 25;
    }

    // Check line item matches
    const orderItems = order.order_items || [];
    let matchedItems = 0;

    for (const invoiceItem of invoiceData.lineItems) {
      const matchingOrderItem = orderItems.find(oi => {
        const products = (oi.products as any);
        const productName = products?.name?.toLowerCase() || '';
        const productSku = products?.sku?.toLowerCase() || '';
        const invoiceName = invoiceItem.productName.toLowerCase();
        const invoiceSku = invoiceItem.productSku?.toLowerCase() || '';

        return (
          productName.includes(invoiceName) ||
          invoiceName.includes(productName) ||
          (invoiceSku && productSku === invoiceSku)
        );
      });

      if (matchingOrderItem) {
        matchedItems++;
      }
    }

    // Add score for matched items
    const matchPercent = (matchedItems / Math.max(invoiceData.lineItems.length, orderItems.length)) * 100;
    score += matchPercent * 0.5; // Up to 50 points for item matches

    // Update best match
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        orderId: order.id,
        orderNumber: order.order_number,
        score,
      };
    }
  }

  // Only return match if score is above threshold
  if (bestMatch && bestMatch.score >= 60) {
    return {
      orderId: bestMatch.orderId,
      orderNumber: bestMatch.orderNumber,
    };
  }

  return null;
}

/**
 * Reconcile invoice with purchase order
 */
export async function reconcileInvoice(
  invoiceData: InvoiceData,
  orderId: string
): Promise<InvoiceReconciliation> {
  const supabase = await createClient();

  // Get order details
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      order_items(
        product_id,
        quantity,
        price,
        products(id, name, sku)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }

  const orderItems = order.order_items || [];

  // Calculate discrepancies
  const quantityDiscrepancies: QuantityDiscrepancy[] = [];
  const priceDiscrepancies: PriceDiscrepancy[] = [];
  const missingItems: MissingItem[] = [];
  const extraItems: ExtraItem[] = [];

  // Check each invoice item against order items
  for (const invoiceItem of invoiceData.lineItems) {
    const matchingOrderItem = orderItems.find(oi => {
      const products = (oi.products as any);
      const productName = products?.name?.toLowerCase() || '';
      const productSku = products?.sku?.toLowerCase() || '';
      const invoiceName = invoiceItem.productName.toLowerCase();
      const invoiceSku = invoiceItem.productSku?.toLowerCase() || '';

      return (
        productName.includes(invoiceName) ||
        invoiceName.includes(productName) ||
        (invoiceSku && productSku === invoiceSku)
      );
    });

    if (matchingOrderItem) {
      const products = (matchingOrderItem.products as any);
      // Check quantity discrepancy
      if (invoiceItem.quantity !== matchingOrderItem.quantity) {
        quantityDiscrepancies.push({
          productId: matchingOrderItem.product_id,
          productName: products?.name || invoiceItem.productName,
          invoiceQuantity: invoiceItem.quantity,
          orderQuantity: matchingOrderItem.quantity,
          difference: invoiceItem.quantity - matchingOrderItem.quantity,
        });
      }

      // Check price discrepancy (allow 1% variance for rounding)
      const priceDiff = Math.abs(invoiceItem.unitPrice - matchingOrderItem.price);
      const priceDiffPercent = (priceDiff / matchingOrderItem.price) * 100;
      if (priceDiffPercent > 1) {
        priceDiscrepancies.push({
          productId: matchingOrderItem.product_id,
          productName: products?.name || invoiceItem.productName,
          invoicePrice: invoiceItem.unitPrice,
          orderPrice: matchingOrderItem.price,
          difference: invoiceItem.unitPrice - matchingOrderItem.price,
        });
      }
    } else {
      // Item on invoice but not on order
      extraItems.push({
        productName: invoiceItem.productName,
        quantity: invoiceItem.quantity,
      });
    }
  }

  // Check for items on order but not on invoice
  for (const orderItem of orderItems) {
    const matchingInvoiceItem = invoiceData.lineItems.find(ii => {
      const products = (orderItem.products as any);
      const productName = products?.name?.toLowerCase() || '';
      const productSku = products?.sku?.toLowerCase() || '';
      const invoiceName = ii.productName.toLowerCase();
      const invoiceSku = ii.productSku?.toLowerCase() || '';

      return (
        productName.includes(invoiceName) ||
        invoiceName.includes(productName) ||
        (invoiceSku && productSku === invoiceSku)
      );
    });

    if (!matchingInvoiceItem) {
      const products = (orderItem.products as any);
      missingItems.push({
        productName: products?.name || 'Unknown',
        quantity: orderItem.quantity,
      });
    }
  }

  // Calculate amount difference
  const amountDifference = invoiceData.totalAmount - order.total;

  // Determine status and confidence
  let status: 'matched' | 'discrepancy' | 'no_match';
  let matchConfidence: number;

  const hasDiscrepancies = 
    quantityDiscrepancies.length > 0 ||
    priceDiscrepancies.length > 0 ||
    missingItems.length > 0 ||
    extraItems.length > 0 ||
    Math.abs(amountDifference) > 0.01;

  if (!hasDiscrepancies) {
    status = 'matched';
    matchConfidence = 1.0;
  } else if (Math.abs(amountDifference / order.total) < 0.05) {
    // Less than 5% difference
    status = 'discrepancy';
    matchConfidence = 0.8;
  } else {
    status = 'discrepancy';
    matchConfidence = 0.5;
  }

  // Generate AI notes and recommendations
  const aiAnalysis = await analyzeDiscrepancies({
    status,
    amountDifference,
    quantityDiscrepancies,
    priceDiscrepancies,
    missingItems,
    extraItems,
  });

  return {
    invoiceNumber: invoiceData.invoiceNumber,
    invoiceDate: invoiceData.invoiceDate,
    invoiceTotal: invoiceData.totalAmount,
    vendorName: invoiceData.vendorName,
    vendorId: invoiceData.vendorId || null,
    matchedOrderId: order.id,
    matchedOrderNumber: order.order_number,
    status,
    matchConfidence,
    amountDifference,
    quantityDiscrepancies,
    priceDiscrepancies,
    missingItems,
    extraItems,
    aiNotes: aiAnalysis.notes,
    recommendedAction: aiAnalysis.action,
  };
}

/**
 * Analyze discrepancies using AI
 */
async function analyzeDiscrepancies(data: {
  status: string;
  amountDifference: number;
  quantityDiscrepancies: QuantityDiscrepancy[];
  priceDiscrepancies: PriceDiscrepancy[];
  missingItems: MissingItem[];
  extraItems: ExtraItem[];
}): Promise<{ notes: string; action: string }> {
  const prompt = `Analyze these invoice discrepancies and provide recommendations:

Status: ${data.status}
Amount Difference: $${data.amountDifference.toFixed(2)}

Quantity Discrepancies: ${data.quantityDiscrepancies.length}
${data.quantityDiscrepancies.map(d => `- ${d.productName}: Invoice ${d.invoiceQuantity}, Order ${d.orderQuantity}`).join('\n')}

Price Discrepancies: ${data.priceDiscrepancies.length}
${data.priceDiscrepancies.map(d => `- ${d.productName}: Invoice $${d.invoicePrice}, Order $${d.orderPrice}`).join('\n')}

Missing Items: ${data.missingItems.length}
${data.missingItems.map(i => `- ${i.productName} (${i.quantity})`).join('\n')}

Extra Items: ${data.extraItems.length}
${data.extraItems.map(i => `- ${i.productName} (${i.quantity})`).join('\n')}

Provide:
1. Brief analysis of the discrepancies
2. Recommended action (approve, investigate, reject, contact vendor)

Respond with JSON:
{
  "notes": "brief analysis",
  "action": "recommended action"
}`;

  const analysis = await generateJSONPro<{ notes: string; action: string }>(prompt, {
    temperature: 0.2,  // Lower for financial analysis
    maxTokens: 600,
    systemPrompt: 'You are a financial reconciliation expert. Analyze discrepancies with precision and provide clear, actionable recommendations.'
  });

  return analysis;
}

