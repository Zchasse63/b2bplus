/**
 * Bulk Customer Invoice Upload API
 * 
 * Upload multiple customer invoice PDFs to populate historical usage data.
 * AI parses each invoice and links to customer profiles.
 * 
 * POST /api/admin/invoices/bulk-upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { processDocumentJSON } from '@/lib/ai/providers/unified';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for bulk processing

interface ExtractedCustomerInvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  po_number?: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount?: number;
  total_amount: number;
  line_items: Array<{
    sku?: string;
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payment_terms?: string;
  notes?: string;
}

interface CSVInvoiceRow {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  po_number?: string;
  sku?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  subtotal?: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount?: number;
  payment_terms?: string;
  notes?: string;
}

/**
 * POST /api/admin/invoices/bulk-upload
 *
 * Upload multiple customer invoices (PDFs, CSVs, Excel)
 *
 * Request: multipart/form-data with:
 *   - files: File[] (PDFs, CSVs, or Excel files)
 *   - organization_id: string (optional - if provided, all invoices linked to this customer)
 *   - auto_detect: boolean (optional - if true, AI tries to detect customer from invoice)
 *
 * Response: { success: true, results: [...], summary: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) {
      return authError;
    }

    const supabase = await createClient();
    const formData = await request.formData();

    // Get organization_id if provided
    const organizationId = formData.get('organization_id') as string | null;
    const autoDetect = formData.get('auto_detect') === 'true';

    // Get all files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types (PDF, CSV, Excel)
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const invalidFiles = files.filter(f => !allowedTypes.includes(f.type) && !f.name.endsWith('.csv'));
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: `Invalid file types. Only PDF, CSV, and Excel files allowed. Found: ${invalidFiles.map(f => f.name).join(', ')}` },
        { status: 400 }
      );
    }

    // Process each file
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      try {
        let result;

        // Determine file type and process accordingly
        if (file.type === 'application/pdf') {
          result = await processPDFInvoice(file, supabase, user!.id, organizationId, autoDetect);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          result = await processCSVInvoices(file, supabase, user!.id, organizationId);
        } else {
          // Excel file
          result = await processExcelInvoices(file, supabase, user!.id, organizationId);
        }

        results.push({
          filename: file.name,
          success: true,
          ...result,
        });
        successCount += (result as any).count || 1;
      } catch (error: any) {
        results.push({
          filename: file.name,
          success: false,
          error: error.message,
        });
        failureCount++;
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: files.length,
        successful: successCount,
        failed: failureCount,
      },
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single customer invoice PDF
 */
async function processPDFInvoice(
  file: File,
  supabase: any,
  userId: string,
  organizationId: string | null,
  autoDetect: boolean
): Promise<{
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
}> {
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `customer-invoice-${timestamp}-${randomString}.pdf`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // Extract invoice data using Gemini Pro
  const extractionPrompt = `
You are an expert invoice data extraction system. Analyze this CUSTOMER invoice PDF (invoice sent TO a customer, not FROM a vendor).

Extract all relevant information in this exact JSON format:
{
  "invoice_number": "string (required)",
  "invoice_date": "YYYY-MM-DD (required)",
  "due_date": "YYYY-MM-DD (optional)",
  "customer_name": "string (required - the customer/organization this invoice was sent to)",
  "customer_email": "string (optional)",
  "customer_phone": "string (optional)",
  "po_number": "string (optional - customer's PO number)",
  "subtotal": number (required),
  "tax_amount": number (required - 0 if no tax)",
  "shipping_amount": number (optional - 0 if not specified)",
  "total_amount": number (required),
  "line_items": [
    {
      "sku": "string (optional)",
      "name": "string (required)",
      "description": "string (optional)",
      "quantity": number (required),
      "unit_price": number (required),
      "line_total": number (required)
    }
  ],
  "payment_terms": "string (optional - e.g., 'Net 30', 'Due on receipt')",
  "notes": "string (optional)"
}

Important:
- This is a customer invoice (accounts receivable), not a vendor invoice
- Extract the CUSTOMER name (who the invoice was sent to)
- Extract ALL line items with accurate quantities and prices
- Ensure all monetary values are numbers (not strings)
- Dates must be in YYYY-MM-DD format
- If a field is not found, omit it or use null
- Be precise with numbers - double-check calculations
`;

  const extractedData = await processDocumentJSON<ExtractedCustomerInvoiceData>(
    buffer,
    file.type,
    extractionPrompt,
    {
      usePro: true,
      temperature: 0.2,
    }
  );

  // Validate extracted data
  if (!extractedData.invoice_number || !extractedData.invoice_date) {
    throw new Error('Missing required fields: invoice_number or invoice_date');
  }

  // Determine organization ID
  let finalOrganizationId: string | null = organizationId;

  // If no organization provided and auto-detect is enabled, try to find/create customer
  if (!finalOrganizationId && autoDetect && extractedData.customer_name) {
    // Try to find existing organization by name (fuzzy match)
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', `%${extractedData.customer_name}%`)
      .limit(1);

    if (existingOrgs && existingOrgs.length > 0) {
      finalOrganizationId = existingOrgs[0].id;
    } else {
      // Create new organization if not found
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: extractedData.customer_name,
          slug: extractedData.customer_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          type: 'restaurant', // Default type
          email: extractedData.customer_email,
          phone: extractedData.customer_phone,
        })
        .select()
        .single();

      if (orgError) {
        console.warn('Failed to create organization, will create invoice without org link:', orgError);
      } else {
        finalOrganizationId = newOrg.id;
      }
    }
  }

  // Create invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: extractedData.invoice_number,
      organization_id: finalOrganizationId,
      issue_date: extractedData.invoice_date,
      due_date: extractedData.due_date || null,
      status: 'unpaid', // Historical invoices default to unpaid
      subtotal: extractedData.subtotal,
      tax_amount: extractedData.tax_amount,
      shipping_amount: extractedData.shipping_amount || 0,
      total_amount: extractedData.total_amount,
      payment_terms: extractedData.payment_terms,
      notes: extractedData.notes,
      // Store original PDF reference
      metadata: {
        source: 'bulk_upload_pdf',
        original_filename: file.name,
        file_url: publicUrl,
        extracted_customer_name: extractedData.customer_name,
        extracted_customer_email: extractedData.customer_email,
        extracted_customer_phone: extractedData.customer_phone,
        po_number: extractedData.po_number,
      },
    })
    .select()
    .single();

  if (invoiceError) {
    throw new Error(`Failed to create invoice: ${invoiceError.message}`);
  }

  // Log admin activity
  await supabase.rpc('log_admin_activity', {
    p_action: 'bulk_upload_customer_invoice_pdf',
    p_entity_type: 'invoice',
    p_entity_id: invoice.id,
    p_details: {
      filename: file.name,
      customer_name: extractedData.customer_name,
      invoice_number: extractedData.invoice_number,
      total_amount: extractedData.total_amount,
      organization_id: finalOrganizationId,
    },
  });

  return {
    invoice_id: invoice.id,
    invoice_number: extractedData.invoice_number,
    customer_name: extractedData.customer_name || 'Unknown',
    total_amount: extractedData.total_amount,
  };
}

/**
 * Process CSV file with invoice data
 */
async function processCSVInvoices(
  file: File,
  supabase: any,
  userId: string,
  organizationId: string | null
): Promise<{
  count: number;
  invoices: string[];
}> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Parse CSV header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Group rows by invoice number
  const invoiceGroups = new Map<string, CSVInvoiceRow[]>();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const invoiceNumber = row.invoice_number || row.invoice_no || row.invoice;
    if (!invoiceNumber) continue;

    if (!invoiceGroups.has(invoiceNumber)) {
      invoiceGroups.set(invoiceNumber, []);
    }

    invoiceGroups.get(invoiceNumber)!.push({
      invoice_number: invoiceNumber,
      invoice_date: row.invoice_date || row.date,
      due_date: row.due_date,
      po_number: row.po_number || row.po,
      sku: row.sku || row.product_code,
      product_name: row.product_name || row.product || row.item || row.description,
      quantity: parseFloat(row.quantity || row.qty || '1'),
      unit_price: parseFloat(row.unit_price || row.price || '0'),
      line_total: parseFloat(row.line_total || row.total || '0'),
      subtotal: parseFloat(row.subtotal || '0'),
      tax_amount: parseFloat(row.tax_amount || row.tax || '0'),
      shipping_amount: parseFloat(row.shipping_amount || row.shipping || '0'),
      total_amount: parseFloat(row.total_amount || row.grand_total || '0'),
      payment_terms: row.payment_terms || row.terms,
      notes: row.notes,
    });
  }

  if (!organizationId) {
    throw new Error('Organization ID is required for CSV uploads. Please select a customer.');
  }

  // Create invoices
  const createdInvoices: string[] = [];

  for (const [invoiceNumber, rows] of invoiceGroups) {
    const firstRow = rows[0];

    // Calculate totals from line items if not provided
    const lineItemsTotal = rows.reduce((sum, row) => sum + (row.line_total || row.quantity * row.unit_price), 0);
    const subtotal = firstRow.subtotal || lineItemsTotal;
    const taxAmount = firstRow.tax_amount || 0;
    const shippingAmount = firstRow.shipping_amount || 0;
    const totalAmount = firstRow.total_amount || (subtotal + taxAmount + shippingAmount);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        organization_id: organizationId,
        issue_date: firstRow.invoice_date,
        due_date: firstRow.due_date || null,
        status: 'unpaid',
        subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        payment_terms: firstRow.payment_terms,
        notes: firstRow.notes,
        metadata: {
          source: 'bulk_upload_csv',
          original_filename: file.name,
          line_items: rows.map(row => ({
            sku: row.sku,
            name: row.product_name,
            quantity: row.quantity,
            unit_price: row.unit_price,
            line_total: row.line_total || row.quantity * row.unit_price,
          })),
        },
      })
      .select()
      .single();

    if (invoiceError) {
      console.error(`Failed to create invoice ${invoiceNumber}:`, invoiceError);
      continue;
    }

    createdInvoices.push(invoice.invoice_number);
  }

  // Log admin activity
  await supabase.rpc('log_admin_activity', {
    p_action: 'bulk_upload_customer_invoices_csv',
    p_entity_type: 'invoice',
    p_details: {
      filename: file.name,
      invoices_created: createdInvoices.length,
      organization_id: organizationId,
    },
  });

  return {
    count: createdInvoices.length,
    invoices: createdInvoices,
  };
}

/**
 * Process Excel file with invoice data
 */
async function processExcelInvoices(
  file: File,
  supabase: any,
  userId: string,
  organizationId: string | null
): Promise<{
  count: number;
  invoices: string[];
}> {
  // For now, treat Excel files similar to CSV
  // In production, you'd use a library like 'xlsx' to parse Excel files
  throw new Error('Excel file processing not yet implemented. Please convert to CSV format.');
}

