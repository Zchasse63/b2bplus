# CSRF Protection Implementation Guide

## Overview
This guide provides step-by-step instructions for adding CSRF protection to all state-changing API routes in the B2B+ platform.

## What is CSRF?
Cross-Site Request Forgery (CSRF) attacks trick users into performing unwanted actions on websites where they're authenticated. CSRF protection uses tokens to verify that requests come from legitimate sources.

## Implementation Status

### Already Protected ✅
- `/api/orders/reorder` - POST
- `/api/orders/calculate-total` - POST
- `/api/csrf-token` - GET

### Need Protection (Priority Order)

#### Tier 1: Financial/Critical Operations
- [ ] `/api/invoices/[id]` - PATCH (payment status)
- [ ] `/api/orders/create` - POST
- [ ] `/api/cart/add` - POST
- [ ] `/api/cart/remove` - DELETE
- [ ] `/api/admin/orders/auto-approve` - POST/PATCH

#### Tier 2: User Data Modifications
- [ ] `/api/admin/pricing/[id]/approve` - POST
- [ ] `/api/admin/organizations/approve` - POST
- [ ] `/api/admin/crm/**` - All POST/PUT/DELETE
- [ ] `/api/leads/create` - POST
- [ ] `/api/notifications/send` - POST

#### Tier 3: Administrative Actions
- [ ] `/api/admin/**` - All POST/PUT/PATCH/DELETE
- [ ] `/api/admin/campaigns/**` - All state-changing
- [ ] `/api/admin/import/**` - All operations

## How to Add CSRF Protection to an Endpoint

### Step 1: Import CSRF Middleware
```typescript
import { csrfProtection, addCSRFTokenToCookie } from '@/lib/middleware/csrf';
```

### Step 2: Add CSRF Check at Start of Handler
```typescript
export async function POST(request: NextRequest) {
  try {
    // ✅ Add this at the beginning
    const { valid, response } = await csrfProtection(request);
    if (!valid) {
      return response!;
    }

    // Rest of your handler code...
  } catch (error) {
    // error handling
  }
}
```

### Step 3: Add CSRF Token to Response
```typescript
    const result = NextResponse.json({
      success: true,
      data: someData
    });

    // ✅ Add this before returning
    return addCSRFTokenToCookie(result, '');
```

### Complete Example
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { csrfProtection, addCSRFTokenToCookie } from '@/lib/middleware/csrf';

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF Protection (must be first)
    const { valid, response: csrfResponse } = await csrfProtection(request);
    if (!valid) {
      return csrfResponse!;
    }

    const supabase = await createClient();
    
    // 2. Your business logic
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of handler

    // 3. Return response with CSRF token
    const response = NextResponse.json({ success: true });
    return addCSRFTokenToCookie(response, '');

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Client-Side Integration

### Using the useCSRFToken Hook
```typescript
'use client';

import { useCSRFToken, fetchWithCSRF } from '@/hooks/useCSRFToken';

export function MyComponent() {
  const { token, loading, error } = useCSRFToken();

  const handleSubmit = async () => {
    const response = await fetchWithCSRF('/api/my-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'value' })
    });
    const data = await response.json();
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Manual CSRF Token Addition
```typescript
import { fetchCSRFToken } from '@/hooks/useCSRFToken';

const token = await fetchCSRFToken();
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': token,
  },
  body: JSON.stringify({ data: 'value' })
});
```

## Testing CSRF Protection

### Test 1: Valid Request with Token
```bash
# 1. Get CSRF token
TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.token')

# 2. Make request with token
curl -X POST http://localhost:3000/api/orders/reorder \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -H "Cookie: csrf-token=$TOKEN" \
  -d '{"orderId": "test-id"}'
```

### Test 2: Request Without Token (Should Fail)
```bash
curl -X POST http://localhost:3000/api/orders/reorder \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-id"}'
# Expected: 403 CSRF token missing
```

### Test 3: Request with Invalid Token (Should Fail)
```bash
curl -X POST http://localhost:3000/api/orders/reorder \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: invalid-token" \
  -d '{"orderId": "test-id"}'
# Expected: 403 CSRF token invalid
```

## Automated Protection: Wrapper Middleware

For easier application, use the `withCSRFProtection` wrapper:

```typescript
import { withCSRFProtection } from '@/lib/middleware/csrf';

async function myHandler(request: NextRequest) {
  // Your handler code - CSRF is already checked
  return NextResponse.json({ success: true });
}

// Wrap and export
export const POST = withCSRFProtection(myHandler);
```

## Bulk Update: Script Template

Use this template to apply CSRF to multiple routes:

```typescript
// For each route file:

// 1. Add imports
import { csrfProtection, addCSRFTokenToCookie, withCSRFProtection } from '@/lib/middleware/csrf';

// 2. Add to each POST/PUT/PATCH/DELETE handler:
const { valid, response } = await csrfProtection(request);
if (!valid) return response!;

// 3. Add to response before returning:
return addCSRFTokenToCookie(response, '');

// OR use the wrapper for simpler code:
export const POST = withCSRFProtection(async (request) => {
  // handler code
});
```

## Troubleshooting

### Issue: "CSRF token missing"
**Solution:** Ensure client is:
1. Calling `/api/csrf-token` to get token
2. Including `x-csrf-token` header in request
3. Sending token in request body if using form data

### Issue: "CSRF token invalid"
**Solution:** 
1. Token may have expired (1-2 hours) - fetch new token
2. Cookie with token may be deleted - reload page
3. Cross-domain issue - check origin matching

### Issue: Requests failing intermittently
**Solution:**
1. Check Redis connection for rate limiting
2. Verify token is being set in cookies
3. Check browser privacy/incognito mode allows cookies

## Security Considerations

### Do's ✅
- Always apply CSRF to POST/PUT/PATCH/DELETE
- Store token in HTTP-only cookie
- Regenerate tokens periodically
- Log CSRF failures for monitoring
- Test CSRF protection regularly

### Don'ts ❌
- Don't expose tokens in URLs
- Don't apply CSRF to GET requests
- Don't skip CSRF for internal APIs
- Don't use weak token generation
- Don't log tokens in error messages

## Performance Impact

CSRF protection adds minimal overhead:
- Token generation: <1ms
- Token validation: <1ms
- Cookie operations: <1ms
- Total overhead: ~3ms per request

For high-traffic APIs, consider:
- Using Redis for token storage (already implemented)
- Token TTL optimization
- Batch token validation if needed

## Monitoring & Logging

Monitor CSRF failures in production:

```typescript
// Log CSRF failures
if (!valid) {
  console.warn('CSRF protection triggered', {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
  });
  return response!;
}
```

## Compliance & Standards

CSRF protection in this implementation follows:
- OWASP Top 10: A05:2021 - CSRF
- CWE-352: Cross-Site Request Forgery (CSRF)
- HTTP RFC 7231: Safe/Idempotent methods
- SameSite cookie guidelines

## Next Steps

1. **Week 1:** Apply CSRF to Tier 1 (financial) routes
2. **Week 2:** Apply CSRF to Tier 2 (user data) routes
3. **Week 3:** Apply CSRF to Tier 3 (admin) routes
4. **Week 4:** Comprehensive testing and monitoring

## Questions?

Refer to:
- OWASP CSRF Prevention Cheat Sheet
- Express CSRF Middleware Documentation
- Supabase Security Best Practices