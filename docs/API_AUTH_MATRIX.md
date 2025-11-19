# API Authentication & Authorization Matrix

This document defines the authentication, authorization, CSRF, and RLS requirements for all `/api/**` routes.

## Legend

- **Auth Level**: `public` (no auth), `user` (authenticated user), `admin` (admin role), `service` (service-to-service)
- **Org Scoping**: `none`, `user_org` (user's organization), `admin_org` (admin's organization)
- **CSRF**: `required`, `not_needed` (GET/safe methods), `n/a` (service endpoints)
- **RLS**: `enforced`, `bypassed` (service-role), `n/a` (no DB access)

## Auth Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/auth/magic-link/request` | POST | public | none | required | n/a | Sends magic link email |
| `/api/auth/magic-link/verify` | GET | public | none | not_needed | bypassed | Creates session, uses admin client |
| `/api/auth/validate-signup` | POST | public | none | required | n/a | Validates signup data |
| `/api/auth/verify-password-reset` | GET/POST | public | none | required | n/a | Password reset flow |

## Cart Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/cart` | GET | user | user_org | not_needed | enforced | Fetch user's cart |
| `/api/cart` | POST | user | user_org | required | enforced | Add item to cart |
| `/api/cart/[id]` | PATCH | user | user_org | required | enforced | Update cart item |
| `/api/cart/[id]` | DELETE | user | user_org | required | enforced | Remove cart item |

## Order Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/orders` | GET | user | user_org | not_needed | enforced | List user's orders |
| `/api/orders` | POST | user | user_org | required | enforced | Create order from cart |
| `/api/orders/[id]` | GET | user | user_org | not_needed | enforced | Get order details |

## Pricing Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/pricing/calculate` | POST | user | user_org | required | n/a | Calculate order total |
| `/api/pricing/batch` | POST | user | user_org | required | n/a | Batch pricing for cart items |

## Admin Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/admin/apply-migration` | POST | admin | none | required | n/a | **DISABLED in production** |
| `/api/admin/pricing/assign-tier` | POST | admin | admin_org | required | bypassed | Assign pricing tier |
| `/api/admin/campaigns/send-personalized` | POST | admin | admin_org | required | bypassed | Send email campaign |
| `/api/admin/leads/import` | POST | admin | admin_org | required | bypassed | Bulk import leads |

## Webhook Routes

| Route | Method | Auth Level | Org Scoping | CSRF | RLS | Notes |
|-------|--------|-----------|-------------|------|-----|-------|
| `/api/webhooks/sendgrid` | POST | service | none | n/a | bypassed | SendGrid events, signature verified |
| `/api/webhooks/email` | POST | service | none | n/a | bypassed | Inbound emails, bearer token verified |

## Implementation Checklist

- [ ] All routes have explicit auth level defined
- [ ] All user-scoped routes enforce org scoping
- [ ] All mutating routes have CSRF protection
- [ ] All routes document their RLS behavior
- [ ] Service routes have signature/token verification
- [ ] Admin routes check admin role and org membership
- [ ] Rate limiting applied to webhook routes
- [ ] Structured logging on all routes

