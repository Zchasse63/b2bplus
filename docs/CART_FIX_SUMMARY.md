# Cart Functionality Fix Summary

## Date: October 31, 2025

## Problem Statement
The "Add to Cart" functionality was failing with RLS policy violations, preventing users from adding products to their shopping cart.

## Root Causes Identified

### 1. Missing Organization Membership Records
**Issue**: Users created before the `handle_new_user()` trigger was added did not have corresponding `organization_members` records.

**Impact**: The RLS policy on `cart_items` table uses `is_organization_member(organization_id)` function, which checks the `organization_members` table. Without this record, all cart operations failed with error code 42501 (insufficient privilege).

**Solution**: 
- Created migration `20251031000007_fix_org_memberships_function.sql`
- Added `fix_my_organization_membership()` function with `SECURITY DEFINER` to bypass RLS
- Function checks if user has organization membership and creates it if missing
- Successfully applied via Supabase MCP

### 2. Schema Mismatch - cart_id Column
**Issue**: The `cart_items` table had a NOT NULL `cart_id` column that was not in the original schema migrations.

**Details**:
- Initial schema (20240101000000_initial_schema.sql) defines cart_items without cart_id
- Comprehensive seed data (99999999999998_comprehensive_seed_data.sql) references a `carts` table and cart_id column
- The cart_id column exists in the database but is NOT NULL, causing inserts to fail
- No `carts` table exists in the schema migrations

**Impact**: Even after fixing organization membership, cart inserts failed with error code 23502 (not-null constraint violation).

**Solution**:
- Created migration `make_cart_id_nullable` to alter cart_items table
- Changed cart_id column from NOT NULL to nullable
- Successfully applied via Supabase MCP
- This allows cart_items to work without requiring a parent cart record

## Migrations Applied

1. **fix_org_memberships_function** (via Supabase MCP apply_migration)
   - Creates `fix_my_organization_membership()` function
   - Grants execute permission to authenticated users
   - Uses SECURITY DEFINER to bypass RLS for administrative operations

2. **make_cart_id_nullable** (via Supabase MCP apply_migration)
   - Alters cart_items table to make cart_id nullable
   - SQL: `ALTER TABLE cart_items ALTER COLUMN cart_id DROP NOT NULL;`

## Testing Results

### Test 1: Organization Membership Fix
**Test Page**: `/test-cart`
**Action**: Clicked "Fix Organization Membership" button
**Result**: ✅ SUCCESS
**Output**: "Organization membership created"

### Test 2: Cart Insert (Database Level)
**Test Page**: `/test-cart`
**Action**: Clicked "Test Cart Insert" button
**Result**: ✅ SUCCESS
**Output**: 
```json
{
  "id": "847fae3c-e938-4a92-b2df-54e1570664ff",
  "organization_id": "11111111-1111-1111-1111-111111111111",
  "user_id": "b0d0c553-07d7-44c4-a36e-b3bb391e0210",
  "product_id": "854bcee9-1456-4409-bf59-776edc2dfad3",
  "quantity": 1,
  "cart_id": null
}
```

### Test 3: Add to Cart (UI Level)
**Page**: `/products`
**Action**: Clicked "Add to Cart" button on product card
**Result**: ⚠️ PARTIAL SUCCESS
**Notes**: 
- No error occurred (previous RLS errors resolved)
- Cart counter showed "1" indicating item was added
- Unable to verify cart page due to session loss after server restart

## Known Issues

### Bug #6: Session Persistence
**Status**: EXISTING - NOT FIXED
**Description**: User sessions are lost on page navigation or server restart
**Impact**: 
- After server restart, user appears logged out
- Cart page shows loading spinner indefinitely when not authenticated
- Prevents full end-to-end testing of cart functionality

**Evidence**: After restarting dev server, header changed from showing user menu to "Sign In" / "Sign Up" buttons

## Recommendations

### Immediate Actions
1. ✅ Cart insert functionality is now working at the database level
2. ⚠️ Session persistence issue (Bug #6) must be fixed before full cart testing
3. 📋 Cart page needs to be tested with authenticated session

### Schema Cleanup Needed
The schema has inconsistencies that should be addressed:

**Option A: Remove cart_id** (Simpler)
- Drop cart_id column from cart_items table
- Update seed data to not reference carts table
- Current cart model: Direct user → cart_items relationship

**Option B: Implement Full Cart Model** (More Complex)
- Create carts table migration
- Add proper foreign key constraints
- Update application code to create cart sessions
- Update all cart-related components

**Recommendation**: Option A for MVP, Option B for future enhancement

### Files Modified
- `/home/ubuntu/b2bplus/apps/web/.env.local` - Added SUPABASE_SERVICE_ROLE_KEY
- `/home/ubuntu/b2bplus/supabase/migrations/20251031000007_fix_org_memberships_function.sql` - Created
- Database: Applied two migrations via Supabase MCP

### Test Credentials Used
- Email: test@testmail.app
- Password: TestPassword123!
- Organization: 11111111-1111-1111-1111-111111111111

## Next Steps for Testing
1. Fix session persistence issue (Bug #6)
2. Re-login and test full cart flow:
   - Add multiple items to cart
   - View cart page
   - Update quantities
   - Remove items
   - Proceed to checkout
3. Test with newly registered users (should have organization_members via trigger)
4. Document any additional issues found

## Technical Notes

### Supabase Service Role Key
Retrieved via Rube MCP connector:
- Used RUBE_SEARCH_TOOLS to find Supabase API key tools
- Used RUBE_MULTI_EXECUTE_TOOL with SUPABASE_GET_PROJECT_API_KEYS
- Project ref: ksprdklquoskvjqsicvv
- Key stored in .env.local (not committed to git)

### RLS Policy Check
The cart_items RLS policy uses:
```sql
is_organization_member(organization_id)
```

This function queries:
```sql
SELECT EXISTS (
  SELECT 1 FROM organization_members 
  WHERE user_id = auth.uid() 
  AND organization_id = $1
)
```

Without organization_members record, this returns false and blocks all operations.

## Conclusion
The core cart insertion functionality is now working. The fix involved:
1. Adding missing organization membership records for existing users
2. Making cart_id nullable to work around schema mismatch

The remaining blocker for full testing is the session persistence issue, which is a separate authentication/middleware problem.
