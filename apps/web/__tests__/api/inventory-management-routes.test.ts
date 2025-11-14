/**
 * REAL Integration Tests for Inventory Management API Routes
 * Tests inventory availability checking, authorization, and error handling
 *
 * @group api
 * @group inventory
 * @group critical
 */

import { NextRequest } from 'next/server';
import { GET as getInventoryAvailability } from '@/app/api/admin/inventory/availability/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

function createTestRequest(url: string): NextRequest {
  const request = new NextRequest(url);
  if (request.nextUrl === undefined) {
    const nextUrl = new URL(url);
    Object.defineProperty(request, 'nextUrl', {
      value: nextUrl,
      writable: false,
      enumerable: true,
      configurable: true
    });
  }
  return request;
}

describe('Inventory Management API Routes - REAL TESTS', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/admin/inventory/availability - Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'customer' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(chain);

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should allow admin users to access inventory', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValue({
        data: 150,
        error: null,
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('availability');
      expect(data.availability).toBe(150);
    });

    it('should allow super_admin users to access inventory', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'super_admin' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(profileChain);

      mockSupabase.rpc.mockResolvedValue({
        data: 200,
        error: null,
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(200);
    });
  });

  describe('GET /api/admin/inventory/availability - Request Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(profileChain);
    });

    it('should return 400 if product_id is missing', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('product_id is required');
    });

    it('should return 400 if product_id is empty', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id='
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('product_id is required');
    });
  });

  describe('GET /api/admin/inventory/availability - Single Location Queries', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(profileChain);
    });

    it('should return availability for in-stock product at location', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 150,
        error: null,
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(150);
    });

    it('should return 0 for out-of-stock product', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 0,
        error: null,
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(0);
    });

    it('should handle RPC errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch availability');
    });

    it('should handle very large inventory quantities', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 999999,
        error: null,
      });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(999999);
    });
  });

  describe('GET /api/admin/inventory/availability - Multi-Location Queries', () => {
    it('should return availability across all locations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockLocations = [
        { id: 'loc-1', name: 'Warehouse A', address: '123 Main St' },
        { id: 'loc-2', name: 'Warehouse B', address: '456 Oak Ave' },
      ];

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      const locationsChain = {
        select: jest.fn().mockResolvedValue({
          data: mockLocations,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(locationsChain);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 100, error: null })
        .mockResolvedValueOnce({ data: 50, error: null });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.availability)).toBe(true);
      expect(data.availability).toHaveLength(2);
      expect(data.availability[0].location_name).toBe('Warehouse A');
      expect(data.availability[0].quantity).toBe(100);
      expect(data.availability[1].location_name).toBe('Warehouse B');
      expect(data.availability[1].quantity).toBe(50);
    });

    it('should return empty array if no locations exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      const locationsChain = {
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(locationsChain);

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.availability)).toBe(true);
      expect(data.availability).toHaveLength(0);
    });

    it('should calculate total across multiple locations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockLocations = [
        { id: 'loc-1', name: 'Warehouse A', address: '123 Main' },
        { id: 'loc-2', name: 'Warehouse B', address: '456 Oak' },
        { id: 'loc-3', name: 'Warehouse C', address: '789 Elm' },
      ];

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      const locationsChain = {
        select: jest.fn().mockResolvedValue({
          data: mockLocations,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(locationsChain);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 100, error: null })
        .mockResolvedValueOnce({ data: 50, error: null })
        .mockResolvedValueOnce({ data: 75, error: null });

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toHaveLength(3);
      const total = data.availability.reduce(
        (sum: number, loc: any) => sum + loc.quantity,
        0
      );
      expect(total).toBe(225);
    });

    it('should handle location fetch errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const profileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      };

      const locationsChain = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(locationsChain);

      const request = createTestRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getInventoryAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch locations');
    });
  });
});
