/**
 * Zod Schemas for Document Processing AI Outputs
 *
 * These schemas ensure type-safe structured outputs from AI for document parsing.
 */

import { z } from 'zod';

// Invoice Line Item Schema
export const invoiceLineItemSchema = z.object({
  lineNumber: z.number().optional(),
  itemNumber: z.string().describe('Product SKU or item code'),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  extendedPrice: z.number().optional(),
  unit: z.string().optional().describe('e.g., EA, CS, PK'),
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

// Parsed Invoice Schema
export const parsedInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string().describe('ISO date'),
  dueDate: z.string().optional(),
  customerInfo: z.object({
    name: z.string().optional(),
    accountNumber: z.string().optional(),
    address: z.string().optional(),
  }),
  vendorInfo: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }),
  lineItems: z.array(invoiceLineItemSchema),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  shipping: z.number().optional(),
  total: z.number(),
  paymentTerms: z.string().optional(),
  poNumber: z.string().optional(),
});

export type ParsedInvoice = z.infer<typeof parsedInvoiceSchema>;

// Purchase Order Line Item Schema
export const poLineItemSchema = z.object({
  lineNumber: z.number().optional(),
  itemNumber: z.string().describe('Product SKU'),
  description: z.string().optional(),
  quantity: z.number().positive(),
  requestedDeliveryDate: z.string().optional(),
  unitPrice: z.number().optional(),
  notes: z.string().optional(),
});

export type POLineItem = z.infer<typeof poLineItemSchema>;

// Parsed Purchase Order Schema
export const parsedPurchaseOrderSchema = z.object({
  poNumber: z.string(),
  poDate: z.string(),
  shipToAddress: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }),
  lineItems: z.array(poLineItemSchema),
  specialInstructions: z.string().optional(),
  requestedDeliveryDate: z.string().optional(),
});

export type ParsedPurchaseOrder = z.infer<typeof parsedPurchaseOrderSchema>;

// Price List Item with Regional Pricing Schema
export const priceListItemSchema = z.object({
  itemNumber: z.string().describe('Product SKU'),
  description: z.string(),
  packSize: z.string().optional().describe('e.g., 12/1LB, 24/16OZ'),
  unit: z.string().optional(),
  categoryPath: z.string().optional(),
  pricing: z.record(z.string(), z.number()).describe('Region/tier to price mapping'),
  specs: z.record(z.string(), z.string()).optional().describe('Additional specifications'),
});

export type PriceListItem = z.infer<typeof priceListItemSchema>;

// Parsed Price List Schema
export const parsedPriceListSchema = z.object({
  listName: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  pricingRegions: z.array(z.string()).describe('Column headers for regional pricing'),
  items: z.array(priceListItemSchema),
});

export type ParsedPriceList = z.infer<typeof parsedPriceListSchema>;

// Document Analysis Result Schema (from AI structure detection)
export const documentAnalysisSchema = z.object({
  documentType: z.enum(['invoice', 'purchase_order', 'price_list', 'product_catalog', 'unknown']),
  confidence: z.number().min(0).max(100),
  detectedColumns: z.array(z.object({
    originalHeader: z.string(),
    mappedTo: z.string().describe('Standard field name'),
    confidence: z.number(),
    sampleValues: z.array(z.string()),
  })),
  warnings: z.array(z.object({
    type: z.enum(['missing_column', 'ambiguous_mapping', 'invalid_data', 'unknown_sku', 'price_mismatch']),
    message: z.string(),
    rowNumbers: z.array(z.number()).optional(),
    suggestion: z.string().optional(),
  })),
  summary: z.object({
    totalRows: z.number(),
    validRows: z.number(),
    errorRows: z.number(),
    warningRows: z.number(),
  }),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

// SKU Correction Suggestion Schema
export const skuCorrectionSchema = z.object({
  originalSku: z.string(),
  suggestedSku: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export type SkuCorrection = z.infer<typeof skuCorrectionSchema>;

// Validation Result Schema
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    type: z.string(),
    severity: z.enum(['error', 'warning']),
    message: z.string(),
    lineNumber: z.number().optional(),
    suggestion: z.string().optional(),
  })),
  summary: z.object({
    totalIssues: z.number(),
    errors: z.number(),
    warnings: z.number(),
  }),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// Product Catalog Item Schema
export const productCatalogItemSchema = z.object({
  itemNumber: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  basePrice: z.number().optional(),
  specs: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export type ProductCatalogItem = z.infer<typeof productCatalogItemSchema>;
