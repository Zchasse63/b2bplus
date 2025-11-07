/**
 * Unit tests for Chatbot Actions
 * 
 * Tests all 7 chatbot actions:
 * 1. checkOrderStatus
 * 2. getOrderHistory
 * 3. checkInventory
 * 4. addToCart
 * 5. getProductInfo
 * 6. createSupportTicket
 * 7. reorderLastOrder
 * 8. executeChatbotAction (dispatcher)
 */

import {
  checkOrderStatus,
  getOrderHistory,
  checkInventory,
  addToCart,
  getProductInfo,
  createSupportTicket,
  reorderLastOrder,
  executeChatbotAction,
} from './chatbot-actions';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Chatbot Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock Supabase client with chainable methods
    mockSupabase = {};
    mockSupabase.from = jest.fn(() => mockSupabase);
    mockSupabase.select = jest.fn(() => mockSupabase);
    mockSupabase.eq = jest.fn(() => mockSupabase);
    mockSupabase.or = jest.fn(() => mockSupabase);
    mockSupabase.in = jest.fn(() => mockSupabase);
    mockSupabase.order = jest.fn(() => mockSupabase);
    mockSupabase.limit = jest.fn(() => mockSupabase);
    mockSupabase.single = jest.fn();
    mockSupabase.insert = jest.fn(() => mockSupabase);
    mockSupabase.update = jest.fn(() => mockSupabase);
    mockSupabase.upsert = jest.fn(() => mockSupabase);

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('checkOrderStatus', () => {
    it('returns order status for valid order', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'order-1',
          order_number: 'ORD-123',
          status: 'shipped',
          total: 500,
          submitted_at: '2024-01-01',
          shipping_tracking_number: 'TRACK123',
        },
        error: null,
      });

      const result = await checkOrderStatus('user-1', 'org-1', 'ORD-123');

      expect(result.success).toBe(true);
      expect(result.data.order_number).toBe('ORD-123');
      expect(result.data.status).toBe('shipped');
      expect(result.message).toContain('shipped');
    });

    it('returns error for non-existent order', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await checkOrderStatus('user-1', 'org-1', 'ORD-999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles database errors gracefully', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database error'));

      const result = await checkOrderStatus('user-1', 'org-1', 'ORD-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check order status');
    });
  });

  describe('getOrderHistory', () => {
    it('returns order history for user', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { id: 'order-1', order_number: 'ORD-123', status: 'completed', total: 500 },
          { id: 'order-2', order_number: 'ORD-124', status: 'shipped', total: 300 },
        ],
        error: null,
      });

      const result = await getOrderHistory('user-1', 'org-1', 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.message).toContain('2 recent orders');
    });

    it('returns empty array when no orders found', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getOrderHistory('user-1', 'org-1', 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.message).toContain('0 recent orders');
    });

    it('handles database errors', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await getOrderHistory('user-1', 'org-1', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve order history');
    });
  });

  describe('checkInventory', () => {
    it('returns matching products', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { id: 'prod-1', sku: 'SKU-1', name: 'Widget', in_stock: true, base_price: 10 },
          { id: 'prod-2', sku: 'SKU-2', name: 'Gadget', in_stock: true, base_price: 20 },
        ],
        error: null,
      });

      const result = await checkInventory('org-1', 'widget', 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.message).toContain('2 products');
    });

    it('returns empty array when no products match', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await checkInventory('org-1', 'nonexistent', 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.message).toContain('0 products');
    });

    it('handles database errors', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await checkInventory('org-1', 'widget', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check inventory');
    });
  });

  describe('addToCart', () => {
    it('adds new product to cart', async () => {
      // Mock product lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Widget', base_price: 10, in_stock: true },
        error: null,
      });

      // Mock existing cart item check (not found)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert
      mockSupabase.insert.mockResolvedValueOnce({
        error: null,
      });

      const result = await addToCart('user-1', 'org-1', 'prod-1', 5);

      expect(result.success).toBe(true);
      expect(result.data.productId).toBe('prod-1');
      expect(result.data.quantity).toBe(5);
      expect(result.message).toContain('Added');
    });

    it('updates existing cart item quantity', async () => {
      // Mock product lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'prod-1', name: 'Widget', base_price: 10, in_stock: true },
          error: null,
        })
        // Mock existing cart item check (found)
        .mockResolvedValueOnce({
          data: { id: 'cart-1', quantity: 3 },
          error: null,
        });

      // Mock update - need to mock the full chain: update().eq()
      const updateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.update.mockReturnValueOnce(updateChain);

      const result = await addToCart('user-1', 'org-1', 'prod-1', 2);

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(5); // 3 + 2
      expect(result.message).toContain('Updated');
    });

    it('returns error for non-existent product', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await addToCart('user-1', 'org-1', 'prod-999', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('returns error for out of stock product', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Widget', base_price: 10, in_stock: false },
        error: null,
      });

      const result = await addToCart('user-1', 'org-1', 'prod-1', 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of stock');
    });
  });

  describe('getProductInfo', () => {
    it('returns product information', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'prod-1',
          sku: 'SKU-1',
          name: 'Widget',
          description: 'A great widget',
          base_price: 10,
          in_stock: true,
        },
        error: null,
      });

      const result = await getProductInfo('prod-1');

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Widget');
      expect(result.message).toContain('Widget');
    });

    it('returns error for non-existent product', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await getProductInfo('prod-999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });
  });

  describe('createSupportTicket', () => {
    it('creates support ticket successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'ticket-1', ticket_number: 'TKT-123' },
        error: null,
      });

      const result = await createSupportTicket(
        'user-1',
        'org-1',
        'Issue with order',
        'My order is delayed',
        'shipping',
        'high'
      );

      expect(result.success).toBe(true);
      expect(result.data.ticket_number).toBe('TKT-123');
      expect(result.message).toContain('TKT-123');
    });

    it('handles database errors', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await createSupportTicket(
        'user-1',
        'org-1',
        'Issue',
        'Description',
        'general'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create support ticket');
    });
  });

  describe('reorderLastOrder', () => {
    it('adds items from last order to cart', async () => {
      // Mock last order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'order-1',
          order_number: 'ORD-123',
          order_items: [
            { product_id: 'prod-1', quantity: 2, name: 'Widget' },
            { product_id: 'prod-2', quantity: 1, name: 'Gadget' },
          ],
        },
        error: null,
      });

      // Mock product availability check
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: 'prod-1', name: 'Widget', in_stock: true },
          { id: 'prod-2', name: 'Gadget', in_stock: true },
        ],
        error: null,
      });

      // Mock upsert
      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      const result = await reorderLastOrder('user-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.data.itemsAdded).toBe(2);
      expect(result.data.itemsOutOfStock).toBe(0);
      expect(result.message).toContain('ORD-123');
    });

    it('handles out of stock items', async () => {
      // Mock last order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'order-1',
          order_number: 'ORD-123',
          order_items: [
            { product_id: 'prod-1', quantity: 2, name: 'Widget' },
            { product_id: 'prod-2', quantity: 1, name: 'Gadget' },
          ],
        },
        error: null,
      });

      // Mock product availability check (one out of stock)
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: 'prod-1', name: 'Widget', in_stock: true },
          { id: 'prod-2', name: 'Gadget', in_stock: false },
        ],
        error: null,
      });

      // Mock upsert
      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      const result = await reorderLastOrder('user-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.data.itemsAdded).toBe(1);
      expect(result.data.itemsOutOfStock).toBe(1);
      expect(result.message).toContain('out of stock');
    });

    it('returns error when no previous orders found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await reorderLastOrder('user-1', 'org-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No previous orders found');
    });

    it('returns error when all items are out of stock', async () => {
      // Mock last order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'order-1',
          order_number: 'ORD-123',
          order_items: [
            { product_id: 'prod-1', quantity: 2, name: 'Widget' },
          ],
        },
        error: null,
      });

      // Mock product availability check (all out of stock)
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: 'prod-1', name: 'Widget', in_stock: false },
        ],
        error: null,
      });

      const result = await reorderLastOrder('user-1', 'org-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('None of the items');
    });
  });

  describe('executeChatbotAction', () => {
    it('executes check_order_status action', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'order-1', order_number: 'ORD-123', status: 'shipped' },
        error: null,
      });

      const result = await executeChatbotAction(
        'check_order_status',
        'user-1',
        'org-1',
        { orderNumber: 'ORD-123' }
      );

      expect(result.success).toBe(true);
    });

    it('executes get_order_history action', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await executeChatbotAction(
        'get_order_history',
        'user-1',
        'org-1',
        { limit: 10 }
      );

      expect(result.success).toBe(true);
    });

    it('executes check_inventory action', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await executeChatbotAction(
        'check_inventory',
        'user-1',
        'org-1',
        { query: 'widget', limit: 10 }
      );

      expect(result.success).toBe(true);
    });

    it('executes add_to_cart action', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'prod-1', name: 'Widget', in_stock: true },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      mockSupabase.insert.mockResolvedValueOnce({
        error: null,
      });

      const result = await executeChatbotAction(
        'add_to_cart',
        'user-1',
        'org-1',
        { productId: 'prod-1', quantity: 1 }
      );

      expect(result.success).toBe(true);
    });

    it('executes get_product_info action', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Widget' },
        error: null,
      });

      const result = await executeChatbotAction(
        'get_product_info',
        'user-1',
        'org-1',
        { productId: 'prod-1' }
      );

      expect(result.success).toBe(true);
    });

    it('executes create_support_ticket action', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'ticket-1', ticket_number: 'TKT-123' },
        error: null,
      });

      const result = await executeChatbotAction(
        'create_support_ticket',
        'user-1',
        'org-1',
        {
          subject: 'Issue',
          description: 'Description',
          category: 'general',
          priority: 'medium',
        }
      );

      expect(result.success).toBe(true);
    });

    it('executes reorder_last_order action', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'order-1',
          order_number: 'ORD-123',
          order_items: [{ product_id: 'prod-1', quantity: 1 }],
        },
        error: null,
      });

      mockSupabase.in.mockResolvedValueOnce({
        data: [{ id: 'prod-1', in_stock: true }],
        error: null,
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      const result = await executeChatbotAction(
        'reorder_last_order',
        'user-1',
        'org-1',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('returns error for unknown action', async () => {
      const result = await executeChatbotAction(
        'unknown_action',
        'user-1',
        'org-1',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});

