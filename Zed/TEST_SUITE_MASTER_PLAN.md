# 🧪 TEST SUITE MASTER PLAN

**Project:** B2B+ Platform  
**Date:** December 2024  
**Status:** Implementation Plan  
**Goal:** Achieve 80%+ test coverage with real, meaningful tests  

---

## 📊 CURRENT STATE ANALYSIS

### Existing Test Infrastructure
- ✅ Jest configured for unit/integration tests
- ✅ Playwright configured for E2E tests
- ✅ 75+ test files created
- ⚠️ **678 placeholder tests** (`expect(true).toBe(true)`)
- ⚠️ **Real tests needed** for production confidence

### Test File Breakdown
- **API Tests:** 17 files
- **Component Tests:** 50+ files
- **Integration Tests:** 1 file
- **E2E Tests:** 11 files
- **Total:** 75+ test files

### Coverage Goal
```
Global Coverage Threshold: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%
```

---

## 🎯 TEST PRIORITY MATRIX

### 🔴 P0: CRITICAL (Must Have - Week 1)
**Business Logic & Security**
1. **Authentication & Authorization**
   - Login/logout flows
   - Magic link verification
   - Session management
   - Admin role checks
   - Organization approval checks

2. **Checkout & Orders**
   - Cart operations (add, remove, update)
   - Server-side total calculation
   - Order creation transaction
   - Organization approval validation
   - Payment flow

3. **Pricing System**
   - Priority-based pricing calculation
   - Discount application
   - Promo code validation
   - Volume pricing
   - Contract pricing

4. **Security**
   - CSRF token generation/validation
   - Rate limiting (fail-closed)
   - AI input sanitization
   - SQL injection prevention
   - XSS prevention

### 🟠 P1: HIGH (Should Have - Week 2)
**Core Features**
1. **Inventory Management**
   - Stock tracking
   - Low stock alerts
   - Reorder predictions

2. **Risk Assessment**
   - Customer risk scoring
   - Payment failure tracking
   - Dispute handling
   - Return processing

3. **AI Features**
   - Chatbot message handling
   - Action detection/execution
   - Lead qualification
   - Prompt injection protection

4. **Admin Functions**
   - Campaign management
   - Pricing approval
   - Order auto-approval
   - Analytics queries

### 🟡 P2: MEDIUM (Nice to Have - Week 3)
**Supporting Features**
1. **Search & Discovery**
   - Product search
   - Semantic search
   - Visual search
   - Category filtering

2. **Notifications**
   - Email sending
   - Push notifications
   - Reorder alerts
   - Order status updates

3. **Reporting**
   - Analytics calculations
   - Customer insights
   - Sales forecasting
   - Churn prediction

### 🔵 P3: LOW (Future)
**Polish & Optimization**
1. Performance tests
2. Load tests
3. Accessibility tests
4. Visual regression tests

---

## 📋 TEST CATEGORIES

### 1. Unit Tests (Jest)
**Purpose:** Test individual functions in isolation

**Focus Areas:**
- Utility functions (logger, validators, sanitizers)
- Pricing calculations
- Risk scoring algorithms
- Date/time helpers
- String formatting
- Data transformations

**Example:**
```typescript
describe('PricingService.calculatePrice', () => {
  it('should apply price lock as highest priority', () => {
    const result = PricingService.calculatePrice(context, {
      priceLocks: [{ locked_price: 100, is_active: true }],
      // ... other pricing data
    });
    expect(result.pricing_source).toBe('price_lock');
    expect(result.unit_price).toBe(100);
  });
});
```

### 2. Integration Tests (Jest + Mocked Supabase)
**Purpose:** Test API routes and multi-component interactions

**Focus Areas:**
- API route handlers
- Database queries (mocked)
- Service integrations
- Middleware chains
- Error handling flows

**Example:**
```typescript
describe('POST /api/orders/reorder', () => {
  it('should reorder items with CSRF and rate limiting', async () => {
    // Mock auth, CSRF, rate limit
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
  });
});
```

### 3. Component Tests (Jest + React Testing Library)
**Purpose:** Test UI components in isolation

**Focus Areas:**
- User interactions
- State management
- Props handling
- Conditional rendering
- Form validation
- Error states

**Example:**
```typescript
describe('ProductCard', () => {
  it('should display product details and add to cart', () => {
    render(<ProductCard product={mockProduct} />);
    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);
    expect(mockAddToCart).toHaveBeenCalled();
  });
});
```

### 4. E2E Tests (Playwright)
**Purpose:** Test complete user journeys

**Focus Areas:**
- Authentication flows
- Complete checkout process
- Admin workflows
- AI chatbot conversations
- Search and filtering
- Mobile responsiveness

**Example:**
```typescript
test('complete checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('text=Add to Cart');
  await page.goto('/checkout');
  await page.fill('[name="poNumber"]', 'PO-12345');
  await page.click('text=Place Order');
  await expect(page.locator('text=Order Confirmed')).toBeVisible();
});
```

### 5. Database Tests (Real Supabase Instance)
**Purpose:** Test database functions, triggers, RLS policies

**Focus Areas:**
- Stored procedures
- Database functions
- Triggers
- RLS policies
- Indexes performance
- Data integrity

---

## 🔨 IMPLEMENTATION STRATEGY

### Phase 1: Critical Path (Week 1)
**Days 1-2: Security & Auth**
- [ ] CSRF protection tests
- [ ] Rate limiting tests (fail-closed verification)
- [ ] AI input sanitization tests
- [ ] Authentication flow tests
- [ ] Authorization tests (admin, org roles)
- [ ] Magic link tests

**Days 3-4: Checkout & Pricing**
- [ ] Cart operations tests
- [ ] Pricing calculation tests (all 7 priorities)
- [ ] Server-side total calculation tests
- [ ] Order creation transaction tests
- [ ] Organization approval tests
- [ ] Promo code tests

**Day 5: Review & Coverage**
- [ ] Run full test suite
- [ ] Check coverage reports
- [ ] Fix failing tests
- [ ] Document any blockers

### Phase 2: Core Features (Week 2)
**Days 1-2: Risk & Inventory**
- [ ] Risk scoring tests
- [ ] Payment failure tracking tests
- [ ] Inventory management tests
- [ ] Reorder prediction tests

**Days 3-4: AI & Admin**
- [ ] Chatbot message tests
- [ ] Lead qualification tests
- [ ] Campaign management tests
- [ ] Pricing approval tests
- [ ] Order auto-approval tests

**Day 5: Integration & E2E**
- [ ] Complete checkout E2E test
- [ ] Admin workflow E2E tests
- [ ] Chatbot conversation E2E tests

### Phase 3: Polish (Week 3)
- [ ] Search functionality tests
- [ ] Notification tests
- [ ] Analytics tests
- [ ] Performance tests
- [ ] Documentation

---

## 📐 TEST FILE STRUCTURE

```
apps/web/
├── __tests__/
│   ├── unit/                      # Pure function tests
│   │   ├── utils/
│   │   │   ├── logger.test.ts
│   │   │   ├── sanitizer.test.ts
│   │   │   └── validators.test.ts
│   │   ├── services/
│   │   │   ├── pricing.test.ts
│   │   │   ├── risk-scoring.test.ts
│   │   │   └── redis-client.test.ts
│   │   └── lib/
│   │       ├── csrf.test.ts
│   │       └── rate-limit.test.ts
│   │
│   ├── integration/               # API + multi-component
│   │   ├── api/
│   │   │   ├── auth.test.ts
│   │   │   ├── checkout.test.ts
│   │   │   ├── pricing.test.ts
│   │   │   ├── orders.test.ts
│   │   │   ├── chatbot.test.ts
│   │   │   └── admin.test.ts
│   │   ├── database/
│   │   │   ├── functions.test.ts
│   │   │   ├── triggers.test.ts
│   │   │   └── rls-policies.test.ts
│   │   └── workflows/
│   │       ├── order-flow.test.ts
│   │       └── approval-flow.test.ts
│   │
│   └── components/                # UI component tests
│       ├── cart/
│       ├── checkout/
│       ├── products/
│       └── admin/
│
├── e2e/                          # End-to-end tests
│   ├── auth.spec.ts
│   ├── customer-journey.spec.ts
│   ├── checkout-flow.spec.ts
│   ├── admin-workflows.spec.ts
│   └── chatbot.spec.ts
│
└── fixtures/                     # Test data and helpers
    ├── mock-products.ts
    ├── mock-users.ts
    └── test-helpers.ts
```

---

## 🎨 TEST PATTERNS & BEST PRACTICES

### 1. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should calculate correct total with discount', () => {
  // Arrange
  const product = createMockProduct({ price: 100 });
  const quantity = 10;
  const discount = 0.1;

  // Act
  const result = calculateTotal(product, quantity, discount);

  // Assert
  expect(result).toBe(900); // 100 * 10 * 0.9
});
```

### 2. Test Naming Convention
```typescript
// Good: Descriptive, behavior-focused
it('should reject checkout when organization is pending approval', () => {});

// Bad: Implementation-focused
it('should check org status', () => {});
```

### 3. Mocking Strategy
```typescript
// Mock at module level for consistency
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Create typed mocks
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: testUser },
      error: null,
    }),
  },
  from: jest.fn(),
};
```

### 4. Test Data Factories
```typescript
// Create reusable test data builders
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  id: 'prod-123',
  name: 'Test Product',
  base_price: 100,
  ...overrides,
});
```

### 5. Async Testing
```typescript
// Use async/await consistently
it('should fetch products from API', async () => {
  const products = await fetchProducts();
  expect(products).toHaveLength(10);
});

// Wait for async updates in components
await waitFor(() => {
  expect(screen.getByText('Products Loaded')).toBeInTheDocument();
});
```

---

## 📊 COVERAGE TRACKING

### Commands
```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- __tests__/integration/api/pricing.test.ts

# Run in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test e2e/checkout-flow.spec.ts
```

### Coverage Reports
- **HTML Report:** `coverage/lcov-report/index.html`
- **JSON Report:** `coverage/coverage-final.json`
- **Console Summary:** Displayed after test run

### CI/CD Integration
```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test -- --coverage --ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## 🚨 CRITICAL TEST SCENARIOS

### Security Tests
1. **SQL Injection Prevention**
   - Test malicious input in all form fields
   - Verify parameterized queries

2. **XSS Prevention**
   - Test script injection in text fields
   - Verify HTML sanitization

3. **CSRF Protection**
   - Test missing token rejection
   - Test invalid token rejection
   - Test token expiration

4. **Prompt Injection (AI)**
   - Test "ignore previous instructions" variants
   - Test system prompt override attempts
   - Test code execution attempts

### Business Logic Tests
1. **Pricing Accuracy**
   - Test all 7 pricing priority levels
   - Test discount stacking rules
   - Test edge cases (negative quantities, zero price)

2. **Order State Machine**
   - Test valid transitions only
   - Test invalid transition rejection
   - Test concurrent order updates

3. **Inventory Management**
   - Test overselling prevention
   - Test stock reservation
   - Test concurrent stock updates

4. **Organization Approval**
   - Test pending org checkout blocked
   - Test rejected org checkout blocked
   - Test approved org checkout allowed

---

## 📝 TEST DOCUMENTATION

### Test File Header
```typescript
/**
 * Integration Tests: Checkout API
 * 
 * Tests the complete checkout flow including:
 * - Organization approval validation
 * - Server-side total calculation
 * - Order creation with transaction safety
 * - CSRF and rate limiting protection
 * 
 * @group integration
 * @group critical
 */
```

### Test Case Documentation
```typescript
it('should reject checkout when organization is pending approval', async () => {
  // GIVEN: User with pending organization
  mockSupabase.from.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: { organization: { approval_status: 'pending' } },
        error: null,
      }),
    }),
  });

  // WHEN: User attempts checkout
  const response = await POST(mockRequest);
  const data = await response.json();

  // THEN: Checkout is rejected with clear message
  expect(response.status).toBe(403);
  expect(data.error).toContain('pending approval');
});
```

---

## 🔄 CONTINUOUS IMPROVEMENT

### Weekly Reviews
- [ ] Review test failures and flakiness
- [ ] Update tests for new features
- [ ] Refactor duplicate test code
- [ ] Update coverage goals

### Quality Metrics
- **Test Execution Time:** < 5 minutes for full suite
- **Flakiness Rate:** < 1% of tests
- **Coverage:** > 80% for all metrics
- **Maintenance:** < 2 hours/week for test updates

---

## 🎯 SUCCESS CRITERIA

### Week 1 Complete
- ✅ All P0 tests implemented and passing
- ✅ Security tests at 100% coverage
- ✅ Checkout flow fully tested
- ✅ Pricing system fully tested
- ✅ Coverage > 60%

### Week 2 Complete
- ✅ All P1 tests implemented and passing
- ✅ AI features fully tested
- ✅ Admin functions tested
- ✅ E2E critical paths passing
- ✅ Coverage > 75%

### Week 3 Complete
- ✅ All P2 tests implemented
- ✅ Coverage > 80%
- ✅ CI/CD pipeline integrated
- ✅ Documentation complete
- ✅ **PRODUCTION READY**

---

## 📚 RESOURCES

### Testing Libraries
- **Jest:** Unit and integration testing
- **React Testing Library:** Component testing
- **Playwright:** E2E testing
- **MSW:** API mocking (if needed)
- **@testing-library/user-event:** User interaction simulation

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Internal Docs
- `SPRINT_3_4_FIXES_APPLIED.md` - Testing checklist for recent fixes
- `POST_SPRINT_3_4_COMPREHENSIVE_REVIEW.md` - Areas requiring test coverage

---

## 🚀 GET STARTED

### Step 1: Set Up Environment
```bash
# Install dependencies
npm install

# Verify Jest works
npm test -- --version

# Verify Playwright works
npx playwright --version
```

### Step 2: Run Existing Tests
```bash
# Run all tests
npm test

# Check current coverage
npm test -- --coverage
```

### Step 3: Start Implementation
```bash
# Follow this order:
1. Security tests (CSRF, rate limiting, sanitization)
2. Auth tests (login, logout, magic link)
3. Pricing tests (all priority levels)
4. Checkout tests (complete flow)
5. Order tests (creation, transaction)
```

### Step 4: Monitor Progress
```bash
# Daily coverage check
npm test -- --coverage --silent

# Track failing tests
npm test -- --verbose
```

---

**Last Updated:** December 2024  
**Owner:** Engineering Team  
**Status:** Ready for Implementation  

🎯 **Goal: 80% coverage with real, meaningful tests in 3 weeks**