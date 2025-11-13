/**
 * API Constants - Named constants for magic numbers used throughout the API
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  PUBLIC_ENDPOINTS_PER_HOUR: 100,
  AUTHENTICATED_ENDPOINTS_PER_HOUR: 1000,
  ADMIN_ENDPOINTS_PER_HOUR: 5000,
  SENSITIVE_OPERATIONS_PER_HOUR: 10,
  AI_ENDPOINTS_PER_DAY: 100
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1
} as const;

// Invoice Constants
export const INVOICE = {
  FREE_SHIPPING_THRESHOLD: 500,
  STANDARD_SHIPPING_COST: 50,
  PAYMENT_TERMS_DAYS: 30,
  INVOICE_NUMBER_PREFIX: 'INV'
} as const;

// Order Constants
export const ORDER = {
  MIN_ORDER_AMOUNT: 10,
  MAX_ORDER_AMOUNT: 1000000,
  PROCESSING_TIME_HOURS: 24,
  DELIVERY_TIME_DAYS: 7
} as const;

// Product Constants
export const PRODUCT = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 999999,
  SIMILAR_PRODUCTS_COUNT: 5
} as const;

// Customer Constants
export const CUSTOMER = {
  MIN_CREDIT_LIMIT: 0,
  MAX_CREDIT_LIMIT: 1000000,
  DEFAULT_CREDIT_LIMIT: 10000,
  CHURN_RISK_THRESHOLD: 0.7,
  INACTIVE_DAYS: 90
} as const;

// AI Constants
export const AI = {
  MAX_TOKENS_PER_REQUEST: 2000,
  MAX_TOKENS_PER_DAY: 100000,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  TIMEOUT_MS: 30000
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  ALLOWED_EXTENSIONS: ['pdf', 'csv', 'xlsx', 'xls', 'json'],
  CHUNK_SIZE_BYTES: 1024 * 1024 // 1MB chunks
} as const;

// Cache Constants
export const CACHE = {
  DEFAULT_TTL_SECONDS: 3600, // 1 hour
  SHORT_TTL_SECONDS: 300, // 5 minutes
  LONG_TTL_SECONDS: 86400, // 24 hours
  PRODUCT_CACHE_TTL: 3600,
  PRICING_CACHE_TTL: 1800,
  CUSTOMER_CACHE_TTL: 600
} as const;

// Timeout Constants
export const TIMEOUTS = {
  API_REQUEST_MS: 30000,
  DATABASE_QUERY_MS: 10000,
  EXTERNAL_SERVICE_MS: 15000,
  WEBHOOK_MS: 5000
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 12,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 255,
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 255,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 20
} as const;

// Error Codes
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  FETCHED: 'Resource fetched successfully'
} as const;

