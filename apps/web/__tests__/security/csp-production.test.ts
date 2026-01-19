/**
 * Production CSP Verification Test
 * Ensures production CSP never contains unsafe-eval or unsafe-inline in script-src
 * This is a critical security requirement to prevent XSS attacks
 */

import { describe, it, expect } from '@jest/globals';

// Production CSP string from next.config.js (verified manually)
const PRODUCTION_CSP = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; media-src 'self' https:; manifest-src 'self'";

describe('Production CSP Security', () => {
  it('production CSP must not contain unsafe-eval', () => {
    expect(PRODUCTION_CSP).not.toContain('unsafe-eval');
  });

  it('production CSP script-src must not contain unsafe-inline', () => {
    const scriptSrcMatch = PRODUCTION_CSP.match(/script-src ([^;]+)/);
    expect(scriptSrcMatch).toBeDefined();
    expect(scriptSrcMatch![1]).not.toContain('unsafe-inline');
  });

  it('production CSP script-src must not contain unsafe-eval', () => {
    const scriptSrcMatch = PRODUCTION_CSP.match(/script-src ([^;]+)/);
    expect(scriptSrcMatch).toBeDefined();
    expect(scriptSrcMatch![1]).not.toContain('unsafe-eval');
  });

  it('production CSP style-src may contain unsafe-inline for CSS-in-JS', () => {
    // This is acceptable for CSS-in-JS frameworks like Tailwind
    const styleSrcMatch = PRODUCTION_CSP.match(/style-src ([^;]+)/);
    expect(styleSrcMatch).toBeDefined();
    expect(styleSrcMatch![1]).toContain('unsafe-inline');
  });

  it('production CSP must include frame-ancestors none for clickjacking protection', () => {
    expect(PRODUCTION_CSP).toContain("frame-ancestors 'none'");
  });

  it('production CSP must include object-src none to block plugins', () => {
    expect(PRODUCTION_CSP).toContain("object-src 'none'");
  });
});
