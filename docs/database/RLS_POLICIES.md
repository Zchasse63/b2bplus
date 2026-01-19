# Row Level Security (RLS) Policies

## Overview

Row Level Security (RLS) is a PostgreSQL security feature that allows fine-grained access control at the row level. B2B Plus uses RLS extensively to ensure data isolation between organizations and users.

**Current Status**: 292+ active RLS policies across 35+ tables

## How RLS Works

1. **Policy Definition**: Policies define WHO can access WHAT rows under WHICH conditions
2. **Automatic Enforcement**: PostgreSQL enforces policies automatically on all queries
3. **Multi-layered**: Policies can be combined (SELECT + INSERT + UPDATE + DELETE)
4. **Role-based**: Different policies for different roles (authenticated, anon, service_role)

**Example Policy**:
```sql
CREATE POLICY "Users can view their own cart"
  ON carts
  FOR SELECT
  USING (user_id = auth.uid());
```

This policy allows users to SELECT only rows where `user_id` matches their authenticated user ID.

## Policy Summary by Table

| Table | Policies | Access Pattern |
|-------|----------|----------------|
| organizations | 4 | Org-scoped (members only) |
| organization_members | 4 | Org-scoped (members + admins) |
| profiles | 3 | User-scoped (own profile) + public read |
| products | 6 | Public read, admin write |
| orders | 6 | Org-scoped (members only) |
| order_items | 4 | Order-scoped (via orders.user_id) |
| carts | 4 | User-scoped (own cart only) |
| cart_items | 4 | User-scoped (own cart items) |
| shipping_addresses | 4 | Org-scoped (members only) |
| invoices | 5 | Org-scoped (members + system) |
| leads | 3 | Admin-only |
| chatbot_conversations | 4 | User-scoped (own conversations) |
| email_campaigns | 5 | Admin-only + org-scoped |
| pricing_tiers | 4 | Public read, admin write |
| vendor_invoices | 4 | Admin + supplier org access |
| purchase_orders | 4 | Org-scoped + supplier visibility |

## Common Policy Patterns

### 1. User-Scoped Access

**Use case**: Resources that belong to a single user

```sql
-- Example: User's cart
CREATE POLICY "Users can view own carts"
  ON carts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own carts"
  ON carts FOR UPDATE
  USING (user_id = auth.uid());
```

**Tables using this pattern**:
- `carts`
- `cart_items`
- `chatbot_conversations`
- `profiles` (for updates)

### 2. Organization-Scoped Access

**Use case**: Resources shared across an organization

```sql
-- Example: Organization members can view orders
CREATE POLICY "Members can view their organization's orders"
  ON orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

**Tables using this pattern**:
- `orders`
- `order_items` (via orders)
- `shipping_addresses`
- `invoices`
- `organization_members`

### 3. Public Read, Restricted Write

**Use case**: Data that everyone can see, but only specific roles can modify

```sql
-- Example: Products
CREATE POLICY "Everyone can view products"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**Tables using this pattern**:
- `products`
- `pricing_tiers`
- `product_categories`

### 4. Admin-Only Access

**Use case**: Sensitive data only accessible to administrators

```sql
-- Example: Leads
CREATE POLICY "Admins can manage leads"
  ON leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );
```

**Tables using this pattern**:
- `leads`
- `email_campaigns`
- `risk_assessments`
- `crm_activities`

## Detailed Policy Breakdown

### Organizations Table

**Purpose**: Isolate organization data

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view their organizations | SELECT | authenticated | Member of org |
| Owners can update their organization | UPDATE | authenticated | Owner or admin role |
| System can insert organizations | INSERT | service_role | System only |
| System can delete organizations | DELETE | service_role | System only |

### Organization Members Table

**Purpose**: Control who can see/modify organization membership

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view members of their organizations | SELECT | authenticated | Member of same org |
| Owners and admins can manage members | INSERT/UPDATE/DELETE | authenticated | Owner or admin role |
| Users can view own membership | SELECT | authenticated | user_id = auth.uid() |

### Profiles Table

**Purpose**: User profile data

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view all profiles | SELECT | authenticated | Public info only |
| Users can update their own profile | UPDATE | authenticated | Own profile |
| System can insert profiles | INSERT | service_role | System only |

### Products Table

**Purpose**: Product catalog (public read, admin write)

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Everyone can view products | SELECT | authenticated, anon | All products visible |
| Admins can manage products | INSERT/UPDATE/DELETE | authenticated | Admin role required |
| Members can view org products | SELECT | authenticated | Organization's products |

### Orders Table

**Purpose**: Order data isolation per organization

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Members can view org orders | SELECT | authenticated | Member of order's org |
| Members can create orders | INSERT | authenticated | Member of org |
| Members can update own orders | UPDATE | authenticated | Creator or org admin |
| System can manage orders | ALL | service_role | System operations |

### Order Items Table

**Purpose**: Order line items (access via parent order)

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view items for their orders | SELECT | authenticated | Via orders.user_id |
| Users can insert items in draft orders | INSERT | authenticated | Order status = 'draft' |
| Users can manage items in draft orders | UPDATE/DELETE | authenticated | Order status = 'draft' |

### Carts Table

**Purpose**: Shopping cart isolation

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view own carts | SELECT | authenticated | user_id = auth.uid() |
| Users can create own carts | INSERT | authenticated | user_id = auth.uid() |
| Users can update own carts | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own carts | DELETE | authenticated | user_id = auth.uid() |

### Cart Items Table

**Purpose**: Cart item isolation

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view own cart items | SELECT | authenticated | Via carts.user_id |
| Users can manage own cart items | INSERT/UPDATE/DELETE | authenticated | Via carts.user_id |

### Shipping Addresses Table

**Purpose**: Organization shipping addresses

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Members can view org addresses | SELECT | authenticated | Member of org |
| Members can insert addresses | INSERT | authenticated | Member of org |
| Members can update org addresses | UPDATE | authenticated | Member of org |
| Admins can delete addresses | DELETE | authenticated | Admin role |

### Invoices Table

**Purpose**: Invoice access control

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view org invoices | SELECT | authenticated | Member of org |
| System can insert invoices | INSERT | service_role | System only |
| Users can update org invoices | UPDATE | authenticated | Member of org |
| Admins can manage invoices | ALL | authenticated | Admin role |

### Leads Table

**Purpose**: Lead management (admin-only)

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Admins can view leads | SELECT | authenticated | Admin role |
| Admins can manage leads | INSERT/UPDATE/DELETE | authenticated | Admin role |
| System can create leads | INSERT | service_role | Chatbot/API |

### Chatbot Conversations Table

**Purpose**: Conversation privacy

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Users can view own conversations | SELECT | authenticated | user_id = auth.uid() |
| Users can create conversations | INSERT | authenticated | user_id = auth.uid() |
| Users can update own conversations | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own conversations | DELETE | authenticated | user_id = auth.uid() |

### Email Campaigns Table

**Purpose**: Marketing campaign access

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Admins can view campaigns | SELECT | authenticated | Admin role |
| Admins can create campaigns | INSERT | authenticated | Admin role |
| Admins can update campaigns | UPDATE | authenticated | Admin role |
| System can send campaigns | UPDATE | service_role | Status updates |

### Pricing Tiers Table

**Purpose**: Pricing visibility

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| Everyone can view pricing tiers | SELECT | authenticated, anon | Public info |
| Admins can manage pricing tiers | INSERT/UPDATE/DELETE | authenticated | Admin role |

## Testing RLS Policies

### Manual Testing

```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-id-here"}';

-- Try to access another user's cart
SELECT * FROM carts WHERE user_id != 'user-id-here';
-- Should return 0 rows

-- Reset
RESET ROLE;
```

### Automated Testing

See `apps/web/__tests__/security/rls-verification.test.ts` for automated RLS tests.

**Test Coverage**:
- ✅ User isolation (carts, orders, conversations)
- ✅ Organization isolation (members, addresses, invoices)
- ✅ Public read access (products, pricing)
- ✅ Admin-only access (leads, campaigns)
- ✅ Cross-user access prevention

## Security Best Practices

### 1. Always Enable RLS

```sql
-- Enable RLS on new tables
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### 2. Default Deny

By default, when RLS is enabled, no rows are accessible. Create policies to explicitly grant access.

### 3. Use Helper Functions

```sql
-- Create reusable functions for common checks
CREATE FUNCTION is_organization_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Use in policies
CREATE POLICY "Members can view org data"
  ON some_table FOR SELECT
  USING (is_organization_member(organization_id));
```

### 4. Test Before Deployment

- Always test RLS policies in staging
- Verify both positive and negative cases
- Test as different user roles

### 5. Monitor Policy Performance

RLS policies can impact query performance. Use indexes on columns referenced in policies:

```sql
-- Index for common policy checks
CREATE INDEX idx_orders_org_id ON orders(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
```

## Common Pitfalls

### 1. Service Role Bypasses RLS

The `service_role` key bypasses ALL RLS policies. Never expose it in client-side code.

```typescript
// ❌ BAD: Never use service role in client
const supabase = createClient(url, serviceRoleKey);

// ✅ GOOD: Use anon key in client
const supabase = createClient(url, anonKey);
```

### 2. Missing Policies for All Operations

If you create a SELECT policy but not INSERT/UPDATE/DELETE, those operations will fail.

```sql
-- ❌ Missing: No INSERT policy
CREATE POLICY "view" ON table FOR SELECT USING (...);

-- ✅ Complete: All operations covered
CREATE POLICY "view" ON table FOR SELECT USING (...);
CREATE POLICY "insert" ON table FOR INSERT WITH CHECK (...);
CREATE POLICY "update" ON table FOR UPDATE USING (...);
```

### 3. Performance Issues with Complex Policies

Complex subqueries in policies can slow down queries. Use indexed columns and materialized views when possible.

## Migration Reference

All RLS policies are defined in migration files:

- **Initial Setup**: `supabase/migrations/20251031*.sql`
- **Security Fixes**: `supabase/migrations/20251114184330_security_rls_fixes.sql`
- **Product RLS**: `supabase/migrations/20251031000004_fix_products_rls_policy.sql`

To view all policies for a table:

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table_name';
```

## Troubleshooting

### Issue: "Permission denied for table X"

**Cause**: No RLS policy grants access to the current user

**Solution**:
1. Check if RLS is enabled: `SELECT tablename FROM pg_tables WHERE rowsecurity = true;`
2. List policies: `SELECT * FROM pg_policies WHERE tablename = 'X';`
3. Verify user role and JWT claims
4. Add appropriate policy if missing

### Issue: Users can see other users' data

**Cause**: Overly permissive policy (e.g., `USING (true)`)

**Solution**:
1. Review policy: `SELECT * FROM pg_policies WHERE tablename = 'X';`
2. Update policy to check `auth.uid()` or organization membership
3. Test with multiple users

### Issue: Admin operations failing

**Cause**: Admin check not working correctly

**Solution**:
1. Verify admin role is set in `organization_members`
2. Check policy uses correct role check
3. Ensure JWT contains correct claims

## Monitoring & Auditing

### Enable Query Logging

```sql
-- Log queries that hit RLS policies
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_duration = on;
```

### Audit Policy Changes

Track who modifies RLS policies:

```sql
-- View policy creation/modification history
SELECT * FROM pg_stat_activity
WHERE query LIKE '%CREATE POLICY%' OR query LIKE '%DROP POLICY%';
```

### Regular Security Audits

- **Weekly**: Review new policies added in migrations
- **Monthly**: Run automated RLS tests
- **Quarterly**: Manual security review of all policies

---

**Last Updated**: 2026-01-18
**Reviewed By**: Security Team
**Next Review**: 2026-02-18
**Policy Count**: 292 policies across 35+ tables
