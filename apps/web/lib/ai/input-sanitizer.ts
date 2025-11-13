/**
 * AI Input Sanitization
 * Prevents prompt injection attacks by sanitizing user inputs before sending to AI APIs
 */

/**
 * Patterns that indicate prompt injection attempts
 */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all)\s+(instructions|prompts|messages)/gi,
  /forget\s+(all|everything|previous)/gi,
  /system\s+prompt/gi,
  /new\s+instructions?/gi,
  /override\s+(instructions|rules|guidelines)/gi,
  /disregard\s+(instructions|rules)/gi,
  /you\s+are\s+now/gi,
  /pretend\s+you\s+are/gi,
  /roleplay\s+as/gi,
  /act\s+as\s+(if|though|a)/gi,
  /treat\s+this\s+as/gi,
  /respond\s+as\s+(if|though)/gi,
  /for\s+the\s+purposes?\s+of/gi,
  /assuming\s+you/gi,
  /imagine\s+you/gi,
  /simulate\s+being/gi,
  /execute\s+code/gi,
  /run\s+command/gi,
  /system\s+command/gi,
  /execute\s+sql/gi,
  /delete\s+database/gi,
  /drop\s+table/gi,
  /admin\s+password/gi,
  /api\s+key/gi,
  /secret\s+key/gi,
  /reveal\s+(secrets?|passwords?|keys?)/gi,
  /tell\s+me\s+(about|the)/gi,
  /show\s+me\s+the/gi,
  /['"`;\\]/g, // Common injection characters
];

/**
 * Suspicious phrase patterns
 */
const SUSPICIOUS_PATTERNS = [
  /\$\{.*\}/g, // Template injection
  /{{.*}}/g, // Template syntax
  /<%.*%>/g, // Template syntax
  /<script/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers
  /eval\s*\(/gi, // eval function
  /exec\s*\(/gi, // exec function
];

/**
 * Sanitize user input for AI processing
 * Removes or flags potentially malicious content
 */
export function sanitizeAIInput(input: string, options: SanitizationOptions = {}): SanitizationResult {
  const {
    maxLength = 5000,
    stripHtml = true,
    removeUrls = false,
    allowedSpecialChars = '',
    checkSuspicious = true,
  } = options;

  const result: SanitizationResult = {
    isClean: true,
    sanitized: input,
    warnings: [],
    threats: [],
  };

  if (!input || typeof input !== 'string') {
    result.isClean = false;
    result.threats.push('Invalid input: must be a non-empty string');
    return result;
  }

  // Check input length
  if (input.length > maxLength) {
    result.warnings.push(`Input exceeds maximum length of ${maxLength} characters`);
    result.sanitized = input.substring(0, maxLength);
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      result.isClean = false;
      result.threats.push(`Detected potential prompt injection: ${pattern.source}`);
    }
  }

  // Check for suspicious patterns if enabled
  if (checkSuspicious) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        result.isClean = false;
        result.threats.push(`Detected suspicious pattern: ${pattern.source}`);
      }
    }
  }

  // Strip HTML tags if enabled
  if (stripHtml) {
    result.sanitized = stripHtmlTags(result.sanitized);
  }

  // Remove URLs if enabled
  if (removeUrls) {
    result.sanitized = removeUrlsFromText(result.sanitized);
  }

  // Remove control characters
  result.sanitized = removeControlCharacters(result.sanitized);

  // Normalize whitespace
  result.sanitized = normalizeWhitespace(result.sanitized);

  return result;
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Remove URLs from text
 */
function removeUrlsFromText(text: string): string {
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  return text.replace(urlPattern, '');
}

/**
 * Remove control characters
 */
function removeControlCharacters(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\x80-\x9F]/g, ''); // Remove extended ASCII control characters
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Escape special characters for safe display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate input against a whitelist of allowed characters
 */
export function validateAgainstWhitelist(
  input: string,
  whitelist: string
): boolean {
  const pattern = new RegExp(`^[${whitelist}]*$`);
  return pattern.test(input);
}

/**
 * Rate limit check for AI requests
 */
export interface RateLimitState {
  requestCount: number;
  lastReset: number;
  isRateLimited: boolean;
}

const rateLimitStates = new Map<string, RateLimitState>();

export function checkAIRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let state = rateLimitStates.get(identifier);

  if (!state || now > state.lastReset + windowMs) {
    // Reset window
    state = {
      requestCount: 0,
      lastReset: now,
      isRateLimited: false,
    };
    rateLimitStates.set(identifier, state);
  }

  state.requestCount++;

  const allowed = state.requestCount <= maxRequests;
  const resetAt = state.lastReset + windowMs;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - state.requestCount),
    resetAt,
  };
}

/**
 * Configuration for input sanitization
 */
export interface SanitizationOptions {
  maxLength?: number;
  stripHtml?: boolean;
  removeUrls?: boolean;
  allowedSpecialChars?: string;
  checkSuspicious?: boolean;
}

/**
 * Result of sanitization
 */
export interface SanitizationResult {
  isClean: boolean;
  sanitized: string;
  warnings: string[];
  threats: string[];
}

/**
 * Batch sanitize multiple inputs
 */
export function sanitizeAIInputBatch(
  inputs: string[],
  options?: SanitizationOptions
): SanitizationResult[] {
  return inputs.map((input) => sanitizeAIInput(input, options));
}

/**
 * Check if input contains any threats
 */
export function hasThreat(input: string): boolean {
  const result = sanitizeAIInput(input, { checkSuspicious: true });
  return !result.isClean || result.threats.length > 0;
}

/**
 * Get threat severity (low, medium, high)
 */
export function getThreatSeverity(
  result: SanitizationResult
): 'low' | 'medium' | 'high' | 'none' {
  if (result.threats.length === 0) {
    return 'none';
  }

  if (result.threats.length === 1) {
    return 'low';
  }

  if (result.threats.length <= 3) {
    return 'medium';
  }

  return 'high';
}
