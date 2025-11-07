import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rate-limit';

// POST semantic search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Rate limit semantic search to prevent abuse
    // Embedding generation is expensive (AI API calls + processing)
    const rateLimitResult = await checkRateLimit(supabase, {
      key: 'semantic-search',
      identifier: user.id,
      maxRequests: 20, // 20 searches per minute
      windowSeconds: 60,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimitResult.resetAt.toISOString(),
          limit: rateLimitResult.limit,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { 
      query, 
      limit = 10, 
      threshold = 0.7,
      includeKeywordSearch = true 
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Check if semantic search is enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'semantic_search')
      .single();

    if (!featureFlag?.enabled) {
      // Fall back to keyword search
      return performKeywordSearch(supabase, query, limit);
    }

    // Generate embedding for search query using Gemini text-embedding-004
    const queryEmbedding = await generateEmbedding(query);

    // Perform semantic search using vector similarity
    const { data: semanticResults, error: searchError } = await supabase
      .rpc('semantic_search_products', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: limit
      });

    if (searchError) {
      console.error('Semantic search error:', searchError);
      // Fall back to keyword search
      return performKeywordSearch(supabase, query, limit);
    }

    // Get full product details
    const productIds = semanticResults.map((r: any) => r.product_id);
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Merge similarity scores with product data
    const results = products?.map(product => {
      const match = semanticResults.find((r: any) => r.product_id === product.id);
      return {
        ...product,
        similarity: match?.similarity || 0,
        searchType: 'semantic'
      };
    }).sort((a, b) => b.similarity - a.similarity);

    // Log search query for analytics
    await supabase
      .from('search_queries')
      .insert({
        user_id: user.id,
        query_text: query,
        query_type: 'semantic',
        results_count: results?.length || 0
      });

    // If semantic search returns few results and keyword search is enabled, combine with keyword results
    if (includeKeywordSearch && results && results.length < 5) {
      const keywordResults = await performKeywordSearch(supabase, query, limit - results.length);
      
      if (keywordResults.ok) {
        const keywordData = await keywordResults.json();
        const combinedResults = [
          ...results,
          ...keywordData.products.filter((kp: any) => 
            !results.some(sr => sr.id === kp.id)
          )
        ];
        
        return NextResponse.json({
          success: true,
          products: combinedResults.slice(0, limit),
          searchType: 'hybrid',
          semanticCount: results.length,
          keywordCount: keywordData.products.length
        });
      }
    }

    return NextResponse.json({
      success: true,
      products: results || [],
      searchType: 'semantic'
    });

  } catch (error) {
    console.error('Error in semantic search API:', error);
    
    // Fall back to keyword search on error
    try {
      const supabase = await createClient();
      const body = await request.json();
      return performKeywordSearch(supabase, body.query, body.limit || 10);
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}

// Fallback keyword search
async function performKeywordSearch(supabase: any, query: string, limit: number) {
  // SECURITY FIX: Sanitize search terms to prevent SQL injection
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
    .split(' ')
    .filter(term => term.length > 2)
    .slice(0, 10); // Limit number of terms

  let productsQuery = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .limit(limit);

  // Build OR conditions safely - terms are now sanitized
  if (searchTerms.length > 0) {
    const orConditions = searchTerms.map(term => {
      // Escape % and _ which are SQL wildcard characters
      const escapedTerm = term.replace(/[%_]/g, '\\$&');
      return [
        `name.ilike.%${escapedTerm}%`,
        `description.ilike.%${escapedTerm}%`,
        `sku.ilike.%${escapedTerm}%`,
        `category.ilike.%${escapedTerm}%`
      ].join(',');
    }).join(',');

    productsQuery = productsQuery.or(orConditions);
  }

  const { data: products, error } = await productsQuery;

  if (error) {
    console.error('Keyword search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    products: products || [],
    searchType: 'keyword'
  });
}

// GET search suggestions (autocomplete)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (query.length < 2) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    // Get product name suggestions
    const { data: products } = await supabase
      .from('products')
      .select('name, category')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(limit);

    const suggestions = products?.map(p => ({
      text: p.name,
      category: p.category
    })) || [];

    return NextResponse.json({ success: true, suggestions });

  } catch (error) {
    console.error('Error in search suggestions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
