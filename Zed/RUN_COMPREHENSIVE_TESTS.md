# 🧪 RUN COMPREHENSIVE TESTS

**Project:** B2B+ Platform  
**Date:** December 2024  
**Purpose:** Execute and validate the complete test suite  

---

## 📋 QUICK START

### Run All Tests
```bash
# Navigate to web app directory
cd apps/web

# Run complete test suite with coverage
npm test -- --coverage --verbose

# Run tests in watch mode (development)
npm test -- --watch

# Run specific test file
npm test -- __tests__/unit/lib/ai-sanitization.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Prompt Injection"
```

---

## 🎯 TEST CATEGORIES

### 1. Unit Tests (Fast - ~2 minutes)
```bash
# Run all unit tests
npm test -- __tests__/unit --coverage

# Run specific unit test suites
npm test -- __tests__/unit/lib/ai-sanitization.test.ts
npm test -- __tests__/unit/services/pricing.test.ts
npm test -- __tests__/unit/lib/csrf.test.ts
npm test -- __tests__/unit/lib/rate-limit.test.ts
```

**What's Tested:**
- ✅ AI input sanitization (527 tests)
- ✅ Pricing calculations (697 tests)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Utility functions
- ✅ Data transformations

### 2. Integration Tests (Medium - ~5 minutes)
```bash
# Run all integration tests
npm test -- __tests__/integration --coverage

# Run API integration tests
npm test -- __tests__/integration/api

# Run database integration tests (requires Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_url \
SUPABASE_SERVICE_ROLE_KEY=your_key \
npm test -- __tests__/integration/database
```

**What's Tested:**
- ✅ API routes with mocked dependencies
- ✅ Multi-component workflows
- ✅ Database functions (if credentials provided)
- ✅ Service integrations

### 3. Component Tests (Medium - ~3 minutes)
```bash
# Run all component tests
npm test -- components --coverage

# Run specific component tests
npm test -- components/CartView.test.tsx
npm test -- components/ProductCard.test.tsx
npm test -- components/checkout
```

**What's Tested:**
- ✅ UI component rendering
- ✅ User interactions
- ✅ State management
- ✅ Form validation

### 4. E2E Tests (Slow - ~15 minutes)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test e2e/checkout-flow.spec.ts

# Run E2E tests in headed mode (see browser)
npx playwright test --headed

# Run E2E tests in debug mode
npx playwright test --debug
```

**What's Tested:**
- ✅ Complete user journeys
- ✅ Authentication flows
- ✅ Checkout process
- ✅ Admin workflows
- ✅ Chatbot conversations

---

## 📊 COVERAGE REPORTS

### Generate Coverage Report
```bash
# Generate and open HTML coverage report
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html
```

### Coverage Thresholds
```javascript
{
  "global": {
    "branches": 80,    // Target: 80%
    "functions": 80,   // Target: 80%
    "lines": 80,       // Target: 80%
    "statements": 80   // Target: 80%
  }
}
```

### Interpret Coverage Results
```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
lib/ai/input-sanitizer  | 100     | 100      | 100     | 100     | ✅
services/pricing        | 98.5    | 95.2     | 100     | 98.3    | ✅
lib/middleware/csrf     | 85.3    | 78.4     | 90.0    | 84.2    | ⚠️
```

**Legend:**
- ✅ **Green (>80%):** Good coverage
- ⚠️ **Yellow (60-80%):** Acceptable, needs improvement
- ❌ **Red (<60%):** Insufficient coverage, requires attention

---

## 🔍 TEST EXECUTION CHECKLIST

### Before Running Tests

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **Set Environment Variables** (if needed)
  ```bash
  cp .env.example .env.local
  # Edit .env.local with test credentials
  ```

- [ ] **Start Dependencies** (for integration tests)
  ```bash
  # Redis (if testing caching)
  docker run -p 6379:6379 redis:alpine
  
  # Supabase (if testing database)
  # Use project credentials or local instance
  ```

### Run Test Suite

1. **Phase 1: Quick Check (Unit Tests)**
   ```bash
   npm test -- __tests__/unit --coverage
   ```
   - Expected time: ~2 minutes
   - Should have 0 failures
   - Coverage should be >90%

2. **Phase 2: API Integration**
   ```bash
   npm test -- __tests__/integration/api
   ```
   - Expected time: ~5 minutes
   - Tests API routes with mocked Supabase
   - Should have 0 failures

3. **Phase 3: Components**
   ```bash
   npm test -- components
   ```
   - Expected time: ~3 minutes
   - Tests React components
   - Should have 0 failures

4. **Phase 4: E2E (Optional - Slow)**
   ```bash
   npm run test:e2e
   ```
   - Expected time: ~15 minutes
   - Requires running dev server
   - Tests complete user flows

### After Running Tests

- [ ] **Review Coverage Report**
  ```bash
  open coverage/lcov-report/index.html
  ```

- [ ] **Check for Flaky Tests**
  - Run tests 3 times
  - Note any intermittent failures
  - File issues for flaky tests

- [ ] **Document Results**
  - Note pass/fail counts
  - Record coverage percentages
  - Identify gaps for improvement

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. "Cannot find module '@/lib/...'"
```bash
# Solution: Check TypeScript paths in tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 2. "Supabase client not defined"
```bash
# Solution: Ensure mocks are set up
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));
```

#### 3. "Tests timing out"
```bash
# Solution: Increase timeout for slow tests
jest.setTimeout(30000); // 30 seconds
```

#### 4. "Module import errors"
```bash
# Solution: Clear Jest cache
npm test -- --clearCache
rm -rf node_modules/.cache
npm test
```

#### 5. "Playwright tests failing"
```bash
# Solution: Install browsers
npx playwright install chromium

# Or update Playwright
npm install -D @playwright/test@latest
npx playwright install
```

---

## 📈 INTERPRETING RESULTS

### Successful Test Run
```
Test Suites: 25 passed, 25 total
Tests:       1,224 passed, 1,224 total
Snapshots:   0 total
Time:        45.234 s
```
✅ **All tests passing - ready for deployment**

### Tests with Failures
```
Test Suites: 1 failed, 24 passed, 25 total
Tests:       5 failed, 1,219 passed, 1,224 total
```
❌ **Fix failing tests before deployment**

### Coverage Below Threshold
```
Jest: "global" coverage threshold for branches (80%) not met: 75.3%
```
⚠️ **Add more tests to improve coverage**

---

## 🎯 VALIDATION CHECKLIST

### Critical Security Tests (Must Pass)
- [ ] ✅ AI input sanitization prevents prompt injection
- [ ] ✅ CSRF tokens validated on state-changing operations
- [ ] ✅ Rate limiting fails closed when Redis unavailable
- [ ] ✅ SQL injection attempts blocked
- [ ] ✅ XSS attacks prevented
- [ ] ✅ Authorization checks enforce org approval

### Business Logic Tests (Must Pass)
- [ ] ✅ Pricing priority order correct (7 levels)
- [ ] ✅ Discounts calculated accurately
- [ ] ✅ Order total calculations server-side only
- [ ] ✅ Cart operations handle concurrency
- [ ] ✅ Organization approval blocks checkout
- [ ] ✅ Inventory prevents overselling

### Integration Tests (Must Pass)
- [ ] ✅ Checkout flow completes successfully
- [ ] ✅ Magic link verification works
- [ ] ✅ Admin authorization checks org roles
- [ ] ✅ Risk scoring calculates correctly
- [ ] ✅ Chatbot sanitizes all inputs

---

## 🚀 CI/CD INTEGRATION

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Unit Tests
        run: npm test -- --coverage --ci
        
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          
      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          CI: true
```

---

## 📝 TEST MAINTENANCE

### Weekly Tasks
- [ ] Review and fix flaky tests
- [ ] Update test data for new features
- [ ] Check coverage remains >80%
- [ ] Review test execution time

### Per Feature
- [ ] Write unit tests for new functions
- [ ] Write integration tests for new APIs
- [ ] Write component tests for new UI
- [ ] Write E2E tests for new flows
- [ ] Update test documentation

---

## 🎓 BEST PRACTICES

### Writing Tests
1. **Follow AAA Pattern:** Arrange, Act, Assert
2. **One assertion per test:** Keep tests focused
3. **Use descriptive names:** "should reject checkout when org pending"
4. **Mock external dependencies:** Keep tests fast and reliable
5. **Test edge cases:** Zero, negative, large numbers, null, undefined

### Test Naming
```typescript
// ✅ Good: Describes behavior
it('should reject checkout when organization is pending approval')

// ❌ Bad: Describes implementation
it('should check org status')
```

### Test Organization
```typescript
describe('PricingService', () => {
  describe('calculatePrice', () => {
    describe('Priority Level 1: Price Locks', () => {
      it('should apply active price lock as highest priority')
      it('should ignore expired price locks')
    })
  })
})
```

---

## 📊 CURRENT STATUS

### Test Suite Overview
```
Total Test Files:     75+
Total Test Cases:     1,224+
Placeholder Tests:    0 (all replaced with real tests)
Critical Tests:       ✅ Complete
Coverage Target:      80%
Current Coverage:     TBD (run tests to determine)
```

### New Tests Added (Dec 2024)
- ✅ AI Input Sanitization: 527 real tests
- ✅ Pricing Service: 697 real tests
- ✅ CSRF Protection: Ready for implementation
- ✅ Rate Limiting: Ready for implementation
- ⏳ Additional integration tests: In progress

---

## 🎯 SUCCESS CRITERIA

### Definition of Done
- ✅ All critical tests passing (P0)
- ✅ All high-priority tests passing (P1)
- ✅ Coverage >80% for all metrics
- ✅ No flaky tests (100% reliability)
- ✅ Test execution time <10 minutes
- ✅ CI/CD pipeline green

### Ready for Production
- ✅ Security tests: 100% pass rate
- ✅ Business logic tests: 100% pass rate
- ✅ Integration tests: 100% pass rate
- ✅ E2E tests: >95% pass rate (some flakiness acceptable)
- ✅ Coverage: >80% all files

---

## 🔗 RELATED DOCUMENTATION

- `TEST_SUITE_MASTER_PLAN.md` - Overall testing strategy
- `SPRINT_3_4_FIXES_APPLIED.md` - Testing checklist for recent fixes
- `POST_SPRINT_3_4_COMPREHENSIVE_REVIEW.md` - Areas requiring coverage
- Jest Documentation: https://jestjs.io/
- Playwright Documentation: https://playwright.dev/

---

## 📞 SUPPORT

### Issues with Tests?
1. Check test output for error details
2. Review troubleshooting section above
3. Clear caches: `npm test -- --clearCache`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

### Need Help?
- Review test documentation in each test file
- Check Jest/Playwright docs
- Review test patterns in existing tests
- Ask the team in #engineering channel

---

**Last Updated:** December 2024  
**Status:** Ready to Execute  
**Next Action:** Run `npm test -- --coverage` and review results  

🧪 **Let's ensure our platform is rock solid with comprehensive test coverage!**