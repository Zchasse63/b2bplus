# Test Data Documentation

**Migration File:** `supabase/migrations/99999999999999_seed_test_data.sql`

This document describes all test data seeded into the database for E2E testing purposes.

---

## 🔐 Test User Accounts

### 1. Regular User (Member)
- **Email:** `test@testmail.app`
- **Password:** `TestPassword123!`
- **Full Name:** Test User
- **Phone:** +1-555-1001
- **Organization:** Acme Restaurant Group
- **Role:** Member
- **Use For:** Standard user workflows, cart operations, order placement

### 2. Admin User
- **Email:** `admin@testmail.app`
- **Password:** `AdminPassword123!`
- **Full Name:** Admin User
- **Phone:** +1-555-1002
- **Organizations:**
  - Acme Restaurant Group (Admin)
  - City Hospital (Admin)
- **Use For:** Admin features, user management, approval workflows

### 3. Organization Owner
- **Email:** `owner@testmail.app`
- **Password:** `OwnerPassword123!`
- **Full Name:** Owner User
- **Phone:** +1-555-1003
- **Organization:** Acme Restaurant Group
- **Role:** Owner
- **Use For:** Organization management, billing, member invitations

### 4. Viewer User
- **Email:** `viewer@testmail.app`
- **Password:** `ViewerPassword123!`
- **Full Name:** Viewer User
- **Phone:** +1-555-1004
- **Organization:** Grand Hotel Chain
- **Role:** Viewer
- **Use For:** Read-only access testing, permission validation

> **Note:** All test users use the `@testmail.app` domain, which is a real temporary email service that allows Supabase to send password reset emails during testing. The old `@example.com` domain was blocked by Supabase.

---

## 🏢 Test Organizations

### 1. Acme Restaurant Group
- **ID:** `11111111-1111-1111-1111-111111111111`
- **Slug:** `acme-restaurant`
- **Type:** Restaurant
- **Tax ID:** 12-3456789
- **Phone:** +1-555-0100
- **Website:** https://acme-restaurant.example.com
- **Members:**
  - owner@example.com (Owner)
  - admin@example.com (Admin)
  - test@example.com (Member)
- **Products:** 10 disposable products
- **Addresses:** 2 shipping addresses

### 2. Grand Hotel Chain
- **ID:** `22222222-2222-2222-2222-222222222222`
- **Slug:** `grand-hotel`
- **Type:** Hotel
- **Tax ID:** 98-7654321
- **Phone:** +1-555-0200
- **Website:** https://grand-hotel.example.com
- **Members:**
  - viewer@example.com (Viewer)
- **Addresses:** 1 shipping address

### 3. City Hospital
- **ID:** `33333333-3333-3333-3333-333333333333`
- **Slug:** `city-hospital`
- **Type:** Hospital
- **Tax ID:** 45-6789012
- **Phone:** +1-555-0300
- **Website:** https://city-hospital.example.com
- **Members:**
  - admin@example.com (Admin)
- **Addresses:** 1 shipping address

---

## 📦 Test Products (Acme Restaurant Group)

All products belong to organization `11111111-1111-1111-1111-111111111111`

### Plates
1. **9" White Paper Plates**
   - SKU: `PLATE-9IN-WHT-500`
   - Price: $45.99/case
   - Units: 500 per case
   - Category: Disposables > Plates

2. **6" White Paper Plates**
   - SKU: `PLATE-6IN-WHT-1000`
   - Price: $32.99/case
   - Units: 1000 per case
   - Category: Disposables > Plates

### Cups
3. **12oz Clear Plastic Cups**
   - SKU: `CUP-12OZ-CLR-1000`
   - Price: $38.99/case
   - Units: 1000 per case
   - Category: Disposables > Cups

4. **16oz Hot Coffee Cups**
   - SKU: `CUP-16OZ-HOT-500`
   - Price: $52.99/case
   - Units: 500 per case
   - Category: Disposables > Cups

### Cutlery
5. **White Plastic Forks**
   - SKU: `FORK-PLSTC-WHT-1000`
   - Price: $28.99/case
   - Units: 1000 per case
   - Category: Disposables > Cutlery

6. **White Plastic Knives**
   - SKU: `KNIFE-PLSTC-WHT-1000`
   - Price: $28.99/case
   - Units: 1000 per case
   - Category: Disposables > Cutlery

### Napkins
7. **White Dinner Napkins**
   - SKU: `NAPKIN-DINNER-WHT-3000`
   - Price: $42.99/case
   - Units: 3000 per case
   - Category: Disposables > Napkins

### Containers
8. **9" Clamshell Containers**
   - SKU: `CONT-CLAM-9IN-150`
   - Price: $65.99/case
   - Units: 150 per case
   - Category: Disposables > Containers

9. **32oz Rectangular Containers**
   - SKU: `CONT-RECT-32OZ-240`
   - Price: $58.99/case
   - Units: 240 per case
   - Category: Disposables > Containers

### Foil & Wrap
10. **18" Aluminum Foil Roll**
    - SKU: `FOIL-ROLL-18IN-500FT`
    - Price: $89.99/each
    - Units: 1 per order
    - Category: Disposables > Foil & Wrap

---

## 📍 Shipping Addresses

### Acme Restaurant Group

#### Main Kitchen (Default)
- **ID:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **Contact:** John Smith
- **Phone:** +1-555-0101
- **Address:** 123 Main Street, Suite 100, New York, NY 10001
- **Instructions:** Deliver to back entrance
- **Default:** Yes

#### Downtown Location
- **ID:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab`
- **Contact:** Jane Doe
- **Phone:** +1-555-0102
- **Address:** 456 Broadway, New York, NY 10013
- **Instructions:** Ring doorbell
- **Default:** No

### Grand Hotel Chain

#### Hotel Receiving (Default)
- **ID:** `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- **Contact:** Bob Johnson
- **Phone:** +1-555-0201
- **Address:** 789 Park Avenue, Loading Dock B, New York, NY 10021
- **Instructions:** Call 30 minutes before delivery
- **Default:** Yes

### City Hospital

#### Hospital Cafeteria (Default)
- **ID:** `cccccccc-cccc-cccc-cccc-cccccccccccc`
- **Contact:** Dr. Sarah Williams
- **Phone:** +1-555-0301
- **Address:** 321 Hospital Drive, Building C, New York, NY 10032
- **Instructions:** Deliver to cafeteria loading dock
- **Default:** Yes

---

## ✅ Consent Records

All test users have granted consent for:
- Terms of Service
- Privacy Policy
- Data Processing
- Marketing
- Analytics

**IP Address:** 127.0.0.1 (localhost)
**Granted At:** Migration run time

---

## 🔧 How to Use This Test Data

### Running the Seed Migration

```bash
# Apply the migration
supabase db push

# Or run directly
psql $DATABASE_URL -f supabase/migrations/99999999999999_seed_test_data.sql
```

### In E2E Tests

```typescript
// Use test credentials in your fixtures
const TEST_USERS = {
  regular: {
    email: 'test@testmail.app',
    password: 'TestPassword123!',
  },
  admin: {
    email: 'admin@testmail.app',
    password: 'AdminPassword123!',
  },
  owner: {
    email: 'owner@testmail.app',
    password: 'OwnerPassword123!',
  },
  viewer: {
    email: 'viewer@testmail.app',
    password: 'ViewerPassword123!',
  },
};
```

### Test Scenarios

**Cart & Checkout:**
- Login as `test@testmail.app`
- Add products from Acme Restaurant Group
- Use "Main Kitchen" shipping address
- Complete checkout

**Admin Features:**
- Login as `admin@testmail.app`
- Manage users in Acme Restaurant Group
- View orders across organizations

**Permission Testing:**
- Login as `viewer@testmail.app`
- Verify read-only access to Grand Hotel Chain
- Ensure cannot modify data

---

## 🛡️ Safety Features

1. **Environment Check:** Migration only runs in development/test environments
2. **Idempotent:** Can be run multiple times safely (uses `ON CONFLICT`)
3. **Predictable IDs:** Uses fixed UUIDs for easy test assertions
4. **Realistic Data:** Products, prices, and addresses mirror real-world usage

---

## 📝 Notes

- All test users have confirmed email addresses
- Passwords use bcrypt hashing (same as production)
- Products have realistic dimensions for container optimization testing
- Shipping addresses cover different delivery scenarios
- Organizations represent different business types (restaurant, hotel, hospital)

---

## 🔄 Resetting Test Data

To reset test data, simply re-run the migration:

```bash
supabase db reset
supabase db push
```

This will drop all data and re-apply all migrations including the seed data.

---

**Last Updated:** October 30, 2025
**Email Domain Change:** Migrated from `@example.com` to `@testmail.app` on October 30, 2025 to enable password reset email testing with Supabase.

