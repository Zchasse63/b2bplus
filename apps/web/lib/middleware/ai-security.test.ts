/**
 * Unit tests for AI Security Middleware
 * 
 * Tests security functions including:
 * - Rate limiting (checkRateLimit, clearRateLimit, getRateLimitStatus)
 * - Request validation (validateAIRequest, validateCustomerAIRequest, validateAdminAIRequest)
 * - Rate limit configurations (getRateLimitConfig)
 */

import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  clearRateLimit,
  getRateLimitStatus,
  validateAIRequest,
  validateCustomerAIRequest,
  validateAdminAIRequest,
  getRateLimitConfig,
  AI_RATE_LIMITS,
} from './ai-security';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/ai/customer-context', () => ({
  verifyCustomerAccess: jest.fn(),
}));

describe('AI Security Middleware', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear all rate limits before each test
    clearRateLimit('user-1');
    clearRateLimit('user-2');
    
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('checkRateLimit', () => {
    it('allows first request and returns correct remaining count', async () => {
      const result = await checkRateLimit('user-1', { maxRequests: 10, windowMs: 60000 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('allows requests within limit', async () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      
      const result1 = await checkRateLimit('user-1', config);
      const result2 = await checkRateLimit('user-1', config);
      const result3 = await checkRateLimit('user-1', config);

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('blocks requests when limit exceeded', async () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      
      await checkRateLimit('user-1', config);
      await checkRateLimit('user-1', config);
      const result = await checkRateLimit('user-1', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('resets limit after window expires', async () => {
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window
      
      await checkRateLimit('user-1', config);
      await checkRateLimit('user-1', config);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = await checkRateLimit('user-1', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('tracks limits separately per user', async () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      
      await checkRateLimit('user-1', config);
      await checkRateLimit('user-1', config);
      
      const result = await checkRateLimit('user-2', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('clearRateLimit', () => {
    it('clears rate limit for user', async () => {
      const config = { maxRequests: 2, windowMs: 60000 };
      
      await checkRateLimit('user-1', config);
      await checkRateLimit('user-1', config);
      
      clearRateLimit('user-1');
      
      const result = await checkRateLimit('user-1', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('returns null for user with no rate limit', () => {
      const status = getRateLimitStatus('user-1');

      expect(status).toBeNull();
    });

    it('returns current status for user with rate limit', async () => {
      await checkRateLimit('user-1', { maxRequests: 10, windowMs: 60000 });
      
      const status = getRateLimitStatus('user-1');

      expect(status).not.toBeNull();
      expect(status?.count).toBe(1);
      expect(status?.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('validateAIRequest', () => {
    const mockRequest = {} as NextRequest;

    it('returns authorized for valid authenticated user with approved org', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'approved' },
        },
        error: null,
      });

      const result = await validateAIRequest(mockRequest);

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.organizationId).toBe('org-1');
      expect(result.rateLimitRemaining).toBeDefined();
    });

    it('returns error for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await validateAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });

    it('returns error when rate limit exceeded', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      const config = { maxRequests: 1, windowMs: 60000 };
      
      // First request succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'approved' },
        },
        error: null,
      });
      await validateAIRequest(mockRequest, config);
      
      // Second request should be rate limited
      const result = await validateAIRequest(mockRequest, config);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.rateLimitRemaining).toBe(0);
    });

    it('returns error for user without organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await validateAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Organization membership not found');
    });

    it('returns error for pending organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'pending' },
        },
        error: null,
      });

      const result = await validateAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('pending approval');
    });

    it('returns error for rejected organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'rejected' },
        },
        error: null,
      });

      const result = await validateAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('not approved');
    });
  });

  describe('validateCustomerAIRequest', () => {
    const mockRequest = {} as NextRequest;

    it('returns authorized when user has access to target organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'approved' },
        },
        error: null,
      });

      const { verifyCustomerAccess } = require('@/lib/ai/customer-context');
      verifyCustomerAccess.mockResolvedValueOnce(true);

      const result = await validateCustomerAIRequest(mockRequest, 'org-1');

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe('user-1');
    });

    it('returns error when user does not have access to target organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          organization_id: 'org-1',
          organization: { id: 'org-1', approval_status: 'approved' },
        },
        error: null,
      });

      const { verifyCustomerAccess } = require('@/lib/ai/customer-context');
      verifyCustomerAccess.mockResolvedValueOnce(false);

      const result = await validateCustomerAIRequest(mockRequest, 'org-2');

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });

  describe('validateAdminAIRequest', () => {
    const mockRequest = {} as NextRequest;

    it('returns authorized for admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
        error: null,
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            organization_id: 'org-1',
            organization: { id: 'org-1', approval_status: 'approved' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

      const result = await validateAdminAIRequest(mockRequest);

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe('user-1');
    });

    it('returns authorized for super_admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'superadmin@example.com' } },
        error: null,
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            organization_id: 'org-1',
            organization: { id: 'org-1', approval_status: 'approved' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'super_admin' },
          error: null,
        });

      const result = await validateAdminAIRequest(mockRequest);

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe('user-1');
    });

    it('returns error for non-admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            organization_id: 'org-1',
            organization: { id: 'org-1', approval_status: 'approved' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'customer' },
          error: null,
        });

      const result = await validateAdminAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Admin access required');
    });

    it('returns error when profile not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            organization_id: 'org-1',
            organization: { id: 'org-1', approval_status: 'approved' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const result = await validateAdminAIRequest(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('Admin access required');
    });
  });

  describe('getRateLimitConfig', () => {
    it('returns STANDARD config by default', () => {
      const config = getRateLimitConfig();

      expect(config).toEqual(AI_RATE_LIMITS.STANDARD);
      expect(config.maxRequests).toBe(100);
      expect(config.windowMs).toBe(60000);
    });

    it('returns STANDARD config for "standard" type', () => {
      const config = getRateLimitConfig('standard');

      expect(config).toEqual(AI_RATE_LIMITS.STANDARD);
    });

    it('returns HEAVY config for "heavy" type', () => {
      const config = getRateLimitConfig('heavy');

      expect(config).toEqual(AI_RATE_LIMITS.HEAVY);
      expect(config.maxRequests).toBe(20);
    });

    it('returns BULK config for "bulk" type', () => {
      const config = getRateLimitConfig('bulk');

      expect(config).toEqual(AI_RATE_LIMITS.BULK);
      expect(config.maxRequests).toBe(5);
    });

    it('returns ADMIN config for "admin" type', () => {
      const config = getRateLimitConfig('admin');

      expect(config).toEqual(AI_RATE_LIMITS.ADMIN);
      expect(config.maxRequests).toBe(200);
    });

    it('returns TESTING config for "testing" type', () => {
      const config = getRateLimitConfig('testing');

      expect(config).toEqual(AI_RATE_LIMITS.TESTING);
      expect(config.maxRequests).toBe(10000);
    });
  });
});

