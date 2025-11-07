import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateEmbedding } from '@/lib/gemini';

// POST generate embeddings for products
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { productIds, regenerate = false } = body;

    // Get products to generate embeddings for
    let query = supabase
      .from('products')
      .select('id, name, description, category, sku')
      .eq('is_active', true);

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data: products, error: productsError } = await query;

    if (productsError || !products || products.length === 0) {
      return NextResponse.json(
        { error: 'No products found' },
        { status: 404 }
      );
    }

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ message: string; [key: string]: unknown }> = [];

    for (const product of products) {
      try {
        // Create searchable content from product data
        const content = [
          product.name,
          product.description || '',
          product.category || '',
          product.sku
        ].filter(Boolean).join(' ');

        // Generate content hash to detect changes
        const contentHash = crypto
          .createHash('md5')
          .update(content)
          .digest('hex');

        // Check if embedding already exists and is up to date
        if (!regenerate) {
          const { data: existing } = await supabase
            .from('product_embeddings')
            .select('content_hash')
            .eq('product_id', product.id)
            .single();

          if (existing && existing.content_hash === contentHash) {
            skipped++;
            continue;
          }
        }

        // Generate embedding using Gemini text-embedding-004
        const embedding = await generateEmbedding(content);

        // Upsert embedding to database
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

        generated++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error('Error generating embedding for product:', product.id, error);
        failed++;
        errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      failed,
      total: products.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in generate embeddings API:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET check embedding status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Count products with embeddings
    const { count: withEmbeddings } = await supabase
      .from('product_embeddings')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      totalProducts: totalProducts || 0,
      withEmbeddings: withEmbeddings || 0,
      missingEmbeddings: (totalProducts || 0) - (withEmbeddings || 0),
      coverage: totalProducts ? ((withEmbeddings || 0) / totalProducts * 100).toFixed(2) : 0
    });

  } catch (error) {
    console.error('Error checking embedding status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
