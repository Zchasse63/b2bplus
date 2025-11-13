import { z } from 'zod';

/**
 * Validation schemas for API routes
 * Centralized Zod schemas for input validation across the application
 */

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const MagicLinkRequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  purpose: z.enum(['login', 'signup', 'password_reset', 'offer_access']).default('login'),
  redirectUrl: z.string().url().optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
);

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const PasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  newPassword: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must contain lowercase letters')
    .regex(/[A-Z]/, 'Password must contain uppercase letters')
    .regex(/[0-9]/, 'Password must contain numbers')
    .regex(/[!@#$%^&*]/, 'Password must contain special characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export type PasswordReset = z.infer<typeof PasswordResetSchema>;

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const OrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').optional(),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  shipping_address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1),
  }),
  billing_address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
  notes: z.string().max(500).optional(),
  po_number: z.string().optional(),
});

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().optional(),
});

export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

export const ReorderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

export type Reorder = z.infer<typeof ReorderSchema>;

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const PaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  orderId: z.string().uuid('Invalid order ID'),
  paymentMethod: z.enum(['credit_card', 'bank_transfer', 'check']),
  description: z.string().optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================================
// CART SCHEMAS
// ============================================================================

export const AddToCartSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export type AddToCart = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
});

export type UpdateCartItem = z.infer<typeof UpdateCartItemSchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  recipientType: z.enum(['all_customers', 'segment', 'specific_users']),
  segmentId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  scheduledFor: z.string().datetime().optional(),
  campaignType: z.enum(['promotional', 'educational', 'transactional']).default('promotional'),
});

export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;

export const SendCampaignSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  sendNow: z.boolean().default(true),
  scheduledFor: z.string().datetime().optional(),
});

export type SendCampaign = z.infer<typeof SendCampaignSchema>;

// ============================================================================
// PRICING SCHEMAS
// ============================================================================

export const PricingTierSchema = z.object({
  name: z.string().min(1).max(255),
  minQuantity: z.number().int().nonnegative(),
  maxQuantity: z.number().int().positive().optional(),
  discountPercent: z.number().min(0).max(100),
  description: z.string().optional(),
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

export const AssignPricingTierSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  tierId: z.string().uuid('Invalid tier ID'),
});

export type AssignPricingTier = z.infer<typeof AssignPricingTierSchema>;

// ============================================================================
// CHATBOT SCHEMAS
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(5000),
  timestamp: z.string().datetime(),
});

export const ChatbotMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().uuid().optional(),
  context: z.record(z.any()).optional(),
});

export type ChatbotMessage = z.infer<typeof ChatbotMessageSchema>;

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const SemanticSearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().default(0),
  filters: z.record(z.any()).optional(),
});

export type SemanticSearch = z.infer<typeof SemanticSearchSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const ReconcileInvoiceSchema = z.object({
  invoiceText: z.string().min(1),
  invoiceFileUrl: z.string().url().optional(),
});

export type ReconcileInvoice = z.infer<typeof ReconcileInvoiceSchema>;

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Validation failed' } };
  }
}

