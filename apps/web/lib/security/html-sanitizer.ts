/**
 * HTML Sanitization for Email Content
 *
 * Sanitizes HTML content to prevent XSS attacks while allowing safe formatting
 * Used for AI-generated email content and user-provided HTML
 */

/**
 * Sanitize HTML content for email use
 * Removes potentially dangerous tags and attributes while preserving safe formatting
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML safe for email
 */
export function sanitizeEmailHTML(html: string | null | undefined): string {
  if (!html) return '';

  let sanitized = String(html);

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs (can contain base64-encoded scripts)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove <object>, <embed>, <applet>, <iframe> tags
  sanitized = sanitized.replace(/<(object|embed|applet|iframe)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // Remove <link> tags (can load external malicious CSS)
  sanitized = sanitized.replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '');

  // Remove <base> tags (can change relative URL resolution)
  sanitized = sanitized.replace(/<base\b[^<]*(?:(?!<\/base>)<[^<]*)*<\/base>/gi, '');

  // Remove <meta> tags (except safe ones)
  sanitized = sanitized.replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');

  // Remove <style> tags with potentially malicious CSS
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove form elements
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  sanitized = sanitized.replace(/<input\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '');
  sanitized = sanitized.replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '');
  sanitized = sanitized.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');

  // Sanitize href attributes to only allow safe protocols
  sanitized = sanitized.replace(/href\s*=\s*["']([^"']*)["']/gi, (match, url) => {
    const trimmedUrl = url.trim().toLowerCase();
    // Allow only http, https, and mailto
    if (trimmedUrl.startsWith('http://') ||
        trimmedUrl.startsWith('https://') ||
        trimmedUrl.startsWith('mailto:') ||
        trimmedUrl.startsWith('/')) {
      return match;
    }
    return 'href="#"';
  });

  // Sanitize src attributes (for images) to only allow safe protocols
  sanitized = sanitized.replace(/src\s*=\s*["']([^"']*)["']/gi, (match, url) => {
    const trimmedUrl = url.trim().toLowerCase();
    // Allow only http and https for images
    if (trimmedUrl.startsWith('http://') ||
        trimmedUrl.startsWith('https://') ||
        trimmedUrl.startsWith('/')) {
      return match;
    }
    return 'src=""';
  });

  // Remove any remaining style attributes with potential XSS
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*\)["']/gi, '');
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*javascript\s*:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*behavior\s*:[^"']*["']/gi, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Sanitize plain text for display (converts to HTML entities)
 * Use this when you want to display user input as plain text
 *
 * @param text - Plain text to sanitize
 * @returns HTML-safe text with entities escaped
 */
export function escapeHTML(text: string | null | undefined): string {
  if (!text) return '';

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that HTML contains only safe tags
 * Returns true if HTML is considered safe for emails
 *
 * @param html - HTML to validate
 * @returns true if safe, false if dangerous tags detected
 */
export function isEmailHTMLSafe(html: string): boolean {
  const dangerous = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<applet/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /data:text\/html/i,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(html)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize campaign HTML content before saving to database
 * More restrictive than email sanitization
 *
 * @param html - HTML content to sanitize
 * @param maxLength - Maximum length allowed
 * @returns Sanitized HTML
 */
export function sanitizeCampaignHTML(html: string, maxLength: number = 50000): string {
  if (!html) return '';

  // First apply email sanitization
  let sanitized = sanitizeEmailHTML(html);

  // Limit length to prevent storage issues and potential DoS
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Try to close any open tags
    const openTags = sanitized.match(/<(\w+)[^>]*>/g) || [];
    const closeTags = sanitized.match(/<\/(\w+)>/g) || [];

    if (openTags.length > closeTags.length) {
      // Add warning comment
      sanitized += '\n<!-- Content truncated -->';
    }
  }

  return sanitized;
}
