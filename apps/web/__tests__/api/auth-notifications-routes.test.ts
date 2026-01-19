/**
 * Authentication API Route Tests
 * Tests for /api/auth/* endpoints
 *
 * @group api
 * @group authentication
 * @group critical
 */

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@/lib/env', () => ({
  getEnv: jest.fn(() => ({
    NODE_ENV: 'test',
    SENDGRID_API_KEY: 'test-key',
    SENDGRID_FROM_EMAIL: 'test@example.com',
    SENDGRID_FROM_NAME: 'Test',
    SENDGRID_REPLY_TO_EMAIL: 'test@example.com',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  })),
}));

const mockSendEmail = jest.fn();

jest.mock('@/lib/sendgrid', () => ({
  get sendEmail() {
    return mockSendEmail;
  },
  EMAIL_CONFIG: {
    fromEmail: 'test@example.com',
    fromName: 'Test',
    replyTo: 'test@example.com',
    testEmail: 'test@example.com',
  },
}));

jest.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/middleware/validation', () => ({
  validateRequestBody: jest.fn(),
}));

import { POST as magicLinkRequest } from '@/app/api/auth/magic-link/request/route';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/middleware/validation';
import { sendEmail } from '@/lib/sendgrid';



// Test helpers
const createMockRequest = (body: any, headers: Record<string, string> = {}): NextRequest => {
  return new NextRequest('http://localhost:3000/api/auth/magic-link/request', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Test Browser',
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const mockMagicLinkToken = {
  insert: jest.fn(),
  select: jest.fn(),
};

const mockProfiles = {
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

const mockLeads = {
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

describe('Authentication API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore sendEmail mock after clearAllMocks
    mockSendEmail.mockResolvedValue({ success: true });

    // Setup default mocks
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'magic_link_tokens') {
        return {
          insert: mockMagicLinkToken.insert,
          select: mockMagicLinkToken.select,
        };
      }
      if (table === 'profiles') {
        return {
          select: mockProfiles.select,
        };
      }
      if (table === 'leads') {
        return {
          select: mockLeads.select,
        };
      }
      return {};
    });

    // Default mock returns
    mockMagicLinkToken.select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        gte: jest.fn().mockResolvedValue({ data: [] }),
      }),
    });

    mockProfiles.select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null }),
      }),
    });

    mockLeads.select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null }),
      }),
    });
  });

  describe('POST /api/auth/magic-link/request', () => {
    describe('Email validation', () => {
      it('should reject request without email or phone', async () => {
        validateRequestBody.mockResolvedValue({
          valid: false,
          response: NextResponse.json({ error: 'Invalid request' }, { status: 400 }),
        });

        const request = createMockRequest({});
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(400);
      });

      it('should accept valid email', async () => {

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'Test User' },
              error: null,
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });
        mockSupabaseClient.from.mockReturnValueOnce(mockMagicLinkToken);

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      it('should accept valid phone number', async () => {

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { phone: '+1234567890', purpose: 'login' },
        });

        mockLeads.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead-123', contact_name: 'Test Lead', company_name: 'Test Company' },
              error: null,
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });
        mockSupabaseClient.from.mockReturnValueOnce(mockMagicLinkToken);

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ phone: '+1234567890' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Rate limiting', () => {
      it('should enforce rate limit of 3 requests per hour', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        // Mock 3 recent tokens (at limit)
        const recentTokens = [
          { id: '1', created_at: new Date().toISOString() },
          { id: '2', created_at: new Date().toISOString() },
          { id: '3', created_at: new Date().toISOString() },
        ];

        // Mock recent tokens query for rate limiting (at limit)
        mockSupabaseClient.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: recentTokens }),
            }),
          }),
        });

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error.message).toContain('Too many requests');
      });

      it('should allow request if under rate limit', async () => {

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        // Mock profile lookup (user exists)
        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'Test User' },
              error: null,
            }),
          }),
        });

        mockMagicLinkToken.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: [] }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);
      });
    });

    describe('User identification', () => {
      it('should find existing user by email', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'existing@example.com', purpose: 'login' },
        });

        // Mock finding user
        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'existing@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);
        expect(mockMagicLinkToken.insert).toHaveBeenCalled();

        const insertCall = mockMagicLinkToken.insert.mock.calls[0][0];
        expect(insertCall.user_id).toBe('user-123');
      });

      it('should find existing lead by email', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'lead@example.com', purpose: 'offer_access' },
        });

        // Mock no user found
        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        });

        // Mock finding lead
        mockLeads.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead-456', contact_name: 'Jane Smith', company_name: 'Acme Corp' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'lead@example.com', purpose: 'offer_access' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);

        const insertCall = mockMagicLinkToken.insert.mock.calls[0][0];
        expect(insertCall.lead_id).toBe('lead-456');
      });

      it('should reject request if user and lead not found', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'unknown@example.com', purpose: 'login' },
        });

        // Mock no user or lead found
        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        });

        mockLeads.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        });

        const request = createMockRequest({ email: 'unknown@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(404); // NotFoundError returns 404
        const data = await response.json();
        expect(data.error.message).toContain('not found');
      });
    });

    describe('Token generation', () => {
      it('should generate unique token', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'test@example.com' });
        await magicLinkRequest(request);

        const insertCall = mockMagicLinkToken.insert.mock.calls[0][0];
        expect(insertCall.token).toBeDefined();
        expect(insertCall.token.length).toBeGreaterThan(32);
      });

      it('should set token expiration to 10 minutes', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const beforeTime = Date.now();
        const request = createMockRequest({ email: 'test@example.com' });
        await magicLinkRequest(request);
        const afterTime = Date.now();

        const insertCall = mockMagicLinkToken.insert.mock.calls[0][0];
        const expiresAtTime = new Date(insertCall.expires_at).getTime();
        const expectedExpiration = 10 * 60 * 1000; // 10 minutes in ms

        expect(expiresAtTime - beforeTime).toBeGreaterThanOrEqual(expectedExpiration);
        expect(expiresAtTime - afterTime).toBeLessThanOrEqual(expectedExpiration + 1000);
      });

      it('should store IP address and user agent', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');
        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest(
          { email: 'test@example.com' },
          { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'Mozilla/5.0' }
        );
        await magicLinkRequest(request);

        const insertCall = mockMagicLinkToken.insert.mock.calls[0][0];
        expect(insertCall.ip_address).toBe('10.0.0.1');
        expect(insertCall.user_agent).toBe('Mozilla/5.0');
      });
    });

    describe('Email sending', () => {
      it('should send magic link via email when email provided', async () => {
        const { sendEmail } = require('@/lib/sendgrid');
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'test@example.com' });
        await magicLinkRequest(request);

        expect(sendEmail).toHaveBeenCalled();
        const emailCall = sendEmail.mock.calls[0][0];
        expect(emailCall.to).toBe('test@example.com');
        expect(emailCall.subject).toContain('login');
        expect(emailCall.html).toContain('Log In');
      });

      it('should customize email for offer access', async () => {
        const { sendEmail } = require('@/lib/sendgrid');
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'offer_access' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ email: 'test@example.com', purpose: 'offer_access' });
        await magicLinkRequest(request);

        const emailCall = sendEmail.mock.calls[0][0];
        expect(emailCall.subject).toContain('exclusive offer');
        expect(emailCall.html).toContain('View Your Offer');
      });

      it('should not send email if only phone provided', async () => {
        const { sendEmail } = require('@/lib/sendgrid');
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { phone: '+1234567890', purpose: 'login' },
        });

        mockLeads.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead-456', contact_name: 'Jane' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ phone: '+1234567890' });
        await magicLinkRequest(request);

        expect(sendEmail).not.toHaveBeenCalled();
      });

      it('should return 500 if email sending fails', async () => {
        const { sendEmail } = require('@/lib/sendgrid');
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });
        sendEmail.mockRejectedValue(new Error('SendGrid error'));

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(502); // ExternalServiceError returns 502
        const data = await response.json();
        expect(data.error.message).toContain('Failed to send');
      });
    });

    describe('Database operations', () => {
      it('should return 500 if token insertion fails', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        mockProfiles.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', full_name: 'John Doe' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: new Error('DB error') });

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error.message).toContain('Failed to generate');
      });
    });

    describe('Success response', () => {
      it('should return success message for email', async () => {


        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { email: 'test@example.com', purpose: 'login' },
        });

        // Mock rate limit check - need to return separate mock instances
        const mockGteResult = jest.fn().mockResolvedValue({ data: [] });
        const mockEqResult = jest.fn().mockReturnValue({
          gte: mockGteResult,
        });
        const mockSelectResult = jest.fn().mockReturnValue({
          eq: mockEqResult,
        });

        // Override default mock for this test
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'magic_link_tokens') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
              select: mockSelectResult,
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'user-123', full_name: 'John Doe' },
                  }),
                }),
              }),
            };
          }
          return {};
        });

        const request = createMockRequest({ email: 'test@example.com' });
        const response = await magicLinkRequest(request);

        if (response.status !== 200) {
          const errorData = await response.json();
          console.error('Test failed with response:', { status: response.status, error: errorData });
        }

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toContain('email');
      });

      it('should return success message for phone', async () => {
        const { validateRequestBody } = require('@/lib/middleware/validation');

        validateRequestBody.mockResolvedValue({
          valid: true,
          data: { phone: '+1234567890', purpose: 'login' },
        });

        mockLeads.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead-456', contact_name: 'Jane' },
            }),
          }),
        });

        mockMagicLinkToken.insert.mockResolvedValue({ error: null });

        const request = createMockRequest({ phone: '+1234567890' });
        const response = await magicLinkRequest(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toContain('phone');
      });
    });
  });
});
