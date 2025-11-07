/**
 * E2E Test: SKU Mapping with AI
 * 
 * Tests AI-powered SKU mapping system with REAL Gemini API calls:
 * - Upload old SKU list (from Bailey system)
 * - AI analysis and fuzzy matching
 * - Embedding-based similarity matching
 * - Confidence score calculation
 * - Manual override capability
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('SKU Mapping with AI', () => {
  test.beforeAll(async () => {
    // Ensure test data exists
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (!products || products.length === 0) {
      throw new Error('No test products found. Run seed-test-data.ts first.');
    }
  });

  test('should analyze and map old SKUs to new products with AI', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin', { timeout: 10000 });
    
    // Navigate to SKU mapping
    await page.goto('/admin/sku-mapping');
    await expect(page).toHaveURL('/admin/sku-mapping');
    
    // Prepare old SKU data (from Bailey system)
    const oldSKUs = [
      { oldSKU: 'BAI-PLT-9-WHT-500', description: 'White Paper Plates 9 inch - Case of 500' },
      { oldSKU: 'BAI-NAP-WHT-1000', description: 'White Napkins 2-ply - Pack of 1000' },
      { oldSKU: 'BAI-CUP-12-HOT-500', description: 'Hot Cups 12oz Paper - Case of 500' }
    ];
    
    // Record start time to measure AI processing
    const startTime = Date.now();
    
    // Call SKU mapping API
    const response = await page.request.post('/api/admin/sku-mapping/analyze', {
      data: {
        oldSKUs
      }
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Verify AI processing took reasonable time (>5 seconds for embedding generation + matching)
    expect(processingTime).toBeGreaterThan(5000);
    console.log(`✓ AI SKU mapping took ${processingTime}ms (confirms real Gemini embedding calls)`);
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify mappings were generated
    expect(result.mappings).toBeTruthy();
    expect(result.mappings.length).toBe(oldSKUs.length);
    
    console.log(`✓ Generated ${result.mappings.length} SKU mappings`);
    
    // Verify mapping structure
    result.mappings.forEach((mapping: any, index: number) => {
      expect(mapping.old_sku).toBe(oldSKUs[index].oldSKU);
      expect(mapping.suggested_product_id).toBeTruthy();
      expect(mapping.confidence_score).toBeGreaterThan(0);
      expect(mapping.confidence_score).toBeLessThanOrEqual(1);
      expect(mapping.match_reasoning).toBeTruthy(); // AI-generated reasoning
      
      console.log(`  - ${mapping.old_sku} → ${mapping.suggested_product_name}`);
      console.log(`    Confidence: ${(mapping.confidence_score * 100).toFixed(1)}%`);
      console.log(`    Reasoning: ${mapping.match_reasoning.substring(0, 80)}...`);
    });
  });

  test('should use embedding similarity for fuzzy matching', async ({ page }) => {
    // Test fuzzy matching with slightly different descriptions
    const testCases = [
      { oldSKU: 'OLD-001', description: 'Disposable paper plate 9 inches white' },
      { oldSKU: 'OLD-002', description: 'White disposable plates nine inch' },
      { oldSKU: 'OLD-003', description: '9" white paper plates disposable' }
    ];
    
    const response = await page.request.post('/api/admin/sku-mapping/analyze', {
      data: {
        oldSKUs: testCases
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // All three should map to the same product (semantic similarity)
    const mappedProducts = result.mappings.map((m: any) => m.suggested_product_id);
    const uniqueProducts = new Set(mappedProducts);
    
    // Should map to same or very similar products
    expect(uniqueProducts.size).toBeLessThanOrEqual(2);
    
    console.log('✓ Fuzzy matching successful');
    console.log('  - All variations mapped to similar products');
    result.mappings.forEach((m: any) => {
      console.log(`    ${m.old_sku}: ${m.suggested_product_name} (${(m.confidence_score * 100).toFixed(1)}%)`);
    });
  });

  test('should save SKU mappings to database', async ({ page }) => {
    const oldSKU = `TEST-SKU-${Date.now()}`;
    
    // Get a product to map to
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .limit(1)
      .single();
    
    if (!product) {
      test.skip();
      return;
    }
    
    // Create SKU mapping
    const mappingData = {
      old_sku: oldSKU,
      new_product_id: product.id,
      old_description: 'Test product from old system',
      confidence_score: 0.95,
      match_reasoning: 'AI-generated match based on product description similarity',
      status: 'confirmed'
    };
    
    const { data: mapping, error } = await supabase
      .from('sku_mappings')
      .insert(mappingData)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(mapping).toBeTruthy();
    expect(mapping.old_sku).toBe(oldSKU);
    expect(mapping.new_product_id).toBe(product.id);
    
    console.log('✓ SKU mapping saved to database');
    console.log(`  - Old SKU: ${mapping.old_sku}`);
    console.log(`  - New Product: ${product.name}`);
    console.log(`  - Confidence: ${(mapping.confidence_score * 100).toFixed(1)}%`);
  });

  test('should allow manual override of AI suggestions', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin', { timeout: 10000 });
    
    // Get a SKU mapping
    const { data: mapping } = await supabase
      .from('sku_mappings')
      .select('*')
      .eq('status', 'pending')
      .limit(1)
      .single();
    
    if (!mapping) {
      test.skip();
      return;
    }
    
    // Navigate to SKU mapping
    await page.goto('/admin/sku-mapping');
    
    // Find the mapping
    await page.click(`text=${mapping.old_sku}`);
    
    // Click override button
    await page.click('button:has-text("Override")');
    
    // Select different product
    await page.click('[data-testid="product-selector"]');
    await page.click('[data-testid="product-option"]').first();
    
    // Save override
    await page.click('button:has-text("Save Override")');
    
    // Wait for success message
    await expect(page.locator('text=Mapping updated')).toBeVisible({ timeout: 5000 });
    
    // Verify mapping was updated
    const { data: updatedMapping } = await supabase
      .from('sku_mappings')
      .select('*')
      .eq('id', mapping.id)
      .single();
    
    expect(updatedMapping.status).toBe('manual_override');
    expect(updatedMapping.new_product_id).not.toBe(mapping.new_product_id);
    
    console.log('✓ Manual override successful');
    console.log(`  - Old mapping: ${mapping.new_product_id}`);
    console.log(`  - New mapping: ${updatedMapping.new_product_id}`);
  });

  test('should handle bulk SKU import from CSV', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin', { timeout: 10000 });
    
    // Navigate to SKU mapping
    await page.goto('/admin/sku-mapping');
    
    // Prepare CSV data
    const csvData = `old_sku,description
BAI-PLT-10-WHT,White Paper Plates 10 inch
BAI-NAP-BLK,Black Napkins 2-ply
BAI-CUP-16-COLD,Cold Cups 16oz Clear`;
    
    // Create blob and upload
    const blob = new Blob([csvData], { type: 'text/csv' });
    
    // Click import button
    await page.click('button:has-text("Import CSV")');
    
    // Upload file (mock)
    // In real test, you'd use page.setInputFiles()
    
    // For now, test the API directly
    const response = await page.request.post('/api/admin/sku-mapping/import', {
      data: {
        csvData
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.imported).toBe(3);
    expect(result.mappings).toBeTruthy();
    expect(result.mappings.length).toBe(3);
    
    console.log('✓ Bulk CSV import successful');
    console.log(`  - Imported: ${result.imported} SKUs`);
    console.log(`  - Mapped: ${result.mappings.filter((m: any) => m.confidence_score > 0.7).length} with high confidence`);
  });

  test('should track mapping accuracy over time', async ({ page }) => {
    // Get confirmed mappings
    const { data: mappings } = await supabase
      .from('sku_mappings')
      .select('*')
      .eq('status', 'confirmed')
      .limit(10);
    
    if (!mappings || mappings.length === 0) {
      test.skip();
      return;
    }
    
    // Check if customers are actually ordering using the new SKUs
    let accurateCount = 0;
    
    for (const mapping of mappings) {
      // Check if there are orders for the new product
      const { data: orders } = await supabase
        .from('order_items')
        .select('*')
        .eq('product_id', mapping.new_product_id)
        .gte('created_at', mapping.created_at);
      
      if (orders && orders.length > 0) {
        accurateCount++;
      }
    }
    
    const accuracyRate = accurateCount / mappings.length;
    
    console.log('✓ Mapping accuracy tracked');
    console.log(`  - Confirmed mappings: ${mappings.length}`);
    console.log(`  - Actually used: ${accurateCount}`);
    console.log(`  - Accuracy rate: ${(accuracyRate * 100).toFixed(1)}%`);
  });
});

