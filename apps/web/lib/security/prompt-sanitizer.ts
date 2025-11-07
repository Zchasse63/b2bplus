/**
 * Security utility for sanitizing user inputs before using in AI prompts
 * Prevents prompt injection attacks
 */

/**
 * Sanitizes a string for safe use in AI prompts
 * - Removes newlines (prevents multi-line injection)
 * - Removes code block markers
 * - Removes potential command injection patterns
 * - Limits length to prevent token bombing
 *
 * @param input - User-provided string to sanitize
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized string safe for AI prompts
 */
export function sanitizeForPrompt(input: string | null | undefined, maxLength: number = 200): string {
  if (!input) return '';

  return String(input)
    // Remove newlines and carriage returns
    .replace(/[\n\r]/g, ' ')
    // Remove code block markers
    .replace(/```/g, '')
    .replace(/`/g, '')
    // Remove potential command injection patterns
    .replace(/system:|user:|assistant:|human:|ai:/gi, '')
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .replace(/\{.*?system.*?\}/gi, '') // Remove JSON with "system" key
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Limit length
    .substring(0, maxLength);
}

/**
 * Sanitizes an object's string fields for AI prompts
 * @param obj - Object with string fields to sanitize
 * @param fields - Array of field names to sanitize
 * @param maxLength - Maximum length per field
 * @returns Object with sanitized fields
 */
export function sanitizeObjectForPrompt<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  maxLength: number = 200
): T {
  const sanitized = { ...obj };

  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeForPrompt(sanitized[field] as string, maxLength) as any;
    }
  }

  return sanitized;
}

/**
 * Sanitizes array of strings for AI prompts
 * @param arr - Array of strings to sanitize
 * @param maxLength - Maximum length per item
 * @param maxItems - Maximum number of items to include
 * @returns Sanitized array
 */
export function sanitizeArrayForPrompt(
  arr: (string | null | undefined)[],
  maxLength: number = 200,
  maxItems: number = 50
): string[] {
  return arr
    .slice(0, maxItems)
    .map(item => sanitizeForPrompt(item, maxLength))
    .filter(item => item.length > 0);
}

/**
 * Validates that a prompt doesn't contain suspicious patterns
 * Use this as an additional check before sending to AI
 * @param prompt - Complete prompt to validate
 * @returns true if safe, false if suspicious
 */
export function validatePromptSafety(prompt: string): { safe: boolean; reason?: string } {
  // Check for extremely long prompts (potential token bombing)
  if (prompt.length > 50000) {
    return { safe: false, reason: 'Prompt exceeds maximum length' };
  }

  // Check for excessive repetition (potential attack)
  const words = prompt.split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 100 && uniqueWords.size / words.length < 0.1) {
    return { safe: false, reason: 'Excessive repetition detected' };
  }

  // Check for base64 encoded content (potential obfuscation)
  const base64Pattern = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/;
  if (base64Pattern.test(prompt)) {
    return { safe: false, reason: 'Potentially obfuscated content detected' };
  }

  return { safe: true };
}
