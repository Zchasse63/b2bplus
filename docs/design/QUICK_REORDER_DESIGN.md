# Quick Reorder Feature Design

**Date**: October 31, 2025
**Feature**: Quick Reorder from Order History
**Priority**: 1 - Critical

---

## Overview

Allow users to quickly reorder all items from a previous order with a single click. This is a critical B2B feature that saves time for repeat customers.

---

## User Stories

1. **As a customer**, I want to reorder all items from a previous order so that I can quickly place repeat orders without manually adding each item.

2. **As a customer**, I want to see the current pricing when reordering so that I know if prices have changed.

3. **As a customer**, I want to review the cart before completing the order so that I can make adjustments if needed.

---

## Technical Design

### API Endpoint

**POST** `/api/orders/reorder`

**Request Body**:
```json
{
  "orderId": "uuid",
  "userId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "cartItemsAdded": 5,
  "message": "5 items added to cart"
}
```

**Business Logic**:
1. Verify the order belongs to the user's organization
2. Fetch all order items from the order
3. For each item:
   - Check if product still exists and is in stock
   - Add to user's cart with the original quantity
   - If item already in cart, update quantity (add to existing)
4. Return summary of items added

**Error Handling**:
- Order not found → 404
- Order doesn't belong to user's org → 403
- No items in order → 400
- Product no longer available → Skip item, add note to response

---

## UI Components

### Order History Page (`/orders`)
- Add "Reorder" button to each order card
- Button placement: Bottom right of order card
- Icon: Shopping cart with circular arrow
- On click: Call reorder API, show toast notification, redirect to cart

### Order Details Page (`/orders/[id]`)
- Add "Reorder All Items" button at the top of the page
- Prominent placement near order summary
- Same functionality as order history button

### Toast Notifications
- Success: "✅ 5 items added to cart"
- Partial success: "⚠️ 3 of 5 items added to cart (2 unavailable)"
- Error: "❌ Unable to reorder. Please try again."

---

## Database Considerations

**No schema changes needed**. We'll use existing tables:
- `orders` - Source order data
- `order_items` - Items to reorder
- `cart_items` - Destination for reordered items
- `products` - Verify product availability

---

## Edge Cases

1. **Product no longer exists**: Skip item, notify user
2. **Product out of stock**: Add to cart anyway (user can decide)
3. **Item already in cart**: Add quantities together
4. **Empty order**: Return error message
5. **Pricing changed**: Use current pricing, not historical

---

## Testing Checklist

- [ ] Reorder with all items available
- [ ] Reorder with some items unavailable
- [ ] Reorder when items already in cart
- [ ] Reorder from different organizations (should fail)
- [ ] Reorder with empty order (should fail)
- [ ] Check that current pricing is used
- [ ] Verify cart badge updates
- [ ] Test toast notifications

---

## Implementation Steps

1. Create `/api/orders/reorder` endpoint
2. Add "Reorder" button to Order History page
3. Add "Reorder All Items" button to Order Details page
4. Test functionality
5. Update documentation

---

## Success Metrics

- Users can reorder in < 3 seconds
- 95%+ success rate for reorders
- Reduced time to place repeat orders by 80%
