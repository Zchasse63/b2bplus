# B2B+ Frontend Integration Task List

**Created:** October 31, 2025  
**Status:** In Progress

---

## Phase 1: Update ProductCard Component ✅ STARTING

### Task 1.1: Create pricing hook
- [ ] Create `hooks/usePricing.ts` to call pricing API
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Cache pricing results

### Task 1.2: Update ProductCard component
- [ ] Replace `base_price` display with dynamic pricing
- [ ] Show discount badges when applicable
- [ ] Display pricing source (tier, promo, volume, etc.)
- [ ] Show savings amount
- [ ] Update cart integration to pass pricing data

---

## Phase 2: Create Search and Filter Components

### Task 2.1: Create SearchBar component
- [ ] Create `components/SearchBar.tsx`
- [ ] Implement debounced search input
- [ ] Add search suggestions/autocomplete
- [ ] Highlight matching terms in suggestions

### Task 2.2: Create FilterSidebar component
- [ ] Create `components/FilterSidebar.tsx`
- [ ] Category filter with checkboxes
- [ ] Price range slider
- [ ] Brand filter
- [ ] Stock status filter
- [ ] Show facet counts

### Task 2.3: Update products page
- [ ] Integrate SearchBar
- [ ] Integrate FilterSidebar
- [ ] Implement search API calls
- [ ] Update product list based on filters
- [ ] Add pagination
- [ ] Show result count

---

## Phase 3: Create Category Navigation

### Task 3.1: Create CategoryMenu component
- [ ] Create `components/CategoryMenu.tsx`
- [ ] Fetch categories from database
- [ ] Display top-level categories
- [ ] Show subcategories on hover/click
- [ ] Handle category selection

### Task 3.2: Create Breadcrumbs component
- [ ] Create `components/Breadcrumbs.tsx`
- [ ] Show current category path
- [ ] Make breadcrumbs clickable
- [ ] Update on navigation

### Task 3.3: Create CategoryPage
- [ ] Create `app/categories/[slug]/page.tsx`
- [ ] Fetch products by category
- [ ] Show category description
- [ ] Display subcategories
- [ ] Integrate with filters

### Task 3.4: Update ProductCard
- [ ] Link category badge to category page
- [ ] Use category_id instead of category text field

---

## Phase 4: Update Cart with Pricing API

### Task 4.1: Create promotional code input
- [ ] Create `components/PromoCodeInput.tsx`
- [ ] Input field with apply button
- [ ] Validate promo code
- [ ] Show applied discount
- [ ] Handle error messages

### Task 4.2: Update CartView component
- [ ] Call pricing API for each cart item
- [ ] Display line-item discounts
- [ ] Show pricing source for each item
- [ ] Calculate total with all discounts
- [ ] Integrate PromoCodeInput
- [ ] Show discount breakdown

### Task 4.3: Create cart pricing hook
- [ ] Create `hooks/useCartPricing.ts`
- [ ] Batch pricing calculations
- [ ] Handle promo code application
- [ ] Update totals reactively

---

## Phase 5: Integrate Error Handling

### Task 5.1: Create error boundary
- [ ] Create `components/ErrorBoundary.tsx`
- [ ] Catch React errors
- [ ] Display user-friendly error messages
- [ ] Log errors for debugging

### Task 5.2: Update form validation
- [ ] Use validation utilities in forms
- [ ] Show field-specific errors
- [ ] Prevent invalid submissions
- [ ] Sanitize inputs

### Task 5.3: Update API error handling
- [ ] Use custom error classes
- [ ] Display formatted error messages
- [ ] Handle different error types
- [ ] Add retry logic where appropriate

---

## Phase 6: Add Performance Optimizations

### Task 6.1: Implement debouncing
- [ ] Create `hooks/useDebounce.ts`
- [ ] Apply to search input
- [ ] Apply to filter changes

### Task 6.2: Implement caching
- [ ] Create `lib/cache.ts`
- [ ] Cache category data
- [ ] Cache product lists
- [ ] Cache pricing results
- [ ] Implement cache invalidation

### Task 6.3: Add lazy loading
- [ ] Lazy load product images
- [ ] Implement infinite scroll for products
- [ ] Lazy load category data

### Task 6.4: Optimize bundle size
- [ ] Code split by route
- [ ] Lazy load heavy components
- [ ] Optimize images

---

## Phase 7: Testing and Documentation

### Task 7.1: Component testing
- [ ] Test ProductCard with pricing
- [ ] Test SearchBar and filters
- [ ] Test CategoryMenu navigation
- [ ] Test CartView with discounts
- [ ] Test PromoCodeInput

### Task 7.2: Integration testing
- [ ] Test complete product browsing flow
- [ ] Test search to cart to checkout flow
- [ ] Test category navigation flow
- [ ] Test promo code application flow

### Task 7.3: Documentation
- [ ] Document new components
- [ ] Update README with new features
- [ ] Create user guide for new features
- [ ] Document API integration patterns

### Task 7.4: Final report
- [ ] Create implementation summary
- [ ] Document known issues
- [ ] List future enhancements
- [ ] Provide deployment checklist

---

## Summary

**Total Tasks:** 40+  
**Estimated Time:** 4-6 hours  
**Current Status:** Starting Phase 1
