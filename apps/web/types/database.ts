/**
 * Database Type Definitions
 *
 * Comprehensive type definitions for all database tables and relations
 * Replaces unsafe `any` types throughout the application
 */

// ============================================
// Core Entity Types
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'distributor' | 'restaurant' | 'hotel' | 'hospital' | 'school';
  tax_id: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  current_organization_id: string | null;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  base_price: number;
  unit_of_measure: string;
  units_per_case: number | null;
  weight_lbs: number | null;
  dimensions_inches: {
    length: number;
    width: number;
    height: number;
  } | null;
  in_stock: boolean;
  is_active: boolean;
  image_url: string | null;
  additional_images: string[] | null;
  specifications: Record<string, any> | null;
  allergens: string[] | null;
  nutritional_info: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  organization_id: string;
  user_id: string;
  order_number: string;
  po_number: string | null;
  status: 'draft' | 'submitted' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  shipping_address_id: string | null;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  notes: string | null;
  submitted_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  organization_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  id: string;
  organization_id: string;
  label: string;
  contact_name: string;
  phone: string;
  street_address: string;
  street_address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  delivery_instructions: string | null;
  is_default: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  body: string;
  target_segments: string[] | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Recommendation Types
// ============================================

export interface ProductRecommendation {
  id: string;
  organization_id: string;
  product_id: string;
  recommended_product_id: string;
  recommendation_type: 'similar' | 'frequently_bought' | 'cross_sell' | 'upsell';
  score: number;
  reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationWithProduct extends ProductRecommendation {
  product: Product;
  recommended_product: Product;
}

// ============================================
// Pricing Types
// ============================================

export interface PricingTier {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  minimum_order_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProductPricing {
  id: string;
  organization_id: string;
  customer_id: string;
  product_id: string;
  custom_price: number;
  created_at: string;
  updated_at: string;
}

export interface VolumeDiscount {
  id: string;
  organization_id: string;
  product_id: string;
  min_quantity: number;
  discount_percentage: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Notification Types
// ============================================

export interface PushNotification {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationBatch {
  successful: number;
  failed: number;
  errors: Array<{
    token: string;
    error: string;
  }>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Database Query Types
// ============================================

export interface SupabaseClient {
  from: (table: string) => unknown;
  auth: {
    getUser: () => Promise<{ data: { user: Profile | null }; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
  };
  rpc: (fn: string, params?: Record<string, unknown>) => unknown;
  storage: {
    from: (bucket: string) => unknown;
  };
}

export interface DatabaseRow {
  [key: string]: unknown;
}

export interface QueryResult<T = DatabaseRow> {
  data: T[] | T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
  count?: number | null;
  status: number;
  statusText: string;
}

// ============================================
// Analytics Types
// ============================================

export interface SalesMetrics {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  period_start: string;
  period_end: string;
}

export interface ProductMetrics {
  product_id: string;
  product_name: string;
  total_units_sold: number;
  total_revenue: number;
  average_price: number;
  order_count: number;
}

export interface CustomerMetrics {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_revenue: number;
  lifetime_value: number;
  last_order_date: string;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: string;
  event_type: string;
  user_id: string | null;
  organization_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  created_at: string;
}

// ============================================
// Utility Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================
// Type Guards
// ============================================

export function isApiError(response: unknown): response is ApiError {
  return response !== null && typeof response === 'object' && 'error' in response && typeof (response as ApiError).error === 'string';
}

export function isApiSuccess<T>(response: unknown): response is ApiSuccess<T> {
  return response !== null && typeof response === 'object' && 'data' in response;
}

export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    response !== null &&
    typeof response === 'object' &&
    'data' in response &&
    'total' in response &&
    'page' in response &&
    Array.isArray((response as PaginatedResponse<T>).data) &&
    typeof (response as PaginatedResponse<T>).total === 'number' &&
    typeof (response as PaginatedResponse<T>).page === 'number'
  );
}
