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
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)').optional(),
  purpose: z.enum(['login', 'signup', 'password_reset', 'offer_access']).default('login'),
  redirectUrl: z.string().url().optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
);

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

const passwordValidation = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain lowercase letters')
  .regex(/[A-Z]/, 'Password must contain uppercase letters')
  .regex(/[0-9]/, 'Password must contain numbers')
  .regex(/[!@#$%^&*]/, 'Password must contain special characters');

export const SignupValidationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export type SignupValidation = z.infer<typeof SignupValidationSchema>;

export const PasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  newPassword: passwordValidation,
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
// CHATBOT & AI SCHEMAS
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

export const AICompanionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
  userId: z.string().uuid().optional(),
  context: z.object({
    productId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
  }).optional(),
});

export type AICompanion = z.infer<typeof AICompanionSchema>;

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
// LEAD SCHEMAS
// ============================================================================

export const LeadCreateSchema = z.object({
  company_name: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  website: z.string().url().optional(),
  contact_name: z.string().max(255).optional(),
  contact_title: z.string().max(100).optional(),
  email: z.string().email('Invalid email format'),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().min(1).max(2),
  zip_code: z.string().max(10).optional(),
  country: z.string().max(2).default('US'),
  source: z.string().max(50).default('website'),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export type LeadCreate = z.infer<typeof LeadCreateSchema>;

// ============================================================================
// ADMIN AI OPERATION SCHEMAS
// ============================================================================

export const OptimizePricingSchema = z.object({
  productId: z.string().uuid('Invalid product ID').optional(),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  targetMargin: z.number().min(0).max(100).optional(),
});

export type OptimizePricing = z.infer<typeof OptimizePricingSchema>;

export const DetectOpportunitiesSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  minValue: z.number().positive().optional(),
  includeHistorical: z.boolean().default(true),
});

export type DetectOpportunities = z.infer<typeof DetectOpportunitiesSchema>;

export const CustomerAnalyticsSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.enum(['clv', 'churn_risk', 'engagement', 'sentiment'])).optional(),
});

export type CustomerAnalytics = z.infer<typeof CustomerAnalyticsSchema>;

export const ChurnRiskSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  includeRecommendations: z.boolean().default(true),
});

export type ChurnRisk = z.infer<typeof ChurnRiskSchema>;

export const PredictCLVSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  timeHorizon: z.number().int().positive().max(60).default(12), // months
});

export type PredictCLV = z.infer<typeof PredictCLVSchema>;

export const InventoryForecastSchema = z.object({
  productId: z.string().uuid('Invalid product ID').optional(),
  horizon: z.number().int().positive().max(365).default(30), // days
  includeSeasonality: z.boolean().default(true),
});

export type InventoryForecast = z.infer<typeof InventoryForecastSchema>;

export const AIExcelImportSchema = z.object({
  fileUrl: z.string().url('Invalid file URL'),
  importType: z.enum(['products', 'customers', 'orders', 'inventory']),
  validateOnly: z.boolean().default(false),
});

export type AIExcelImport = z.infer<typeof AIExcelImportSchema>;

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationRegisterSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
  platform: z.enum(['ios', 'android', 'web']),
});

export type NotificationRegister = z.infer<typeof NotificationRegisterSchema>;

export const NotificationSendSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
});

export type NotificationSend = z.infer<typeof NotificationSendSchema>;

// ============================================================================
// SAMPLE REQUEST SCHEMAS
// ============================================================================

export const SampleRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive().max(10).default(1),
  notes: z.string().max(500).optional(),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().default('US'),
  }).optional(),
});

export type SampleRequest = z.infer<typeof SampleRequestSchema>;

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const DocumentAnalyzeSchema = z.object({
  documentUrl: z.string().url('Invalid document URL'),
  analysisType: z.enum(['invoice', 'order', 'general']).default('general'),
});

export type DocumentAnalyze = z.infer<typeof DocumentAnalyzeSchema>;

export const DocumentImportSchema = z.object({
  documentUrl: z.string().url('Invalid document URL'),
  importType: z.enum(['invoice', 'order', 'product', 'customer']),
  validateOnly: z.boolean().default(false),
});

export type DocumentImport = z.infer<typeof DocumentImportSchema>;

// ============================================================================
// ADMIN CAMPAIGN SCHEMAS
// ============================================================================

export const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  templateId: z.string().uuid().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  targetAudience: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CampaignCreate = z.infer<typeof CampaignCreateSchema>;

export const CampaignUpdateSchema = z.object({
  id: z.string().uuid('Invalid campaign ID'),
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(255).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  targetAudience: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']).optional(),
});

export type CampaignUpdate = z.infer<typeof CampaignUpdateSchema>;

// ============================================================================
// ADMIN ORGANIZATION SCHEMAS
// ============================================================================

export const OrganizationApproveSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type OrganizationApprove = z.infer<typeof OrganizationApproveSchema>;

// ============================================================================
// ADMIN CRM SCHEMAS
// ============================================================================

export const CRMContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(255).optional(),
  title: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export type CRMContact = z.infer<typeof CRMContactSchema>;

export const CRMTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  assignedTo: z.string().uuid().optional(),
  relatedTo: z.object({
    type: z.enum(['contact', 'lead', 'customer', 'opportunity']),
    id: z.string().uuid(),
  }).optional(),
});

export type CRMTask = z.infer<typeof CRMTaskSchema>;

export const CRMActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  subject: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  relatedTo: z.object({
    type: z.enum(['contact', 'lead', 'customer', 'opportunity']),
    id: z.string().uuid(),
  }),
  scheduledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export type CRMActivity = z.infer<typeof CRMActivitySchema>;

// ============================================================================
// ADMIN REBATE SCHEMAS
// ============================================================================

export const RebateCalculateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export type RebateCalculate = z.infer<typeof RebateCalculateSchema>;

export const RebateApproveSchema = z.object({
  rebateId: z.string().uuid('Invalid rebate ID'),
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type RebateApprove = z.infer<typeof RebateApproveSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const InvoiceGenerateSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  includeDetails: z.boolean().default(true),
});

export type InvoiceGenerate = z.infer<typeof InvoiceGenerateSchema>;

// ============================================================================
// AUTH SCHEMAS (Additional)
// ============================================================================

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  type: z.enum(['login', 'signup', 'password_reset', 'offer_access']).optional(),
});

export type MagicLinkVerify = z.infer<typeof MagicLinkVerifySchema>;

export const MagicLinkResendSchema = z.object({
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['login', 'signup', 'password_reset', 'offer_access']).default('login'),
});

export type MagicLinkResend = z.infer<typeof MagicLinkResendSchema>;

// ============================================================================
// UUID PARAM SCHEMA (for routes with ID params)
// ============================================================================

export const UUIDParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

export type UUIDParam = z.infer<typeof UUIDParamSchema>;

// ============================================================================
// PAGINATION SCHEMA (for list endpoints)
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

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

