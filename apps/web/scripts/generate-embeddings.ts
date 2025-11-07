/**
 * Generate Product Embeddings Script
 *
 * This script generates Gemini AI embeddings for all products in the database.
 * Embeddings enable semantic search functionality.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 *
 * Options:
 *   --regenerate  Force regenerate all embeddings (even if they exist)
 *   --product-ids "id1,id2,id3"  Only generate for specific product IDs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbeddings() {
  console.log('🤖 Starting product embeddings generation...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const regenerate = args.includes('--regenerate');
  const productIdsArg = args.find(arg => arg.startsWith('--product-ids='));
  const productIds = productIdsArg 
    ? productIdsArg.split('=')[1].split(',').map(id => id.trim())
    : undefined;

  try {
    // Step 1: Check current status
    console.log('📊 Checking current embedding status...');
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: withEmbeddings } = await supabase
      .from('product_embeddings')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total active products: ${totalProducts || 0}`);
    console.log(`   Products with embeddings: ${withEmbeddings || 0}`);
    console.log(`   Missing embeddings: ${(totalProducts || 0) - (withEmbeddings || 0)}`);
    
    if (totalProducts && withEmbeddings) {
      const coverage = ((withEmbeddings / totalProducts) * 100).toFixed(2);
      console.log(`   Coverage: ${coverage}%\n`);
    }

    // Step 2: Get admin user for API authentication
    console.log('🔐 Getting admin user for authentication...');
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id, email')
      .in('role', ['admin', 'super_admin'])
      .limit(1)
      .single();

    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    console.log(`   Using admin: ${adminUser.email}\n`);

    // Step 3: Create admin session
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: adminUser.email!,
    });

    if (authError || !authData) {
      throw new Error(`Failed to generate auth link: ${authError?.message}`);
    }

    // Step 4: Get products to process
    let query = supabase
      .from('products')
      .select('id, name, sku');

    if (productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data: products, error: productsError } = await query;

    if (productsError || !products || products.length === 0) {
      throw new Error('No products found to process');
    }

    console.log(`📦 Found ${products.length} products to process\n`);

    // Step 5: Generate embeddings via API
    console.log('🚀 Generating embeddings via Gemini AI...');
    console.log(`   Model: text-embedding-004 (768 dimensions)`);
    console.log(`   Regenerate: ${regenerate ? 'Yes' : 'No (skip existing)'}`);
    console.log(`   Rate limiting: 50ms delay between products\n`);

    const startTime = Date.now();

    // Call the API endpoint directly using service role
    const { data: result, error: apiError } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        productIds: productIds,
        regenerate: regenerate,
      },
    });

    // If functions don't work, use direct database approach
    if (apiError) {
      console.log('   ⚠️  Supabase Functions not available, using direct approach...\n');
      
      // Import the embedding generation logic
      const { generateEmbedding } = await import('../lib/gemini');
      const crypto = await import('crypto');

      let generated = 0;
      let skipped = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const product of products) {
        try {
          // Get full product data
          const { data: fullProduct } = await supabase
            .from('products')
            .select('id, name, description, category, sku')
            .eq('id', product.id)
            .single();

          if (!fullProduct) continue;

          // Create searchable content
          const content = [
            fullProduct.name,
            fullProduct.description || '',
            fullProduct.category || '',
            fullProduct.sku
          ].filter(Boolean).join(' ');

          // Generate content hash
          const contentHash = crypto
            .createHash('md5')
            .update(content)
            .digest('hex');

          // Check if embedding exists
          if (!regenerate) {
            const { data: existing } = await supabase
              .from('product_embeddings')
              .select('content_hash')
              .eq('product_id', product.id)
              .single();

            if (existing && existing.content_hash === contentHash) {
              console.log(`   ⏭️  Skipped: ${product.name} (${product.sku}) - already up to date`);
              skipped++;
              continue;
            }
          }

          // Generate embedding
          console.log(`   🔄 Generating: ${product.name} (${product.sku})...`);
          const embedding = await generateEmbedding(content);

          // Upsert to database
          const { error: upsertError } = await supabase
            .from('product_embeddings')
            .upsert({
              product_id: product.id,
              embedding: JSON.stringify(embedding),
              embedding_model: 'text-embedding-004',
              content_hash: contentHash,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'product_id'
            });

          if (upsertError) {
            throw upsertError;
          }

          console.log(`   ✅ Generated: ${product.name} (${product.sku})`);
          generated++;

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`   ❌ Failed: ${product.name} (${product.sku}) - ${error}`);
          failed++;
          errors.push({
            productId: product.id,
            productName: product.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n✅ Embedding generation complete!\n');
      console.log('📊 Summary:');
      console.log(`   Generated: ${generated}`);
      console.log(`   Skipped: ${skipped}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Total: ${products.length}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Avg per product: ${(parseFloat(duration) / products.length).toFixed(2)}s`);

      if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach(err => {
          console.log(`   - ${err.productName}: ${err.error}`);
        });
      }
    }

    // Step 6: Verify embeddings were created
    console.log('\n🔍 Verifying embeddings...');
    const { count: finalCount } = await supabase
      .from('product_embeddings')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total embeddings in database: ${finalCount || 0}`);
    
    if (totalProducts && finalCount) {
      const finalCoverage = ((finalCount / totalProducts) * 100).toFixed(2);
      console.log(`   Final coverage: ${finalCoverage}%`);
    }

    console.log('\n✨ Done!\n');

  } catch (error) {
    console.error('\n❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

generateEmbeddings();

