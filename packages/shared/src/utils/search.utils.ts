/**
 * Search Optimization Utilities
 * 
 * This module provides utilities for optimizing product search functionality,
 * including full-text search, faceted filtering, and relevance scoring.
 */

export interface SearchFilters {
  category_ids?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  brands?: string[];
  tags?: string[];
}

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  page?: number;
  page_size?: number;
}

export interface SearchResult<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  facets?: SearchFacets;
}

export interface SearchFacets {
  categories: { id: string; name: string; count: number }[];
  brands: { name: string; count: number }[];
  price_ranges: { min: number; max: number; count: number }[];
}

/**
 * Build a full-text search query for PostgreSQL
 */
export function buildFullTextSearchQuery(searchTerm: string): string {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return '';
  }
  
  // Clean and tokenize the search term
  const tokens = searchTerm
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0);
  
  if (tokens.length === 0) {
    return '';
  }
  
  // Build a tsquery with prefix matching for partial word search
  // Example: "paper cup" becomes "paper:* & cup:*"
  const tsquery = tokens.map(token => `${token}:*`).join(' & ');
  
  return tsquery;
}

/**
 * Build SQL WHERE clause for search filters
 */
export function buildFilterWhereClause(filters?: SearchFilters): {
  conditions: string[];
  params: Record<string, any>;
} {
  const conditions: string[] = [];
  const params: Record<string, any> = {};
  
  if (!filters) {
    return { conditions, params };
  }
  
  // Category filter
  if (filters.category_ids && filters.category_ids.length > 0) {
    conditions.push('category_id = ANY(:category_ids)');
    params.category_ids = filters.category_ids;
  }
  
  // Price range filter
  if (filters.min_price !== undefined) {
    conditions.push('base_price >= :min_price');
    params.min_price = filters.min_price;
  }
  
  if (filters.max_price !== undefined) {
    conditions.push('base_price <= :max_price');
    params.max_price = filters.max_price;
  }
  
  // Stock filter
  if (filters.in_stock !== undefined) {
    conditions.push('in_stock = :in_stock');
    params.in_stock = filters.in_stock;
  }
  
  // Brand filter
  if (filters.brands && filters.brands.length > 0) {
    conditions.push('brand = ANY(:brands)');
    params.brands = filters.brands;
  }
  
  // Tags filter (assuming tags is a JSONB array)
  if (filters.tags && filters.tags.length > 0) {
    conditions.push('tags ?| :tags');
    params.tags = filters.tags;
  }
  
  return { conditions, params };
}

/**
 * Build SQL ORDER BY clause for sorting
 */
export function buildSortClause(sortBy?: string): string {
  switch (sortBy) {
    case 'price_asc':
      return 'base_price ASC';
    case 'price_desc':
      return 'base_price DESC';
    case 'name_asc':
      return 'name ASC';
    case 'name_desc':
      return 'name DESC';
    case 'newest':
      return 'created_at DESC';
    case 'relevance':
    default:
      // When using full-text search, order by relevance (ts_rank)
      return 'ts_rank DESC, name ASC';
  }
}

/**
 * Calculate pagination offset
 */
export function calculatePagination(page: number = 1, pageSize: number = 20): {
  offset: number;
  limit: number;
} {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(Math.max(1, pageSize), 100); // Max 100 items per page
  
  return {
    offset: (normalizedPage - 1) * normalizedPageSize,
    limit: normalizedPageSize
  };
}

/**
 * Extract search facets from raw data
 */
export function extractSearchFacets(
  categories: { id: string; name: string; product_count: number }[],
  brands: { brand: string; product_count: number }[],
  priceStats: { min_price: number; max_price: number }
): SearchFacets {
  // Build price ranges (e.g., $0-25, $25-50, $50-100, $100+)
  const priceRanges = [
    { min: 0, max: 25 },
    { min: 25, max: 50 },
    { min: 50, max: 100 },
    { min: 100, max: 999999 }
  ];
  
  return {
    categories: categories.map(c => ({
      id: c.id,
      name: c.name,
      count: c.product_count
    })),
    brands: brands.map(b => ({
      name: b.brand,
      count: b.product_count
    })),
    price_ranges: priceRanges.map(range => ({
      min: range.min,
      max: range.max,
      count: 0 // This would need to be calculated from actual data
    }))
  };
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return text;
  }
  
  const tokens = searchTerm
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0);
  
  let highlightedText = text;
  
  for (const token of tokens) {
    const regex = new RegExp(`(${token})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  }
  
  return highlightedText;
}

/**
 * Generate search suggestions based on partial input
 */
export function generateSearchSuggestions(
  partialQuery: string,
  recentSearches: string[],
  popularSearches: string[]
): string[] {
  const suggestions: string[] = [];
  const lowerQuery = partialQuery.toLowerCase();
  
  // Add matching recent searches
  const matchingRecent = recentSearches
    .filter(search => search.toLowerCase().includes(lowerQuery))
    .slice(0, 3);
  
  suggestions.push(...matchingRecent);
  
  // Add matching popular searches
  const matchingPopular = popularSearches
    .filter(search => 
      search.toLowerCase().includes(lowerQuery) && 
      !suggestions.includes(search)
    )
    .slice(0, 5);
  
  suggestions.push(...matchingPopular);
  
  return suggestions.slice(0, 8); // Return max 8 suggestions
}
