# B2B+ Architecture Documentation

## Overview

B2B+ is a full-stack B2B commerce and CRM platform built with:
- **Frontend**: Next.js 14 App Router with React 18
- **Mobile**: Expo/React Native
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (magic links)
- **External Services**: Gemini AI, SendGrid, Upstash Redis

## Core Architecture Layers

### 1. Authentication & Authorization

**Magic Link Flow**:
- User requests magic link via `/api/auth/magic-link/request`
- Supabase sends email with verification link
- User clicks link, verified via `/api/auth/magic-link/verify`
- Session established with JWT token

**Admin Operations**:
- Use `createAdminClient()` from `lib/supabase/admin.ts`
- Server-only module using `SUPABASE_SERVICE_ROLE_KEY`
- Never expose service-role key to client
- Used for auth.admin operations and webhook processing

**Role-Based Access**:
- `profiles.role`: 'user' | 'admin'
- `organization_members.role`: 'member' | 'admin' | 'owner'
- Check via helpers in `lib/auth/helpers.ts`

### 2. Billing & Pricing

**Unified Billing Service** (`lib/billing/billing-service.ts`):
- Centralized pricing, tax, and shipping calculations
- Single source of truth for monetary logic
- Prevents N+1 pricing calls

**Batch Pricing** (`/api/pricing/batch`):
- Calculate pricing for multiple items in one request
- Used by cart and order flows
- Eliminates frontend N+1 patterns

### 3. Cart & Orders

**Cart API** (`/api/cart`):
- GET: Fetch user's cart items
- POST: Add item to cart (CSRF protected)
- DELETE: Remove item from cart (CSRF protected)
- Server-side business rule enforcement
- RLS ensures user can only access own cart

**Order Flow**:
- Cart → Checkout → Order creation
- Order items stored in `order_items` table
- RLS ensures org members can only see org orders

### 4. Webhooks & External Services

**SendGrid Webhooks** (`/api/webhooks/sendgrid`):
- Signature verification via HMAC-SHA256
- Rate limiting (1000 req/min per IP)
- Structured logging with client IP
- Updates email delivery status

**Email Webhooks** (`/api/webhooks/email`):
- Bearer token authentication
- Rate limiting (500 req/min per IP)
- Uses admin client for database writes
- Classifies and routes emails

**Webhook Security**:
- All webhooks verify signatures/tokens
- Rate limiting prevents abuse
- Admin client bypasses RLS (intentional)
- Structured logging for audit trail

### 5. AI & Automation

**ChatbotService** (`lib/services/chatbot-service.ts`):
- Conversation management
- User ownership enforcement
- Message history tracking
- Opt-out handling

**Email Routing** (`lib/services/email-routing-service.ts`):
- Route emails by classification
- Generate auto-responses
- Handle opt-out logic
- Log all activities

**Automation Logging** (`lib/services/automation-logging.ts`):
- Check opt-out status before sending
- Log all automation activities
- Standardized lead_activities records
- Prevent contact with opted-out leads

### 6. Row Level Security (RLS)

**User-Scoped Tables**:
- `cart_items`: Users see only their own items
- `chatbot_conversations`: Users see only their conversations
- `chatbot_messages`: Users see only their messages

**Organization-Scoped Tables**:
- `orders`: Org members see only org orders
- `order_items`: Org members see only org order items
- `leads`: Org members see only org leads

**Webhook-Bypassed Tables**:
- `processed_emails`: Webhooks use admin client
- `email_actions_log`: Webhooks use admin client
- RLS prevents user access (intentional)

## Security Model

### Service-Role Key Usage

✅ **Allowed**:
- Auth admin operations (user creation, password reset)
- Webhook processing (email classification, routing)
- Admin operations (migrations, bulk imports)

❌ **Not Allowed**:
- Client-side code
- Browser-exposed endpoints
- Non-admin API routes

### CSRF Protection

All browser-invoked mutating routes require CSRF tokens:
- POST /api/cart
- DELETE /api/cart/[id]
- POST /api/orders
- POST /api/campaigns/send

Frontend sends `x-csrf-token` header with token from cookie.

### Webhook Verification

**SendGrid**:
- Header: `x-twilio-email-event-webhook-signature`
- Algorithm: HMAC-SHA256
- Constant-time comparison to prevent timing attacks

**Email**:
- Header: `Authorization: Bearer <token>`
- Token verified against `EMAIL_WEBHOOK_SECRET`
- Constant-time comparison

## API Patterns

### Request/Response

```typescript
// Request
POST /api/endpoint
{
  "field": "value"
}

// Response (Success)
{
  "success": true,
  "data": { ... }
}

// Response (Error)
{
  "error": "Error message",
  "status": 400
}
```

### Error Handling

- 400: Bad request (validation error)
- 401: Unauthorized (auth required)
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 429: Rate limited
- 500: Server error

## Deployment

### Environment Variables

**Client** (NEXT_PUBLIC_*):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

**Server**:
- SUPABASE_SERVICE_ROLE_KEY
- SENDGRID_API_KEY
- SENDGRID_WEBHOOK_SIGNING_KEY
- EMAIL_WEBHOOK_SECRET
- GEMINI_API_KEY

### Database Migrations

Migrations in `supabase/migrations/` are applied automatically on deployment.

Critical migrations:
- `20251119000001_restrict_exec_sql.sql`: Restricts exec_sql to postgres role only

