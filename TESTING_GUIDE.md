# B2B+ Testing Guide

**Version:** 1.0  
**Last Updated:** November 1, 2025  
**Purpose:** Comprehensive testing checklist for all features

---

## 🎯 Testing Overview

This guide covers testing for:
- ✅ Priority 1 features (Complete)
- ✅ Priority 2 features (Just implemented)
- ✅ Core platform functionality

**Testing Approach:**
1. Manual testing (functional, UI/UX)
2. Database validation (data integrity)
3. API testing (endpoints, responses)
4. Security testing (RLS, authentication)

---

## 📋 Priority 1 Features Testing

### 1. Quick Reorder
**Location:** `/orders` → Order history → "Reorder" button

**Test Cases:**
- [ ] Click "Reorder" on a past order
- [ ] Verify all items added to cart
- [ ] Check quantities match original order
- [ ] Confirm cart total is correct
- [ ] Test with out-of-stock items (should show warning)

**Expected Result:** All items from previous order added to cart in one click

---

### 2. Advanced Order Filtering
**Location:** `/orders` → Filter panel

**Test Cases:**
- [ ] Filter by date range (last 7 days, 30 days, custom)
- [ ] Filter by status (pending, processing, shipped, delivered)
- [ ] Filter by PO number (exact match)
- [ ] Filter by amount range ($0-$100, $100-$500, etc.)
- [ ] Combine multiple filters
- [ ] Clear all filters

**Expected Result:** Orders filtered correctly based on selected criteria

---

### 3. PO Tracking Enhancements
**Location:** `/orders/[id]` → Order details

**Test Cases:**
- [ ] View PO number on order details
- [ ] Click "Copy PO" button (should copy to clipboard)
- [ ] Verify PO number character limit (50 chars)
- [ ] Test PO number search
- [ ] Check PO display on invoice

**Expected Result:** PO tracking works smoothly with copy functionality

---

### 4. Invoice Management
**Location:** `/admin/orders` → "Generate Invoice" or `/orders/[id]` → "View Invoice"

**Test Cases:**
- [ ] Generate invoice for an order
- [ ] View invoice PDF
- [ ] Download invoice PDF
- [ ] Check invoice details (items, prices, totals, tax)
- [ ] Verify invoice number format
- [ ] Test invoice email sending
- [ ] Mark invoice as paid
- [ ] View payment history

**Expected Result:** Complete invoice lifecycle works correctly

---

### 5. 2D Container Calculator
**Location:** `/tools/container-calculator`

**Test Cases:**
- [ ] Select container type (20ft, 40ft, 40ft HC)
- [ ] Enter product dimensions (L × W × H)
- [ ] Enter quantity
- [ ] Calculate how many fit
- [ ] View optimization suggestions
- [ ] Test with multiple products
- [ ] Export calculation results

**Expected Result:** Accurate container loading calculations

---

## 📋 Priority 2 Features Testing

### 1. Advanced Role-Based Pricing

#### Admin: Pricing Tiers (`/admin/pricing/tiers`)
**Test Cases:**
- [ ] Create new pricing tier
- [ ] Set discount percentage (0-100%)
- [ ] Set priority (1-10)
- [ ] Toggle tier active/inactive
- [ ] Edit existing tier
- [ ] Delete tier (should fail if customers assigned)
- [ ] View customer count per tier

**Expected Result:** Pricing tiers managed correctly

#### Admin: Customer Tier Assignment (`/admin/pricing/customers`)
**Test Cases:**
- [ ] Assign tier to customer by email
- [ ] View all tier assignments
- [ ] Search customers by email/name
- [ ] Remove tier assignment
- [ ] Test with non-existent customer email (should show error)

**Expected Result:** Customers assigned to tiers successfully

#### Customer: Pricing Display
**Test Cases:**
- [ ] Login as customer with assigned tier
- [ ] View product prices (should show discounted price)
- [ ] Check cart totals (should reflect tier discount)
- [ ] View order history (prices should match tier at time of order)
- [ ] Test volume discounts (if configured)

**Expected Result:** Customer sees tier-specific pricing

---

### 2. AI-Enhanced Excel Imports

**Location:** `/admin/import/excel`

**Test Cases:**
- [ ] Upload valid Excel file (.xlsx)
- [ ] AI detects column mappings
- [ ] Review confidence scores (High/Medium/Low)
- [ ] Manually adjust incorrect mappings
- [ ] Preview first 5 rows
- [ ] View validation warnings
- [ ] Execute import
- [ ] Verify products created in database
- [ ] Test with invalid file format (should show error)
- [ ] Test with missing required columns (should show error)

**Expected Result:** Excel files imported with AI-assisted column mapping

**Test Data:**
Create a test Excel file with columns:
- Product Code → SKU
- Item Name → Name
- Cost → Price
- Stock → Stock Quantity

---

### 3. Email Campaigns

**Location:** `/admin/campaigns`

**Test Cases:**
- [ ] Create new campaign
- [ ] Write email subject and content (HTML)
- [ ] Save as draft
- [ ] Preview email
- [ ] Send test email to yourself
- [ ] Send campaign to all customers
- [ ] View campaign statistics (sent, opened, clicked)
- [ ] Calculate open rate and click rate
- [ ] Delete campaign

**Expected Result:** Email campaigns created and sent successfully

**Prerequisites:**
- Resend API key configured in `.env.local`
- At least one customer in database

---

### 4. OpenAI Semantic Search

**Location:** Product search bar (all pages)

**Test Cases:**
- [ ] Enable AI search (click sparkle icon)
- [ ] Search with natural language ("cups for hot drinks")
- [ ] Verify results are semantically relevant
- [ ] Compare with keyword search (should be different)
- [ ] Test with misspellings
- [ ] Test with synonyms
- [ ] Search with product attributes ("red plastic containers")

**Expected Result:** Semantic search returns relevant products even without exact keyword matches

**Prerequisites:**
- Product embeddings generated (`/admin/embeddings`)
- OpenAI API key configured

---

### 5. Smart Product Recommendations

**Location:** Product detail pages, homepage, cart

**Test Cases:**
- [ ] View "Customers Also Bought" on product page
- [ ] View "Similar Products" on product page
- [ ] View "Recommended For You" on homepage
- [ ] Click recommended product (should navigate correctly)
- [ ] Add recommended product to cart
- [ ] Verify recommendation scores (should be 0-1)
- [ ] Check recommendation reasons

**Expected Result:** Relevant product recommendations displayed

**Prerequisites:**
- Order history data (for "also bought")
- Product embeddings (for "similar products")

---

### 6. CSV Bulk Order Upload

**Location:** `/orders/bulk-upload`

**Test Cases:**
- [ ] Download CSV template
- [ ] Upload valid CSV file
- [ ] View order preview
- [ ] Check valid/invalid item counts
- [ ] Review error messages for invalid SKUs
- [ ] Verify total amount calculation
- [ ] Submit order
- [ ] View submitted order in order history
- [ ] Test with empty CSV (should show error)
- [ ] Test with invalid quantities (should show error)

**Expected Result:** Bulk orders uploaded and submitted successfully

**Test CSV:**
```csv
SKU,Quantity
EXISTING-SKU-001,10
EXISTING-SKU-002,25
INVALID-SKU,5
```

---

## 📋 Core Platform Testing

### Authentication & Authorization
**Test Cases:**
- [ ] Register new account
- [ ] Login with email/password
- [ ] Logout
- [ ] Password reset flow
- [ ] Access admin pages (should require admin role)
- [ ] Access customer pages (should require authentication)

---

### Product Catalog
**Test Cases:**
- [ ] Browse products
- [ ] Filter by category
- [ ] Search products (keyword)
- [ ] View product details
- [ ] Check product images
- [ ] Verify pricing display

---

### Shopping Cart
**Test Cases:**
- [ ] Add product to cart
- [ ] Update quantity
- [ ] Remove item
- [ ] View cart total
- [ ] Apply discounts (if applicable)
- [ ] Proceed to checkout

---

### Checkout & Orders
**Test Cases:**
- [ ] Complete checkout flow
- [ ] Enter shipping address
- [ ] Enter PO number
- [ ] Submit order
- [ ] View order confirmation
- [ ] Receive order confirmation email
- [ ] Track order status

---

## 🔒 Security Testing

### Row-Level Security (RLS)
**Test Cases:**
- [ ] Customer can only see their own orders
- [ ] Customer can only see their own cart
- [ ] Customer can only see their own pricing tier
- [ ] Admin can see all data
- [ ] Unauthenticated users cannot access protected data

**How to Test:**
1. Open browser DevTools → Network tab
2. Make API requests
3. Verify responses only include authorized data

---

### API Endpoint Security
**Test Cases:**
- [ ] Protected endpoints require authentication
- [ ] Admin endpoints require admin role
- [ ] Invalid tokens rejected
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized

---

## 📊 Database Validation

### Data Integrity
**SQL Queries to Run:**

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM order_items WHERE order_id NOT IN (SELECT id FROM orders);

-- Check for missing product references
SELECT COUNT(*) FROM order_items WHERE product_id NOT IN (SELECT id FROM products);

-- Check for invalid pricing tiers
SELECT * FROM customer_pricing_tiers WHERE tier_id NOT IN (SELECT id FROM pricing_tiers);

-- Check for duplicate SKUs
SELECT sku, COUNT(*) FROM products GROUP BY sku HAVING COUNT(*) > 1;

-- Check for negative prices
SELECT * FROM products WHERE price < 0;

-- Check for negative stock
SELECT * FROM products WHERE stock_quantity < 0;
```

---

## 🚀 Performance Testing

### Page Load Times
**Target:** < 2 seconds for all pages

**Test Cases:**
- [ ] Homepage load time
- [ ] Product listing page (with 100+ products)
- [ ] Product detail page
- [ ] Cart page
- [ ] Checkout page
- [ ] Admin dashboard

**Tool:** Browser DevTools → Network tab → Disable cache

---

### API Response Times
**Target:** < 500ms for most endpoints

**Test Cases:**
- [ ] GET /api/products (list)
- [ ] GET /api/products/[id] (detail)
- [ ] POST /api/cart (add to cart)
- [ ] GET /api/orders (list)
- [ ] POST /api/orders (create order)

**Tool:** Browser DevTools → Network tab → Check "Time" column

---

## 📱 Mobile Responsiveness

### Breakpoints to Test
- [ ] Mobile (320px - 480px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1280px+)

**Test Cases:**
- [ ] Navigation menu (hamburger on mobile)
- [ ] Product grid (responsive columns)
- [ ] Forms (readable on mobile)
- [ ] Tables (horizontal scroll on mobile)
- [ ] Buttons (touch-friendly size)

---

## 🐛 Bug Tracking

### How to Report Bugs
1. **Title:** Brief description
2. **Steps to Reproduce:** Numbered list
3. **Expected Result:** What should happen
4. **Actual Result:** What actually happened
5. **Screenshots:** If applicable
6. **Browser/Device:** Chrome 120, iPhone 14, etc.

### Bug Priority Levels
- **P0 - Critical:** Blocks core functionality (e.g., cannot checkout)
- **P1 - High:** Major feature broken (e.g., search not working)
- **P2 - Medium:** Minor feature issue (e.g., button misaligned)
- **P3 - Low:** Cosmetic issue (e.g., typo)

---

## ✅ Testing Checklist Summary

### Priority 1 Features
- [ ] Quick Reorder
- [ ] Advanced Order Filtering
- [ ] PO Tracking Enhancements
- [ ] Invoice Management
- [ ] 2D Container Calculator

### Priority 2 Features
- [ ] Advanced Role-Based Pricing
- [ ] AI-Enhanced Excel Imports
- [ ] Email Campaigns
- [ ] OpenAI Semantic Search
- [ ] Smart Product Recommendations
- [ ] CSV Bulk Order Upload

### Core Platform
- [ ] Authentication & Authorization
- [ ] Product Catalog
- [ ] Shopping Cart
- [ ] Checkout & Orders

### Security
- [ ] Row-Level Security (RLS)
- [ ] API Endpoint Security

### Performance
- [ ] Page Load Times
- [ ] API Response Times

### Mobile
- [ ] Mobile Responsiveness

---

## 📝 Test Results Log

**Date:** ___________  
**Tester:** ___________  
**Environment:** Development / Staging / Production

| Feature | Status | Notes |
|---------|--------|-------|
| Quick Reorder | ⏸️ Not Tested | |
| Advanced Filtering | ⏸️ Not Tested | |
| PO Tracking | ⏸️ Not Tested | |
| Invoice Management | ⏸️ Not Tested | |
| Container Calculator | ⏸️ Not Tested | |
| Pricing Tiers | ⏸️ Not Tested | |
| Excel Imports | ⏸️ Not Tested | |
| Email Campaigns | ⏸️ Not Tested | |
| Semantic Search | ⏸️ Not Tested | |
| Recommendations | ⏸️ Not Tested | |
| Bulk Upload | ⏸️ Not Tested | |

**Legend:**
- ✅ Passed
- ❌ Failed
- ⚠️ Passed with Issues
- ⏸️ Not Tested

---

## 🎯 Next Steps After Testing

1. **Fix Critical Bugs (P0)** - Immediately
2. **Fix High Priority Bugs (P1)** - Within 24 hours
3. **Document Known Issues** - For P2/P3 bugs
4. **Update User Documentation** - Based on test findings
5. **Prepare for Production Deployment** - Once all P0/P1 bugs fixed

---

**Happy Testing! 🚀**
