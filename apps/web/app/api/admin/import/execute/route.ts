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
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Map all rows first
    const mappedRows: Array<{ data: ImportRow; rowNumber: number; originalRow: any }> = [];

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

        // Validate required fields early
        if (importType === 'products' && (!mappedData.sku || !mappedData.name)) {
          throw new Error('SKU and name are required');
        }

        mappedRows.push({ data: mappedData, rowNumber, originalRow: row });

      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
      }
    }

    // Execute batch import based on type
    if (importType === 'products') {
      await importProductsBatch(supabase, mappedRows, updateExisting, result, profile.current_organization_id);
    } else if (importType === 'prices') {
      await updatePricesBatch(supabase, mappedRows, result);
    } else if (importType === 'inventory') {
      await updateInventoryBatch(supabase, mappedRows, result);
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

// Batch import products - processes multiple rows at once
async function importProductsBatch(
  supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any },
  mappedRows: Array<{ data: ImportRow; rowNumber: number; originalRow: any }>,
  updateExisting: boolean,
  result: ImportResult,
  organizationId: string
) {
  if (mappedRows.length === 0) return;

  const BATCH_SIZE = 500; // Process in chunks of 500

  // Process in batches
  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE);

    // Get all SKUs in this batch
    const skus = batch.map(row => row.data.sku);

    // Check which products already exist (single query for the whole batch)
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, sku')
      .eq('organization_id', organizationId)
      .in('sku', skus);

    const existingSkuMap = new Map(
      (existingProducts || []).map(p => [p.sku, p.id])
    );

    const toInsert: ImportRow[] = [];
    const toUpdate: Array<{ id: string; data: ImportRow; rowNumber: number }> = [];
    const toSkip: Array<{ rowNumber: number; sku: string; data: any }> = [];

    // Categorize rows
    for (const row of batch) {
      const existingId = existingSkuMap.get(row.data.sku);

      if (existingId && updateExisting) {
        toUpdate.push({ id: existingId, data: row.data, rowNumber: row.rowNumber });
      } else if (!existingId) {
        toInsert.push(row.data);
      } else {
        toSkip.push({ rowNumber: row.rowNumber, sku: row.data.sku, data: row.data });
      }
    }

    // Batch insert new products
    if (toInsert.length > 0) {
      const { error, data: insertedData } = await supabase
        .from('products')
        .insert(toInsert)
        .select();

      if (error) {
        logger.error('Batch insert error:', error);
        // Mark all as failed
        toInsert.forEach((item, idx) => {
          result.failed++;
          result.errors.push({
            row: batch[idx].rowNumber,
            error: error.message,
            data: item
          });
        });
      } else {
        result.imported += insertedData?.length || toInsert.length;
      }
    }

    // Batch update existing products
    // Note: Supabase doesn't support batch updates directly, so we chunk them
    if (toUpdate.length > 0) {
      const UPDATE_CHUNK_SIZE = 100;

      for (let j = 0; j < toUpdate.length; j += UPDATE_CHUNK_SIZE) {
        const updateChunk = toUpdate.slice(j, j + UPDATE_CHUNK_SIZE);

        // Use Promise.all for parallel updates within chunk
        const updatePromises = updateChunk.map(async (item) => {
          const { error } = await supabase
            .from('products')
            .update({
              ...item.data,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (error) {
            result.failed++;
            result.errors.push({
              row: item.rowNumber,
              error: error.message,
              data: item.data
            });
            return false;
          }
          return true;
        });

        const updateResults = await Promise.all(updatePromises);
        result.updated += updateResults.filter(r => r).length;
      }
    }

    // Handle skipped items
    if (toSkip.length > 0 && !updateExisting) {
      toSkip.forEach(item => {
        result.failed++;
        result.errors.push({
          row: item.rowNumber,
          error: `Product already exists (SKU: ${item.sku})`,
          data: item.data
        });
      });
    }
  }
}

// Batch update prices - processes multiple rows at once
async function updatePricesBatch(
  supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any },
  mappedRows: Array<{ data: ImportRow; rowNumber: number; originalRow: any }>,
  result: ImportResult
) {
  if (mappedRows.length === 0) return;

  const BATCH_SIZE = 500;

  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE);
    const skus = batch.map(row => row.data.sku);

    // Find all products by SKU in one query
    const { data: products } = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', skus);

    const productSkuMap = new Map(
      (products || []).map(p => [p.sku, p.id])
    );

    // Update prices in parallel chunks
    const UPDATE_CHUNK_SIZE = 100;

    for (let j = 0; j < batch.length; j += UPDATE_CHUNK_SIZE) {
      const chunk = batch.slice(j, j + UPDATE_CHUNK_SIZE);

      const updatePromises = chunk.map(async (row) => {
        const productId = productSkuMap.get(row.data.sku);

        if (!productId) {
          result.failed++;
          result.errors.push({
            row: row.rowNumber,
            error: `Product not found with SKU: ${row.data.sku}`,
            data: row.data
          });
          return false;
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (row.data.base_price !== undefined) updates.base_price = row.data.base_price;
        if (row.data.cost_price !== undefined) updates.cost_price = row.data.cost_price;

        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', productId);

        if (error) {
          result.failed++;
          result.errors.push({
            row: row.rowNumber,
            error: error.message,
            data: row.data
          });
          return false;
        }
        return true;
      });

      const updateResults = await Promise.all(updatePromises);
      result.updated += updateResults.filter(r => r).length;
    }
  }
}

// Batch update inventory - processes multiple rows at once
async function updateInventoryBatch(
  supabase: { from: (table: string) => any; auth?: any; rpc?: (fn: string, params?: any) => any },
  mappedRows: Array<{ data: ImportRow; rowNumber: number; originalRow: any }>,
  result: ImportResult
) {
  if (mappedRows.length === 0) return;

  // Check if inventory management is enabled (once)
  const { data: featureFlag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('feature_name', 'inventory_management')
    .single();

  if (!featureFlag?.enabled) {
    mappedRows.forEach(row => {
      result.failed++;
      result.errors.push({
        row: row.rowNumber,
        error: 'Inventory management feature is not enabled',
        data: row.data
      });
    });
    return;
  }

  const BATCH_SIZE = 500;

  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE);
    const skus = batch.map(row => row.data.sku);

    // Find all products by SKU in one query
    const { data: products } = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', skus);

    const productSkuMap = new Map(
      (products || []).map(p => [p.sku, p.id])
    );

    // Get unique location codes
    const locationCodes = [...new Set(
      batch
        .map(row => row.data.location)
        .filter(loc => loc)
    )];

    // Fetch all locations in one query
    const { data: locations } = await supabase
      .from('inventory_locations')
      .select('id, code')
      .in('code', locationCodes);

    const locationCodeMap = new Map(
      (locations || []).map(l => [l.code, l.id])
    );

    // Prepare upsert data
    const inventoryData = [];

    for (const row of batch) {
      const productId = productSkuMap.get(row.data.sku);

      if (!productId) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          error: `Product not found with SKU: ${row.data.sku}`,
          data: row.data
        });
        continue;
      }

      const locationId = row.data.location_id || locationCodeMap.get(row.data.location);

      if (!locationId) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          error: 'Location not found',
          data: row.data
        });
        continue;
      }

      inventoryData.push({
        product_id: productId,
        location_id: locationId,
        quantity_on_hand: row.data.quantity || 0,
        last_updated_at: new Date().toISOString()
      });
    }

    // Batch upsert inventory
    if (inventoryData.length > 0) {
      const { error } = await supabase
        .from('product_inventory')
        .upsert(inventoryData, {
          onConflict: 'product_id,location_id'
        });

      if (error) {
        logger.error('Batch inventory upsert error:', error);
        result.failed += inventoryData.length;
        inventoryData.forEach((_, idx) => {
          result.errors.push({
            row: batch[idx].rowNumber,
            error: error.message,
            data: batch[idx].data
          });
        });
      } else {
        result.updated += inventoryData.length;
      }
    }
  }
}
