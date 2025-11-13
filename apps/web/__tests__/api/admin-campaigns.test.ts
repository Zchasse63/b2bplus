/**
 * REAL Integration Tests for Admin Campaigns API Routes
 * Tests actual route handlers with real logic
 */

import { NextRequest } from 'next/server';
import { GET as getCampaigns, POST as createCampaign } from '@/app/api/admin/campaigns/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock admin middleware
jest.mock('@/lib/middleware/admin', () => ({
  checkAdminRole: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { NextResponse } from 'next/server';

describe('Admin Campaigns API - REAL ROUTE TESTS', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create comprehensive mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/admin/campaigns', () => {
    it('should return 401 if user is not admin', async () => {
      // Mock non-admin user
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns');
      const response = await getCampaigns(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return campaigns list for admin user', async () => {
      // Mock admin user
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@test.com' },
        error: null,
      });

      // Mock campaigns data
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Summer Sale',
          subject: 'Big Summer Discounts!',
          status: 'sent',
          created_at: '2024-01-01T00:00:00Z',
          template: { name: 'Promotional' },
          created_by_user: { full_name: 'Admin User', email: 'admin@test.com' },
        },
        {
          id: 'campaign-2',
          name: 'New Product Launch',
          subject: 'Check out our new products',
          status: 'draft',
          created_at: '2024-01-02T00:00:00Z',
          template: { name: 'Announcement' },
          created_by_user: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockCampaigns,
            error: null,
          }),
        }),
      });

      // Mock campaign stats
      mockSupabase.rpc.mockResolvedValue({
        data: {
          total_recipients: 100,
          sent: 100,
          delivered: 95,
          opened: 50,
          clicked: 20,
          bounced: 2,
          failed: 3,
          open_rate: 0.5,
          click_rate: 0.2,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns');
      const response = await getCampaigns(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.campaigns).toHaveLength(2);
      expect(data.campaigns[0].id).toBe('campaign-1');
      expect(data.campaigns[0].stats).toBeDefined();
      expect(data.campaigns[0].stats.total_recipients).toBe(100);
    });

    it('should return 500 if database query fails', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns');
      const response = await getCampaigns(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch campaigns');
    });
  });

  describe('POST /api/admin/campaigns', () => {
    it('should return 401 if user is not admin', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          subject: 'Test Subject',
        }),
      });

      const response = await createCampaign(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if name is missing', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Subject',
        }),
      });

      const response = await createCampaign(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and subject are required');
    });

    it('should return 400 if subject is missing', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
        }),
      });

      const response = await createCampaign(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and subject are required');
    });

    it('should create campaign successfully with valid data', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@test.com' },
        error: null,
      });

      const mockCampaign = {
        id: 'campaign-new',
        name: 'New Campaign',
        subject: 'New Subject',
        status: 'draft',
        created_by: 'admin-123',
        created_at: '2024-01-03T00:00:00Z',
      };

      // Mock campaign creation and customer queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'email_campaigns') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCampaign,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'email_campaign_recipients') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Campaign',
          subject: 'New Subject',
          htmlContent: '<p>Test content</p>',
          textContent: 'Test content',
        }),
      });

      const response = await createCampaign(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.campaign).toBeDefined();
      expect(data.campaign.id).toBe('campaign-new');
      expect(data.campaign.name).toBe('New Campaign');
    });

    it('should create scheduled campaign when scheduledAt is provided', async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        error: null,
      });

      const scheduledDate = '2024-12-25T10:00:00Z';
      const mockCampaign = {
        id: 'campaign-scheduled',
        name: 'Holiday Campaign',
        subject: 'Happy Holidays!',
        status: 'scheduled',
        scheduled_at: scheduledDate,
        created_by: 'admin-123',
      };

      // Mock campaign creation and customer queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'email_campaigns') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCampaign,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'email_campaign_recipients') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Holiday Campaign',
          subject: 'Happy Holidays!',
          scheduledAt: scheduledDate,
        }),
      });

      const response = await createCampaign(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.campaign.status).toBe('scheduled');
      expect(data.campaign.scheduled_at).toBe(scheduledDate);
    });
  });
});

