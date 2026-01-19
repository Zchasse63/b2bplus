import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateEmbedding } from '@/lib/ai/providers/unified';
import { createLogger } from '@/lib/logging/logger';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ForbiddenError, NotFoundError } from '@/lib/middleware/error-handler';

const logger = createLogger('embeddings-generate');

// POST generate embeddings for products
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'ai');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      throw ForbiddenError.insufficientRole('admin');
    }

    const body = await request.json();
    const { productIds, regenerate = false } = body;

    // Get products to generate embeddings for
    let query = supabase
      .from('products')
      .select('id, name, description, category, sku');

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data: products, error: productsError } = await query;

    if (productsError || !products || products.length === 0) {
      throw new NotFoundError('Products');
    }

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: any[] = [];

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
        logger.error('Error generating embedding for product', { productId: product.id, error });
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
    return handleError(error);
  }
}

// GET check embedding status
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    // Count total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

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
    return handleError(error);
  }
}
