/**
 * Pagination Utilities
 * Helps manage large datasets by breaking them into smaller pages
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(params: PaginationParams): {
  offset: number;
  limit: number;
} {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));

  const offset = params.offset ?? (page - 1) * pageSize;
  const limit = params.limit ?? pageSize;

  return { offset, limit };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { offset, limit } = parsePaginationParams(params);
  const page = Math.floor(offset / limit) + 1;
  const pageSize = limit;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Paginate array
 */
export function paginateArray<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const { offset, limit } = parsePaginationParams(params);
  const data = items.slice(offset, offset + limit);

  return createPaginatedResponse(data, items.length, params);
}

/**
 * Cursor-based pagination
 * Better for large datasets and real-time data
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  limit: number,
  currentCursor: string | null,
  nextCursor: string | null
): CursorPaginatedResponse<T> {
  return {
    data,
    pagination: {
      cursor: currentCursor,
      nextCursor,
      hasMore: nextCursor !== null,
      limit,
    },
  };
}

/**
 * Encode cursor (base64)
 */
export function encodeCursor(value: string): string {
  return Buffer.from(value).toString('base64');
}

/**
 * Decode cursor (base64)
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Create cursor from item
 */
export function createCursor<T>(item: T, key: keyof T): string {
  const value = String(item[key]);
  return encodeCursor(value);
}

/**
 * Pagination helper for API routes
 */
export class PaginationHelper {
  constructor(
    private total: number,
    private pageSize: number = 20
  ) {}

  /**
   * Get page data
   */
  getPage(page: number, data: any[]): PaginatedResponse<any> {
    const offset = (page - 1) * this.pageSize;
    const pageData = data.slice(offset, offset + this.pageSize);

    return createPaginatedResponse(pageData, this.total, {
      page,
      pageSize: this.pageSize,
    });
  }

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  /**
   * Check if page is valid
   */
  isValidPage(page: number): boolean {
    return page >= 1 && page <= this.getTotalPages();
  }

  /**
   * Get offset for page
   */
  getOffset(page: number): number {
    return (page - 1) * this.pageSize;
  }

  /**
   * Get limit
   */
  getLimit(): number {
    return this.pageSize;
  }
}

/**
 * Streaming pagination for large datasets
 */
export async function* streamPaginated<T>(
  fetcher: (offset: number, limit: number) => Promise<T[]>,
  pageSize: number = 100
): AsyncGenerator<T[], void, unknown> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await fetcher(offset, pageSize);

    if (data.length === 0) {
      hasMore = false;
    } else {
      yield data;
      offset += data.length;

      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }
}

/**
 * Batch pagination
 * Process items in batches
 */
export async function batchPaginate<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Lazy pagination
 * Load data on demand
 */
export class LazyPagination<T> {
  private cache: Map<number, T[]> = new Map();
  private total: number | null = null;

  constructor(
    private fetcher: (offset: number, limit: number) => Promise<{ data: T[]; total: number }>,
    private pageSize: number = 20
  ) {}

  /**
   * Get page
   */
  async getPage(page: number): Promise<PaginatedResponse<T>> {
    const offset = (page - 1) * this.pageSize;

    // Check cache
    if (this.cache.has(page)) {
      const data = this.cache.get(page)!;
      const total = this.total || 0;
      return createPaginatedResponse(data, total, { page, pageSize: this.pageSize });
    }

    // Fetch data
    const { data, total } = await this.fetcher(offset, this.pageSize);
    this.total = total;

    // Cache result
    this.cache.set(page, data);

    return createPaginatedResponse(data, total, { page, pageSize: this.pageSize });
  }

  /**
   * Clear cache
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
 * Infinite scroll pagination
 */
export class InfiniteScrollPagination<T> {
  private items: T[] = [];
  private currentPage = 1;
  private hasMore = true;

  constructor(
    private fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
    private pageSize: number = 20
  ) {}

  /**
   * Load next page
   */
  async loadMore(): Promise<T[]> {
    if (!this.hasMore) {
      return [];
    }

    const { data, hasMore } = await this.fetcher(this.currentPage, this.pageSize);
    this.items.push(...data);
    this.hasMore = hasMore;
    this.currentPage++;

    return data;
  }

  /**
   * Get all loaded items
   */
  getItems(): T[] {
    return [...this.items];
  }

  /**
   * Check if more items available
   */
  hasMoreItems(): boolean {
    return this.hasMore;
  }

  /**
   * Reset
   */
  reset(): void {
    this.items = [];
    this.currentPage = 1;
    this.hasMore = true;
  }
}

