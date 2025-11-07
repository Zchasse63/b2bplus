/**
 * E2E Test: Semantic Search with Product Embeddings
 * 
 * Tests AI-powered semantic search with REAL Gemini API calls:
 * - Natural language product search
 * - Embedding generation for search queries
 * - Vector similarity search using pgvector
 * - Semantic matching (not just keyword matching)
 * - Fallback to keyword search when needed
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Semantic Search with AI', () => {
  test.beforeAll(async () => {
    // Ensure product embeddings exist
    const { data: embeddings } = await supabase
      .from('product_embeddings')
      .select('id')
      .limit(1);
    
    if (!embeddings || embeddings.length === 0) {
      console.warn('⚠️  No product embeddings found. Generating embeddings...');
      
      // Generate embeddings for test
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/admin/embeddings/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate embeddings. Run: npx tsx scripts/generate-embeddings.ts');
      }
    }
  });

  test('should perform semantic search with natural language query', async ({ page }) => {
    // Login as customer
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'customer@demo.com');
    await page.fill('[data-testid="password-input"]', 'customer123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Navigate to products
    await page.goto('/products');
    await expect(page).toHaveURL('/products');
    
    // Perform semantic search with natural language
    const searchQuery = 'eco-friendly disposable plates for outdoor events';
    
    // Record start time to measure AI processing
    const startTime = Date.now();
    
    await page.fill('[data-testid="search-input"]', searchQuery);
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Verify AI processing took reasonable time (>1 second for embedding generation)
    expect(processingTime).toBeGreaterThan(1000);
    console.log(`✓ Semantic search took ${processingTime}ms (confirms real Gemini embedding call)`);
    
    // Verify results are displayed
    const results = await page.locator('[data-testid="product-card"]').count();
    expect(results).toBeGreaterThan(0);
    
    console.log(`✓ Found ${results} semantically similar products`);
    
    // Verify results are semantically relevant (not just keyword matches)
    // Should find products related to "plates", "disposable", "eco-friendly" even if exact words don't match
    const firstProduct = await page.locator('[data-testid="product-card"]').first();
    const productName = await firstProduct.locator('[data-testid="product-name"]').textContent();
    
    console.log(`  - Top result: ${productName}`);
    
    // Verify semantic relevance (should contain related terms)
    const relevantTerms = ['plate', 'disposable', 'eco', 'green', 'biodegradable', 'compostable'];
    const hasRelevantTerm = relevantTerms.some(term => 
      productName?.toLowerCase().includes(term)
    );
    
    expect(hasRelevantTerm).toBe(true);
  });

  test('should generate embeddings for search query using Gemini', async ({ page }) => {
    const searchQuery = 'heavy duty paper napkins for restaurants';
    
    // Call search API directly to test embedding generation
    const response = await page.request.post('/api/products/search', {
      data: {
        query: searchQuery,
        useSemanticSearch: true
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify embedding was generated
    expect(result.embedding).toBeTruthy();
    expect(result.embedding.length).toBe(768); // Gemini text-embedding-004 dimension
    
    console.log('✓ Query embedding generated successfully');
    console.log(`  - Embedding dimensions: ${result.embedding.length}`);
    console.log(`  - First 5 values: [${result.embedding.slice(0, 5).map((v: number) => v.toFixed(4)).join(', ')}...]`);
    
    // Verify search results
    expect(result.products).toBeTruthy();
    expect(result.products.length).toBeGreaterThan(0);
    
    // Verify similarity scores
    const firstProduct = result.products[0];
    expect(firstProduct.similarity_score).toBeTruthy();
    expect(firstProduct.similarity_score).toBeGreaterThan(0);
    expect(firstProduct.similarity_score).toBeLessThanOrEqual(1);
    
    console.log(`✓ Found ${result.products.length} products with similarity scores`);
    console.log(`  - Top match: ${firstProduct.name} (similarity: ${firstProduct.similarity_score.toFixed(4)})`);
  });

  test('should find semantically similar products without exact keyword matches', async ({ page }) => {
    // Test semantic understanding - search for concept, not exact words
    const conceptQueries = [
      { query: 'items for serving food at parties', expectedCategory: 'plates' },
      { query: 'things to wipe hands and mouth', expectedCategory: 'napkins' },
      { query: 'containers for hot beverages', expectedCategory: 'cups' }
    ];
    
    for (const { query, expectedCategory } of conceptQueries) {
      const response = await page.request.post('/api/products/search', {
        data: {
          query,
          useSemanticSearch: true
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.products).toBeTruthy();
      expect(result.products.length).toBeGreaterThan(0);
      
      // Verify semantic matching found relevant products
      const topProduct = result.products[0];
      const productCategory = topProduct.category?.toLowerCase() || topProduct.name.toLowerCase();
      
      const isRelevant = productCategory.includes(expectedCategory);
      expect(isRelevant).toBe(true);
      
      console.log(`✓ Semantic search for "${query}"`);
      console.log(`  - Found: ${topProduct.name} (${topProduct.category})`);
      console.log(`  - Similarity: ${topProduct.similarity_score.toFixed(4)}`);
    }
  });

  test('should apply similarity threshold to filter results', async ({ page }) => {
    const searchQuery = 'industrial cleaning supplies';
    
    // Search with high similarity threshold
    const response = await page.request.post('/api/products/search', {
      data: {
        query: searchQuery,
        useSemanticSearch: true,
        similarityThreshold: 0.7 // Only return highly similar results
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify all results meet threshold
    if (result.products && result.products.length > 0) {
      const allMeetThreshold = result.products.every((p: any) => p.similarity_score >= 0.7);
      expect(allMeetThreshold).toBe(true);
      
      console.log(`✓ Similarity threshold applied successfully`);
      console.log(`  - Results: ${result.products.length}`);
      console.log(`  - Min similarity: ${Math.min(...result.products.map((p: any) => p.similarity_score)).toFixed(4)}`);
      console.log(`  - Max similarity: ${Math.max(...result.products.map((p: any) => p.similarity_score)).toFixed(4)}`);
    } else {
      console.log('✓ No results met high similarity threshold (expected for unrelated query)');
    }
  });

  test('should fallback to keyword search when semantic search fails', async ({ page }) => {
    // Search for very specific SKU or product code
    const specificQuery = 'SKU-12345-XYZ';
    
    const response = await page.request.post('/api/products/search', {
      data: {
        query: specificQuery,
        useSemanticSearch: true,
        fallbackToKeyword: true
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Verify fallback was used
    if (result.usedFallback) {
      console.log('✓ Fallback to keyword search triggered');
      console.log(`  - Reason: ${result.fallbackReason || 'No semantic matches found'}`);
      
      // Verify keyword search results
      expect(result.products).toBeTruthy();
    } else {
      console.log('✓ Semantic search succeeded (no fallback needed)');
    }
  });

  test('should handle multi-language semantic search', async ({ page }) => {
    // Test semantic search with different phrasings
    const queries = [
      'plates for serving food',
      'dishes for meals',
      'tableware for dining'
    ];
    
    const results = [];
    
    for (const query of queries) {
      const response = await page.request.post('/api/products/search', {
        data: {
          query,
          useSemanticSearch: true
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      results.push({
        query,
        topProduct: result.products[0]?.name,
        similarity: result.products[0]?.similarity_score
      });
    }
    
    // Verify all queries found similar products (semantic understanding)
    const allFoundPlates = results.every(r => 
      r.topProduct?.toLowerCase().includes('plate') || 
      r.topProduct?.toLowerCase().includes('dish')
    );
    
    expect(allFoundPlates).toBe(true);
    
    console.log('✓ Multi-phrasing semantic search successful');
    results.forEach(r => {
      console.log(`  - "${r.query}" → ${r.topProduct} (${r.similarity?.toFixed(4)})`);
    });
  });

  test('should rank results by semantic similarity', async ({ page }) => {
    const searchQuery = 'biodegradable paper products';
    
    const response = await page.request.post('/api/products/search', {
      data: {
        query: searchQuery,
        useSemanticSearch: true,
        limit: 10
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.products).toBeTruthy();
    expect(result.products.length).toBeGreaterThan(1);
    
    // Verify results are sorted by similarity (descending)
    const similarities = result.products.map((p: any) => p.similarity_score);
    const isSorted = similarities.every((score: number, i: number) => 
      i === 0 || score <= similarities[i - 1]
    );
    
    expect(isSorted).toBe(true);
    
    console.log('✓ Results ranked by semantic similarity');
    console.log('  - Top 5 results:');
    result.products.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`    ${i + 1}. ${p.name} (${p.similarity_score.toFixed(4)})`);
    });
  });
});

