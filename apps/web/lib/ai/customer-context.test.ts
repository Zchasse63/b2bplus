/**
 * Unit tests for Customer Context functions
 * 
 * Tests data isolation and access control functions including:
 * - getCustomerContext - ensures organization-scoped data
 * - verifyCustomerAccess - prevents cross-organization access
 * - verifyOrderAccess - ensures order belongs to user's org
 * - verifyProductAccess - checks user authentication
 * - getUserOrganizationId - helper for org ID lookup
 * - isOrganizationAdmin - checks admin permissions
 */

import {
  getCustomerContext,
  verifyCustomerAccess,
  verifyOrderAccess,
  verifyProductAccess,
  getUserOrganizationId,
  isOrganizationAdmin,
} from './customer-context';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Customer Context Functions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('getCustomerContext', () => {
    // Note: getCustomerContext is tested via integration tests due to complex Supabase query chains
    // Unit tests focus on error cases and access control functions

    it('throws error if user organization membership not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      await expect(getCustomerContext('user-123')).rejects.toThrow(
        'User organization membership not found'
      );
    });

    it('throws error if organization not approved', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          role: 'member',
          organization: {
            id: 'org-456',
            name: 'Test Organization',
            approval_status: 'pending',
            credit_limit: 10000,
          },
        },
        error: null,
      });

      await expect(getCustomerContext('user-123')).rejects.toThrow(
        'Organization not approved'
      );
    });
  });

  describe('verifyCustomerAccess', () => {
    it('returns true if user is member of target organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'member-123' },
        error: null,
      });

      const hasAccess = await verifyCustomerAccess('user-123', 'org-456');

      expect(hasAccess).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-456');
    });

    it('returns false if user is not member of target organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const hasAccess = await verifyCustomerAccess('user-123', 'org-456');

      expect(hasAccess).toBe(false);
    });
  });

  describe('verifyOrderAccess', () => {
    it('returns true if order belongs to user organization', async () => {
      // Mock user's organization lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { organization_id: 'org-456' },
        error: null,
      });

      // Mock order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'order-123' },
        error: null,
      });

      const hasAccess = await verifyOrderAccess('user-123', 'order-123');

      expect(hasAccess).toBe(true);
    });

    it('returns false if user has no organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const hasAccess = await verifyOrderAccess('user-123', 'order-123');

      expect(hasAccess).toBe(false);
    });

    it('returns false if order does not belong to user organization', async () => {
      // Mock user's organization lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { organization_id: 'org-456' },
        error: null,
      });

      // Mock order lookup (not found)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const hasAccess = await verifyOrderAccess('user-123', 'order-123');

      expect(hasAccess).toBe(false);
    });
  });

  describe('verifyProductAccess', () => {
    it('returns true if user has approved organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization: {
            approval_status: 'approved',
          },
        },
        error: null,
      });

      const hasAccess = await verifyProductAccess('user-123', 'prod-456');

      expect(hasAccess).toBe(true);
    });

    it('returns false if user has no organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const hasAccess = await verifyProductAccess('user-123', 'prod-456');

      expect(hasAccess).toBe(false);
    });

    it('returns false if organization not approved', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization: {
            approval_status: 'pending',
          },
        },
        error: null,
      });

      const hasAccess = await verifyProductAccess('user-123', 'prod-456');

      expect(hasAccess).toBe(false);
    });
  });

  describe('getUserOrganizationId', () => {
    it('returns organization ID for user', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { organization_id: 'org-456' },
        error: null,
      });

      const orgId = await getUserOrganizationId('user-123');

      expect(orgId).toBe('org-456');
    });

    it('returns null if user has no organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const orgId = await getUserOrganizationId('user-123');

      expect(orgId).toBeNull();
    });
  });

  describe('isOrganizationAdmin', () => {
    it('returns true for owner role', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      const isAdmin = await isOrganizationAdmin('user-123');

      expect(isAdmin).toBe(true);
    });

    it('returns true for admin role', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const isAdmin = await isOrganizationAdmin('user-123');

      expect(isAdmin).toBe(true);
    });

    it('returns true for super_admin role', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'super_admin' },
        error: null,
      });

      const isAdmin = await isOrganizationAdmin('user-123');

      expect(isAdmin).toBe(true);
    });

    it('returns false for member role', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      const isAdmin = await isOrganizationAdmin('user-123');

      expect(isAdmin).toBe(false);
    });

    it('returns false if user has no organization', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const isAdmin = await isOrganizationAdmin('user-123');

      expect(isAdmin).toBe(false);
    });
  });
});

