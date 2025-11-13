/**
 * REAL Integration Tests for Admin Inventory API Routes
 * Tests actual route handlers with real logic
 */

import { NextRequest } from 'next/server';
import { GET as getAvailability } from '@/app/api/admin/inventory/availability/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Admin Inventory API - REAL ROUTE TESTS', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create comprehensive mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/admin/inventory/availability', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'customer' },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 if product_id is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('product_id is required');
    });

    it('should return availability for specific location', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 150,
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toBe(150);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_product_availability', {
        p_product_id: 'prod-123',
        p_location_id: 'loc-456',
      });
    });

    it('should return availability across all locations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      // Mock profile check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
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
        if (table === 'inventory_locations') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { id: 'loc-1', name: 'Warehouse A', address: '123 Main St' },
                { id: 'loc-2', name: 'Warehouse B', address: '456 Oak Ave' },
              ],
              error: null,
            }),
          };
        }
        return {};
      });

      // Mock RPC calls for each location
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 100, error: null })
        .mockResolvedValueOnce({ data: 50, error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availability).toHaveLength(2);
      expect(data.availability[0]).toEqual({
        location_id: 'loc-1',
        location_name: 'Warehouse A',
        location_address: '123 Main St',
        quantity: 100,
      });
      expect(data.availability[1]).toEqual({
        location_id: 'loc-2',
        location_name: 'Warehouse B',
        location_address: '456 Oak Ave',
        quantity: 50,
      });
    });

    it('should return 500 if RPC call fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123&location_id=loc-456'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch availability');
    });

    it('should return 500 if locations query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
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
        if (table === 'inventory_locations') {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/inventory/availability?product_id=prod-123'
      );

      const response = await getAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch locations');
    });
  });
});

