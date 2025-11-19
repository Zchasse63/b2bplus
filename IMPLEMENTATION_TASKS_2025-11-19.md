# Implementation Task Breakdown
**Generated**: 2025-11-19
**Source Analysis**: Full-stack integration, security, and data-flow audit of `b2b-plus` monorepo
**Total Tasks**: 32 (8 parent tasks, 24 subtasks)

## Table of Contents
- [PARENT TASK SEC-001: Lock down Supabase service-role usage and migrations](#parent-task-sec-001-lock-down-supabase-service-role-usage-and-migrations)
- [PARENT TASK SEC-002: Secure email and SendGrid webhooks](#parent-task-sec-002-secure-email-and-sendgrid-webhooks)
- [PARENT TASK SEC-003: Standardize auth, CSRF, and RLS coverage](#parent-task-sec-003-standardize-auth-csrf-and-rls-coverage)
- [PARENT TASK ARCH-001: Unify pricing, tax, shipping, and batch pricing](#parent-task-arch-001-unify-pricing-tax-shipping-and-batch-pricing)
- [PARENT TASK ARCH-002: Introduce secure cart API layer and reinforce RLS](#parent-task-arch-002-introduce-secure-cart-api-layer-and-reinforce-rls)
- [PARENT TASK ARCH-003: Finalize chatbot and email automation service layer](#parent-task-arch-003-finalize-chatbot-and-email-automation-service-layer)
- [PARENT TASK TEST-001: Expand integration, E2E, and security tests](#parent-task-test-001-expand-integration-e2e-and-security-tests)
- [PARENT TASK DOC-001: Update architecture and ops documentation](#parent-task-doc-001-update-architecture-and-ops-documentation)

---

## Summary
**Critical Priority**: 6 tasks (2 parent, 4 sub)
**High Priority**: 19 tasks (4 parent, 15 sub)
**Medium Priority**: 7 tasks (2 parent, 5 sub)
**Low Priority**: 0 tasks

**Estimated Total Effort**: ~6–8 weeks for 1 senior engineer, or ~3–4 weeks for 2–3 engineers working in parallel.

---

## PARENT TASK SEC-001: Lock down Supabase service-role usage and migrations
**Priority**: Critical
**Category**: Security / Architecture
**Overview**: Remove or tightly lock down any HTTP-accessible functionality that can execute arbitrary SQL or otherwise use the Supabase service-role key in ways that bypass RLS, ensuring that all schema and privileged operations go through controlled ops tooling.
**Dependencies**: None

---

### SUBTASK SEC-001.1: Disable or strictly gate `/api/admin/apply-migration`
**Priority**: Critical
**Complexity**: Simple

**Context**:
`apps/web/app/api/admin/apply-migration/route.ts` exposes a public HTTP endpoint that reads arbitrary SQL migration files and executes them via the `exec_sql` Postgres function using the Supabase service-role key, effectively creating a remote DB backdoor.

**Objective**:
Ensure no non-local environment exposes an HTTP endpoint capable of executing arbitrary SQL via the service-role key.

**Implementation Steps**:
1. In `apps/web/app/api/admin/apply-migration/route.ts`, wrap the POST handler in an environment guard so that in production (and any shared non-dev environment) it returns a 404 or 403 immediately, e.g. based on `NODE_ENV` or a dedicated `ENABLE_MIGRATION_API` flag.
2. Add a prominent comment above the handler indicating this route is for local development only and that production schema changes must go through Supabase CLI migrations.
3. Optionally, if team agrees this endpoint is no longer needed, delete the route file entirely and rely solely on Supabase CLI and migration pipeline.

**Files to Modify**:
- `apps/web/app/api/admin/apply-migration/route.ts` – add environment gating or remove the handler entirely.

**Code Pattern/Approach**:
Use a simple early-return pattern such as:
`if (process.env.NODE_ENV !== 'development') return NextResponse.json({ error: 'Not found' }, { status: 404 });`

**Acceptance Criteria**:
- [ ] In production builds, any request to `/api/admin/apply-migration` returns 404/403 and never attempts to read files or call `supabase.rpc('exec_sql', ...)`.
- [ ] In local dev, migrations can still be applied via Supabase CLI (`supabase db push` / `supabase db reset`) without relying on this route.
- [ ] No logs or traces show `exec_sql` being invoked from HTTP handlers in production.

**Testing**:
- Build and run the app with `NODE_ENV=production` locally; confirm `/api/admin/apply-migration` is unreachable (404/403).
- Run existing smoke tests to ensure no other routes depend on this endpoint.

**Dependencies**: None

---

### SUBTASK SEC-001.2: Restrict or remove `exec_sql` RPC usage to ops tooling only
**Priority**: Critical
**Complexity**: Moderate

**Context**:
The `exec_sql` Postgres function (invoked via `supabase.rpc('exec_sql', ...)`) allows arbitrary SQL execution with elevated privileges. When callable from app code using the service-role key, it bypasses RLS and can be abused if any code path is exposed inadvertently.

**Objective**:
Ensure `exec_sql` is only usable from controlled ops tools (e.g., Supabase CLI, manual psql) and is not reachable from HTTP handlers in production.

**Implementation Steps**:
1. Search the repo for all usages of `exec_sql` (including in SQL migrations and TS code) to confirm only `apps/web/app/api/admin/apply-migration/route.ts` uses it from the app.
2. After disabling/removing the apply-migration endpoint (SEC-001.1), update the relevant migration or function definition to restrict `exec_sql` so that only privileged roles (e.g., an internal ops role) can call it, or drop the function entirely if not needed.
3. Document the new policy in `docs/` that all schema changes are performed via Supabase migrations and CLI, not via `exec_sql` from application runtime.

**Files to Modify**:
- `supabase/migrations/*exec_sql*.sql` or the migration that creates `exec_sql` – adjust or drop the function.
- `docs/` (see DOC-001 tasks) – describe the migration process and removal/restriction of `exec_sql`.

**Acceptance Criteria**:
- [ ] No TypeScript/JavaScript code in the repo calls `supabase.rpc('exec_sql', ...)`.
- [ ] The `exec_sql` function is either removed or restricted to an internal role not used by the app runtime.
- [ ] The documented migration procedure references Supabase CLI, not any HTTP endpoint.

**Testing**:
- Run Supabase migrations locally after modifying/dropping `exec_sql` to ensure no dependent code breaks.
- Attempt to call `exec_sql` via the service-role client in a local script; confirm it fails unless executed under the intended privileged context.

**Dependencies**: Depends on SEC-001.1 if the apply-migration route is the only in-app caller.

---

### SUBTASK SEC-001.3: Introduce server-only Supabase admin client for auth/admin operations
**Priority**: High
**Complexity**: Moderate

**Context**:
Some routes (e.g., `/api/auth/magic-link/verify`) call `supabase.auth.admin.generateLink` using the SSR client configured with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Admin APIs should instead use the `SUPABASE_SERVICE_ROLE_KEY` via a server-only client that is never imported into client bundles.

**Objective**:
Create a dedicated `supabaseAdminClient` module that uses the service-role key and refactor all auth/admin usages to call this client only from server-side code.

**Implementation Steps**:
1. Create a new module, e.g. `apps/web/lib/supabase/admin.ts`, that exports a factory function `createAdminClient()` using `@supabase/supabase-js` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
2. Ensure this module has no `"use client"` directive and is only imported from API route handlers or server-only utilities.
3. Update `/api/auth/magic-link/verify` (and any other routes using `supabase.auth.admin`) to use `createAdminClient()` instead of the anon SSR client, and ensure the anon client remains configured only with `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add runtime assertions or logging to confirm that the service-role key is never exposed in client bundles (e.g., no `NEXT_PUBLIC_` prefix).

**Files to Modify**:
- `apps/web/lib/supabase/admin.ts` – new file defining `createAdminClient`.
- `apps/web/app/api/auth/magic-link/verify/route.ts` – switch to admin client for `auth.admin` calls.
- Other admin-only routes using `auth.admin` (search for `.auth.admin`) – refactor similarly.

**Acceptance Criteria**:
- [ ] All `auth.admin` calls use the new admin client module and never import from client code.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains the anon key and is not replaced by the service-role key.
- [ ] Static analysis / bundle inspection confirms the service-role key is not present in any client-side bundle.

**Testing**:
- Manually exercise magic-link flows (request + verify) in a local environment and confirm they still succeed.
- Add integration tests that hit `/api/auth/magic-link/verify` and assert correct redirects and user creation.

**Dependencies**: None (but informs SEC-003 tasks around auth consistency).

---

## PARENT TASK SEC-002: Secure email and SendGrid webhooks
**Priority**: Critical
**Category**: Security / API
**Overview**: Harden all inbound webhooks (`/api/webhooks/email` and `/api/webhooks/sendgrid`) so that only legitimate providers can trigger them, preventing attackers from injecting fake events, emails, or campaign metrics.
**Dependencies**: SEC-001 (admin client patterns and service-role usage)

---

### SUBTASK SEC-002.1: Implement SendGrid event webhook signature verification
**Priority**: Critical
**Complexity**: Moderate

**Context**:
`apps/web/app/api/webhooks/sendgrid/route.ts` currently accepts unauthenticated POST requests and trusts the body as if it came from SendGrid, while using the Supabase service-role key to mutate `email_campaign_recipients`.

**Objective**:
Ensure `/api/webhooks/sendgrid` only processes requests that are cryptographically verified as coming from SendGrid.

**Implementation Steps**:
1. Review SendGrid's webhook security docs (https://docs.sendgrid.com/ui/account-and-settings/security-and-compliance) and choose a supported verification method (e.g., signed payload using an HMAC key or public key verification).
2. Add environment variables for the chosen secret/public key (e.g., `SENDGRID_WEBHOOK_SIGNING_KEY`) and validate them in `apps/web/lib/env.ts`.
3. In `apps/web/app/api/webhooks/sendgrid/route.ts`, compute and verify the signature from headers + payload before any DB access; if verification fails, return 401 and log a warning.
4. Add structured logging for verification failures and success metrics to aid monitoring.

**Files to Modify**:
- `apps/web/app/api/webhooks/sendgrid/route.ts` – add signature verification and early rejection.
- `apps/web/lib/env.ts` – add new env vars and validation.
- Deployment secrets/config – set the signing key in each environment.

**Acceptance Criteria**:
- [ ] Requests without valid SendGrid signatures are rejected with 401 and do not modify any database rows.
- [ ] Validly signed SendGrid webhook requests continue to update `email_campaign_recipients` as before.
- [ ] Logs clearly distinguish between accepted and rejected webhook calls.

**Testing**:
- Write unit tests that simulate signed and unsigned requests to `/api/webhooks/sendgrid`.
- In a staging environment, configure SendGrid to send test events and confirm they are accepted and processed.

**Dependencies**: SEC-001.2 (service-role usage understanding)


---

### SUBTASK SEC-002.2: Implement inbound email webhook authentication and verification
**Priority**: Critical
**Complexity**: Moderate

**Context**:
`apps/web/app/api/webhooks/email/route.ts` receives inbound email payloads (SendGrid Inbound Parse–style) without verifying that the request actually comes from the email provider, allowing arbitrary injection of `processed_emails` and `email_actions_log` entries.

**Objective**:
Ensure `/api/webhooks/email` only processes requests that are authenticated or signed by the configured email provider.

**Implementation Steps**:
1. Decide on the provider and mechanism (e.g., SendGrid Inbound Parse with signed webhook, IP allowlist plus HMAC secret) and add corresponding env vars (e.g., `EMAIL_WEBHOOK_SIGNING_KEY`, `EMAIL_WEBHOOK_ALLOWED_IPS`) to `apps/web/lib/env.ts`.
2. In `apps/web/app/api/webhooks/email/route.ts`, compute and verify the signature and/or IP before parsing the body; reject unauthenticated requests with 401 and log the attempt.
3. Ensure verification logic runs before calling `classifyEmail` or writing to Supabase.

**Files to Modify**:
- `apps/web/app/api/webhooks/email/route.ts` – add verification and early rejection.
- `apps/web/lib/env.ts` – add and validate new env vars.
- Deployment secrets/config – set signing key and/or IP lists.

**Acceptance Criteria**:
- [ ] Unauthenticated or improperly signed requests to `/api/webhooks/email` are rejected with 401 and do not write to `processed_emails` or `email_actions_log`.
- [ ] Valid provider webhooks are still accepted and processed end-to-end.
- [ ] Security logs show clear records of rejected attempts for monitoring.

**Testing**:
- Add unit tests for signed/unsigned and allowed/blocked IP combinations.
- In staging, configure the provider to send test inbound emails and verify they appear correctly in the database.

**Dependencies**: SEC-001.3 (admin client pattern) and provider choice.

---

### SUBTASK SEC-002.3: Harden webhook routes with rate limiting and structured logging
**Priority**: High
**Complexity**: Simple

**Context**:
Even with signature verification, webhooks can be targeted with high-volume requests or malformed payloads that consume resources or clutter logs.

**Objective**:
Add lightweight rate limiting and structured logging around webhook handlers to protect against abuse and ease observability.

**Implementation Steps**:
1. Reuse or extend the existing `rateLimit` helper used for other sensitive routes (e.g., magic-link) to add per-IP and global rate limits to `/api/webhooks/email` and `/api/webhooks/sendgrid`.
2. Ensure all webhook handlers use `createLogger` with a dedicated namespace (already present for email webhook) and log verification results, key identifiers (message ID, campaign ID), and failures.
3. Optionally add basic payload size checks and early rejection for excessively large bodies.

**Files to Modify**:
- `apps/web/app/api/webhooks/email/route.ts` – add `rateLimit` usage and improved logging.
- `apps/web/app/api/webhooks/sendgrid/route.ts` – add `rateLimit` usage and improved logging.

**Acceptance Criteria**:
- [ ] Webhook routes enforce rate limits and return 429 when exceeded.
- [ ] Logs include structured fields for event type, message ID, and verification status.
- [ ] No significant performance regression for normal webhook traffic.

**Testing**:
- Add tests that simulate rapid repeated webhook calls and confirm 429 responses after thresholds.
- Manually inspect logs in a staging environment under normal and failure scenarios.

**Dependencies**: SEC-002.1, SEC-002.2

---

### SUBTASK SEC-002.4: Use a service-role server client for `/api/webhooks/email` with tight RLS
**Priority**: High
**Complexity**: Moderate

**Context**:
`/api/webhooks/email` currently uses the SSR client configured with the anon key to write to `processed_emails` and `email_actions_log`. This either requires permissive RLS or risks failing silently.

**Objective**:
Ensure inbound email processing uses a server-only Supabase client with the service-role key while keeping RLS policies strict for anon users.

**Implementation Steps**:
1. Import and use the server-only admin or service-role client (from SEC-001.3) in `apps/web/app/api/webhooks/email/route.ts` for all inserts/updates.
2. Review and tighten RLS policies on `processed_emails` and `email_actions_log` so that only service-role (or appropriate internal role) can write to them.
3. Confirm that no browser or anon client paths can write to these tables directly.

**Files to Modify**:
- `apps/web/app/api/webhooks/email/route.ts` – switch to service-role client for DB writes.
- `supabase/migrations/*` – adjust RLS policies for the affected tables if needed.

**Acceptance Criteria**:
- [ ] Inbound email processing continues to work using the service-role client.
- [ ] Anon/browser clients cannot write to `processed_emails` or `email_actions_log` under RLS.
- [ ] Security review confirms RLS policies are strict and coherent.

**Testing**:
- Run inbound email tests using the webhook after switching clients.
- Attempt to write to the affected tables from a browser Supabase client and confirm access is denied.

**Dependencies**: SEC-001.3, SEC-002.2

---

## PARENT TASK SEC-003: Standardize auth, CSRF, and RLS coverage
**Priority**: High
**Category**: Security / Architecture
**Overview**: Ensure all backend routes have explicit, consistent authentication, authorization (role/org), CSRF protection (where applicable), and rely on strong RLS so that every path has a clearly defined access policy.
**Dependencies**: SEC-001, SEC-002

---

### SUBTASK SEC-003.1: Inventory and classify all `/api/**` routes by auth and role/org requirements
**Priority**: High
**Complexity**: Moderate

**Context**:
The monorepo has ~95 API route handlers. While many follow a consistent pattern (Supabase auth + org checks), a few may lack explicit checks or rely only on RLS.

**Objective**:
Produce a definitive matrix of all API routes with their required auth level (public/authed/admin), org scoping, and RLS reliance, to drive subsequent hardening work.

**Implementation Steps**:
1. Use `apps/web/app/api` directory to enumerate all route files and document for each: HTTP methods, expected caller (browser, system, admin), and current auth checks.
2. Capture this in a markdown or spreadsheet under `docs/` (e.g., `docs/api_auth_matrix.md`) with columns: route, method, auth required, roles, org scoping, CSRF, notes.
3. Mark any routes that are public but mutate data or touch sensitive tables for follow-up changes.

**Files to Modify**:
- `docs/api_auth_matrix.md` – new documentation file capturing the matrix.

**Acceptance Criteria**:
- [ ] Every `apps/web/app/api/**/route.ts` file is represented in the matrix with auth/role/org details.
- [ ] At least one reviewer confirms the matrix matches the current implementation.

**Testing**:
- N/A (documentation/analysis task), but cross-check a random sample of routes against code.

**Dependencies**: None


### SUBTASK SEC-003.2: Ensure CSRF protection on all browser-invoked stateful routes
**Priority**: High
**Complexity**: Moderate

**Context**:
Some state-changing routes already use `csrfProtection`, but coverage is not guaranteed for all browser-invoked POST/PUT/PATCH/DELETE endpoints.

**Objective**:
Guarantee that all browser-facing stateful endpoints are either protected by CSRF middleware or explicitly documented as exempt (e.g., pure API-to-API calls).

**Implementation Steps**:
1. From the auth matrix (SEC-003.1), identify all routes that are called directly from the browser and mutate state.
2. For each such route, wrap the handler with `withCSRFProtection` and ensure frontend callers fetch `/api/csrf-token` and send the `x-csrf-token` header.
3. For system-only or webhook routes, explicitly document why CSRF is not applied.

**Files to Modify**:
- `apps/web/app/api/**/route.ts` (selected files) – add `withCSRFProtection` where missing.
- Frontend API call sites – ensure they include `x-csrf-token` where required.

**Acceptance Criteria**:
- [ ] All browser-invoked stateful routes either use `withCSRFProtection` or are explicitly exempted with justification.
- [ ] CSRF errors return consistent 403 responses with clear error messages.

**Testing**:
- Add tests that omit the CSRF header and assert 403 responses for protected routes.
- Manually verify that normal flows work when the token is correctly supplied.

**Dependencies**: SEC-003.1

---

### SUBTASK SEC-003.3: Normalize admin role and org scoping checks
**Priority**: High
**Complexity**: Moderate

**Context**:
Admin endpoints currently use a mix of direct `profiles.role` checks and helper functions (e.g., `checkAdminRole`) to enforce admin privileges and org scoping.

**Objective**:
Standardize how admin and org checks are performed so that all admin routes behave consistently and are easy to audit.

**Implementation Steps**:
1. Identify and centralize role/org-check helpers in a shared module (e.g., `apps/web/lib/auth/authorization.ts`).
2. Refactor admin routes under `apps/web/app/api/admin/**` to use these helpers rather than duplicating logic.
3. Ensure organization-owned resources are always filtered by `current_organization_id` or equivalent context.

**Files to Modify**:
- `apps/web/lib/auth/authorization.ts` – define reusable helpers.
- `apps/web/app/api/admin/**/route.ts` – refactor to use helpers.

**Acceptance Criteria**:
- [ ] All admin routes call a common helper for role and org checks.
- [ ] No route trusts raw role strings or org IDs from the client without validation.

**Testing**:
- Add integration tests for at least one route per admin domain (pricing, campaigns, analytics) to verify unauthorized users are blocked.

**Dependencies**: SEC-003.1

---

## PARENT TASK ARCH-001: Unify pricing, tax, shipping, and batch pricing
**Priority**: High
**Category**: Architecture / Performance
**Overview**: Consolidate pricing, tax, and shipping logic into a single, shared service used by pricing, orders, and invoices, and add batch pricing capabilities to improve performance and consistency.
**Dependencies**: SEC-001, SEC-003

---

### SUBTASK ARCH-001.1: Design unified billing/pricing domain service
**Priority**: High
**Complexity**: Complex

**Context**:
Pricing logic currently lives in `/api/pricing/calculate`, `/api/orders/calculate-total`, `/api/invoices/generate`, and DB functions, risking drift between checkout totals and invoice totals.

**Objective**:
Define a single TypeScript service (plus DB contracts) that encapsulates all pricing, tax, and shipping rules.

**Implementation Steps**:
1. Create a shared service module, e.g., `packages/shared/src/services/billing-service.ts`, that exposes methods like `calculateItemPrice`, `calculateOrderTotals`, and `calculateInvoiceTotals`.
2. Model inputs/outputs as pure TypeScript types, leveraging existing `PricingResult` and DB types from `@b2b-plus/supabase`.
3. Document tax and shipping rules in code comments and in `docs/` so they are explicit and versioned.

**Files to Modify**:
- `packages/shared/src/services/billing-service.ts` – new unified service.
- `docs/pricing_and_billing.md` – new or updated documentation describing rules.

**Acceptance Criteria**:
- [ ] Billing service exposes clearly typed functions covering item, order, and invoice calculations.
- [ ] All pricing-related code paths use the same formulae and constants.

**Testing**:
- Add unit tests for the billing service covering common and edge cases (volume discounts, promotions, free shipping thresholds).

**Dependencies**: None

---

### SUBTASK ARCH-001.2: Refactor pricing, orders, and invoices to use the billing service
**Priority**: High
**Complexity**: Complex

**Context**:
Existing endpoints implement their own pricing/tax/shipping logic, duplicating rules and creating risk of inconsistency.

**Objective**:
Refactor key endpoints to delegate all monetary calculations to the billing service.

**Implementation Steps**:
1. Update `/api/pricing/calculate` to call `billingService.calculateItemPrice` instead of inline logic while preserving existing response shape.
2. Update `/api/orders/calculate-total` to call `billingService.calculateOrderTotals` using cart items and any applicable promotions.
3. Update `/api/invoices/generate` to call `billingService.calculateInvoiceTotals` so invoice totals always match order totals.

**Files to Modify**:
- `apps/web/app/api/pricing/calculate/route.ts`
- `apps/web/app/api/orders/calculate-total/route.ts`
- `apps/web/app/api/invoices/generate/route.ts`

**Acceptance Criteria**:
- [ ] All three endpoints use the billing service for calculations.
- [ ] For given inputs, totals remain consistent before and after refactor (or differences are explicitly documented as fixes).

**Testing**:
- Add regression tests that compare pre-refactor fixtures to post-refactor outputs.

**Dependencies**: ARCH-001.1

---

### SUBTASK ARCH-001.3: Implement batch pricing endpoint and update consumers
**Priority**: High
**Complexity**: Moderate

**Context**:
`CartViewWithPricing` and `/api/orders/calculate-total` currently issue one `/api/pricing/calculate` call per cart item, leading to N+1 HTTP calls.

**Objective**:
Provide a batch pricing API to calculate prices for multiple items in a single call and update consumers to use it.

**Implementation Steps**:
1. Add a new endpoint `POST /api/pricing/batch-calculate` that accepts an array of item payloads and returns an array of pricing results, delegating to the billing service.
2. Refactor `CartViewWithPricing` and any other multi-item callers to use the batch endpoint instead of per-item calls.
3. Update `/api/orders/calculate-total` to call billing service functions directly in-process rather than via HTTP for each item.

**Files to Modify**:
- `apps/web/app/api/pricing/batch-calculate/route.ts` – new route.
- `apps/web/components/CartViewWithPricing.tsx` – update to use batch endpoint.
- `apps/web/app/api/orders/calculate-total/route.ts` – in-process billing calls.

**Acceptance Criteria**:
- [ ] Batch endpoint returns correct results for multiple items and handles errors per item gracefully.
- [ ] Cart and order flows perform significantly fewer HTTP requests for pricing.

**Testing**:
- Add tests for batch endpoint with mixed valid/invalid items.
- Measure request count and latency before vs. after changes in a staging environment.

**Dependencies**: ARCH-001.1, ARCH-001.2


---

## PARENT TASK ARCH-002: Introduce secure cart API layer and reinforce RLS
**Priority**: High
**Category**: Architecture / Security
**Overview**: Move critical cart mutations from client-side Supabase calls into a dedicated API layer while keeping RLS as a backstop, reducing duplication and tightening business invariants.
**Dependencies**: SEC-003, ARCH-001

---

### SUBTASK ARCH-002.1: Implement `/api/cart` endpoints wrapping Supabase mutations
**Priority**: High
**Complexity**: Moderate

**Context**:
Cart operations (add/remove/update) are currently executed directly from the browser using Supabase, relying solely on RLS for enforcement and scattering business rules.

**Objective**:
Create a small set of REST endpoints that own cart mutations and enforce business rules server-side.

**Implementation Steps**:
1. Add routes under `apps/web/app/api/cart/` (e.g., `POST` add, `PATCH` update, `DELETE` remove) using Supabase server client and RLS.
2. Validate quantities, product existence, and ownership (`auth.getUser` + `profiles.current_organization_id`) before writing.
3. Return normalized cart item payloads for frontend consumption.

**Files to Modify**:
- `apps/web/app/api/cart/route.ts` (and subroutes) – new handlers.

**Acceptance Criteria**:
- [ ] All cart mutations are supported via `/api/cart` endpoints.
- [ ] Server validates ownership, quantities, and product status before writing.

**Testing**:
- Add integration tests for add/update/remove scenarios, including invalid product IDs and unauthorized access.

**Dependencies**: SEC-003.1, SEC-003.3

---

### SUBTASK ARCH-002.2: Update web cart components to use cart API endpoints
**Priority**: High
**Complexity**: Moderate

**Context**:
`CartViewWithPricing` and related components currently call Supabase directly to mutate `cart_items`.

**Objective**:
Refactor cart UI to use the new `/api/cart` endpoints, keeping Supabase client usage read-only where possible.

**Implementation Steps**:
1. Identify all cart-mutation call sites (e.g., `CartViewWithPricing`, cart hooks) and replace direct Supabase writes with `fetch` calls to `/api/cart`.
2. Preserve optimistic UI where appropriate by updating local state based on API responses.
3. Ensure CSRF tokens are attached to cart mutation requests.

**Files to Modify**:
- `apps/web/components/CartViewWithPricing.tsx`
- Any cart-related hooks/components under `apps/web`.

**Acceptance Criteria**:
- [ ] Cart UI uses `/api/cart` endpoints for all mutations.
- [ ] Direct browser writes to `cart_items` are removed from UI code.

**Testing**:
- Run E2E tests for cart flows (add/update/remove) and verify correct behavior.

**Dependencies**: ARCH-002.1, SEC-003.2

---

### SUBTASK ARCH-002.3: Review and tighten RLS for cart and order tables
**Priority**: High
**Complexity**: Moderate

**Context**:
RLS policies for `cart_items`, `orders`, and `order_items` must align with the new API pattern and ensure users can only see and modify their own data.

**Objective**:
Audit and, if necessary, adjust RLS to reflect that all writes go through the cart/order APIs while keeping read access scoped to the correct user/org.

**Implementation Steps**:
1. Review RLS policies for `cart_items`, `orders`, and `order_items` in the Supabase migrations.
2. Ensure policies reference `auth.uid()` and, where appropriate, organization membership, matching the API-level checks.
3. Add comments in the RLS migration files explaining the intended access pattern.

**Files to Modify**:
- `supabase/migrations/*` affecting `cart_items`, `orders`, `order_items` RLS.

**Acceptance Criteria**:
- [ ] RLS policies prevent users from reading or mutating other users' or orgs' carts and orders.
- [ ] API integration tests confirm forbidden access is blocked at the DB level.

**Testing**:
- Write tests that attempt cross-user/cart access via API and direct Supabase client.

**Dependencies**: ARCH-002.1, SEC-003.3

---

## PARENT TASK ARCH-003: Finalize chatbot and email automation service layer
**Priority**: Medium
**Category**: Architecture / AI
**Overview**: Complete and centralize chatbot and email automation logic so that AI-driven flows share common services and respect ownership, opt-out, and logging requirements.
**Dependencies**: SEC-002, SEC-003

---

### SUBTASK ARCH-003.1: Implement `ChatbotService` methods and align API usage
**Priority**: Medium
**Complexity**: Moderate

**Context**:
`packages/shared/src/services/chatbot-service.ts` contains stubbed methods while chatbot endpoints operate directly on `chatbot_conversations`.

**Objective**:
Provide a fully implemented `ChatbotService` used by chatbot APIs for conversation management.

**Implementation Steps**:
1. Implement CRUD and helper methods in `ChatbotService` using existing Supabase types and current endpoint behavior as reference.
2. Refactor `/api/chatbot/**` routes to call `ChatbotService` instead of duplicating logic.
3. Ensure all operations enforce user ownership of conversations.

**Files to Modify**:
- `packages/shared/src/services/chatbot-service.ts`
- `apps/web/app/api/chatbot/**/route.ts`

**Acceptance Criteria**:
- [ ] All chatbot endpoints delegate to `ChatbotService`.
- [ ] No stubbed or unused methods remain.

**Testing**:
- Add unit tests for `ChatbotService` and integration tests for chatbot flows.

**Dependencies**: None

---

### SUBTASK ARCH-003.2: Centralize email routing and auto-response logic
**Priority**: Medium
**Complexity**: Moderate

**Context**:
Routing and auto-response behavior for processed emails is spread between `/api/webhooks/email` and admin email routes.

**Objective**:
Move routing and auto-response rules into a shared service that can be reused and tested in isolation.

**Implementation Steps**:
1. Create a service module (e.g., `packages/shared/src/services/email-routing-service.ts`) encapsulating routing and auto-response logic.
2. Refactor `/api/webhooks/email` background processing and `/api/admin/emails/*` endpoints to use this service.
3. Ensure lead/account ownership, opt-out, and activity logging rules are enforced consistently.

**Files to Modify**:
- `packages/shared/src/services/email-routing-service.ts`
- `apps/web/app/api/webhooks/email/route.ts`
- `apps/web/app/api/admin/emails/**/route.ts`

**Acceptance Criteria**:
- [ ] Email routing logic resides in a single shared service.
- [ ] All relevant endpoints call into this service.

**Testing**:
- Add unit tests for routing/auto-response scenarios with different classifications and lead states.

**Dependencies**: SEC-002.2, SEC-002.4

---

### SUBTASK ARCH-003.3: Enforce opt-out and logging semantics across AI automations
**Priority**: Medium
**Complexity**: Moderate

**Context**:
AI-driven emails and chatbot interactions must respect unsubscribe/opt-out flags and consistently record `lead_activities` for compliance and analytics.

**Objective**:
Ensure all automation entry points enforce opt-out checks and log standardized activities.

**Implementation Steps**:
1. Identify where opt-out flags live (e.g., on `leads`, `email_campaign_recipients`) and define a helper that checks them.
2. Update campaign sending, inbound email routing, and chatbot lead-capture flows to use this helper before sending or logging actions.
3. Standardize `lead_activities` event types and payload structure.

**Files to Modify**:
- `packages/shared/src/services/email-routing-service.ts` (or related helpers)
- `apps/web/app/api/admin/campaigns/**/route.ts`
- `apps/web/app/api/webhooks/email/route.ts`
- `apps/web/app/api/chatbot/**/route.ts`

**Acceptance Criteria**:
- [ ] No AI-driven email or chatbot message is sent to leads who have opted out.
- [ ] All significant AI-driven actions create consistent `lead_activities` records.

**Testing**:
- Add tests covering opt-out scenarios and activity logging for campaigns, inbound emails, and chatbot interactions.

**Dependencies**: ARCH-003.2, SEC-002


---

## PARENT TASK TEST-001: Expand integration, E2E, and security tests
**Priority**: High
**Category**: Testing / Security
**Overview**: Add automated coverage for critical auth, pricing, cart, invoice, and webhook flows so regressions are caught early and security guarantees are enforced.
**Dependencies**: SEC-001, SEC-002, SEC-003, ARCH-001, ARCH-002

---

### SUBTASK TEST-001.1: Add API integration tests for core flows
**Priority**: High
**Complexity**: Complex

**Context**:
Many endpoints are well-structured but lack comprehensive automated tests verifying end-to-end behavior across Supabase and business logic.

**Objective**:
Create API-level tests that exercise auth, magic-link, pricing, cart, orders, invoices, and lead flows using real Supabase test instances.

**Implementation Steps**:
1. Set up an API integration test harness (e.g., Jest or Vitest) configured to run against a local/staging Supabase instance with seed data.
2. Write tests covering: magic-link request/verify, `/api/pricing/calculate` and `/api/pricing/batch-calculate`, `/api/orders/calculate-total`, `/api/invoices/generate`, `/api/leads/create`, and `/api/cart` endpoints.
3. Ensure tests assert both success paths and common failure modes (invalid tokens, missing auth, wrong org).

**Files to Modify**:
- `apps/web/tests/api/**` – new integration test files.
- Test config (e.g., `jest.config.ts` or `vitest.config.ts`).

**Acceptance Criteria**:
- [ ] Automated tests cover all listed endpoints and run in CI.
- [ ] Tests fail on breaking changes to auth or pricing contracts.

**Testing**:
- Run the integration test suite locally and in CI; ensure deterministic results.

**Dependencies**: ARCH-001, ARCH-002, SEC-003

---

### SUBTASK TEST-001.2: Add Playwright E2E flows for key user journeys
**Priority**: High
**Complexity**: Complex

**Context**:
End-to-end behavior (including real Gemini/SendGrid/Supabase interactions) must be validated from the user perspective for production readiness.

**Objective**:
Define and automate Playwright scenarios for critical journeys: lead capture → account creation, browse → cart → checkout → invoice, and AI campaign flows.

**Implementation Steps**:
1. Extend existing Playwright setup to include scenarios for: public lead form submission, magic-link login, product browsing, cart management, checkout, invoice viewing, and admin AI campaign sending.
2. Configure tests to use real Gemini APIs and staging SendGrid where feasible, with safe test accounts.
3. Ensure tests run with `wait=false` in CI as per project conventions, and capture artifacts (screenshots, logs) for failures.

**Files to Modify**:
- `apps/web/tests/e2e/**` – new Playwright specs.
- Playwright config (e.g., `playwright.config.ts`).

**Acceptance Criteria**:
- [ ] E2E tests cover the defined journeys and pass consistently in CI.
- [ ] Failures surface real integration issues (auth, pricing, webhooks) rather than flakiness.

**Testing**:
- Run the Playwright suite locally and in CI; tune timeouts and selectors for stability.

**Dependencies**: TEST-001.1, SEC-002

---

### SUBTASK TEST-001.3: Add targeted security regression tests
**Priority**: High
**Complexity**: Moderate

**Context**:
Critical security fixes (disabled migration API, webhook signatures, CSRF coverage) need regression tests so they are never inadvertently reverted.

**Objective**:
Automate tests that assert the absence or locked-down behavior of previously risky endpoints and features.

**Implementation Steps**:
1. Add tests that confirm `/api/admin/apply-migration` returns 404/403 in non-dev environments.
2. Add tests that send unsigned/incorrectly signed webhook requests and assert 401 responses with no DB changes.
3. Add tests that omit CSRF tokens on protected routes and assert 403 responses.

**Files to Modify**:
- `apps/web/tests/security/**` – new security-focused test files.

**Acceptance Criteria**:
- [ ] Tests fail if the migration API becomes reachable in production builds.
- [ ] Tests fail if webhook signature checks are removed or bypassed.
- [ ] Tests fail if CSRF middleware is removed from protected routes.

**Testing**:
- Run security test suite as part of CI; verify failures are clear and actionable.

**Dependencies**: SEC-001, SEC-002, SEC-003

---

## PARENT TASK DOC-001: Update architecture and ops documentation
**Priority**: Medium
**Category**: Documentation / Architecture
**Overview**: Align documentation and analysis artifacts with the updated architecture, security posture, and operational practices so new team members can work without reading the original audit.
**Dependencies**: All previous parent tasks

---

### SUBTASK DOC-001.1: Update architecture and security documentation
**Priority**: Medium
**Complexity**: Moderate

**Context**:
Existing docs and diagrams do not fully reflect the unified billing service, cart API layer, webhook security, and admin client patterns.

**Objective**:
Produce up-to-date docs that describe the new architecture and security model in one place.

**Implementation Steps**:
1. Update or create docs under `docs/` (e.g., `docs/architecture_overview.md`, `docs/security_model.md`) to cover: admin client usage, webhook verification, cart API, billing service, and RLS strategy.
2. Include diagrams or sequence flows for key data paths (auth, cart→order→invoice, campaigns, inbound email).
3. Link these docs from `docs/README.md` and any relevant onboarding material.

**Files to Modify**:
- `docs/architecture_overview.md`
- `docs/security_model.md`
- `docs/README.md`

**Acceptance Criteria**:
- [ ] Documentation explains how each major domain works end-to-end with updated patterns.
- [ ] Security-sensitive flows (admin, webhooks, cart) are clearly described.

**Testing**:
- Have at least one engineer unfamiliar with the changes read the docs and confirm they can understand how to implement a new feature safely.

**Dependencies**: SEC-001–SEC-003, ARCH-001–ARCH-003

---

### SUBTASK DOC-001.2: Refresh analysis artifacts and maintenance process
**Priority**: Medium
**Complexity**: Simple

**Context**:
`implementation_analysis.json` and `database_analysis.json` are partially outdated, which can mislead future tooling and developers.

**Objective**:
Regenerate or clearly mark these artifacts and document how to keep them in sync with the codebase.

**Implementation Steps**:
1. Run the existing analysis scripts (e.g., `scripts/archive/analyze_database.py` and any TS tools) to regenerate the JSON artifacts against the current schema and code.
2. If regeneration is not desirable, add comments or a short `docs/analysis_artifacts.md` explaining their snapshot status and how to update them.
3. Add a short section to the contribution guide outlining when and how to refresh these files.

**Files to Modify**:
- `database_analysis.json`
- `implementation_analysis.json`
- `docs/analysis_artifacts.md`
- `docs/CONTRIBUTING.md` or equivalent.

**Acceptance Criteria**:
- [ ] Analysis artifacts are either up-to-date or clearly labeled as snapshots.
- [ ] There is a documented process for refreshing them.

**Testing**:
- Run the documented commands in a clean environment and verify they reproduce the artifacts.

**Dependencies**: None

---

## Implementation Checklist
- [ ] SEC-001: Lock down Supabase service-role usage and migrations
  - [ ] SEC-001.1
  - [ ] SEC-001.2
  - [ ] SEC-001.3
- [ ] SEC-002: Secure email and SendGrid webhooks
  - [ ] SEC-002.1
  - [ ] SEC-002.2
  - [ ] SEC-002.3
  - [ ] SEC-002.4
- [ ] SEC-003: Standardize auth, CSRF, and RLS coverage
  - [ ] SEC-003.1
  - [ ] SEC-003.2
  - [ ] SEC-003.3
- [ ] ARCH-001: Unify pricing, tax, shipping, and batch pricing
  - [ ] ARCH-001.1
  - [ ] ARCH-001.2
  - [ ] ARCH-001.3
- [ ] ARCH-002: Introduce secure cart API layer and reinforce RLS
  - [ ] ARCH-002.1
  - [ ] ARCH-002.2
  - [ ] ARCH-002.3
- [ ] ARCH-003: Finalize chatbot and email automation service layer
  - [ ] ARCH-003.1
  - [ ] ARCH-003.2
  - [ ] ARCH-003.3
- [ ] TEST-001: Expand integration, E2E, and security tests
  - [ ] TEST-001.1
  - [ ] TEST-001.2
  - [ ] TEST-001.3
- [ ] DOC-001: Update architecture and ops documentation
  - [ ] DOC-001.1
  - [ ] DOC-001.2
