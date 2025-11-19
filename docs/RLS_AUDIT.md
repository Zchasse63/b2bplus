# Row Level Security (RLS) Audit

## Overview

RLS policies ensure users can only access their own data. This document audits RLS coverage for critical tables.

## Cart Tables

### cart_items

**Current Policy**: Users can only see/modify their own cart items

```sql
-- SELECT: User can view their own cart items
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: User can add items to their own cart
CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: User can update their own cart items
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: User can remove their own cart items
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Status**: ✅ ENFORCED

## Order Tables

### orders

**Current Policy**: Users can only see orders from their organization

```sql
-- SELECT: User can view orders from their organization
CREATE POLICY "Users can view org orders"
  ON orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

**Status**: ✅ ENFORCED

### order_items

**Current Policy**: Users can only see items from their organization's orders

**Status**: ✅ ENFORCED

## Email Tables

### processed_emails

**Current Policy**: Webhooks bypass RLS (service-role), users cannot access

**Status**: ✅ BYPASSED (intentional for webhooks)

### email_actions_log

**Current Policy**: Webhooks bypass RLS (service-role), users cannot access

**Status**: ✅ BYPASSED (intentional for webhooks)

## Recommendations

1. ✅ All user-facing tables have RLS enabled
2. ✅ Webhook tables use service-role bypass (intentional)
3. ✅ Organization scoping prevents cross-org access
4. ✅ User scoping prevents cross-user access

## Testing

Run RLS tests to verify:
```bash
npm run test:rls
```

