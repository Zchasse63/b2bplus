import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface CSVRow {
  sku: string;
  quantity: number;
}

interface OrderItem {
  sku: string;
  quantity: number;
  product_id?: string;
  product_name?: string;
  unit_price?: number;
  total_price?: number;
  status: 'valid' | 'invalid' | 'warning';
  error?: string;
}

interface OrderPreview {
  items: OrderItem[];
  total_items: number;
  total_amount: number;
  valid_items: number;
  invalid_items: number;
}

/**
 * Parse CSV content to extract SKU and Quantity
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const skuIndex = header.findIndex(h => h === 'sku');
  const quantityIndex = header.findIndex(h => h === 'quantity' || h === 'qty');

  if (skuIndex === -1) {
    throw new Error('CSV must contain a "SKU" column');
  }

  if (quantityIndex === -1) {
    throw new Error('CSV must contain a "Quantity" or "Qty" column');
  }

  // Parse data rows
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map(v => v.trim());

    const sku = values[skuIndex];
    const quantityStr = values[quantityIndex];

    if (!sku) continue; // Skip rows without SKU

    const quantity = parseInt(quantityStr, 10);

    if (isNaN(quantity) || quantity <= 0) {
      rows.push({ sku, quantity: 0 }); // We'll mark this as invalid later
    } else {
      rows.push({ sku, quantity });
    }
  }

  return rows;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    let csvRows: CSVRow[];
    try {
      csvRows = parseCSV(content);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to parse CSV' },
        { status: 400 }
      );
    }

    if (csvRows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file contains no valid data rows' },
        { status: 400 }
      );
    }

    // Fetch all products matching the SKUs (batch query)
    const skus = csvRows.map(row => row.sku);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, base_price, is_active')
      .in('sku', skus);

    if (productsError) {
      logger.error('Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Create a map of SKU -> Product for fast lookup
    const productMap = new Map(
      (products || []).map(p => [p.sku.toUpperCase(), p])
    );

    // Validate and price each item
    const items: OrderItem[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let totalAmount = 0;

    for (const row of csvRows) {
      const skuUpper = row.sku.toUpperCase();
      const product = productMap.get(skuUpper);

      // Validate quantity
      if (row.quantity <= 0) {
        items.push({
          sku: row.sku,
          quantity: row.quantity,
          status: 'invalid',
          error: 'Quantity must be a positive number'
        });
        invalidCount++;
        continue;
      }

      // Validate product exists
      if (!product) {
        items.push({
          sku: row.sku,
          quantity: row.quantity,
          status: 'invalid',
          error: 'Product not found'
        });
        invalidCount++;
        continue;
      }

      // Check if product is active
      if (!product.is_active) {
        items.push({
          sku: row.sku,
          quantity: row.quantity,
          product_id: product.id,
          product_name: product.name,
          status: 'invalid',
          error: 'Product is no longer available'
        });
        invalidCount++;
        continue;
      }

      // Get customer-specific price
      const { data: customerPrice } = await supabase.rpc('get_customer_price', {
        p_customer_id: user.id,
        p_product_id: product.id,
        p_quantity: row.quantity,
        p_date: new Date().toISOString().split('T')[0]
      });

      const unitPrice = customerPrice || product.base_price;
      const totalPrice = unitPrice * row.quantity;

      items.push({
        sku: row.sku,
        quantity: row.quantity,
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: 'valid'
      });

      validCount++;
      totalAmount += totalPrice;
    }

    // Build preview response
    const preview: OrderPreview = {
      items,
      total_items: items.length,
      total_amount: totalAmount,
      valid_items: validCount,
      invalid_items: invalidCount
    };

    return NextResponse.json({ preview });

  } catch (error) {
    logger.error('Error in bulk upload API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
