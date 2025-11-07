import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface ImportRow {
  [key: string]: any;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

// POST execute import with confirmed column mappings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Validate organization_id exists for multi-tenant data isolation
    // All imports must be associated with an organization to prevent data leakage
    if (!profile.current_organization_id) {
      return NextResponse.json(
        { error: 'Organization not found. Please select an organization.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      rows, 
      mappings, 
      importType = 'products',
      updateExisting = true 
    } = body;

    if (!rows || !mappings || !Array.isArray(rows) || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Rows and mappings are required' },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header row and 0-index

      try {
        // Map row data to target fields
        const mappedData: ImportRow = {};
        
        mappings.forEach((mapping: any) => {
          if (mapping.targetField && row[mapping.sourceColumn] !== undefined) {
            let value = row[mapping.sourceColumn];
            
            // Type conversion based on target field
            if (mapping.targetField === 'base_price' || mapping.targetField === 'cost_price') {
              value = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
              if (isNaN(value)) value = 0;
            } else if (mapping.targetField === 'min_order_quantity') {
              value = parseInt(String(value).replace(/[^0-9]/g, ''));
              if (isNaN(value)) value = 1;
            } else if (mapping.targetField === 'is_active') {
              value = ['true', 'yes', '1', 'active'].includes(String(value).toLowerCase());
            }
            
            mappedData[mapping.targetField] = value;
          }
        });

        // Add organization_id and created_by
        if (importType === 'products') {
          mappedData.organization_id = profile.current_organization_id;
          mappedData.created_by = user.id;
        }

        // Execute import based on type
        if (importType === 'products') {
          await importProduct(supabase, mappedData, updateExisting, result, rowNumber);
        } else if (importType === 'prices') {
          await updatePrices(supabase, mappedData, result, rowNumber);
        } else if (importType === 'inventory') {
          await updateInventory(supabase, mappedData, result, rowNumber);
        }

      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
      }
    }

    return NextResponse.json({
      success: result.failed === 0,
      result: result
    });

  } catch (error) {
    logger.error('Error in execute import API:', error);
    return NextResponse.json(
      { error: 'Failed to execute import', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function importProduct(
  supabase: any,
  data: ImportRow,
  updateExisting: boolean,
  result: ImportResult,
  rowNumber: number
) {
  // Validate required fields
  if (!data.sku || !data.name) {
    throw new Error('SKU and name are required');
  }

  // Check if product exists
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('sku', data.sku)
    .eq('organization_id', data.organization_id)
    .single();

  if (existing && updateExisting) {
    // Update existing product
    const { error } = await supabase
      .from('products')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) throw error;
    result.updated++;
  } else if (!existing) {
    // Insert new product
    const { error } = await supabase
      .from('products')
      .insert(data);

    if (error) throw error;
    result.imported++;
  } else {
    // Skip if exists and updateExisting is false
    result.failed++;
    result.errors.push({
      row: rowNumber,
      error: 'Product already exists (SKU: ' + data.sku + ')',
      data: data
    });
  }
}

async function updatePrices(
  supabase: any,
  data: ImportRow,
  result: ImportResult,
  rowNumber: number
) {
  // Find product by SKU
  const { data: product, error: findError } = await supabase
    .from('products')
    .select('id')
    .eq('sku', data.sku)
    .single();

  if (findError || !product) {
    throw new Error('Product not found with SKU: ' + data.sku);
  }

  // Update prices
  const updates: any = {};
  if (data.base_price !== undefined) updates.base_price = data.base_price;
  if (data.cost_price !== undefined) updates.cost_price = data.cost_price;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', product.id);

  if (error) throw error;
  result.updated++;
}

async function updateInventory(
  supabase: any,
  data: ImportRow,
  result: ImportResult,
  rowNumber: number
) {
  // Check if inventory management is enabled
  const { data: featureFlag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('feature_name', 'inventory_management')
    .single();

  if (!featureFlag?.enabled) {
    throw new Error('Inventory management feature is not enabled');
  }

  // Find product by SKU
  const { data: product, error: findError } = await supabase
    .from('products')
    .select('id')
    .eq('sku', data.sku)
    .single();

  if (findError || !product) {
    throw new Error('Product not found with SKU: ' + data.sku);
  }

  // Find or create location
  let locationId = data.location_id;
  if (!locationId && data.location) {
    const { data: location } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('code', data.location)
      .single();

    locationId = location?.id;
  }

  if (!locationId) {
    throw new Error('Location not found');
  }

  // Upsert inventory
  const { error } = await supabase
    .from('product_inventory')
    .upsert({
      product_id: product.id,
      location_id: locationId,
      quantity_on_hand: data.quantity || 0,
      last_updated_at: new Date().toISOString()
    }, {
      onConflict: 'product_id,location_id'
    });

  if (error) throw error;
  result.updated++;
}
