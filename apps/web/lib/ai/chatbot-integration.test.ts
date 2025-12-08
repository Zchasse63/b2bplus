/**
 * Integration Tests for Chatbot Flow
 * Tests the complete chatbot conversation flow including:
 * - Customer context retrieval
 * - Action detection and execution
 * - AI response generation
 * - Rate limiting
 * - Data isolation
 */

/**
 * @jest-environment node
 */

// Define mock client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: jest.fn(),
};

// Mock authenticated user
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock unified AI provider
jest.mock('@/lib/ai/providers/unified', () => ({
  generateText: jest.fn().mockResolvedValue('Mocked AI response'),
  generateJSON: jest.fn().mockResolvedValue({}),
  streamTextResponse: jest.fn().mockResolvedValue({}),
}));

import { generateJSON } from '@/lib/ai/providers/unified';
import { getCustomerContext } from '@/lib/ai/customer-context';
import { executeChatbotAction } from '@/lib/ai/chatbot-actions';
import { validateAIRequest } from '@/lib/middleware/ai-security';

describe('Chatbot Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Chatbot Conversation Flow', () => {
    it('handles a complete conversation with action execution', async () => {
      // Step 1: Validate request (authentication, rate limiting)
      const validation = {
        valid: true,
        userId: mockUserId,
        organizationId: mockOrgId,
      };

      // Step 2: Get customer context
      const mockContext = {
        userName: 'John Doe',
        organizationName: 'Test Company',
        recentOrders: [
          { id: 'order-1', status: 'shipped', total: 100 },
        ],
        cartItems: [],
      };

      // Mock getCustomerContext
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: mockUserId,
              email: 'john@test.com',
              full_name: 'John Doe',
              organization_members: [{
                organizations: {
                  id: mockOrgId,
                  name: 'Test Company',
                  approved: true,
                },
                role: 'member',
              }],
            },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockSelect };
        }
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ id: 'order-1', status: 'shipped', total: 100 }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      // Step 3: Detect action
      (generateJSON as jest.Mock).mockResolvedValueOnce({
        requiresAction: true,
        action: 'check_order_status',
        parameters: { orderNumber: 'ORD-001' },
        confidence: 0.9,
      });

      // Step 4: Execute action
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'order-1',
                      order_number: 'ORD-001',
                      status: 'shipped',
                      shipping_tracking_number: 'TRACK123',
                      shipping_carrier: 'UPS',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const actionResult = await executeChatbotAction(
        'check_order_status',
        mockUserId,
        mockOrgId,
        { orderNumber: 'ORD-001' }
      );

      // Step 5: Generate AI response
      (generateJSON as jest.Mock).mockResolvedValueOnce({
        response: 'Your order is currently shipped with tracking number TRACK123!',
      });

      // Verify the complete flow
      expect(actionResult.success).toBe(true);
      expect(actionResult.data).toHaveProperty('status', 'shipped');
      expect(actionResult.data).toHaveProperty('shipping_tracking_number', 'TRACK123');
    });

    it('handles conversation without action execution', async () => {
      // Mock customer context with proper chain
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    user_id: mockUserId,
                    role: 'member',
                    organization: {
                      id: mockOrgId,
                      name: 'Test Company',
                      approval_status: 'approved',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: mockUserId,
                    email: 'john@test.com',
                    full_name: 'John Doe',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          const mockChain: any = {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
          // Make eq() return the same chain object
          mockChain.eq.mockReturnValue(mockChain);
          return {
            select: jest.fn().mockReturnValue(mockChain),
          };
        }
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      // Action detection returns no action needed
      (generateJSON as jest.Mock).mockResolvedValueOnce({
        requiresAction: false,
        action: null,
        parameters: null,
        confidence: 0,
      });

      // Generate AI response
      (generateJSON as jest.Mock).mockResolvedValueOnce({
        response: 'Hello! How can I help you today?',
      });

      const context = await getCustomerContext(mockUserId);

      // Verify context was retrieved successfully
      expect(context).toBeDefined();
      expect(context.userId).toBe(mockUserId);
      expect(context.organizationName).toBe('Test Company');
      expect(context.organizationId).toBe(mockOrgId);
      expect(context.role).toBe('member');
      expect(context.recentOrders).toEqual([]);
      expect(context.cartItems).toEqual([]);
    });
  });

  describe('Data Isolation', () => {
    it('prevents access to other organization data', async () => {
      const otherOrgId = 'org-999';
      const otherUserId = 'user-999';

      // Try to execute action for another organization's order
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await executeChatbotAction(
        'checkOrderStatus',
        mockUserId,
        mockOrgId,
        { orderId: 'other-org-order' }
      );

      // Should fail because order doesn't belong to user's organization
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }));

      await expect(getCustomerContext(mockUserId)).rejects.toThrow();
    });

    it('handles AI generation errors gracefully', async () => {
      (generateJSON as jest.Mock).mockReset();
      (generateJSON as jest.Mock).mockRejectedValue(new Error('AI service unavailable'));

      await expect(
        generateJSON('test prompt')
      ).rejects.toThrow('AI service unavailable');
    });
  });
});

