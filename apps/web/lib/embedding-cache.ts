/**
 * Embedding Cache Utility
 *
 * Caches AI-generated embeddings to reduce API calls and costs
 * Uses SHA256 hash of text as cache key for fast lookups
 *
 * PERFORMANCE IMPACT:
 * - SKU mapping: Reduces 50,000+ API calls to ~500 for 100 old products vs 500 current products
 * - Semantic search: Caches common search queries
 * - Cost savings: ~99% reduction in embedding API calls for repeated queries
 */

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/gemini';
import crypto from 'crypto';

interface CachedEmbedding {
  embedding: number[];
  fromCache: boolean;
  cacheKey: string;
}

/**
 * Generate cache key from text content
 * Uses SHA256 hash of normalized text
 */
function generateCacheKey(text: string, modelName: string = 'text-embedding-004'): string {
  // Normalize text: lowercase, trim, remove extra whitespace
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // Create hash with model name to differentiate between models
  const hashInput = `${modelName}:${normalized}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Get cached embedding or generate new one
 *
 * @param text - Text to generate embedding for
 * @param options - Optional configuration
 * @returns Cached or newly generated embedding with metadata
 */
export async function getCachedEmbedding(
  text: string,
  options: {
    modelName?: string;
    skipCache?: boolean;
  } = {}
): Promise<CachedEmbedding> {
  const { modelName = 'text-embedding-004', skipCache = false } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('Text content is required for embedding generation');
  }

  const cacheKey = generateCacheKey(text, modelName);

  // If skip cache is requested, generate directly
  if (skipCache) {
    const embedding = await generateEmbedding(text);
    return {
      embedding,
      fromCache: false,
      cacheKey,
    };
  }

  try {
    const supabase = await createClient();

    // Try to get from cache
    const { data: cached, error: cacheError } = await supabase
      .from('embedding_cache')
      .select('embedding, id')
      .eq('cache_key', cacheKey)
      .eq('model_name', modelName)
      .single();

    if (cached && !cacheError) {
      // Update usage statistics
      await supabase
        .from('embedding_cache')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: supabase.raw('use_count + 1'),
        })
        .eq('id', cached.id);

      return {
        embedding: cached.embedding as number[],
        fromCache: true,
        cacheKey,
      };
    }

    // Cache miss - generate new embedding
    const embedding = await generateEmbedding(text);

    // Store in cache for future use
    await supabase.from('embedding_cache').insert({
      cache_key: cacheKey,
      text_content: text.substring(0, 5000), // Limit text storage to 5000 chars
      embedding,
      model_name: modelName,
      use_count: 1,
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    });

    return {
      embedding,
      fromCache: false,
      cacheKey,
    };
  } catch (error) {
    // If caching fails, fall back to direct generation
    console.error('Embedding cache error, falling back to direct generation:', error);
    const embedding = await generateEmbedding(text);
    return {
      embedding,
      fromCache: false,
      cacheKey,
    };
  }
}

/**
 * Batch get or generate embeddings for multiple texts
 * More efficient than calling getCachedEmbedding multiple times
 *
 * @param texts - Array of texts to generate embeddings for
 * @param options - Optional configuration
 * @returns Array of cached or newly generated embeddings
 */
export async function getBatchCachedEmbeddings(
  texts: string[],
  options: {
    modelName?: string;
    skipCache?: boolean;
  } = {}
): Promise<CachedEmbedding[]> {
  const { modelName = 'text-embedding-004', skipCache = false } = options;

  if (!texts || texts.length === 0) {
    return [];
  }

  // Generate cache keys for all texts
  const cacheKeys = texts.map(text => generateCacheKey(text, modelName));

  if (skipCache) {
    // Generate all embeddings directly
    const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
    return embeddings.map((embedding, i) => ({
      embedding,
      fromCache: false,
      cacheKey: cacheKeys[i],
    }));
  }

  try {
    const supabase = await createClient();

    // Fetch all cached embeddings in one query
    const { data: cachedEmbeddings, error } = await supabase
      .from('embedding_cache')
      .select('cache_key, embedding, id')
      .in('cache_key', cacheKeys)
      .eq('model_name', modelName);

    if (error) {
      throw error;
    }

    // Create map of cached embeddings
    const cacheMap = new Map<string, { embedding: number[]; id: string }>();
    if (cachedEmbeddings) {
      cachedEmbeddings.forEach(cached => {
        cacheMap.set(cached.cache_key, {
          embedding: cached.embedding as number[],
          id: cached.id,
        });
      });
    }

    // Update usage stats for cached items (batch update)
    if (cacheMap.size > 0) {
      const cachedIds = Array.from(cacheMap.values()).map(c => c.id);
      await supabase
        .from('embedding_cache')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: supabase.raw('use_count + 1'),
        })
        .in('id', cachedIds);
    }

    // Generate embeddings for cache misses
    const results: CachedEmbedding[] = [];
    const misses: { text: string; cacheKey: string; index: number }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = cacheMap.get(cacheKeys[i]);
      if (cached) {
        results[i] = {
          embedding: cached.embedding,
          fromCache: true,
          cacheKey: cacheKeys[i],
        };
      } else {
        misses.push({
          text: texts[i],
          cacheKey: cacheKeys[i],
          index: i,
        });
      }
    }

    // Generate missing embeddings
    if (misses.length > 0) {
      const newEmbeddings = await Promise.all(misses.map(miss => generateEmbedding(miss.text)));

      // Store new embeddings in cache (batch insert)
      const toInsert = misses.map((miss, i) => ({
        cache_key: miss.cacheKey,
        text_content: miss.text.substring(0, 5000),
        embedding: newEmbeddings[i],
        model_name: modelName,
        use_count: 1,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      }));

      await supabase.from('embedding_cache').insert(toInsert);

      // Add to results
      misses.forEach((miss, i) => {
        results[miss.index] = {
          embedding: newEmbeddings[i],
          fromCache: false,
          cacheKey: miss.cacheKey,
        };
      });
    }

    return results;
  } catch (error) {
    // If batch caching fails, fall back to direct generation
    console.error('Batch embedding cache error, falling back to direct generation:', error);
    const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
    return embeddings.map((embedding, i) => ({
      embedding,
      fromCache: false,
      cacheKey: cacheKeys[i],
    }));
  }
}

/**
 * Pre-cache embeddings for all active products
 * Should be run periodically or when products are updated
 *
 * @returns Statistics about caching operation
 */
export async function precacheProductEmbeddings(): Promise<{
  total: number;
  cached: number;
  generated: number;
  errors: number;
}> {
  try {
    const supabase = await createClient();

    // Fetch all active products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, description, category')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    if (!products || products.length === 0) {
      return { total: 0, cached: 0, generated: 0, errors: 0 };
    }

    // Generate text representations
    const productTexts = products.map(
      p => `${p.name} ${p.description || ''} ${p.category || ''}`
    );

    // Batch cache embeddings
    const results = await getBatchCachedEmbeddings(productTexts);

    const cached = results.filter(r => r.fromCache).length;
    const generated = results.filter(r => !r.fromCache).length;

    return {
      total: products.length,
      cached,
      generated,
      errors: 0,
    };
  } catch (error) {
    console.error('Error pre-caching product embeddings:', error);
    return {
      total: 0,
      cached: 0,
      generated: 0,
      errors: 1,
    };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalUses: number;
  avgUsesPerEntry: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('embedding_cache')
      .select('use_count, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return {
        totalEntries: 0,
        totalUses: 0,
        avgUsesPerEntry: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const totalUses = data.reduce((sum, entry) => sum + entry.use_count, 0);
    const avgUsesPerEntry = data.length > 0 ? totalUses / data.length : 0;

    return {
      totalEntries: data.length,
      totalUses,
      avgUsesPerEntry: Math.round(avgUsesPerEntry * 10) / 10,
      oldestEntry: data[data.length - 1]?.created_at || null,
      newestEntry: data[0]?.created_at || null,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalEntries: 0,
      totalUses: 0,
      avgUsesPerEntry: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}
