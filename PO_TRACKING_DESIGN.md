# PO Tracking Enhancements Design

**Date**: October 31, 2025
**Feature**: PO Tracking Enhancements
**Priority**: 1 - Critical
**Effort**: Low

---

## Overview

Enhance PO (Purchase Order) tracking and management throughout the platform. Make PO numbers more prominent, add validation, and improve PO-based search and filtering capabilities.

---

## Current State

- PO number field exists on orders
- Basic PO number display on order details
- PO number searchable in order history
- No validation or formatting
- No PO number suggestions or history

---

## Proposed Enhancements

### 1. PO Number Validation
- **Format Validation**: Optional regex pattern for PO numbers
- **Duplicate Detection**: Warn if PO number already used
- **Required Field Option**: Make PO number required for certain organizations

### 2. PO Number Suggestions
- **Recent POs**: Show dropdown of recently used PO numbers
- **Auto-increment**: Suggest next PO number based on pattern
- **Templates**: Support PO number templates (e.g., "PO-2025-001")

### 3. Enhanced Display
- **Prominent Display**: Make PO number more visible in UI
- **Copy to Clipboard**: One-click copy of PO number
- **PO Number Badge**: Visual badge on order cards

### 4. PO-Based Features
- **Group by PO**: View all orders with same PO number
- **PO History**: Track all orders under a PO number
- **PO Analytics**: Spending per PO number

---

## Implementation Plan

### Phase 1: Basic Enhancements (Current Sprint)
1. Make PO number more prominent in checkout
2. Add PO number to order cards in order history
3. Improve PO number search highlighting
4. Add copy-to-clipboard for PO numbers

### Phase 2: Validation (Future)
1. Add PO number format validation
2. Duplicate PO detection
3. Organization-level PO settings

### Phase 3: Advanced Features (Future)
1. PO number suggestions
2. PO grouping and analytics
3. PO templates

---

## UI Changes

### Checkout Page
**Before**:
```
PO Number (optional)
[________________]
```

**After**:
```
Purchase Order Number *
[________________] [📋 Copy] [🔍 Recent]
Recently used: PO-2025-001, PO-2025-002
```

### Order Card
**Before**:
```
Order #12345
$1,234.56
```

**After**:
```
Order #12345  |  PO: PO-2025-001 [📋]
$1,234.56
```

### Order Details
**Before**:
```
Additional Information
PO Number: PO-2025-001
```

**After**:
```
Purchase Order
PO-2025-001 [📋 Copy] [🔍 View All Orders]
```

---

## Database Considerations

**No schema changes needed** for Phase 1. Existing `po_number` field in `orders` table is sufficient.

Future phases may add:
- `po_templates` table for PO number templates
- `po_settings` in `organizations` table for validation rules

---

## Implementation (Phase 1)

### 1. Update Checkout Page
- Make PO number field more prominent
- Add copy-to-clipboard button
- Add character counter
- Improve label and help text

### 2. Update Order Cards
- Display PO number prominently
- Add copy-to-clipboard button
- Add PO badge styling

### 3. Update Order Details
- Make PO number section more prominent
- Add copy-to-clipboard button
- Add "View all orders with this PO" link

### 4. Improve Search
- Highlight PO number matches in search results
- Add PO-specific search filter

---

## Success Metrics

- PO numbers used in 80%+ of orders
- Reduced support requests about PO tracking
- Faster PO-based order lookup
- Improved user satisfaction with PO management

---

## Files to Modify

1. `/apps/web/app/checkout/page.tsx` - Enhance PO input
2. `/apps/web/app/orders/page.tsx` - Add PO to order cards
3. `/apps/web/app/orders/[id]/page.tsx` - Enhance PO display
4. `/apps/web/components/CopyButton.tsx` (NEW) - Reusable copy button

---

## Testing Checklist

- [ ] PO number displays on order cards
- [ ] PO number displays prominently on order details
- [ ] Copy-to-clipboard works for PO numbers
- [ ] PO number search works correctly
- [ ] PO number saves correctly during checkout
- [ ] Empty PO numbers handled gracefully

---

## Future Enhancements (Phase 2 & 3)

### Validation
- Regex pattern validation
- Duplicate PO detection with warning
- Required field enforcement

### Suggestions
- Recent PO dropdown
- Auto-increment based on pattern
- PO number templates

### Analytics
- Total spending per PO
- Order count per PO
- PO usage trends

---

## Conclusion

Phase 1 focuses on making PO numbers more visible and easier to use. This low-effort enhancement will significantly improve PO tracking for B2B customers without requiring database changes or complex logic.
