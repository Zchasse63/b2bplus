/**
 * AI Module Type Definitions
 *
 * Phase 3: Type Safety & Code Quality
 * Centralized type definitions for all AI-related modules.
 */

import { z } from 'zod';

// =============================================================================
// Domain Models
// =============================================================================

/**
 * Order status enum
 */
export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/**
 * Order item from database
 */
export interface OrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  name?: string;
  line_total?: number;
  products?: {
    name: string;
    sku: string;
  };
}

/**
 * Order from database
 */
export interface Order {
  id: string;
  order_number?: string;
  status: OrderStatus;
  total: number;
  submitted_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  shipping_tracking_number?: string;
  shipping_carrier?: string;
}

/**
 * Product from database
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  price?: number;
  category: string;
  description?: string;
  in_stock: boolean;
  image_url?: string;
  unit_of_measure?: string;
  units_per_case?: number;
}

/**
 * Cart item from database
 */
export interface CartItem {
  id: string;
  user_id?: string;
  organization_id?: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  product?: Product;
}

/**
 * Organization from database
 */
export interface Organization {
  id: string;
  name: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  credit_limit?: number;
}

/**
 * Top product aggregation
 */
export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  orderCount: number;
  total_revenue?: number;
}

// =============================================================================
// Customer Context Types
// =============================================================================

/**
 * Customer context for AI operations
 */
export interface CustomerContext {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: string;
  recentOrders: Order[];
  topProducts: TopProduct[];
  totalSpend: number;
  cartItems: CartItem[];
  cartTotal: number;
  creditLimit: number;
  creditAvailable: number;
  accountStatus: string;
}

/**
 * Summarized customer context for prompts
 */
export interface SummarizedCustomerContext {
  userId: string;
  organizationName: string;
  role: string;
  recentOrders: Order[];
  topProducts: TopProduct[];
  totalSpend: number;
  cartItems: CartItem[];
  cartTotal: number;
  creditLimit: number;
  creditAvailable: number;
  accountStatus: string;
}

// =============================================================================
// Action Result Types
// =============================================================================

/**
 * Generic action result with typed data
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Order status check result
 */
export interface OrderStatusResult {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  submitted_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  shipping_tracking_number?: string;
  shipping_carrier?: string;
}

/**
 * Cart update result
 */
export interface CartUpdateResult {
  productId: string;
  quantity: number;
}

/**
 * Support ticket result
 */
export interface SupportTicketResult {
  id: string;
  ticket_number: string;
}

/**
 * Reorder result
 */
export interface ReorderResult {
  orderNumber: string;
  itemsAdded: number;
  itemsOutOfStock: number;
}

// =============================================================================
// AI Response Types
// =============================================================================

/**
 * Gemini/OpenAI usage metadata
 */
export interface AIUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Gemini API response structure
 */
export interface GeminiResponse {
  usageMetadata?: AIUsageMetadata;
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * OpenAI API response structure
 */
export interface OpenAIResponse {
  usage?: AIUsageMetadata;
  choices?: Array<{
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

/**
 * Generic AI provider response
 */
export type AIProviderResponse = GeminiResponse | OpenAIResponse;

/**
 * AI metadata - constrained to primitive types
 */
export type AIMetadata = Record<string, string | number | boolean | null | undefined>;

// =============================================================================
// Opportunity Detection Types
// =============================================================================

/**
 * Stopped buying opportunity
 */
export interface StoppedBuyingOpportunity {
  productId: string;
  productName: string;
  lastPurchaseDate: string;
  avgFrequencyDays: number;
  totalRevenue: number;
  reason?: string;
}

/**
 * Cross-sell opportunity
 */
export interface CrossSellOpportunity {
  productId: string;
  productName: string;
  category: string;
  reason: string;
  confidence: number;
}

/**
 * Upsell opportunity
 */
export interface UpsellOpportunity {
  currentProductId: string;
  premiumProductId: string;
  premiumProductName: string;
  currentPrice: number;
  premiumPrice: number;
  reason: string;
}

/**
 * Customer opportunity data for AI prompts
 */
export interface OpportunityCustomerData {
  lastPurchaseDate?: string;
  avgFrequencyDays?: number;
  totalRevenue?: number;
  category?: string;
  productName?: string;
  currentPrice?: number;
  premiumProduct?: string;
  premiumPrice?: number;
}

// =============================================================================
// Pricing Types
// =============================================================================

/**
 * Historical pricing data
 */
export interface PricingHistoryItem {
  price: number;
  date?: string;
  customerId?: string;
}

/**
 * Pricing recommendation input
 */
export interface PricingInput {
  currentPrice: number;
  customerHistory: PricingHistoryItem[];
  competitorPrice?: number;
  targetMargin?: number;
}

/**
 * Pricing recommendation result
 */
export interface PricingRecommendation {
  productId: string;
  suggestedPrice: number;
  winProbability: number;
  reasoning: string;
}

// =============================================================================
// Lead Types
// =============================================================================

/**
 * Lead information for qualification
 */
export interface Lead {
  company: string;
  industry?: string;
  employees?: number;
  revenue?: number;
  needs?: string;
}

// =============================================================================
// Parallel Execution Types
// =============================================================================

/**
 * Customer insights result
 */
export interface CustomerInsights {
  purchasePatterns: string;
  recommendations: string;
  churnRisk: string;
  upsellOpportunities: string;
}

/**
 * Detected opportunities
 */
export interface DetectedOpportunities {
  stoppedBuying: StoppedBuyingOpportunity[];
  crossSell: CrossSellOpportunity[];
  upsell: UpsellOpportunity[];
}

/**
 * Batch response result
 */
export interface BatchResponse {
  customerId: string;
  response: string;
  error?: string;
}

/**
 * Document analysis result
 */
export interface DocumentAnalysisResult {
  documentId: string;
  extractedData: Record<string, unknown> | null;
  error?: string;
}

/**
 * Customer data for insights generation
 */
export interface CustomerInsightsInput {
  recentOrders: Order[];
  topProducts: TopProduct[];
  totalSpend: number;
  accountStatus: string;
}

/**
 * Batch customer input
 */
export interface BatchCustomerInput {
  customerId: string;
  context: Record<string, unknown>;
  prompt: string;
}

/**
 * Document input for analysis
 */
export interface DocumentInput {
  documentId: string;
  content: Buffer;
  mimeType: string;
}

/**
 * Pricing product input
 */
export interface PricingProductInput {
  productId: string;
  customerId: string;
  currentPrice: number;
  historicalData: PricingHistoryItem[];
}

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Tool role type
 */
export type ToolRole = 'customer' | 'admin' | null;

/**
 * Tool counts by category
 */
export interface ToolCounts {
  products: number;
  cart: number;
  orders: number;
  profile: number;
  navigation: number;
  analytics: number;
  customers: number;
  campaigns: number;
  invoices: number;
  documents: number;
  total: number;
}

/**
 * AI tool definition
 */
export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<ActionResult>;
}

/**
 * Tool registry type
 */
export type ToolRegistry = Record<string, AITool>;

// =============================================================================
// Chatbot Types
// =============================================================================

/**
 * Chatbot action parameters
 */
export interface ChatbotActionParams {
  orderNumber?: string;
  limit?: number;
  query?: string;
  productId?: string;
  quantity?: number;
  subject?: string;
  description?: string;
  category?: 'technical' | 'billing' | 'product' | 'shipping' | 'general' | 'complaint';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  chatbotConversationId?: string;
}

/**
 * Chatbot action type
 */
export type ChatbotActionType =
  | 'check_order_status'
  | 'get_order_history'
  | 'check_inventory'
  | 'add_to_cart'
  | 'get_product_info'
  | 'create_support_ticket'
  | 'reorder_last_order';

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

export const orderStatusSchema = z.enum([
  'draft',
  'submitted',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const orderItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  name: z.string().optional(),
  line_total: z.number().optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  order_number: z.string().optional(),
  status: orderStatusSchema,
  total: z.number(),
  submitted_at: z.string().optional(),
  shipped_at: z.string().optional(),
  delivered_at: z.string().optional(),
  created_at: z.string().optional(),
  items: z.array(orderItemSchema).optional(),
  order_items: z.array(orderItemSchema).optional(),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  base_price: z.number(),
  price: z.number().optional(),
  category: z.string(),
  description: z.string().optional(),
  in_stock: z.boolean(),
  image_url: z.string().optional(),
});

export const actionResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const pricingRecommendationSchema = z.object({
  productId: z.string(),
  suggestedPrice: z.number(),
  winProbability: z.number(),
  reasoning: z.string(),
});
