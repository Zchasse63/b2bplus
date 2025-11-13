# B2B+ Platform - Priority Task List

## 🔴 CRITICAL FIXES (Start Immediately)

### TASK-001: Fix Reorder API Table Reference
**Priority:** P0 - Blocker  
**File:** `apps/web/app/api/orders/reorder/route.ts`  
**Line:** 32  
**Issue:** References non-existent `users` table instead of `profiles`

**Steps:**
1. [ ] Change `from('users')` to `from('profiles')`
2. [ ] Change `select('organization_id')` to `select('current_organization_id')`
3. [ ] Update variable name from `userData` to `profileData` for clarity
4. [ ] Test reorder functionality end-to-end
5. [ ] Add unit test for reorder API endpoint

**Estimated Time:** 1 hour

---

### TASK-002: Fix Cart Pricing to Use Calculated Prices
**Priority:** P0 - Critical  
**File:** `apps/web/components/CartView.tsx`  
**Lines:** 161, multiple locations

**Steps:**
1. [ ] Remove `calculateTotal()` function using `base_price`
2. [ ] Create new API endpoint `/api/cart/calculate-totals`
3. [ ] Call pricing calculation API for each cart item
4. [ ] Update cart display to show:
   - Base price (crossed out if discounted)
   - Calculated price with discounts
   - Discount percentage badge
5. [ ] Update checkout to use calculated totals
6. [ ] Add loading state during price calculation
7. [ ] Cache pricing results for 5 minutes
8. [ ] Test with various discount scenarios

**Estimated Time:** 4 hours

---

### TASK-003: Add Organization Approval Check to Checkout
**Priority:** P0 - Critical  
**File:** `apps/web/app/(customer)/checkout/page.tsx`

**Steps:**
1. [ ] Query organization approval_status in checkout page
2. [ ] Block checkout if status is 'pending' or 'rejected'
3. [ ] Show appropriate message for each status
4. [ ] Add same check to cart page
5. [ ] Add check to order API endpoint as backup
6. [ ] Create reusable `requireApprovedOrganization` helper
7. [ ] Test with different approval statuses
8. [ ] Add E2E test for blocked checkout

**Estimated Time:** 3 hours

---

### TASK-004: Implement Real Risk Assessment Data
**Priority:** P0 - Critical  
**File:** `apps/web/lib/ai/order-risk-assessment.ts`  
**Lines:** 309-323

**Steps:**
1. [ ] Create `payment_failures` table with schema
2. [ ] Create `order_returns` table with schema
3. [ ] Create `customer_disputes` table with schema
4. [ ] Add RLS policies for new tables
5. [ ] Replace mock data in `getCustomerHistory()`:
   - [ ] Query actual payment failures
   - [ ] Query actual returns count
   - [ ] Query actual disputes count
6. [ ] Add indexes for performance
7. [ ] Update risk calculation tests
8. [ ] Verify risk scores are accurate

**Estimated Time:** 6 hours

---

### TASK-005: Fix Checkout Total Calculation (Server-Side)
**Priority:** P0 - Critical  
**File:** `apps/web/app/(customer)/checkout/page.tsx`  
**Lines:** 156-161

**Steps:**
1. [ ] Remove client-side total calculation
2. [ ] Create `/api/orders/calculate-total` endpoint
3. [ ] Server-side calculation should include:
   - [ ] Product pricing (with all discounts)
   - [ ] Tax calculation
   - [ ] Shipping cost
   - [ ] Promotional code discounts
4. [ ] Update order creation to use server-calculated total
5. [ ] Validate submitted total matches calculated total
6. [ ] Return error if totals don't match
7. [ ] Add comprehensive tests
8. [ ] Log any discrepancies for fraud detection

**Estimated Time:** 5 hours

---

### TASK-006: Implement CSRF Protection on All Routes
**Priority:** P0 - Critical  
**Files:** Multiple API routes

**Steps:**
1. [ ] Audit all API routes for state-changing operations
2. [ ] Apply `withCSRFProtection` to POST routes:
   - [ ] `/api/orders/**`
   - [ ] `/api/cart/**`
   - [ ] `/api/pricing/**`
   - [ ] `/api/admin/**`
   - [ ] `/api/invoices/**`
3. [ ] Update frontend to fetch and include CSRF token:
   - [ ] Create `useCSRFToken` hook
   - [ ] Add token to all fetch/axios requests
   - [ ] Handle token refresh on expiry
4. [ ] Test all protected endpoints
5. [ ] Add automated tests for CSRF protection
6. [ ] Document CSRF requirements for new endpoints

**Estimated Time:** 6 hours

---

### TASK-007: Fix Rate Limiting Fail-Open Vulnerability
**Priority:** P0 - Critical  
**File:** `apps/web/lib/middleware/rate-limit.ts`  
**Lines:** 82-87

**Steps:**
1. [ ] Change fail-open to fail-closed (reject on error)
2. [ ] Implement in-memory fallback rate limiter using Map
3. [ ] Add cache for rate limit state (30 second TTL)
4. [ ] Add retry logic for Redis connection
5. [ ] Add monitoring/alerting for rate limit failures
6. [ ] Test Redis failure scenarios
7. [ ] Document fallback behavior
8. [ ] Add circuit breaker pattern

**Estimated Time:** 4 hours

---

### TASK-008: Strengthen Magic Link Password Generation
**Priority:** P0 - Critical  
**File:** `apps/web/app/api/auth/magic-link/verify/route.ts`  
**Line:** 159

**Steps:**
1. [ ] Replace `crypto.randomUUID()` with strong password generation
2. [ ] Create `generateSecurePassword()` helper:
   - Minimum 32 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Cryptographically random
3. [ ] Store hashed password only
4. [ ] Consider passwordless approach (remove password field)
5. [ ] Add password reset flow for users who need passwords
6. [ ] Test account creation flow
7. [ ] Update documentation

**Estimated Time:** 3 hours

---

### TASK-009: Fix Admin Authorization to Check Org Roles
**Priority:** P0 - Critical  
**File:** `apps/web/lib/middleware/admin.ts`  
**Lines:** 35-40

**Steps:**
1. [ ] Modify `checkAdminRole` to accept optional `organizationId`
2. [ ] Query `organization_members` table for role
3. [ ] Implement two-level check:
   - Platform admin (profiles.role = 'admin' | 'super_admin')
   - Organization admin (organization_members.role = 'admin' | 'owner')
4. [ ] Update all admin API routes to pass organization context
5. [ ] Add tests for authorization scenarios
6. [ ] Document admin permission model
7. [ ] Audit all admin endpoints

**Estimated Time:** 5 hours

---

### TASK-010: Optimize Header Component Data Fetching
**Priority:** P0 - Critical  
**File:** `apps/web/components/Header.tsx`  
**Lines:** 23-47

**Steps:**
1. [ ] Create `AuthContext` with user, cart count, admin status
2. [ ] Move data fetching to context provider
3. [ ] Implement cart count update function in context
4. [ ] Remove useEffect from Header component
5. [ ] Subscribe to cart changes using Supabase realtime
6. [ ] Add optimistic updates for cart count
7. [ ] Test performance improvements
8. [ ] Measure reduction in API calls

**Estimated Time:** 4 hours

---

## 🟠 HIGH PRIORITY FIXES (Week 2)

### TASK-011: Fix CSP to Remove 'unsafe-inline' and 'unsafe-eval'
**Priority:** P1  
**File:** `apps/web/next.config.js`

**Steps:**
1. [ ] Audit all inline scripts and styles
2. [ ] Move inline scripts to external files
3. [ ] Implement nonce-based CSP
4. [ ] Configure Next.js to inject nonces
5. [ ] Update CSP header to remove unsafe directives
6. [ ] Test all functionality
7. [ ] Monitor for CSP violations in production

**Estimated Time:** 6 hours

---

### TASK-012: Implement Inventory Management
**Priority:** P1

**Steps:**
1. [ ] Add `quantity_available` field to products table
2. [ ] Create inventory transaction log table
3. [ ] Implement inventory deduction on order creation
4. [ ] Add inventory reservation for pending orders
5. [ ] Create inventory replenishment workflow
6. [ ] Add low-stock alerts
7. [ ] Implement inventory reports
8. [ ] Add real-time stock updates

**Estimated Time:** 8 hours

---

### TASK-013: Add Unique Constraint for Cart Items
**Priority:** P1  
**File:** Database migration

**Steps:**
1. [ ] Create migration to add unique constraint
2. [ ] Handle existing duplicates (merge quantities)
3. [ ] Update cart add logic to handle constraint
4. [ ] Add database-level validation
5. [ ] Test duplicate prevention
6. [ ] Update API error handling

**Estimated Time:** 3 hours

---

### TASK-014: Add Database Indexes for Performance
**Priority:** P1

**Steps:**
1. [ ] Analyze slow queries using Supabase logs
2. [ ] Add indexes on foreign keys:
   - [ ] `orders.customer_id`
   - [ ] `orders.organization_id`
   - [ ] `order_items.order_id`
   - [ ] `order_items.product_id`
   - [ ] `cart_items.user_id`
   - [ ] `invoices.organization_id`
3. [ ] Add composite indexes for RLS policies
4. [ ] Add indexes on frequently filtered columns
5. [ ] Test query performance improvements
6. [ ] Document index strategy

**Estimated Time:** 4 hours

---

### TASK-015: Validate Magic Link Token Requirements
**Priority:** P1  
**File:** `apps/web/app/api/auth/magic-link/request/route.ts`

**Steps:**
1. [ ] Add validation to ensure user_id OR lead_id exists
2. [ ] Return error if neither can be determined
3. [ ] Add better error messages for failed lookups
4. [ ] Log token creation failures
5. [ ] Add retry logic for temporary failures
6. [ ] Test edge cases

**Estimated Time:** 2 hours

---

### TASK-016: Add Loading States Throughout Application
**Priority:** P1  
**Files:** Multiple components

**Steps:**
1. [ ] Create reusable loading components:
   - [ ] Spinner
   - [ ] Skeleton for product cards
   - [ ] Skeleton for order list
   - [ ] Progress bar
2. [ ] Add loading states to:
   - [ ] Product list page
   - [ ] Cart page
   - [ ] Checkout page
   - [ ] Order history
   - [ ] Profile page
3. [ ] Add loading overlay for async actions
4. [ ] Test user experience

**Estimated Time:** 5 hours

---

### TASK-017: Fix Pricing Service Date Validation
**Priority:** P1  
**File:** `packages/shared/src/services/pricing.service.ts`

**Steps:**
1. [ ] Convert all dates to UTC for comparison
2. [ ] Add timezone handling utility functions
3. [ ] Validate date ranges properly
4. [ ] Test with different timezones
5. [ ] Add date validation tests
6. [ ] Document date handling approach

**Estimated Time:** 3 hours

---

### TASK-018: Implement AI Input Sanitization
**Priority:** P1  
**Files:** All AI integration files

**Steps:**
1. [ ] Create `sanitizeAIInput()` function
2. [ ] Remove prompt injection attempts:
   - [ ] "Ignore previous instructions"
   - [ ] System prompt override attempts
   - [ ] Command injection patterns
3. [ ] Limit input length
4. [ ] Escape special characters
5. [ ] Apply to all AI prompt inputs
6. [ ] Add tests for injection attempts
7. [ ] Monitor for bypass attempts

**Estimated Time:** 4 hours

---

### TASK-019: Add Transaction Handling for Orders
**Priority:** P1  
**File:** `apps/web/app/(customer)/checkout/page.tsx`

**Steps:**
1. [ ] Create Supabase RPC function `create_order_with_items`
2. [ ] Implement database transaction in RPC
3. [ ] Handle rollback on any failure
4. [ ] Update frontend to call RPC function
5. [ ] Add comprehensive error handling
6. [ ] Test failure scenarios
7. [ ] Add transaction monitoring

**Estimated Time:** 5 hours

---

### TASK-020: Fix usePricing Hook Dependencies
**Priority:** P1  
**File:** `apps/web/hooks/usePricing.ts`

**Steps:**
1. [ ] Add missing dependencies to useEffect
2. [ ] Use useCallback for fetchPricing
3. [ ] Implement abort controller for cleanup
4. [ ] Add debouncing for rapid changes
5. [ ] Test hook behavior
6. [ ] Add unit tests

**Estimated Time:** 2 hours

---

## 🟡 MEDIUM PRIORITY (Week 3-4)

### TASK-021: Standardize Error Handling
**Priority:** P2  
**Estimated Time:** 6 hours

**Steps:**
1. [ ] Replace all `console.error` with `logger`
2. [ ] Create error classification system
3. [ ] Implement proper error boundaries
4. [ ] Add error monitoring dashboards
5. [ ] Create error handling documentation

---

### TASK-022: Implement Redis Caching Layer
**Priority:** P2  
**Estimated Time:** 8 hours

**Steps:**
1. [ ] Set up Redis connection
2. [ ] Cache product pricing (5 min TTL)
3. [ ] Cache customer context (10 min TTL)
4. [ ] Cache organization data (30 min TTL)
5. [ ] Implement cache invalidation
6. [ ] Monitor cache hit rates

---

### TASK-023: Add Toast Notification Timeouts
**Priority:** P2  
**Estimated Time:** 2 hours

**Steps:**
1. [ ] Add default duration to toast hook
2. [ ] Categorize by severity (success, error, warning)
3. [ ] Make persistent toasts dismissible
4. [ ] Test across all toast usage

---

### TASK-024: Implement Email Verification
**Priority:** P2  
**Estimated Time:** 5 hours

**Steps:**
1. [ ] Add email verification flow
2. [ ] Send confirmation email on signup
3. [ ] Block actions until verified
4. [ ] Add resend verification option
5. [ ] Test verification flow

---

### TASK-025: Add Pricing Audit Trail
**Priority:** P2  
**Estimated Time:** 4 hours

**Steps:**
1. [ ] Create `pricing_history` table
2. [ ] Add triggers for price changes
3. [ ] Create audit log viewer for admins
4. [ ] Add price change notifications
5. [ ] Test audit trail completeness

---

### TASK-026: Optimize Chatbot Message History
**Priority:** P2  
**Estimated Time:** 3 hours

**Steps:**
1. [ ] Limit conversation history to last 20 messages
2. [ ] Implement pagination for old messages
3. [ ] Add conversation archiving
4. [ ] Optimize database queries
5. [ ] Test performance improvements

---

### TASK-027: Implement Real-time Cart Updates
**Priority:** P2  
**Estimated Time:** 4 hours

**Steps:**
1. [ ] Use Supabase realtime subscriptions
2. [ ] Update cart count on changes
3. [ ] Show toast when items added
4. [ ] Handle concurrent updates
5. [ ] Test real-time behavior

---

### TASK-028: Add Order Status Transition Validation
**Priority:** P2  
**Estimated Time:** 4 hours

**Steps:**
1. [ ] Define valid status transitions
2. [ ] Add validation to order update endpoints
3. [ ] Prevent invalid status changes
4. [ ] Add audit log for status changes
5. [ ] Test all transitions

---

### TASK-029: Refactor Magic Link Verification
**Priority:** P2  
**Estimated Time:** 5 hours

**Steps:**
1. [ ] Break into smaller functions
2. [ ] Separate concerns (user/lead/verification)
3. [ ] Improve error handling
4. [ ] Add comprehensive logging
5. [ ] Add unit tests
6. [ ] Improve code readability

---

### TASK-030: Implement Session Timeout
**Priority:** P2  
**Estimated Time:** 3 hours

**Steps:**
1. [ ] Configure Supabase session timeout
2. [ ] Add activity tracking
3. [ ] Show warning before logout
4. [ ] Implement "stay logged in" option
5. [ ] Test timeout behavior

---

## 🔵 IMPROVEMENTS (Ongoing)

### TASK-031: Enable TypeScript Strict Mode
**Priority:** P3  
**Estimated Time:** 12 hours

**Steps:**
1. [ ] Enable strict mode in tsconfig.json
2. [ ] Fix all type errors systematically
3. [ ] Add proper type definitions
4. [ ] Remove any `any` types
5. [ ] Add strict null checks

---

### TASK-032: Add Unit Tests for Business Logic
**Priority:** P3  
**Estimated Time:** 16 hours

**Steps:**
1. [ ] Test pricing calculations
2. [ ] Test order creation logic
3. [ ] Test risk assessment
4. [ ] Test cart operations
5. [ ] Achieve 80% coverage on business logic

---

### TASK-033: Implement API Versioning
**Priority:** P3  
**Estimated Time:** 8 hours

**Steps:**
1. [ ] Design versioning strategy (URL-based)
2. [ ] Create `/api/v1/` routes
3. [ ] Version all existing endpoints
4. [ ] Add deprecation warnings
5. [ ] Document versioning policy

---

### TASK-034: Add Comprehensive API Logging
**Priority:** P3  
**Estimated Time:** 6 hours

**Steps:**
1. [ ] Log all requests with correlation IDs
2. [ ] Log response times
3. [ ] Log errors with context
4. [ ] Create log analysis dashboards
5. [ ] Implement log retention policy

---

### TASK-035: Implement Feature Flags
**Priority:** P3  
**Estimated Time:** 8 hours

**Steps:**
1. [ ] Set up feature flag system (use existing table)
2. [ ] Create admin UI for flag management
3. [ ] Implement flag checking middleware
4. [ ] Add user/org targeting
5. [ ] Document feature flag usage

---

### TASK-036: Create API Documentation
**Priority:** P3  
**Estimated Time:** 12 hours

**Steps:**
1. [ ] Set up OpenAPI/Swagger
2. [ ] Document all public endpoints
3. [ ] Add request/response examples
4. [ ] Generate interactive API docs
5. [ ] Keep documentation in sync with code

---

### TASK-037: Optimize Bundle Size
**Priority:** P3  
**Estimated Time:** 6 hours

**Steps:**
1. [ ] Analyze bundle with webpack-bundle-analyzer
2. [ ] Remove unused dependencies
3. [ ] Implement code splitting
4. [ ] Lazy load heavy components
5. [ ] Measure improvements

---

### TASK-038: Implement E2E Tests
**Priority:** P3  
**Estimated Time:** 16 hours

**Steps:**
1. [ ] Set up Playwright (already configured)
2. [ ] Write tests for critical flows:
   - [ ] User registration and login
   - [ ] Product browsing and search
   - [ ] Add to cart and checkout
   - [ ] Order placement
   - [ ] Admin workflows
3. [ ] Run tests in CI/CD pipeline

---

### TASK-039: Add Product Image CDN
**Priority:** P3  
**Estimated Time:** 6 hours

**Steps:**
1. [ ] Configure Cloudflare or CloudFront
2. [ ] Upload product images to CDN
3. [ ] Update image URLs
4. [ ] Add image optimization
5. [ ] Test image loading performance

---

### TASK-040: Implement Connection Pooling
**Priority:** P3  
**Estimated Time:** 4 hours

**Steps:**
1. [ ] Configure Supabase connection pooling
2. [ ] Optimize connection settings
3. [ ] Monitor connection usage
4. [ ] Add connection retry logic
5. [ ] Test under load

---

## 📊 Task Summary

**Total Tasks:** 40

**By Priority:**
- P0 (Critical): 10 tasks (~40 hours)
- P1 (High): 10 tasks (~45 hours)
- P2 (Medium): 10 tasks (~48 hours)
- P3 (Improvements): 10 tasks (~94 hours)

**Total Estimated Time:** ~227 hours (~6 weeks with 1 developer)

---

## 🗓️ Sprint Planning

### Sprint 1 (Week 1): Critical Fixes
- TASK-001 through TASK-010
- **Goal:** Fix all P0 issues
- **Time:** 40 hours

### Sprint 2 (Week 2): Security & Performance
- TASK-011 through TASK-020
- **Goal:** Harden security and fix high-priority bugs
- **Time:** 45 hours

### Sprint 3 (Week 3): Stability & UX
- TASK-021 through TASK-025
- **Goal:** Improve error handling and user experience
- **Time:** 25 hours

### Sprint 4 (Week 4): Polish & Optimization
- TASK-026 through TASK-030
- **Goal:** Optimize performance and polish features
- **Time:** 23 hours

### Sprint 5-6 (Ongoing): Improvements
- TASK-031 through TASK-040
- **Goal:** Long-term code quality and testing
- **Time:** 94 hours (split over multiple sprints)

---

## 📝 Notes

- Each task should be worked on in a separate branch
- All tasks require code review before merging
- Critical tasks (P0) should be merged to main immediately after review
- Add automated tests for all bug fixes
- Update documentation as you go
- Monitor production after each deployment

---

## ✅ Completion Checklist

For each task:
- [ ] Code changes completed
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Code reviewed and approved
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tested in staging
- [ ] Deployed to production
- [ ] Monitored for issues
- [ ] Documentation updated

---

**Last Updated:** $(date)
**Status:** Ready for implementation
**Next Review:** After Sprint 1 completion