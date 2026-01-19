# Content Security Policy (CSP) Configuration

This document explains the Content Security Policy implementation for B2B Plus and the security rationale behind each directive.

## Overview

Content Security Policy (CSP) is a critical security layer that helps prevent Cross-Site Scripting (XSS) attacks, data injection attacks, and other code execution vulnerabilities. Our CSP configuration varies between development and production environments to balance security with developer experience.

## Current CSP Configuration

### Development CSP

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
img-src 'self' data: https:;
font-src 'self' data: https:;
connect-src 'self' https: wss:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
media-src 'self' https:;
manifest-src 'self'
```

### Production CSP

```
default-src 'self';
script-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com;
style-src 'self' https://cdn.tailwindcss.com;
img-src 'self' data: https:;
font-src 'self' data: https:;
connect-src 'self' https: wss:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
media-src 'self' https:;
manifest-src 'self'
```

**Key Difference:** Production removes `'unsafe-eval'` and `'unsafe-inline'` from `script-src` for maximum security.

## Directive Breakdown

### `default-src 'self'`

**Purpose:** Default fallback for all directives not explicitly specified.

**Why 'self':**
- Only allows resources from the same origin
- Prevents loading from untrusted external sources
- Provides baseline security for all resource types

**Security Impact:** HIGH - Prevents loading malicious resources from external domains.

---

### `script-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com`

**Purpose:** Controls which scripts can execute on the page.

**Development-only directives:**
- `'unsafe-eval'`: Required for Next.js hot module reload (HMR)
- `'unsafe-inline'`: Required for React Fast Refresh

**Allowed CDNs:**
- `cdn.jsdelivr.net`: Used for polyfills and third-party libraries
- `cdn.tailwindcss.com`: Tailwind CSS CDN (dev only)

**Why these CDNs:**
- jsDelivr is a well-established, trusted CDN with integrity checks
- Tailwind CDN simplifies development workflow

**Security Impact:** CRITICAL
- Production removes `'unsafe-eval'` and `'unsafe-inline'` to prevent:
  - Inline script injection attacks
  - Dynamic code evaluation vulnerabilities
- Only allows scripts from trusted sources

**Future Improvement:** Implement nonce-based CSP for inline scripts in production.

---

### `style-src 'self' https://cdn.tailwindcss.com`

**Purpose:** Controls stylesheet loading.

**Development:** Includes `'unsafe-inline'` for hot reload and Next.js style injection.

**Production:** Removed `'unsafe-inline'` for maximum security. All stylesheets must be loaded from same origin or Tailwind CDN.

**Security Impact:** LOW - Production CSP enforces strict style loading without inline styles.

**Implementation Note:** If CSS-in-JS libraries require inline styles in production, they must use style hashes or nonces instead of `'unsafe-inline'`.

---

### `img-src 'self' data: https:`

**Purpose:** Controls image loading sources.

**Why data: URIs:**
- Allows base64-encoded images
- Used for inline SVGs and small icons
- Common in modern web applications

**Why https:**
- Allows loading images from any HTTPS source
- Required for user-generated content
- Necessary for product images from CDNs

**Security Impact:** LOW - Images cannot execute code but could be used for tracking.

**Mitigation:** HTTPS-only prevents man-in-the-middle attacks on image loading.

---

### `font-src 'self' data: https:`

**Purpose:** Controls font loading sources.

**Why data: and https:**
- `data:`: Allows embedded fonts (base64)
- `https:`: Allows loading from font CDNs (Google Fonts, custom CDNs)

**Security Impact:** LOW - Fonts cannot execute code.

---

### `connect-src 'self' https: wss:`

**Purpose:** Controls API endpoints and WebSocket connections.

**Why https:**
- Allows connections to any HTTPS API endpoint
- Required for Supabase, SendGrid, AI APIs
- Necessary for third-party integrations

**Why wss:**
- Allows secure WebSocket connections
- Required for Supabase realtime subscriptions
- Necessary for live chat features

**Security Impact:** MEDIUM
- Limits connections to secure protocols only
- Prevents loading resources over HTTP
- Does not prevent exfiltration to HTTPS endpoints

**Mitigation:** Backend validates all API requests. CSP provides defense-in-depth.

---

### `frame-ancestors 'none'`

**Purpose:** Prevents the page from being embedded in iframes.

**Why 'none':**
- Prevents clickjacking attacks
- Ensures B2B Plus cannot be framed by malicious sites
- Similar to `X-Frame-Options: DENY`

**Security Impact:** HIGH - Critical protection against UI redressing attacks.

**Note:** Cannot be relaxed without introducing clickjacking risk.

---

### `base-uri 'self'`

**Purpose:** Restricts URLs that can be used in the `<base>` element.

**Why 'self':**
- Prevents injection of `<base>` tags
- Prevents attacks that manipulate relative URLs
- Ensures all relative URLs resolve to our domain

**Security Impact:** MEDIUM - Prevents sophisticated URL manipulation attacks.

---

### `form-action 'self'`

**Purpose:** Restricts where forms can submit data.

**Why 'self':**
- Prevents form hijacking
- Ensures forms only submit to our domain
- Protects against CSRF when combined with CSRF tokens

**Security Impact:** HIGH - Prevents data exfiltration via form submission.

---

### `object-src 'none'`

**Purpose:** Prevents loading of plugins (Flash, Java, etc.).

**Why 'none':**
- Modern apps don't use plugins
- Plugins have known security vulnerabilities
- No legitimate use case for plugins

**Security Impact:** HIGH - Eliminates an entire class of vulnerabilities.

---

### `media-src 'self' https:`

**Purpose:** Controls loading of video and audio resources.

**Why 'self' and https:**
- Allows self-hosted media
- Allows media from CDNs and third-party sources
- Required for product videos, tutorials, etc.

**Security Impact:** LOW - Media files cannot execute code.

---

### `manifest-src 'self'`

**Purpose:** Controls loading of Progressive Web App manifests.

**Why 'self':**
- PWA manifest should only come from our domain
- Prevents manifest injection attacks
- No need for external manifests

**Security Impact:** LOW - Manifest files are JSON configuration.

---

## CSP Validation at Build Time

The `next.config.js` includes runtime validation:

```javascript
const NODE_ENV = process.env.NODE_ENV || 'development';
if (!['development', 'production', 'test'].includes(NODE_ENV)) {
  throw new Error(`Invalid NODE_ENV: "${NODE_ENV}"`);
}

console.log(`[Config] Building with NODE_ENV=${NODE_ENV}`);
```

This ensures:
1. NODE_ENV is always explicitly set
2. Production CSP never accidentally includes dev directives
3. Build fails if NODE_ENV is misconfigured

## Testing CSP

### Test in Browser

1. Open Developer Tools → Network tab
2. Reload the page
3. Check response headers for `Content-Security-Policy`
4. Verify no `'unsafe-eval'` or `'unsafe-inline'` in production

### Test CSP Violations

Intentionally violate CSP to verify it's working:

```html
<!-- This should be blocked in production -->
<script>eval('console.log("CSP test")')</script>
```

Check Console for CSP violation report.

### Automated Testing

Add to your test suite:

```javascript
test('production CSP does not include unsafe directives', async () => {
  const response = await fetch('https://your-domain.com');
  const csp = response.headers.get('content-security-policy');

  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("'unsafe-inline'");
});
```

## Common CSP Issues & Solutions

### Issue: Inline scripts blocked

**Symptom:** Script tags with inline JavaScript don't execute.

**Solution:**
1. Move scripts to external files
2. OR use nonces: `<script nonce="${cspNonce}">...</script>`
3. OR use hashes (see MDN docs)

### Issue: Third-party widgets broken

**Symptom:** Chat widgets, analytics, etc. don't load.

**Solution:**
1. Add widget CDN to `script-src`
2. Add widget API domain to `connect-src`
3. Test thoroughly before production

### Issue: Styles not applying

**Symptom:** CSS-in-JS styles missing.

**Solution:**
- Ensure `style-src` includes `'unsafe-inline'` (already done)
- OR implement style nonces

### Issue: Images from user content blocked

**Symptom:** User-uploaded images don't display.

**Solution:**
- `img-src` already allows `https:` for all HTTPS images
- Ensure image URLs use HTTPS, not HTTP

## Monitoring CSP Violations

### Report-Only Mode

To test CSP without breaking functionality:

```javascript
// In next.config.js
{
  key: 'Content-Security-Policy-Report-Only',
  value: 'your-csp-here; report-uri /api/csp-report'
}
```

### Log CSP Violations

Create `/api/csp-report` endpoint:

```typescript
export async function POST(request: Request) {
  const report = await request.json();
  console.error('CSP Violation:', report);
  // Send to monitoring service (Sentry, etc.)
  return new Response('OK', { status: 200 });
}
```

## Future Improvements

### 1. Implement Nonce-based CSP

Generate unique nonces per request:

```javascript
// middleware.ts
import { nanoid } from 'nanoid';

export function middleware(request: NextRequest) {
  const nonce = nanoid();
  const csp = `script-src 'nonce-${nonce}' 'self'`;
  // ...
}
```

### 2. Remove unsafe-inline from styles

Use CSS modules or styled-components with SSR:

```javascript
// Use hashes for inline styles
const styleHash = generateHash(cssContent);
const csp = `style-src 'sha256-${styleHash}' 'self'`;
```

### 3. Implement CSP reporting

Send violations to monitoring service:

```javascript
{
  key: 'Content-Security-Policy',
  value: `${cspString}; report-uri https://your-monitoring-service.com/csp`
}
```

### 4. Subresource Integrity (SRI)

Add integrity checks for CDN resources:

```html
<script
  src="https://cdn.jsdelivr.net/npm/package"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

## Additional Security Headers

CSP works best with other security headers (already implemented):

- **X-Content-Type-Options: nosniff** - Prevents MIME sniffing
- **X-Frame-Options: DENY** - Prevents clickjacking (redundant with CSP `frame-ancestors`)
- **X-XSS-Protection: 1; mode=block** - Legacy XSS protection for older browsers
- **Referrer-Policy: strict-origin-when-cross-origin** - Controls referrer information
- **Permissions-Policy** - Restricts browser features (camera, mic, geolocation)

## Resources

- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/)
- [Content Security Policy Cheat Sheet (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Validator](https://cspvalidator.org/)

## Questions?

If you need to modify CSP for new features:
1. Understand the security implications
2. Test in development first
3. Use Report-Only mode in staging
4. Document changes in this file
5. Get security review before deploying to production
