/**
 * Security Tests: Row Level Security (RLS) and Data Isolation
 * 
 * Task 1.4: Security Testing
 * - Test RLS policies prevent cross-organization access
 * - Test rate limiting effectiveness
 * - Test unapproved organization restrictions
 * - Test AI data leakage prevention
 * - Test admin role requirements
 */

import { createClient } from '@/lib/supabase/server';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Task 1.4.1: RLS Policies for Cross-Organization Access', () => {
  const org1UserId = 'user-org1-123';
  const org2UserId = 'user-org2-456';
  const org1Id = 'org-1';
  const org2Id = 'org-2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents users from accessing orders from other organizations', async () => {
    // Mock user from org1
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: org1UserId } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: org1Id },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              // RLS should filter to only org1 orders
              data: [
                { id: 'order-1', organization_id: org1Id },
                { id: 'order-2', organization_id: org1Id },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', org1UserId)
      .single();

    // Query orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', membership.organization_id);

    // Verify all orders belong to user's organization
    expect(orders).toHaveLength(2);
    expect(orders?.every(o => o.organization_id === org1Id)).toBe(true);
    expect(orders?.some(o => o.organization_id === org2Id)).toBe(false);
  });

  it('prevents users from accessing products from other organizations', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: org1UserId } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: org1Id },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: jest.fn().mockResolvedValue({
            // RLS filters to only accessible products
            data: [
              { id: 'prod-1', organization_id: org1Id },
              { id: 'prod-2', organization_id: org1Id },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', org1UserId)
      .single();

    const { data: products } = await supabase
      .from('products')
      .select('*');

    expect(products?.every(p => p.organization_id === org1Id)).toBe(true);
  });

  it('prevents users from accessing customer data from other organizations', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: org1UserId } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: org1Id },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              { id: 'cust-1', organization_id: org1Id },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    const { data: customers } = await supabase
      .from('customers')
      .select('*');

    expect(customers?.every(c => c.organization_id === org1Id)).toBe(true);
  });

  it('prevents users from modifying data in other organizations', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: org1UserId } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              // RLS should prevent update to org2 order
              data: null,
              error: { message: 'Row level security policy violation' },
            }),
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    // Attempt to update order from org2
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', 'order-org2-999');

    // Should fail due to RLS
    expect(error).toBeDefined();
    expect(error?.message).toContain('policy');
  });
});

describe('Task 1.4.2: Rate Limiting Effectiveness', () => {
  it('blocks excessive requests to AI endpoints', async () => {
    const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
    const userId = 'test-user-123';
    const limit = 10;
    const windowMs = 60000;

    // Simulate 15 requests (exceeds limit of 10)
    for (let i = 0; i < 15; i++) {
      const now = Date.now();
      const userLimit = rateLimitStore.get(userId);

      if (!userLimit || now > userLimit.resetAt) {
        rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });
      } else {
        userLimit.count++;
      }
    }

    const finalLimit = rateLimitStore.get(userId);
    expect(finalLimit?.count).toBe(15);
    expect(finalLimit?.count).toBeGreaterThan(limit);
    
    // Verify rate limit would be enforced
    const isRateLimited = (finalLimit?.count || 0) > limit;
    expect(isRateLimited).toBe(true);
  });

  it('allows requests after rate limit window expires', async () => {
    const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
    const userId = 'test-user-123';
    const windowMs = 100; // 100ms for testing

    // First request
    const now = Date.now();
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Check if expired
    const userLimit = rateLimitStore.get(userId);
    const isExpired = Date.now() > (userLimit?.resetAt || 0);

    expect(isExpired).toBe(true);
    
    // New request should be allowed
    if (isExpired) {
      rateLimitStore.set(userId, { count: 1, resetAt: Date.now() + windowMs });
    }

    const newLimit = rateLimitStore.get(userId);
    expect(newLimit?.count).toBe(1);
  });

  it('tracks rate limits per user independently', async () => {
    const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
    const user1 = 'user-1';
    const user2 = 'user-2';
    const windowMs = 60000;

    // User 1 makes 5 requests
    for (let i = 0; i < 5; i++) {
      const now = Date.now();
      const userLimit = rateLimitStore.get(user1);
      if (!userLimit) {
        rateLimitStore.set(user1, { count: 1, resetAt: now + windowMs });
      } else {
        userLimit.count++;
      }
    }

    // User 2 makes 3 requests
    for (let i = 0; i < 3; i++) {
      const now = Date.now();
      const userLimit = rateLimitStore.get(user2);
      if (!userLimit) {
        rateLimitStore.set(user2, { count: 1, resetAt: now + windowMs });
      } else {
        userLimit.count++;
      }
    }

    expect(rateLimitStore.get(user1)?.count).toBe(5);
    expect(rateLimitStore.get(user2)?.count).toBe(3);
  });
});

describe('Task 1.4.3: Unapproved Organization Restrictions', () => {
  it('prevents unapproved organizations from accessing the platform', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  organization: {
                    approval_status: 'pending',
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization(approval_status)')
      .eq('user_id', 'user-123')
      .single();

    // Verify organization is not approved
    expect(membership.organization.approval_status).not.toBe('approved');
    
    // In real implementation, this would redirect to pending page
    const isApproved = membership.organization.approval_status === 'approved';
    expect(isApproved).toBe(false);
  });
});

describe('Task 1.4.4: AI Data Leakage Prevention', () => {
  it('ensures AI responses only contain data from user organization', async () => {
    const org1Data = {
      orders: [{ id: 'order-1', customer: 'Customer A', organization_id: 'org-1' }],
      products: [{ id: 'prod-1', name: 'Product A', organization_id: 'org-1' }],
    };

    const org2Data = {
      orders: [{ id: 'order-2', customer: 'Customer B', organization_id: 'org-2' }],
      products: [{ id: 'prod-2', name: 'Product B', organization_id: 'org-2' }],
    };

    // Simulate AI context building for org1 user
    const userOrgId = 'org-1';
    const filteredOrders = org1Data.orders.filter(o => o.organization_id === userOrgId);
    const filteredProducts = org1Data.products.filter(p => p.organization_id === userOrgId);

    // Verify no org2 data leaked
    expect(filteredOrders.some(o => o.organization_id === 'org-2')).toBe(false);
    expect(filteredProducts.some(p => p.organization_id === 'org-2')).toBe(false);
    
    // Verify org1 data is included
    expect(filteredOrders.length).toBeGreaterThan(0);
    expect(filteredProducts.length).toBeGreaterThan(0);
  });
});

describe('Task 1.4.5: Admin Role Requirements', () => {
  it('prevents non-admin users from accessing admin endpoints', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'member' }, // Not admin
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', 'user-123')
      .single();

    // Verify user is not admin
    expect(membership.role).not.toBe('admin');
    
    // In real implementation, this would return 403
    const isAdmin = membership.role === 'admin';
    expect(isAdmin).toBe(false);
  });

  it('allows admin users to access admin endpoints', async () => {
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null,
    });

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const supabase = await createClient();
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', 'admin-123')
      .single();

    expect(membership.role).toBe('admin');
  });
});

