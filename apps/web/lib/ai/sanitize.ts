/**
 * AI Response Sanitization
 * Phase 1, Task 2.4: AI Response Sanitization
 * 
 * Prevents AI from accidentally leaking sensitive customer data across organizations.
 * Removes or redacts PII and organization-specific information from AI responses.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Patterns for detecting sensitive information
 */
const PATTERNS = {
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  PHONE: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // SSN (Social Security Number)
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // UUID patterns (for customer/organization IDs)
  UUID: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  
  // IP addresses
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Street addresses (basic pattern)
  STREET_ADDRESS: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
};

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  allowedOrganizationIds?: string[];
  allowedCustomerIds?: string[];
  allowedEmails?: string[];
  redactEmails?: boolean;
  redactPhones?: boolean;
  redactAddresses?: boolean;
  redactUUIDs?: boolean;
  logViolations?: boolean;
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  sanitized: string;
  violations: string[];
  redactedCount: number;
}

/**
 * Sanitize AI response to prevent data leakage
 * 
 * @param response - AI-generated response text
 * @param options - Sanitization options
 * @returns Sanitized response with violations logged
 */
export function sanitizeAIResponse(
  response: string | object,
  options: SanitizationOptions = {}
): SanitizationResult {
  const {
    allowedOrganizationIds = [],
    allowedCustomerIds = [],
    allowedEmails = [],
    redactEmails = true,
    redactPhones = true,
    redactAddresses = true,
    redactUUIDs = true,
    logViolations = true,
  } = options;
  
  // Handle object responses (JSON)
  if (typeof response === 'object') {
    const stringified = JSON.stringify(response, null, 2);
    const result = sanitizeText(stringified, options);
    
    try {
      // Try to parse back to object
      result.sanitized = JSON.parse(result.sanitized);
    } catch {
      // If parsing fails, return as string
    }
    
    return result;
  }
  
  return sanitizeText(response, options);
}

/**
 * Sanitize text content
 */
function sanitizeText(
  text: string,
  options: SanitizationOptions
): SanitizationResult {
  let sanitized = text;
  const violations: string[] = [];
  let redactedCount = 0;
  
  // Redact emails (except allowed ones)
  if (options.redactEmails) {
    const emails = text.match(PATTERNS.EMAIL) || [];
    emails.forEach(email => {
      if (!options.allowedEmails?.includes(email.toLowerCase())) {
        const domain = email.split('@')[1];
        sanitized = sanitized.replace(
          new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `[REDACTED_EMAIL@${domain}]`
        );
        violations.push(`Email redacted: ${email}`);
        redactedCount++;
      }
    });
  }
  
  // Redact phone numbers
  if (options.redactPhones) {
    const phones = text.match(PATTERNS.PHONE) || [];
    phones.forEach(phone => {
      sanitized = sanitized.replace(
        new RegExp(phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        '[REDACTED_PHONE]'
      );
      violations.push(`Phone redacted: ${phone}`);
      redactedCount++;
    });
  }
  
  // Redact credit card numbers
  const creditCards = text.match(PATTERNS.CREDIT_CARD) || [];
  creditCards.forEach(cc => {
    sanitized = sanitized.replace(
      new RegExp(cc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      '[REDACTED_CC]'
    );
    violations.push(`Credit card redacted: ${cc}`);
    redactedCount++;
  });
  
  // Redact SSN
  const ssns = text.match(PATTERNS.SSN) || [];
  ssns.forEach(ssn => {
    sanitized = sanitized.replace(
      new RegExp(ssn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      '[REDACTED_SSN]'
    );
    violations.push(`SSN redacted: ${ssn}`);
    redactedCount++;
  });
  
  // Redact UUIDs (except allowed customer/organization IDs)
  if (options.redactUUIDs) {
    const uuids = text.match(PATTERNS.UUID) || [];
    uuids.forEach(uuid => {
      const isAllowed = 
        options.allowedOrganizationIds?.includes(uuid) ||
        options.allowedCustomerIds?.includes(uuid);
      
      if (!isAllowed) {
        sanitized = sanitized.replace(
          new RegExp(uuid, 'gi'),
          '[REDACTED_ID]'
        );
        violations.push(`UUID redacted: ${uuid}`);
        redactedCount++;
      }
    });
  }
  
  // Redact IP addresses
  const ips = text.match(PATTERNS.IP_ADDRESS) || [];
  ips.forEach(ip => {
    // Skip common non-sensitive IPs like 0.0.0.0, 127.0.0.1
    if (!['0.0.0.0', '127.0.0.1', '255.255.255.255'].includes(ip)) {
      sanitized = sanitized.replace(
        new RegExp(ip.replace(/\./g, '\\.'), 'g'),
        '[REDACTED_IP]'
      );
      violations.push(`IP address redacted: ${ip}`);
      redactedCount++;
    }
  });
  
  // Redact street addresses
  if (options.redactAddresses) {
    const addresses = text.match(PATTERNS.STREET_ADDRESS) || [];
    addresses.forEach(address => {
      sanitized = sanitized.replace(
        new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        '[REDACTED_ADDRESS]'
      );
      violations.push(`Address redacted: ${address}`);
      redactedCount++;
    });
  }
  
  // Log violations if enabled
  if (options.logViolations && violations.length > 0) {
    console.warn('AI Response Sanitization Violations:', {
      count: violations.length,
      violations: violations.slice(0, 10), // Log first 10
    });
  }
  
  return {
    sanitized,
    violations,
    redactedCount,
  };
}

/**
 * Sanitize AI response for a specific customer context
 * Automatically allows customer's organization data
 * 
 * @param response - AI-generated response
 * @param userId - User ID for context
 * @returns Sanitized response
 */
export async function sanitizeForCustomer(
  response: string | object,
  userId: string
): Promise<SanitizationResult> {
  const supabase = await createClient();
  
  // Get user's organization
  const { data: member } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      organization:organizations!inner(
        id,
        name,
        email
      )
    `)
    .eq('user_id', userId)
    .single();
  
  if (!member) {
    // If no organization found, use strict sanitization
    return sanitizeAIResponse(response, {
      redactEmails: true,
      redactPhones: true,
      redactAddresses: true,
      redactUUIDs: true,
      logViolations: true,
    });
  }
  
  const org = member.organization as any;
  
  // Allow organization's own data
  return sanitizeAIResponse(response, {
    allowedOrganizationIds: [member.organization_id],
    allowedEmails: org.email ? [org.email.toLowerCase()] : [],
    redactEmails: true,
    redactPhones: true,
    redactAddresses: true,
    redactUUIDs: true,
    logViolations: true,
  });
}

/**
 * Check if response contains potential data leakage
 * Returns true if suspicious patterns detected
 * 
 * @param response - AI-generated response
 * @returns true if potential leakage detected
 */
export function detectPotentialLeakage(response: string): boolean {
  const text = typeof response === 'object' ? JSON.stringify(response) : response;
  
  // Check for multiple sensitive patterns
  const hasEmails = (text.match(PATTERNS.EMAIL) || []).length > 3;
  const hasPhones = (text.match(PATTERNS.PHONE) || []).length > 2;
  const hasUUIDs = (text.match(PATTERNS.UUID) || []).length > 5;
  const hasCreditCards = (text.match(PATTERNS.CREDIT_CARD) || []).length > 0;
  const hasSSNs = (text.match(PATTERNS.SSN) || []).length > 0;
  
  return hasEmails || hasPhones || hasUUIDs || hasCreditCards || hasSSNs;
}

/**
 * Sanitize object by removing sensitive fields
 * Useful for sanitizing database records before sending to AI
 * 
 * @param obj - Object to sanitize
 * @param sensitiveFields - Fields to remove
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'api_key', 'secret', 'token', 'ssn', 'credit_card']
): Partial<T> {
  const sanitized = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  
  return sanitized;
}

