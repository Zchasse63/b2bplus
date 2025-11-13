/**
 * REAL Integration Tests for Pricing API Routes
 * Tests actual route handlers with real logic
 */

import { NextRequest } from 'next/server';
import { POST as calculatePricing } from '@/app/api/pricing/calculate/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock PricingService
jest.mock('@b2b-plus/shared', () => ({
  PricingService: {
    calculatePrice: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server';
import { PricingService } from '@b2b-plus/shared';

describe('POST /api/pricing/calculate - REAL ROUTE TESTS', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create comprehensive mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          quantity: 10,
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed if user is authenticated', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock missing required fields to trigger 400 (not 401)
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      // Should get 400 (validation error), not 401 (auth error)
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should return 400 if product_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          quantity: 10,
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if quantity is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if customer_organization_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          quantity: 10,
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('Product Lookup', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should return 404 if product is not found', async () => {
      // Mock product not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'nonexistent-product',
          quantity: 10,
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });
  });

  describe('Price Calculation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock product found and all pricing data queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'prod-123',
                    name: 'Test Product',
                    base_price: 100,
                    organization_id: 'supplier-org-123',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'price_locks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'contract_prices') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }

        if (table === 'customer_product_prices') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'promotional_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'volume_pricing') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }

        if (table === 'pricing_tiers') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }

        // Default fallback
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      // Mock PricingService
      (PricingService.calculatePrice as jest.Mock).mockResolvedValue({
        base_price: 100,
        final_price: 90,
        discount_amount: 10,
        discount_percentage: 10,
      });
    });

    it('should calculate price successfully with valid inputs', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          quantity: 10,
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pricing).toBeDefined();
      expect(data.pricing.base_price).toBe(100);
      expect(data.pricing.final_price).toBe(90);
    });

    it('should call PricingService.calculatePrice with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          quantity: 5,
          customer_organization_id: 'org-456',
          promo_code: 'SAVE10',
          order_subtotal: 500,
        }),
      });

      await calculatePricing(request);

      expect(PricingService.calculatePrice).toHaveBeenCalledWith(
        expect.objectContaining({
          product: expect.objectContaining({
            id: 'prod-123',
            base_price: 100,
          }),
          quantity: 5,
          customer_organization_id: 'org-456',
          supplier_organization_id: 'supplier-org-123',
          promo_code: 'SAVE10',
          order_subtotal: 500,
        }),
        expect.objectContaining({
          priceLocks: expect.any(Array),
          contractPrices: expect.any(Array),
          customerPrices: expect.any(Array),
          volumePricing: expect.any(Array),
          pricingTiers: expect.any(Array),
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should return 500 if an unexpected error occurs', async () => {
      // Mock error during product fetch
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          product_id: 'prod-123',
          quantity: 10,
          customer_organization_id: 'org-123',
        }),
      });

      const response = await calculatePricing(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

