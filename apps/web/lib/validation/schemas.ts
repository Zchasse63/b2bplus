/**
 * Form Validation Schemas with Zod
 *
 * Comprehensive validation for all forms in the application
 * Replaces weak or missing validation with strong type-safe schemas
 */

import { z } from 'zod';

// ============================================
// Common Validation Patterns
// ============================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number')
  .finite('Must be a finite number');

export const priceSchema = z
  .number()
  .nonnegative('Price cannot be negative')
  .finite('Price must be a finite number')
  .refine((val) => Number.isFinite(val) && val >= 0, {
    message: 'Invalid price format',
  });

export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be greater than 0')
  .max(999999, 'Quantity is too large');

export const skuSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(100, 'SKU must be less than 100 characters')
  .regex(/^[A-Z0-9-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores');

// ============================================
// Authentication & User Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .max(255, 'Full name must be less than 255 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters'),
  phone: phoneSchema,
  avatarUrl: urlSchema,
});

// ============================================
// Organization Schemas
// ============================================

export const organizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  type: z.enum(['distributor', 'restaurant', 'hotel', 'hospital', 'school'], {
    errorMap: () => ({ message: 'Invalid organization type' }),
  }),
  taxId: z.string().optional(),
  phone: phoneSchema,
  website: urlSchema,
});

export const organizationMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'member', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
});

// ============================================
// Product Schemas
// ============================================

export const productSchema = z.object({
  sku: skuSchema,
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must be less than 100 characters'),
  subcategory: z.string().max(100, 'Subcategory must be less than 100 characters').optional(),
  brand: z.string().max(100, 'Brand must be less than 100 characters').optional(),
  basePrice: priceSchema,
  unitOfMeasure: z.enum(['case', 'each', 'box', 'pound', 'kilogram', 'liter', 'gallon'], {
    errorMap: () => ({ message: 'Invalid unit of measure' }),
  }),
  unitsPerCase: z.number().int().positive().optional(),
  weightLbs: z.number().positive().finite().optional(),
  dimensionsInches: z
    .object({
      length: positiveNumberSchema,
      width: positiveNumberSchema,
      height: positiveNumberSchema,
    })
    .optional(),
  inStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
  imageUrl: urlSchema,
});

export const productBulkImportSchema = z.array(
  z.object({
    sku: skuSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    basePrice: priceSchema,
    unitOfMeasure: z.string().min(1),
  })
);

// ============================================
// Order Schemas
// ============================================

export const shippingAddressSchema = z.object({
  label: z
    .string()
    .min(1, 'Label is required')
    .max(100, 'Label must be less than 100 characters'),
  contactName: z
    .string()
    .min(1, 'Contact name is required')
    .max(255, 'Contact name must be less than 255 characters'),
  phone: z.string().min(1, 'Phone is required'),
  streetAddress: z
    .string()
    .min(1, 'Street address is required')
    .max(255, 'Street address must be less than 255 characters'),
  streetAddress2: z.string().max(255, 'Street address 2 must be less than 255 characters').optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  state: z
    .string()
    .min(2, 'State is required')
    .max(2, 'State must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
  postalCode: z
    .string()
    .min(1, 'Postal code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code format (e.g., 12345 or 12345-6789)'),
  country: z.string().length(2, 'Country must be 2 characters').default('US'),
  deliveryInstructions: z.string().max(1000, 'Delivery instructions must be less than 1000 characters').optional(),
  isDefault: z.boolean().default(false),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: quantitySchema,
});

export const orderCreateSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(100, 'Order cannot contain more than 100 items'),
  shippingAddressId: z.string().uuid('Invalid shipping address ID'),
  poNumber: z.string().max(100, 'PO number must be less than 100 characters').optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

export const orderUpdateSchema = z.object({
  status: z.enum(['draft', 'submitted', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
  shippingTrackingNumber: z.string().max(100).optional(),
  shippingCarrier: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

// ============================================
// Campaign Schemas
// ============================================

export const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Campaign name must be less than 255 characters'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters'),
  body: z
    .string()
    .min(1, 'Email body is required')
    .max(50000, 'Email body must be less than 50000 characters'),
  targetSegments: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// ============================================
// Lead Schemas
// ============================================

export const leadSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1, 'Full name is required').max(255),
  company: z.string().max(255).optional(),
  phone: phoneSchema,
  source: z.string().max(100).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  notes: z.string().max(5000).optional(),
});

// ============================================
// Pricing Schemas
// ============================================

export const pricingTierSchema = z.object({
  name: z
    .string()
    .min(1, 'Tier name is required')
    .max(100, 'Tier name must be less than 100 characters'),
  description: z.string().max(500).optional(),
  discountPercentage: z
    .number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
  minimumOrderValue: priceSchema.optional(),
});

export const customerProductPricingSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  productId: z.string().uuid('Invalid product ID'),
  customPrice: priceSchema,
});

export const volumeDiscountSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  minQuantity: quantitySchema,
  discountPercentage: z
    .number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
});

// ============================================
// Search & Filter Schemas
// ============================================

export const searchQuerySchema = z.object({
  query: z.string().max(500, 'Search query too long').optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  inStock: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'price', 'category', 'created_at']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// Export Types
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type PricingTierInput = z.infer<typeof pricingTierSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
