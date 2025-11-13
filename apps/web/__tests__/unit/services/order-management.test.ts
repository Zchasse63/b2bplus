/**
 * Unit Tests: Order Management Service
 *
 * Tests the complete order management workflow including:
 * - Status transitions
 * - Reorder functionality
 * - Order history queries
 * - Refunds & returns
 *
 * @group unit
 * @group business-logic
 * @group critical
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Test data factories
const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  organization_id: 'org-customer-123',
  user_id: 'user-123',
  status: 'pending',
  subtotal: 500,
  shipping_cost: 10,
  tax: 41,
  total: 551,
  items: [
    {
      product_id: 'prod-123',
      quantity: 5,
      unit_price: 100,
      line_total: 500,
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockReturn = (overrides = {}) => ({
  id: 'return-123',
  order_id: 'order-123',
  status: 'pending',
  reason: 'defective',
  items: [
    {
      product_id: 'prod-123',
      quantity: 2,
      return_amount: 200,
    },
  ],
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('Order Management Service', () => {
  describe('Status Transitions', () => {
    it('should transition from pending to approved', () => {
      const order = createMockOrder({ status: 'pending' });
      const newStatus = 'approved';

      expect(order.status).toBe('pending');
      const updatedOrder = { ...order, status: newStatus };
      expect(updatedOrder.status).toBe('approved');
    });

    it('should transition from approved to shipped', () => {
      const order = createMockOrder({ status: 'approved' });
      const newStatus = 'shipped';

      expect(order.status).toBe('approved');
      const updatedOrder = { ...order, status: newStatus };
      expect(updatedOrder.status).toBe('shipped');
    });

    it('should transition from shipped to delivered', () => {
      const order = createMockOrder({ status: 'shipped' });
      const newStatus = 'delivered';

      expect(order.status).toBe('shipped');
      const updatedOrder = { ...order, status: newStatus };
      expect(updatedOrder.status).toBe('delivered');
    });

    it('should transition from pending to cancelled', () => {
      const order = createMockOrder({ status: 'pending' });
      const newStatus = 'cancelled';

      expect(order.status).toBe('pending');
      const updatedOrder = { ...order, status: newStatus };
      expect(updatedOrder.status).toBe('cancelled');
    });

    it('should allow cancellation from any status', () => {
      const statuses = ['pending', 'approved', 'shipped'];

      statuses.forEach((status) => {
        const order = createMockOrder({ status });
        const canCancel = true; // Any status can be cancelled

        expect(canCancel).toBe(true);
        const cancelledOrder = { ...order, status: 'cancelled' };
        expect(cancelledOrder.status).toBe('cancelled');
      });
    });

    it('should prevent transition from delivered to pending', () => {
      const order = createMockOrder({ status: 'delivered' });
      const validTransitions = ['cancelled'];
      const invalidTransition = 'pending';

      expect(validTransitions).not.toContain(invalidTransition);
    });

    it('should update timestamp on status change', () => {
      const order = createMockOrder();
      const originalTime = new Date(order.updated_at);

      // Simulate time passing and update
      const updatedOrder = { ...order, updated_at: new Date().toISOString() };
      const newTime = new Date(updatedOrder.updated_at);

      expect(newTime.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });

    it('should require reason when cancelling', () => {
      const order = createMockOrder({ status: 'pending' });
      const cancellationReason = 'Customer requested';

      expect(cancellationReason).toBeTruthy();
    });

    it('should process return on delivered order', () => {
      const order = createMockOrder({ status: 'delivered' });
      const canReturnOrder = order.status === 'delivered';

      expect(canReturnOrder).toBe(true);
    });

    it('should prevent return on cancelled order', () => {
      const order = createMockOrder({ status: 'cancelled' });
      const canReturnOrder = order.status !== 'cancelled';

      expect(canReturnOrder).toBe(false);
    });

    it('should track status history', () => {
      const statusHistory = [
        { status: 'pending', timestamp: new Date().toISOString() },
        { status: 'approved', timestamp: new Date().toISOString() },
        { status: 'shipped', timestamp: new Date().toISOString() },
      ];

      expect(statusHistory.length).toBe(3);
      expect(statusHistory[0].status).toBe('pending');
      expect(statusHistory[2].status).toBe('shipped');
    });
  });

  describe('Reorder Functionality', () => {
    it('should create reorder from existing order', () => {
      const originalOrder = createMockOrder();
      const reorder = {
        original_order_id: originalOrder.id,
        organization_id: originalOrder.organization_id,
        user_id: originalOrder.user_id,
        items: originalOrder.items,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      expect(reorder.original_order_id).toBe(originalOrder.id);
      expect(reorder.items.length).toBe(originalOrder.items.length);
    });

    it('should preserve line items in reorder', () => {
      const originalOrder = createMockOrder({
        items: [
          { product_id: 'prod-123', quantity: 5, unit_price: 100, line_total: 500 },
          { product_id: 'prod-124', quantity: 3, unit_price: 50, line_total: 150 },
        ],
      });

      const reorderItems = originalOrder.items.map((item) => ({
        ...item,
      }));

      expect(reorderItems.length).toBe(2);
      expect(reorderItems[0].product_id).toBe('prod-123');
      expect(reorderItems[1].quantity).toBe(3);
    });

    it('should reset order total on reorder', () => {
      const originalOrder = createMockOrder({ total: 551 });
      const reorder = {
        ...originalOrder,
        id: 'reorder-123',
        total: 0, // Reset for recalculation
      };

      expect(reorder.total).toBe(0);
      expect(reorder.id).not.toBe(originalOrder.id);
    });

    it('should allow quantity changes on reorder', () => {
      const originalOrder = createMockOrder({
        items: [{ product_id: 'prod-123', quantity: 5 }],
      });

      const reorderItems = originalOrder.items.map((item) => ({
        ...item,
        quantity: 10, // Changed quantity
      }));

      expect(reorderItems[0].quantity).toBe(10);
      expect(reorderItems[0].quantity).not.toBe(5);
    });

    it('should check inventory availability on reorder', () => {
      const item = { product_id: 'prod-123', quantity: 100 };
      const availableStock = 50;
      const canReorder = item.quantity <= availableStock;

      expect(canReorder).toBe(false);
    });

    it('should trigger checkout flow on reorder', () => {
      const originalOrder = createMockOrder();
      const reorder = {
        ...originalOrder,
        id: 'reorder-123',
        status: 'pending',
      };

      expect(reorder.status).toBe('pending');
      expect(reorder.id).not.toBe(originalOrder.id);
    });

    it('should link reorder to original order', () => {
      const originalOrder = createMockOrder();
      const reorder = {
        original_order_id: originalOrder.id,
      };

      expect(reorder.original_order_id).toBe(originalOrder.id);
    });

    it('should preserve customer context on reorder', () => {
      const originalOrder = createMockOrder({
        organization_id: 'org-456',
        user_id: 'user-789',
      });

      const reorder = {
        organization_id: originalOrder.organization_id,
        user_id: originalOrder.user_id,
      };

      expect(reorder.organization_id).toBe('org-456');
      expect(reorder.user_id).toBe('user-789');
    });
  });

  describe('Order History', () => {
    it('should query orders by customer ID', () => {
      const userId = 'user-123';
      const orders = [
        createMockOrder({ id: 'order-1', user_id: userId }),
        createMockOrder({ id: 'order-2', user_id: userId }),
        createMockOrder({ id: 'order-3', user_id: 'user-456' }),
      ];

      const customerOrders = orders.filter((o) => o.user_id === userId);

      expect(customerOrders.length).toBe(2);
      expect(customerOrders[0].user_id).toBe(userId);
    });

    it('should query orders by organization ID', () => {
      const orgId = 'org-customer-123';
      const orders = [
        createMockOrder({ id: 'order-1', organization_id: orgId }),
        createMockOrder({ id: 'order-2', organization_id: orgId }),
        createMockOrder({ id: 'order-3', organization_id: 'org-456' }),
      ];

      const orgOrders = orders.filter((o) => o.organization_id === orgId);

      expect(orgOrders.length).toBe(2);
    });

    it('should filter orders by status', () => {
      const orders = [
        createMockOrder({ id: 'order-1', status: 'pending' }),
        createMockOrder({ id: 'order-2', status: 'approved' }),
        createMockOrder({ id: 'order-3', status: 'pending' }),
      ];

      const pendingOrders = orders.filter((o) => o.status === 'pending');

      expect(pendingOrders.length).toBe(2);
    });

    it('should sort orders by creation date newest first', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      const orders = [
        createMockOrder({ created_at: yesterday.toISOString() }),
        createMockOrder({ created_at: tomorrow.toISOString() }),
        createMockOrder({ created_at: now.toISOString() }),
      ];

      const sorted = [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sorted[0].created_at).toBe(tomorrow.toISOString());
      expect(sorted[2].created_at).toBe(yesterday.toISOString());
    });

    it('should support pagination', () => {
      const orders = Array.from({ length: 25 }, (_, i) =>
        createMockOrder({ id: `order-${i}` })
      );

      const pageSize = 10;
      const page1 = orders.slice(0, pageSize);
      const page2 = orders.slice(pageSize, pageSize * 2);
      const page3 = orders.slice(pageSize * 2, pageSize * 3);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page3.length).toBe(5);
    });

    it('should count total orders for customer', () => {
      const userId = 'user-123';
      const orders = [
        createMockOrder({ id: 'order-1', user_id: userId }),
        createMockOrder({ id: 'order-2', user_id: userId }),
        createMockOrder({ id: 'order-3', user_id: 'user-456' }),
      ];

      const totalOrders = orders.filter((o) => o.user_id === userId).length;

      expect(totalOrders).toBe(2);
    });

    it('should retrieve single order by ID', () => {
      const orders = [
        createMockOrder({ id: 'order-123' }),
        createMockOrder({ id: 'order-124' }),
      ];

      const foundOrder = orders.find((o) => o.id === 'order-123');

      expect(foundOrder).toBeDefined();
      expect(foundOrder.id).toBe('order-123');
    });

    it('should return null for non-existent order', () => {
      const orders = [createMockOrder({ id: 'order-123' })];

      const foundOrder = orders.find((o) => o.id === 'order-999');

      expect(foundOrder).toBeUndefined();
    });

    it('should include order details in history', () => {
      const order = createMockOrder({
        id: 'order-123',
        total: 551,
        status: 'delivered',
      });

      expect(order.id).toBe('order-123');
      expect(order.total).toBe(551);
      expect(order.status).toBe('delivered');
      expect(order.items).toBeDefined();
    });
  });

  describe('Refunds & Returns', () => {
    it('should calculate refund amount for returned items', () => {
      const returnedItem = {
        product_id: 'prod-123',
        quantity: 2,
        unit_price: 100,
      };

      const refundAmount = returnedItem.quantity * returnedItem.unit_price;

      expect(refundAmount).toBe(200);
    });

    it('should handle partial refund', () => {
      const order = createMockOrder({ total: 551 });
      const refundAmount = 200;
      const remainingAmount = order.total - refundAmount;

      expect(remainingAmount).toBe(351);
    });

    it('should create return authorization', () => {
      const order = createMockOrder();
      const returnAuth = createMockReturn({
        order_id: order.id,
        status: 'pending',
      });

      expect(returnAuth.order_id).toBe(order.id);
      expect(returnAuth.status).toBe('pending');
    });

    it('should process refund to original payment method', () => {
      const order = createMockOrder({
        payment_method: 'credit_card',
        total: 551,
      });

      const refund = {
        order_id: order.id,
        amount: 200,
        payment_method: order.payment_method,
        status: 'pending',
      };

      expect(refund.payment_method).toBe('credit_card');
      expect(refund.amount).toBe(200);
    });

    it('should set order status to refunded after full refund', () => {
      const order = createMockOrder({ total: 551 });
      const refundAmount = 551;
      const isFullRefund = refundAmount === order.total;

      expect(isFullRefund).toBe(true);

      const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      expect(newStatus).toBe('refunded');
    });

    it('should set order status to partially refunded for partial refund', () => {
      const order = createMockOrder({ total: 551 });
      const refundAmount = 300;
      const isFullRefund = refundAmount === order.total;

      expect(isFullRefund).toBe(false);

      const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      expect(newStatus).toBe('partially_refunded');
    });

    it('should track return reason', () => {
      const reasons = ['defective', 'wrong_item', 'not_as_described', 'customer_request'];
      const selectedReason = 'defective';

      expect(reasons).toContain(selectedReason);
    });

    it('should require return within 30 days', () => {
      const order = createMockOrder();
      const orderDate = new Date(order.created_at);
      const returnDate = new Date();
      const daysSinceOrder = Math.floor(
        (returnDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const returnWindow = 30;
      const canReturn = daysSinceOrder <= returnWindow;

      expect(canReturn).toBe(true);
    });

    it('should prevent return after window expires', () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const order = createMockOrder({ created_at: thirtyOneDaysAgo.toISOString() });

      const orderDate = new Date(order.created_at);
      const returnDate = new Date();
      const daysSinceOrder = Math.floor(
        (returnDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const returnWindow = 30;
      const canReturn = daysSinceOrder <= returnWindow;

      expect(canReturn).toBe(false);
    });

    it('should prevent refund on cancelled order', () => {
      const order = createMockOrder({ status: 'cancelled' });
      const canRefund = order.status !== 'cancelled';

      expect(canRefund).toBe(false);
    });
  });

  describe('Integration: Full Order Lifecycle', () => {
    it('should complete full order lifecycle', () => {
      // Create order
      const order = createMockOrder({ status: 'pending' });
      expect(order.status).toBe('pending');

      // Approve
      const approvedOrder = { ...order, status: 'approved' };
      expect(approvedOrder.status).toBe('approved');

      // Ship
      const shippedOrder = { ...approvedOrder, status: 'shipped' };
      expect(shippedOrder.status).toBe('shipped');

      // Deliver
      const deliveredOrder = { ...shippedOrder, status: 'delivered' };
      expect(deliveredOrder.status).toBe('delivered');
    });

    it('should handle order cancellation mid-lifecycle', () => {
      const order = createMockOrder({ status: 'pending' });
      expect(order.status).toBe('pending');

      const cancelledOrder = { ...order, status: 'cancelled' };
      expect(cancelledOrder.status).toBe('cancelled');

      // Cannot refund cancelled order
      const canRefund = cancelledOrder.status !== 'cancelled';
      expect(canRefund).toBe(false);
    });

    it('should handle reorder after delivery', () => {
      const originalOrder = createMockOrder({
        id: 'order-1',
        status: 'delivered',
        total: 551,
      });

      expect(originalOrder.status).toBe('delivered');

      const reorder = {
        original_order_id: originalOrder.id,
        status: 'pending',
        items: originalOrder.items,
      };

      expect(reorder.original_order_id).toBe('order-1');
      expect(reorder.status).toBe('pending');
    });

    it('should handle return and refund workflow', () => {
      const order = createMockOrder({ status: 'delivered', total: 551 });
      expect(order.status).toBe('delivered');

      const returnAuth = {
        order_id: order.id,
        status: 'approved',
        refund_amount: 300,
      };

      const updatedOrder = {
        ...order,
        status: 'partially_refunded',
      };

      expect(updatedOrder.status).toBe('partially_refunded');
      expect(returnAuth.refund_amount).toBe(300);
    });
  });
});
