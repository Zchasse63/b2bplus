# 🔍 ROOT CAUSE DEBUGGING PATTERNS & EXAMPLES
# Session 4 Reference Guide

**Purpose:** Quick reference for identifying and fixing root causes instead of symptoms

---

## 📋 ROOT CAUSE vs SYMPTOM CHECKLIST

### Pattern 1: Calculation Errors

**SYMPTOM:** Test expects 110, gets 100
```typescript
expect(total).toBe(110);  // FAILS: got 100
```

**INVESTIGATION STEPS:**
1. Is the promo being applied?
2. Is it being applied to correct field (subtotal or line item)?
3. Is it being applied before or after tax?
4. Is the discount percentage correct?

**ROOT CAUSES TO CHECK:**
- [ ] Promo function not called
- [ ] Promo applied to wrong amount
- [ ] Promo applied in wrong order
- [ ] Discount percentage wrong
- [ ] Formula uses wrong field

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
function orderTotal(subtotal, tax, promoDiscount) {
  return subtotal + tax - promoDiscount;  // Discount not applied!
}

// AFTER (CORRECT):
function orderTotal(subtotal, tax, promoDiscount) {
  const discountedSubtotal = subtotal - promoDiscount;
  return discountedSubtotal + tax;  // Discount applied first
}
```

---

### Pattern 2: Status/State Not Changing

**SYMPTOM:** Test expects status 'approved', gets 'pending'
```typescript
expect(order.status).toBe('approved');  // FAILS: got 'pending'
```

**INVESTIGATION STEPS:**
1. Was the update query executed?
2. Did the update return any rows affected?
3. Is the new status being returned?
4. Is there a WHERE clause filtering wrong?

**ROOT CAUSES TO CHECK:**
- [ ] Update query never runs
- [ ] WHERE clause matches 0 rows
- [ ] Update returns old status value
- [ ] Transaction not committed
- [ ] Wrong column name in update

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
async function approveOrder(orderId) {
  await db.query('UPDATE orders SET status = ? WHERE id = ?', 
    ['approved', orderId]);
  // Never checks if update succeeded
}

// AFTER (CORRECT):
async function approveOrder(orderId) {
  const result = await db.query('UPDATE orders SET status = ? WHERE id = ?', 
    ['approved', orderId]);
  if (result.rowsAffected === 0) {
    throw new Error(`Order ${orderId} not found`);
  }
  return { status: 'approved', id: orderId };
}
```

---

### Pattern 3: Query Returning Wrong/Empty Results

**SYMPTOM:** Test expects 10 items, gets 0
```typescript
expect(orders.length).toBe(10);  // FAILS: got 0
```

**INVESTIGATION STEPS:**
1. Is the query actually executing?
2. Are there results in the database?
3. Does the WHERE clause have unintended filters?
4. Is there a date range that's too restrictive?
5. Is the query parameter being passed correctly?

**ROOT CAUSES TO CHECK:**
- [ ] Query has wrong WHERE clause
- [ ] Date range filter too restrictive
- [ ] Parameter not passed to query
- [ ] Join condition filtering rows
- [ ] Index issue (unlikely but check)

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
function getOrdersByUser(userId) {
  return db.query(
    'SELECT * FROM orders WHERE user_id = ? AND status != "cancelled"',
    [userId]
  );
  // Hidden filter excludes cancelled orders!
}

// AFTER (CORRECT):
function getOrdersByUser(userId, includeCancelled = false) {
  let query = 'SELECT * FROM orders WHERE user_id = ?';
  if (!includeCancelled) {
    query += ' AND status != "cancelled"';
  }
  return db.query(query, [userId]);
  // Clear filtering logic
}
```

---

### Pattern 4: Function Not Being Called

**SYMPTOM:** Test expects side effect (email sent, inventory updated, flag created) but it doesn't happen
```typescript
expect(emailSent).toBe(true);  // FAILS: got false
```

**INVESTIGATION STEPS:**
1. Is the function that triggers the action being called?
2. Are the conditions for calling it being met?
3. Does the function exist?
4. Are there early returns preventing it?

**ROOT CAUSES TO CHECK:**
- [ ] Conditional check prevents execution
- [ ] Function not in call path
- [ ] Early return statement
- [ ] Condition logic reversed
- [ ] Function name typo

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
async function processOrder(order) {
  if (order.total < 100) {
    return;  // Early return prevents email!
  }
  await sendOrderConfirmation(order);
}

// AFTER (CORRECT):
async function processOrder(order) {
  // Always send confirmation
  await sendOrderConfirmation(order);
  
  // Only mark as flagged if high value
  if (order.total >= 100) {
    await flagHighValueOrder(order);
  }
}
```

---

### Pattern 5: Wrong Data Type/Format

**SYMPTOM:** Test expects number, function returns string (or vice versa)
```typescript
expect(quantity).toBe(5);  // FAILS: got "5"
```

**INVESTIGATION STEPS:**
1. What type is being returned?
2. What type is expected?
3. Where is the type conversion failing?
4. Is it a parsing issue?

**ROOT CAUSES TO CHECK:**
- [ ] Data retrieved as string from DB
- [ ] Type conversion not happening
- [ ] JSON.parse/stringify changing type
- [ ] Database column type wrong
- [ ] parseInt/parseFloat not called

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
function getQuantity(orderId) {
  const result = db.query('SELECT quantity FROM orders WHERE id = ?', [orderId]);
  return result.quantity;  // Returns string "5"
}

// AFTER (CORRECT):
function getQuantity(orderId) {
  const result = db.query('SELECT quantity FROM orders WHERE id = ?', [orderId]);
  return parseInt(result.quantity, 10);  // Returns number 5
}
```

---

### Pattern 6: Validation Not Running

**SYMPTOM:** Test expects validation error, but invalid data is accepted
```typescript
expect(() => createOrder(invalidOrder)).toThrow();  // FAILS: no error thrown
```

**INVESTIGATION STEPS:**
1. Is the validation function being called?
2. What does the validation check?
3. Is the validation logic correct?
4. Are there cases that skip validation?

**ROOT CAUSES TO CHECK:**
- [ ] Validation function never called
- [ ] Validation condition is wrong
- [ ] Validation checks wrong field
- [ ] Error is thrown but not awaited
- [ ] Try/catch swallows error

**GOOD FIX:**
```typescript
// BEFORE (WRONG):
function createOrder(order) {
  // Validation function exists but never called!
  return db.insert('orders', order);
}

// AFTER (CORRECT):
function createOrder(order) {
  // Validate before creating
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have at least one item');
  }
  if (order.total < 0) {
    throw new Error('Order total cannot be negative');
  }
  return db.insert('orders', order);
}
```

---

## 🎯 DEBUGGING FLOWCHART

```
TEST FAILS
    |
    v
Is it an assertion error?
    |
    +--YES--> What was expected vs actual?
    |             |
    |             v
    |         Read error message carefully
    |             |
    |             v
    |         Make list of possible causes
    |
    +--NO--> Is it a setup error?
                 |
                 +--YES--> Fix test setup
                 +--NO--> Check for runtime error in code
                         |
                         v
                     Trace code path from test

        Once you have list of possible causes:
                 |
                 v
            For each cause:
                 |
                 +--Add console.log to trace
                 +--Check database/cache state
                 +--Verify parameters
                 +--Run test with logging
                 |
                 v
            Found the root cause? (Verify it!)
                 |
                 +--NO--> Try next cause
                 +--YES--> Apply fix
                         |
                         v
                     Re-run test
                         |
                         v
                     Test passes for right reason?
                         |
                         +--NO--> Root cause was wrong, try again
                         +--YES--> Commit! Move forward
```

---

## 🔧 COMMON ROOT CAUSES BY AREA

### Pricing/Calculations
1. Decimal rounding issues
2. Discount applied to wrong field
3. Tax calculation uses wrong rate
4. Promo not in the system
5. Currency conversion missing

### Status/Workflow
1. Update query WHERE clause wrong
2. Status value typo
3. Transition not allowed by state machine
4. Timestamp not updated
5. New status not returned from function

### Data/Queries
1. JOIN condition filters rows
2. WHERE clause too restrictive
3. Date range query has timezone issue
4. NULL values not handled
5. Soft deletes hidden but not filtered

### Inventory
1. Deduction happens at wrong time
2. Concurrent updates cause race condition
3. Stock check uses wrong field
4. Update doesn't verify success
5. Rollback not implemented

### Validation
1. Validator not called
2. Validation condition reversed
3. Wrong field checked
4. Error thrown but caught silently
5. Validation disabled in some paths

---

## 📝 DEBUGGING TEMPLATE

Use this when you encounter a test failure:

```
TEST NAME: [name of failing test]
FAILURE MESSAGE: [exact assertion that failed]
EXPECTED: [what should happen]
ACTUAL: [what actually happened]

INVESTIGATION:
[ ] Checked test setup - is it correct?
[ ] Checked function being tested - exists?
[ ] Traced code path - correct flow?
[ ] Added logging - where does it diverge?
[ ] Checked database state - data there?
[ ] Checked parameters - passed correctly?

POSSIBLE ROOT CAUSES:
1. [possibility 1]
2. [possibility 2]
3. [possibility 3]

ROOT CAUSE IDENTIFIED: [the actual problem]
HOW I FOUND IT: [what led me to it]
THE FIX: [minimal change to fix it]
WHY THIS IS CORRECT: [why this fixes the issue]

VERIFICATION:
[ ] Test passes now
[ ] Related tests still pass
[ ] Fix makes logical sense
[ ] No workarounds or hacks
```

---

## ✅ VERIFICATION CHECKLIST

After applying your fix:

```
[ ] The test now passes
[ ] The test passes for the RIGHT reason (trace through logic)
[ ] Related tests still pass (run full suite)
[ ] The fix is minimal (not refactoring other code)
[ ] The fix makes logical sense (could explain to teammate)
[ ] No console.log debugging code left in
[ ] No .skip() or .only() used
[ ] No test assertions were changed
[ ] No mocks were added as workarounds
[ ] The fix addresses root cause, not symptom
[ ] You understand WHY it was broken
[ ] You understand WHY your fix works
```

---

## 🚨 RED FLAGS - STOP AND RECONSIDER

If you find yourself doing any of these, you're fixing symptoms, not root causes:

1. **"Let me just skip this test and move on"**
   - ❌ NO! Find and fix the root cause
   - ✅ Every failing test has a reason

2. **"I'll change the test assertion to match what the code does"**
   - ❌ NO! Fix the code, not the test
   - ✅ The test is the specification

3. **"I'll mock this to return the right value"**
   - ❌ NO! Unless the mock is part of the test, fix the code
   - ✅ Mocks should test behavior, not hide bugs

4. **"I'll add a conditional in the code for this edge case"**
   - ❌ NO! Find the root issue
   - ✅ Edge cases reveal design problems

5. **"This test is flaky, sometimes it passes"**
   - ❌ NO! Flakiness means instability
   - ✅ Find the race condition or dependency

6. **"I'll just multiply by 2 to get the right answer"**
   - ❌ NO! Find why the calculation is wrong
   - ✅ Math should work first time

---

## 💡 TIPS FOR EFFECTIVE DEBUGGING

### Add Strategic Logging
```typescript
// Add before fix
console.log('Order:', order);
console.log('Subtotal:', subtotal);
console.log('Promo:', promo);
console.log('Discount:', discount);
console.log('Final total:', total);
```

### Use console.table for Complex Data
```typescript
const testData = [
  { field: 'total', expected: 110, actual: 100 },
  { field: 'status', expected: 'approved', actual: 'pending' }
];
console.table(testData);
```

### Write Temporary Test to Understand
```typescript
// Temporary test to understand behavior
it('DEBUG: understand order calculation', () => {
  const order = { subtotal: 100, promo: 10 };
  console.log('Order:', order);
  const result = calculateTotal(order);
  console.log('Result:', result);
  // Remove after understanding
});
```

### Check Database State
```typescript
// Before and after
const before = db.query('SELECT * FROM orders WHERE id = ?', [id]);
console.log('Before:', before);
// ... run code ...
const after = db.query('SELECT * FROM orders WHERE id = ?', [id]);
console.log('After:', after);
```

---

## 🎓 LEARNING FROM FAILURES

Each failure teaches you something:

1. **What was broken?** → Understand the feature better
2. **Why was it broken?** → Learn common mistakes
3. **How did you fix it?** → Build debugging skills
4. **How to prevent it?** → Improve code design

Keep a mental (or actual) log of failures and fixes. Patterns emerge.

---

## 📊 SESSION 4 DEBUGGING GOALS

By end of Session 4:
- [ ] Find and fix 5+ root causes
- [ ] Never change a test assertion
- [ ] Never skip a failing test
- [ ] Never use a mock as a workaround
- [ ] 100% test pass rate
- [ ] 0 flaky tests
- [ ] 408+ real tests
- [ ] Clear understanding of codebase

---

**Remember:** Every failing test is an opportunity to improve your code. Fix the root cause, not the symptom. Your future self will thank you!
