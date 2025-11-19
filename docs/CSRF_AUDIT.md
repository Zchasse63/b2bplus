# CSRF Protection Audit

## Status: INFRASTRUCTURE IN PLACE

CSRF middleware is implemented in `lib/middleware/csrf.ts` with:
- Token generation and validation
- Constant-time comparison to prevent timing attacks
- HttpOnly, Secure, SameSite=Strict cookies
- `withCSRFProtection` wrapper for routes

## Routes with CSRF Protection

✅ Already protected:
- `/api/invoices/[id]`
- `/api/admin/organizations/approve`
- `/api/admin/campaigns`
- `/api/admin/pricing/[id]/approve`
- `/api/orders/reorder`
- `/api/orders/calculate-total`

## Routes Requiring CSRF Protection

The following mutating routes should be wrapped with `withCSRFProtection`:

### Auth Routes
- [ ] `/api/auth/magic-link/request` (POST)
- [ ] `/api/auth/validate-signup` (POST)
- [ ] `/api/auth/verify-password-reset` (POST)

### Cart Routes
- [ ] `/api/cart` (POST, PATCH, DELETE)

### Order Routes
- [ ] `/api/orders` (POST)

### Pricing Routes
- [ ] `/api/pricing/calculate` (POST)
- [ ] `/api/pricing/batch` (POST)

### Admin Routes
- [ ] `/api/admin/apply-migration` (POST) - already disabled
- [ ] `/api/admin/pricing/assign-tier` (POST)
- [ ] `/api/admin/campaigns/send-personalized` (POST)
- [ ] `/api/admin/leads/import` (POST)

## Implementation Pattern

```typescript
import { withCSRFProtection } from '@/lib/middleware/csrf';

export const POST = withCSRFProtection(async (request: NextRequest) => {
  // Route handler
});
```

## Frontend Integration

All POST/PUT/PATCH/DELETE requests must include:
```typescript
headers: {
  'x-csrf-token': csrfToken
}
```

CSRF token is available from:
- Cookie: `csrf-token`
- API endpoint: `/api/csrf-token` (if implemented)

