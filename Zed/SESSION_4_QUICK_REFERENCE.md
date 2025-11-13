# 🚀 SESSION 4 QUICK REFERENCE CARD
# Daily Reference for Root Cause Debugging

**Keep this open while working. Reference it constantly.**

---

## 📋 DAILY CHECKLIST

### Start of Day
- [ ] Run full test suite - verify baseline (should be 308 passing)
- [ ] Read SESSION_4_KICKOFF.md section for today
- [ ] Open ROOT_CAUSE_DEBUGGING_PATTERNS.md
- [ ] Set timer for debugging (15-25 min per test failure)

### When Test Fails
- [ ] DON'T immediately change the test
- [ ] DON'T skip the failing test
- [ ] DO read the error message carefully
- [ ] DO trace the code path
- [ ] DO find the root cause
- [ ] DO fix the root cause
- [ ] DO verify the fix works

### End of Day
- [ ] All tests passing (100%)
- [ ] No .skip() or .only() in code
- [ ] Commit message explains what was built
- [ ] Document root causes found
- [ ] Update progress tracker

---

## 🔧 QUICK DEBUGGING STEPS

### Step 1: Understand the Error (2 min)
```
1. Read the assertion error
2. What was expected?
3. What actually happened?
4. Is there a pattern?
```

### Step 2: Trace the Code (5-10 min)
```
1. Find the test
2. Find the function being tested
3. Follow the code path
4. Add console.log if needed
5. Run test with logging
```

### Step 3: Identify Root Cause (5-10 min)
```
1. Review common patterns (see patterns list below)
2. Check if it's a logic error
3. Check if it's a data error
4. Check if it's a validation error
5. Isolate the exact line causing failure
```

### Step 4: Apply Minimal Fix (5-10 min)
```
1. Make smallest change to fix root cause
2. Don't refactor
3. Don't add features
4. Fix the code, not the test
```

### Step 5: Verify & Commit (2-5 min)
```
1. Run test - passes?
2. Run related tests - pass?
3. Run full suite - all pass?
4. Commit with clear message
```

---

## 🎯 ROOT CAUSE PATTERNS QUICK REFERENCE

| Symptom | Root Causes to Check |
|---------|---------------------|
| Wrong total/calculation | Discount applied wrong, formula wrong, field wrong |
| Status not changing | Update query fails, WHERE clause wrong, value typo |
| Query returns nothing | WHERE too restrictive, JOIN filters, parameter wrong |
| Side effect not happening | Function not called, condition blocks it, early return |
| Wrong data type | DB returns string, conversion missing, JSON issue |
| Validation passes invalid | Validator not called, condition reversed, skipped |

---

## 💻 TERMINAL COMMANDS

```bash
# Run specific failing test
npm test -- __tests__/unit/services/checkout.test.ts -t "should validate cart"

# Run all unit tests
npm test -- __tests__/unit

# Run all unit tests with coverage
npm test -- __tests__/unit --coverage

# Watch mode for development
npm test -- __tests__/unit --watch

# Run tests matching pattern
npm test -- __tests__/unit -t "checkout"

# Clear Jest cache
npm test -- __tests__/unit --clearCache
```

---

## 🚨 RED FLAGS - STOP IMMEDIATELY

- [ ] About to skip a test with `.skip()`
- [ ] About to change test assertion to pass
- [ ] About to add `.only()` to run one test
- [ ] About to mock data to hide bug
- [ ] About to add conditional logic in test
- [ ] About to add workaround in code

**If you see any of these, STOP and reconsider!**

---

## ✅ GOOD DEBUGGING SIGNS

- [ ] Found specific line causing failure
- [ ] Understand exactly why it's failing
- [ ] Fix is minimal (1-3 lines changed)
- [ ] Fix makes logical sense
- [ ] Test passes for right reason
- [ ] Related tests still pass
- [ ] No special cases added

---

## 🎯 DAILY TARGET

### Minimum
- [ ] 10+ tests written
- [ ] All tests passing
- [ ] 1 root cause found and fixed

### Good
- [ ] 30+ tests written
- [ ] All tests passing
- [ ] 2-3 root causes found and fixed

### Excellent
- [ ] 50+ tests written
- [ ] All tests passing
- [ ] 5+ root causes found and fixed

---

## 📊 PROGRESS TRACKING

### Session 4 Goal: 408+ Total Tests

Current: 308 tests
Target Checkout: +40-50 tests
Target Orders: +30-40 tests
Target Risk: +25-35 tests
Total Target: +100 tests

Session 4 Success: 408+ tests, 100% passing, 5+ root causes fixed

---

## 🔍 DEBUGGING TEMPLATE (Copy for Each Failure)

```
TEST: [name]
ERROR: [error message]
EXPECTED: [what should happen]
GOT: [what happened instead]

ROOT CAUSE:
[One sentence description of why it failed]

FIX APPLIED:
[Code change made]

WHY IT WORKS:
[Brief explanation]

VERIFIED:
[ ] Test passes
[ ] Related tests pass
```

---

## 🛠️ COMMON FIX PATTERNS

### Calculate Wrong Total
```typescript
// Wrong
const total = subtotal + tax;

// Right
const discount = promo ? subtotal * 0.1 : 0;
const total = (subtotal - discount) + tax;
```

### Status Not Updating
```typescript
// Wrong
await db.query('UPDATE orders SET status = ?', ['approved']);

// Right
const result = await db.query('UPDATE orders SET status = ?', ['approved']);
if (result.rowsAffected === 0) throw new Error('Order not found');
```

### Query Returns Nothing
```typescript
// Wrong
const orders = db.query('SELECT * FROM orders WHERE user_id = ? AND status != "cancelled"');

// Right
const orders = db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
// Filter separately or make filtering explicit
```

### Function Not Called
```typescript
// Wrong
if (order.total < 100) return; // Prevents email!
await sendEmail(order);

// Right
await sendEmail(order);
if (order.total >= 100) await flagAsHighValue(order);
```

---

## 📝 COMMIT MESSAGE TEMPLATE

```
Add [feature] tests with [number] new tests

- Created [test file name] with [count] tests
- Root cause found: [what was wrong]
- Fix applied: [what was changed]
- All [count+308] tests passing

Example:
Add checkout flow tests with 45 new tests

- Created checkout.test.ts with 45 tests
- Root cause found: Promo discount applied to wrong field
- Fix applied: Fixed calculateOrderTotal to apply discount before tax
- All 353 tests passing
```

---

## 🎓 KEEP LEARNING

Each test failure teaches something:
1. **Why did it fail?** → Understand feature
2. **How to fix it?** → Improve debugging skills
3. **How to prevent it?** → Better design
4. **What's the pattern?** → Recognize in future

---

## ⏰ TIME MANAGEMENT

Per Test Failure: 15-25 minutes
- Understand error: 2-3 min
- Trace code: 5-10 min
- Find root cause: 5-10 min
- Apply fix: 5-10 min
- Verify: 2-5 min

Expected per day: 10-15 test failures resolved, 30-50 tests written

---

## 🚀 YOU'VE GOT THIS!

Remember:
- Every failure is fixable
- Root causes are findable
- Code is understandable
- You are capable

**Fix root causes. Build great tests. Ship quality code.**

Keep pushing forward! 💪