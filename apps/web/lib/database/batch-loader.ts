import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Batch Loader - Prevents N+1 queries
 * Collects multiple requests and batches them into a single database query
 * Inspired by DataLoader pattern
 */

export interface BatchLoaderOptions<K, V> {
  // Function to batch load multiple keys at once
  batchFn: (keys: K[]) => Promise<Map<K, V>>;

  // Optional: cache results
  cache?: boolean;

  // Optional: batch size limit
  batchSize?: number;

  // Optional: batch timeout (ms)
  batchTimeout?: number;
}

/**
 * Generic batch loader implementation
 */
export class BatchLoader<K, V> {
  private queue: Array<{ key: K; resolve: (value: V) => void; reject: (error: Error) => void }> = [];
  private cache: Map<K, V> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly options: Required<BatchLoaderOptions<K, V>>;

  constructor(options: BatchLoaderOptions<K, V>) {
    this.options = {
      cache: true,
      batchSize: 100,
      batchTimeout: 10,
      ...options,
    };
  }

  /**
   * Load a single item
   */
  async load(key: K): Promise<V> {
    // Check cache first
    if (this.options.cache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Process batch if we've reached the batch size
      if (this.queue.length >= this.options.batchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        // Schedule batch processing
        this.batchTimeout = setTimeout(() => this.processBatch(), this.options.batchTimeout);
      }
    });
  }

  /**
   * Load multiple items
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Process the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.options.batchSize);
    const keys = batch.map(item => item.key);

    try {
      const results = await this.options.batchFn(keys);

      // Resolve all promises
      for (const item of batch) {
        const value = results.get(item.key);
        if (value !== undefined) {
          if (this.options.cache) {
            this.cache.set(item.key, value);
          }
          item.resolve(value);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      }
    } catch (error) {
      // Reject all promises
      for (const item of batch) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Process remaining items if any
    if (this.queue.length > 0) {
      this.processBatch();
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Supabase-specific batch loaders
 */

/**
 * Batch load products by IDs
 */
export function createProductBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (productIds: string[]) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (error) throw error;

      const map = new Map<string, any>();
      data?.forEach(product => {
        map.set(product.id, product);
      });
      return map;
    },
  });
}

/**
 * Batch load customers by IDs
 */
export function createCustomerBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (customerIds: string[]) => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', customerIds);

      if (error) throw error;

      const map = new Map<string, any>();
      data?.forEach(customer => {
        map.set(customer.id, customer);
      });
      return map;
    },
  });
}

/**
 * Batch load orders by IDs
 */
export function createOrderBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (orderIds: string[]) => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (error) throw error;

      const map = new Map<string, any>();
      data?.forEach(order => {
        map.set(order.id, order);
      });
      return map;
    },
  });
}

/**
 * Batch load order items by order IDs
 */
export function createOrderItemsBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (orderIds: string[]) => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (error) throw error;

      const map = new Map<string, any[]>();
      orderIds.forEach(id => map.set(id, []));

      data?.forEach(item => {
        const items = map.get(item.order_id) || [];
        items.push(item);
        map.set(item.order_id, items);
      });

      return map;
    },
  });
}

/**
 * Batch load customer analytics by customer IDs
 */
export function createCustomerAnalyticsBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (customerIds: string[]) => {
      const { data, error } = await supabase
        .from('customer_purchase_analytics')
        .select('*')
        .in('customer_id', customerIds);

      if (error) throw error;

      const map = new Map<string, any>();
      data?.forEach(analytics => {
        map.set(analytics.customer_id, analytics);
      });
      return map;
    },
  });
}

/**
 * Batch load recommendations by customer IDs
 */
export function createRecommendationsBatchLoader(supabase: SupabaseClient) {
  return new BatchLoader({
    batchFn: async (customerIds: string[]) => {
      const { data, error } = await supabase
        .from('product_recommendations')
        .select('*')
        .in('customer_id', customerIds);

      if (error) throw error;

      const map = new Map<string, any[]>();
      customerIds.forEach(id => map.set(id, []));

      data?.forEach(rec => {
        const recs = map.get(rec.customer_id) || [];
        recs.push(rec);
        map.set(rec.customer_id, recs);
      });

      return map;
    },
  });
}

/**
 * Context for batch loaders (use in API routes)
 */
export interface BatchLoaderContext {
  products: BatchLoader<string, any>;
  customers: BatchLoader<string, any>;
  orders: BatchLoader<string, any>;
  orderItems: BatchLoader<string, any[]>;
  customerAnalytics: BatchLoader<string, any>;
  recommendations: BatchLoader<string, any[]>;
}

/**
 * Create batch loader context for a request
 */
export function createBatchLoaderContext(supabase: SupabaseClient): BatchLoaderContext {
  return {
    products: createProductBatchLoader(supabase),
    customers: createCustomerBatchLoader(supabase),
    orders: createOrderBatchLoader(supabase),
    orderItems: createOrderItemsBatchLoader(supabase),
    customerAnalytics: createCustomerAnalyticsBatchLoader(supabase),
    recommendations: createRecommendationsBatchLoader(supabase),
  };
}

