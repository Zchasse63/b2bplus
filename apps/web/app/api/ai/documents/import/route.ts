/**
 * Document Import API Endpoint
 *
 * Imports parsed document data into the database.
 * Validates data and handles errors gracefully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin role for imports
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required for imports' },
        { status: 403 }
      );
    }

    const {
      fileId,
      documentType,
      mappings,
      data,
      options,
    } = await request.json();

    if (!fileId || !documentType || !data) {
      return NextResponse.json(
        { error: 'fileId, documentType, and data are required' },
        { status: 400 }
      );
    }

    let result: {
      imported: number;
      errors: Array<{ row: number; error: string }>;
      warnings: Array<{ row: number; warning: string }>;
    } = {
      imported: 0,
      errors: [],
      warnings: [],
    };

    switch (documentType) {
      case 'invoice':
        result = await importInvoice(supabase, data, mappings, options);
        break;
      case 'purchase_order':
        result = await importPurchaseOrder(supabase, data, mappings, options);
        break;
      case 'price_list':
        result = await importPriceList(supabase, data, mappings, options);
        break;
      case 'product_catalog':
        result = await importProductCatalog(supabase, data, mappings, options);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported document type: ${documentType}` },
          { status: 400 }
        );
    }

    // Update document status
    await supabase
      .from('document_uploads')
      .update({
        status: result.errors.length === 0 ? 'imported' : 'imported_with_errors',
        import_result: result,
      })
      .eq('id', fileId);

    return NextResponse.json({
      success: true,
      fileId,
      documentType,
      ...result,
    });
  } catch (error) {
    console.error('Document import error:', error);
    return NextResponse.json(
      { error: 'Failed to import document' },
      { status: 500 }
    );
  }
}

async function importInvoice(
  supabase: any,
  data: any,
  mappings: any,
  options: any
) {
  const result = {
    imported: 0,
    errors: [] as Array<{ row: number; error: string }>,
    warnings: [] as Array<{ row: number; warning: string }>,
  };

  try {
    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: data.invoiceNumber,
        customer_id: data.customerId,
        subtotal: data.subtotal,
        tax: data.tax,
        amount: data.total,
        due_date: data.dueDate,
        status: 'imported',
        source: 'document_import',
      })
      .select()
      .single();

    if (invoiceError) {
      result.errors.push({ row: 0, error: `Failed to create invoice: ${invoiceError.message}` });
      return result;
    }

    // Import line items
    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];

      // Look up product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('sku', item.itemNumber)
        .single();

      if (!product && !options?.createMissingProducts) {
        result.warnings.push({
          row: i + 1,
          warning: `Product SKU not found: ${item.itemNumber}`,
        });
      }

      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          product_id: product?.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          extended_price: item.extendedPrice || item.quantity * item.unitPrice,
        });

      if (itemError) {
        result.errors.push({ row: i + 1, error: `Failed to add item: ${itemError.message}` });
      } else {
        result.imported++;
      }
    }
  } catch (err) {
    result.errors.push({ row: 0, error: `Import failed: ${err}` });
  }

  return result;
}

async function importPurchaseOrder(
  supabase: any,
  data: any,
  mappings: any,
  options: any
) {
  const result = {
    imported: 0,
    errors: [] as Array<{ row: number; error: string }>,
    warnings: [] as Array<{ row: number; warning: string }>,
  };

  try {
    // Create order record
    const orderNumber = `PO-${data.poNumber}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: data.customerId,
        status: 'pending',
        shipping_address: data.shipToAddress,
        notes: data.specialInstructions,
        source: 'document_import',
      })
      .select()
      .single();

    if (orderError) {
      result.errors.push({ row: 0, error: `Failed to create order: ${orderError.message}` });
      return result;
    }

    // Import line items
    let subtotal = 0;
    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];

      // Look up product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id, base_price')
        .eq('sku', item.itemNumber)
        .single();

      if (!product) {
        result.warnings.push({
          row: i + 1,
          warning: `Product SKU not found: ${item.itemNumber}`,
        });
        continue;
      }

      const unitPrice = item.unitPrice || product.base_price;
      const extendedPrice = item.quantity * unitPrice;
      subtotal += extendedPrice;

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
        });

      if (itemError) {
        result.errors.push({ row: i + 1, error: `Failed to add item: ${itemError.message}` });
      } else {
        result.imported++;
      }
    }

    // Update order totals
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    await supabase
      .from('orders')
      .update({
        subtotal,
        tax,
        total: subtotal + tax,
      })
      .eq('id', order.id);
  } catch (err) {
    result.errors.push({ row: 0, error: `Import failed: ${err}` });
  }

  return result;
}

async function importPriceList(
  supabase: any,
  data: any,
  mappings: any,
  options: any
) {
  const result = {
    imported: 0,
    errors: [] as Array<{ row: number; error: string }>,
    warnings: [] as Array<{ row: number; warning: string }>,
  };

  try {
    // Get or create pricing regions
    const regions = data.pricingRegions || [];

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];

      // Look up or create product
      let { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('sku', item.itemNumber)
        .single();

      if (!product) {
        if (options?.createMissingProducts) {
          const { data: newProduct, error: createError } = await supabase
            .from('products')
            .insert({
              sku: item.itemNumber,
              name: item.description,
              description: item.description,
              base_price: Object.values(item.pricing)[0] || 0,
              pack_size: item.packSize,
              is_active: true,
            })
            .select()
            .single();

          if (createError) {
            result.errors.push({ row: i + 1, error: `Failed to create product: ${createError.message}` });
            continue;
          }
          product = newProduct;
        } else {
          result.warnings.push({
            row: i + 1,
            warning: `Product SKU not found: ${item.itemNumber}`,
          });
          continue;
        }
      }

      // Update regional pricing
      for (const [region, price] of Object.entries(item.pricing)) {
        const { error: priceError } = await supabase
          .from('regional_pricing')
          .upsert({
            product_id: product.id,
            region,
            price: price as number,
          }, {
            onConflict: 'product_id,region',
          });

        if (priceError) {
          result.warnings.push({
            row: i + 1,
            warning: `Failed to set price for region ${region}: ${priceError.message}`,
          });
        }
      }

      result.imported++;
    }
  } catch (err) {
    result.errors.push({ row: 0, error: `Import failed: ${err}` });
  }

  return result;
}

async function importProductCatalog(
  supabase: any,
  data: any,
  mappings: any,
  options: any
) {
  const result = {
    imported: 0,
    errors: [] as Array<{ row: number; error: string }>,
    warnings: [] as Array<{ row: number; warning: string }>,
  };

  try {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];

      // Look up category
      let categoryId = null;
      if (item.category) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('name', item.category)
          .single();

        if (category) {
          categoryId = category.id;
        } else if (options?.createCategories) {
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({ name: item.category })
            .select()
            .single();
          categoryId = newCategory?.id;
        }
      }

      // Upsert product
      const { error: productError } = await supabase
        .from('products')
        .upsert({
          sku: item.itemNumber,
          name: item.name,
          description: item.description,
          category_id: categoryId,
          base_price: item.basePrice,
          pack_size: item.packSize,
          is_active: item.isActive ?? true,
        }, {
          onConflict: 'sku',
        });

      if (productError) {
        result.errors.push({ row: i + 1, error: `Failed to import product: ${productError.message}` });
      } else {
        result.imported++;
      }
    }
  } catch (err) {
    result.errors.push({ row: 0, error: `Import failed: ${err}` });
  }

  return result;
}
