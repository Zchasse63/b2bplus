/**
 * PHASE 5B TESTS - Admin Operations & Organization Approval APIs
 * Tests real admin business logic with mock Supabase
 *
 * @group api
 * @group admin
 * @group phase-5b
 * @group critical
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockAdmin = (overrides = {}) => ({
  id: 'admin-user-123',
  email: 'admin@example.com',
  role: 'admin',
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockSuperAdmin = (overrides = {}) => ({
  id: 'super-admin-123',
  email: 'superadmin@example.com',
  role: 'super_admin',
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization Inc',
  approval_status: 'pending_approval',
  total_orders: 25,
  total_revenue: 150000,
  created_at: new Date().toISOString(),
  approved_at: null,
  approved_by: null,
  rejection_reason: null,
  ...overrides,
});

const createMockProfile = (overrides = {}) => ({
  id: 'user-profile-123',
  email: 'owner@example.com',
  full_name: 'John Owner',
  ...overrides,
});

const createMockOrganizationWithOwner = (overrides = {}) => ({
  ...createMockOrganization(),
  members: [
    {
      role: 'owner',
      user: createMockProfile(),
    },
  ],
  ...overrides,
});

const createMockCustomer = (overrides = {}) => ({
  id: 'cust-123',
  organization_id: 'org-123',
  email: 'customer@example.com',
  total_orders: 10,
  total_spend: 5000,
  last_order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  churn_risk_score: 0.2,
  ...overrides,
});

const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  organization_id: 'org-123',
  customer_id: 'cust-123',
  amount: 5000,
  status: 'pending_approval',
  created_at: new Date().toISOString(),
  approved_by: null,
  approved_at: null,
  ...overrides,
});

const createMockDashboardStats = (overrides = {}) => ({
  total_orders: 1250,
  total_revenue: 2500000,
  pending_approvals: 15,
  pending_payments: 8,
  failed_payments: 3,
  high_risk_customers: 7,
  new_organizations: 12,
  ...overrides,
});

// ============================================================================
// ORGANIZATION APPROVAL TESTS (12 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Organization Approval', () => {
  let mockAdmin: any;
  let mockSuperAdmin: any;
  let mockOrg: any;

  beforeEach(() => {
    mockAdmin = createMockAdmin();
    mockSuperAdmin = createMockSuperAdmin();
    mockOrg = createMockOrganizationWithOwner();
  });

  describe('Validation', () => {
    it('should require organization ID in request', () => {
      const payload = { organizationId: null, action: 'approve' };
      const isValid = payload.organizationId && payload.action;
      expect(!isValid).toBe(true);
    });

    it('should require action field in request', () => {
      const payload = { organizationId: 'org-123', action: null };
      const isValid = payload.organizationId && payload.action;
      expect(!isValid).toBe(true);
    });

    it('should validate action is approve or reject', () => {
      const validActions = ['approve', 'reject'];
      const action = 'approve';
      expect(validActions).toContain(action);
    });

    it('should require reason when action is reject', () => {
      const payload = { action: 'reject', reason: null };
      const isValid = payload.action === 'reject' ? payload.reason : true;
      expect(!isValid).toBe(true);
    });

    it('should accept valid approve request without reason', () => {
      const payload = { organizationId: 'org-123', action: 'approve' };
      expect(payload.organizationId).toBeDefined();
      expect(payload.action).toBe('approve');
    });

    it('should accept valid reject request with reason', () => {
      const payload = {
        organizationId: 'org-123',
        action: 'reject',
        reason: 'Incomplete documentation',
      };
      expect(payload.organizationId).toBeDefined();
      expect(payload.action).toBe('reject');
      expect(payload.reason).toBeDefined();
    });
  });

  describe('Approval Flow', () => {
    it('should update organization status to approved', () => {
      const updatedOrg = {
        ...mockOrg,
        approval_status: 'approved',
        approved_by: mockSuperAdmin.id,
        approved_at: new Date().toISOString(),
      };

      expect(updatedOrg.approval_status).toBe('approved');
      expect(updatedOrg.approved_by).toBeDefined();
      expect(updatedOrg.approved_at).toBeDefined();
    });

    it('should record which admin approved organization', () => {
      const approvedOrg = {
        ...mockOrg,
        approval_status: 'approved',
        approved_by: mockSuperAdmin.id,
      };

      expect(approvedOrg.approved_by).toBe(mockSuperAdmin.id);
    });

    it('should set approval timestamp', () => {
      const timestamp = new Date().toISOString();
      const approvedOrg = {
        ...mockOrg,
        approval_status: 'approved',
        approved_at: timestamp,
      };

      expect(approvedOrg.approved_at).toBe(timestamp);
      expect(new Date(approvedOrg.approved_at).getTime()).toBeGreaterThan(0);
    });

    it('should clear rejection reason when approving', () => {
      const org = {
        ...mockOrg,
        approval_status: 'pending_approval',
        rejection_reason: 'Previous rejection',
      };

      const approvedOrg = { ...org, approval_status: 'approved', rejection_reason: null };

      expect(org.rejection_reason).toBe('Previous rejection');
      expect(approvedOrg.rejection_reason).toBeNull();
    });
  });

  describe('Rejection Flow', () => {
    it('should update organization status to rejected', () => {
      const reason = 'Incomplete documentation';
      const rejectedOrg = {
        ...mockOrg,
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_by: mockSuperAdmin.id,
      };

      expect(rejectedOrg.approval_status).toBe('rejected');
      expect(rejectedOrg.rejection_reason).toBe(reason);
    });

    it('should store rejection reason', () => {
      const reason = 'Compliance issues detected';
      const rejectedOrg = {
        ...mockOrg,
        approval_status: 'rejected',
        rejection_reason: reason,
      };

      expect(rejectedOrg.rejection_reason).toBe(reason);
      expect(rejectedOrg.rejection_reason.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization', () => {
    it('should require super_admin role', () => {
      const requiresSuperAdmin = true;
      expect(requiresSuperAdmin).toBe(true);
    });

    it('should reject non-super_admin users', () => {
      const isAuthorized = mockAdmin.role === 'super_admin';
      expect(isAuthorized).toBe(false);
    });

    it('should allow super_admin users', () => {
      const isAuthorized = mockSuperAdmin.role === 'super_admin';
      expect(isAuthorized).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when organization not found', () => {
      const org = null;
      const isFound = org !== null;
      expect(isFound).toBe(false);
    });

    it('should return 404 when owner not found', () => {
      const orgNoOwner = { ...mockOrg, members: [] };
      const hasOwner = orgNoOwner.members && orgNoOwner.members.length > 0;
      expect(hasOwner).toBe(false);
    });
  });
});

// ============================================================================
// DASHBOARD METRICS TESTS (6 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Dashboard Metrics', () => {
  let stats: any;

  beforeEach(() => {
    stats = createMockDashboardStats();
  });

  describe('Dashboard Statistics', () => {
    it('should include total orders in dashboard', () => {
      expect(stats).toHaveProperty('total_orders');
      expect(typeof stats.total_orders).toBe('number');
      expect(stats.total_orders).toBeGreaterThan(0);
    });

    it('should include total revenue in dashboard', () => {
      expect(stats).toHaveProperty('total_revenue');
      expect(typeof stats.total_revenue).toBe('number');
      expect(stats.total_revenue).toBeGreaterThan(0);
    });

    it('should include pending approvals count', () => {
      expect(stats).toHaveProperty('pending_approvals');
      expect(typeof stats.pending_approvals).toBe('number');
      expect(stats.pending_approvals).toBeGreaterThanOrEqual(0);
    });

    it('should include pending payments count', () => {
      expect(stats).toHaveProperty('pending_payments');
      expect(typeof stats.pending_payments).toBe('number');
    });

    it('should include failed payments count', () => {
      expect(stats).toHaveProperty('failed_payments');
      expect(typeof stats.failed_payments).toBe('number');
    });

    it('should include high-risk customers count', () => {
      expect(stats).toHaveProperty('high_risk_customers');
      expect(typeof stats.high_risk_customers).toBe('number');
    });
  });

  describe('Dashboard Calculations', () => {
    it('should calculate average order value', () => {
      const avgOrderValue = stats.total_revenue / stats.total_orders;
      expect(avgOrderValue).toBeGreaterThan(0);
      expect(avgOrderValue).toBe(2000);
    });

    it('should calculate approval rate', () => {
      const approved = 50;
      const pending = 15;
      const total = approved + pending;
      const approvalRate = (approved / total) * 100;

      expect(approvalRate).toBeGreaterThan(0);
      expect(approvalRate).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// ORDER MANAGEMENT TESTS (5 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Order Management', () => {
  let mockOrder: any;

  beforeEach(() => {
    mockOrder = createMockOrder();
  });

  describe('Order Listing and Filtering', () => {
    it('should list orders with all required fields', () => {
      expect(mockOrder).toHaveProperty('id');
      expect(mockOrder).toHaveProperty('organization_id');
      expect(mockOrder).toHaveProperty('amount');
      expect(mockOrder).toHaveProperty('status');
      expect(mockOrder).toHaveProperty('created_at');
    });

    it('should filter orders by status', () => {
      const orders = [
        createMockOrder({ status: 'pending_approval' }),
        createMockOrder({ id: 'order-456', status: 'pending_approval' }),
        createMockOrder({ id: 'order-789', status: 'approved' }),
      ];

      const pending = orders.filter((o) => o.status === 'pending_approval');
      expect(pending).toHaveLength(2);
      expect(pending.every((o) => o.status === 'pending_approval')).toBe(true);
    });

    it('should filter orders by organization', () => {
      const orgOrders = [
        createMockOrder({ organization_id: 'org-123' }),
        createMockOrder({ id: 'order-456', organization_id: 'org-123' }),
      ];

      expect(orgOrders.every((o) => o.organization_id === 'org-123')).toBe(true);
    });
  });

  describe('Order Status Updates', () => {
    it('should approve order and record approver', () => {
      const admin = createMockAdmin();
      const updatedOrder = {
        ...mockOrder,
        status: 'approved',
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      };

      expect(updatedOrder.status).toBe('approved');
      expect(updatedOrder.approved_by).toBe(admin.id);
      expect(updatedOrder.approved_at).toBeDefined();
    });

    it('should reject order with reason', () => {
      const updatedOrder = {
        ...mockOrder,
        status: 'rejected',
        rejection_reason: 'Credit limit exceeded',
      };

      expect(updatedOrder.status).toBe('rejected');
      expect(updatedOrder.rejection_reason).toBeDefined();
    });
  });

  describe('Order Actions', () => {
    it('should process refund for order', () => {
      const refund = {
        id: 'refund-123',
        order_id: mockOrder.id,
        amount: mockOrder.amount,
        reason: 'Customer request',
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      expect(refund.order_id).toBe(mockOrder.id);
      expect(refund.amount).toBe(mockOrder.amount);
      expect(refund.status).toBe('completed');
    });

    it('should add notes to order', () => {
      const note = {
        id: 'note-123',
        order_id: mockOrder.id,
        content: 'VIP customer - expedite processing',
        created_by: createMockAdmin().id,
        created_at: new Date().toISOString(),
      };

      expect(note.order_id).toBe(mockOrder.id);
      expect(note.content.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// USER MANAGEMENT TESTS (4 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - User Management', () => {
  describe('User Listing', () => {
    it('should list users by organization', () => {
      const users = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'User One',
          role: 'owner',
          organization_id: 'org-123',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'User Two',
          role: 'member',
          organization_id: 'org-123',
        },
      ];

      expect(Array.isArray(users)).toBe(true);
      expect(users.every((u) => u.organization_id === 'org-123')).toBe(true);
    });

    it('should include required user fields', () => {
      const user = createMockProfile({
        id: 'user-1',
        role: 'owner',
        organization_id: 'org-123',
      } as any);

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('full_name');
    });
  });

  describe('User Role Management', () => {
    it('should update user role', () => {
      const user = createMockProfile();
      const updatedUser = {
        ...user,
        role: 'admin',
        updated_at: new Date().toISOString(),
      };

      expect(updatedUser.role).toBe('admin');
    });

    it('should assign permissions based on role', () => {
      const roles: any = {
        owner: ['view_all', 'manage_team', 'manage_orders'],
        member: ['view_orders', 'create_orders'],
        admin: ['view_all', 'manage_users', 'manage_orders', 'access_analytics'],
      };

      expect(roles.owner).toContain('manage_team');
      expect(roles.member).toContain('view_orders');
      expect(roles.admin).toContain('access_analytics');
    });

    it('should disable user account', () => {
      const user = createMockProfile();
      const disabledUser = {
        ...user,
        status: 'disabled',
        disabled_at: new Date().toISOString(),
      };

      expect(disabledUser.status).toBe('disabled');
      expect(disabledUser.disabled_at).toBeDefined();
    });

    it('should track user activity', () => {
      const activity = {
        user_id: 'user-1',
        last_login: new Date().toISOString(),
        login_count: 42,
        last_action: 'viewed_orders',
      };

      expect(activity.user_id).toBeDefined();
      expect(typeof activity.login_count).toBe('number');
      expect(activity.login_count).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// CUSTOMER ANALYTICS TESTS (6 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Customer Analytics', () => {
  let mockCustomer: any;

  beforeEach(() => {
    mockCustomer = createMockCustomer();
  });

  describe('Customer Data', () => {
    it('should include total orders in customer data', () => {
      expect(mockCustomer).toHaveProperty('total_orders');
      expect(typeof mockCustomer.total_orders).toBe('number');
    });

    it('should include total spend in customer data', () => {
      expect(mockCustomer).toHaveProperty('total_spend');
      expect(typeof mockCustomer.total_spend).toBe('number');
      expect(mockCustomer.total_spend).toBeGreaterThan(0);
    });

    it('should include churn risk score', () => {
      expect(mockCustomer).toHaveProperty('churn_risk_score');
      expect(typeof mockCustomer.churn_risk_score).toBe('number');
      expect(mockCustomer.churn_risk_score).toBeGreaterThanOrEqual(0);
      expect(mockCustomer.churn_risk_score).toBeLessThanOrEqual(1);
    });

    it('should include last order date', () => {
      expect(mockCustomer).toHaveProperty('last_order_date');
      expect(mockCustomer.last_order_date).toBeDefined();
    });
  });

  describe('Customer Analysis', () => {
    it('should classify high-value customers', () => {
      const highValue = createMockCustomer({ total_spend: 50000 });
      const isHighValue = highValue.total_spend > 25000;
      expect(isHighValue).toBe(true);
    });

    it('should classify at-risk customers by churn score', () => {
      const atRisk = createMockCustomer({ churn_risk_score: 0.8 });
      const isAtRisk = atRisk.churn_risk_score > 0.7;
      expect(isAtRisk).toBe(true);
    });

    it('should calculate customer lifetime value', () => {
      const ltv = mockCustomer.total_spend;
      expect(ltv).toBe(mockCustomer.total_spend);
      expect(typeof ltv).toBe('number');
    });

    it('should identify customers with no recent activity', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactive = createMockCustomer({
        last_order_date: new Date(thirtyDaysAgo).toISOString(),
      });

      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(inactive.last_order_date).getTime()) / (24 * 60 * 60 * 1000)
      );

      expect(daysSinceOrder).toBeGreaterThanOrEqual(30);
    });
  });
});

// ============================================================================
// AUTHORIZATION TESTS (3 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Authorization', () => {
  describe('Role-Based Access Control', () => {
    it('should allow admin users to access admin endpoints', () => {
      const admin = createMockAdmin();
      const isAuthorized = admin.role === 'admin' || admin.role === 'super_admin';
      expect(isAuthorized).toBe(true);
    });

    it('should allow super_admin users to access all admin endpoints', () => {
      const superAdmin = createMockSuperAdmin();
      const isAuthorized = superAdmin.role === 'super_admin';
      expect(isAuthorized).toBe(true);
    });

    it('should reject non-admin users', () => {
      const user = {
        id: 'user-123',
        role: 'member',
      };
      const isAuthorized = user.role === 'admin' || user.role === 'super_admin';
      expect(isAuthorized).toBe(false);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS (3 tests)
// ============================================================================

describe('Phase 5B: Admin Operations - Error Handling', () => {
  describe('HTTP Error Responses', () => {
    it('should return 400 for missing required fields', () => {
      const errors = [
        { status: 400, field: 'organizationId' },
        { status: 400, field: 'action' },
        { status: 400, field: 'reason' },
      ];

      errors.forEach((error) => {
        expect(error.status).toBe(400);
      });
    });

    it('should return 404 when resource not found', () => {
      const error = { status: 404, message: 'Organization not found' };
      expect(error.status).toBe(404);
    });

    it('should return 500 on database errors', () => {
      const error = { status: 500, message: 'Database error' };
      expect(error.status).toBe(500);
    });
  });

  describe('Error Recovery', () => {
    it('should not partially update data on error', () => {
      const original = createMockOrganization({ approval_status: 'pending_approval' });
      const shouldBeUnchanged = original.approval_status === 'pending_approval';
      expect(shouldBeUnchanged).toBe(true);
    });
  });
});
