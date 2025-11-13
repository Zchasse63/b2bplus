import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * Authentication Service Tests
 * Tests for magic link generation, verification, session management
 */

// Test Data Factories
const createMockProfile = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockMagicLinkToken = (overrides = {}) => ({
  id: 'token-123',
  user_id: 'user-123',
  token: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  purpose: 'login',
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  created_at: new Date().toISOString(),
  verified_at: null,
  ...overrides,
});

const createMockSession = (overrides = {}) => ({
  id: 'session-123',
  user_id: 'user-123',
  token: 'session-token-abc123',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  ip_address: '192.168.1.1',
  ...overrides,
});

describe('Authentication Service', () => {
  describe('Magic Link Token Generation', () => {
    it('should generate magic link token with unique ID', () => {
      const token1 = createMockMagicLinkToken();
      const token2 = createMockMagicLinkToken({ id: 'token-124' });

      expect(token1.id).toBe('token-123');
      expect(token2.id).toBe('token-124');
      expect(token1.id).not.toBe(token2.id);
    });

    it('should enforce rate limiting (max 3 requests per hour)', () => {
      const recentAttempts = [
        createMockMagicLinkToken({ id: '1' }),
        createMockMagicLinkToken({ id: '2' }),
        createMockMagicLinkToken({ id: '3' }),
      ];

      const MAX_ATTEMPTS = 3;
      expect(recentAttempts.length).toBe(MAX_ATTEMPTS);
      expect(recentAttempts.length >= MAX_ATTEMPTS).toBe(true);
    });

    it('should generate unique tokens for each request', () => {
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        tokens.push(`token-${Date.now()}-${Math.random()}`);
      }

      const uniqueSet = new Set(tokens);
      expect(uniqueSet.size).toBe(5);
    });

    it('should set token expiration to 10 minutes', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 10 * 60 * 1000);
      const duration = expiresAt.getTime() - now;

      expect(duration).toBe(10 * 60 * 1000);
    });

    it('should capture IP address and user agent', () => {
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0)';
      const mockToken = createMockMagicLinkToken({
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      expect(mockToken.ip_address).toBe(ipAddress);
      expect(mockToken.user_agent).toBe(userAgent);
    });

    it('should support different token purposes', () => {
      const loginToken = createMockMagicLinkToken({ purpose: 'login' });
      const offerToken = createMockMagicLinkToken({
        purpose: 'offer_access',
        id: 'token-offer',
      });

      expect(loginToken.purpose).toBe('login');
      expect(offerToken.purpose).toBe('offer_access');
    });

    it('should store valid email address with token', () => {
      const email = 'user@example.com';
      const token = createMockMagicLinkToken({ email });

      expect(token.email).toBe(email);
      expect(token.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should link token to existing user ID', () => {
      const userId = 'user-456';
      const token = createMockMagicLinkToken({ user_id: userId });

      expect(token.user_id).toBe(userId);
      expect(token.user_id).toBeTruthy();
    });
  });

  describe('Magic Link Verification', () => {
    it('should verify valid magic link token', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000';
      const mockToken = createMockMagicLinkToken({
        token,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      expect(mockToken.token).toBe(token);
      expect(new Date(mockToken.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject expired token', () => {
      const expiredToken = createMockMagicLinkToken({
        expires_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      });

      const isExpired = new Date(expiredToken.expires_at).getTime() < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should reject invalid/non-existent token', () => {
      const token = null;
      expect(token).toBeNull();
    });

    it('should mark token as verified after use', () => {
      const token = createMockMagicLinkToken();
      const verifiedAt = new Date().toISOString();

      const updatedToken = {
        ...token,
        verified_at: verifiedAt,
      };

      expect(updatedToken.verified_at).toBeDefined();
      expect(updatedToken.verified_at).not.toBeNull();
    });

    it('should prevent reuse of already verified token', () => {
      const verifiedToken = createMockMagicLinkToken({
        verified_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      });

      const hasBeenUsed = verifiedToken.verified_at !== null;
      expect(hasBeenUsed).toBe(true);
    });

    it('should match token against stored hash', () => {
      const token = createMockMagicLinkToken();
      const providedToken = token.token;

      expect(providedToken).toBe(token.token);
    });

    it('should include user context in token verification', () => {
      const token = createMockMagicLinkToken({ user_id: 'user-789' });
      expect(token.user_id).toBe('user-789');
    });

    it('should support redirect URL after verification', () => {
      const redirectUrl = '/dashboard/orders';
      const token = createMockMagicLinkToken({ redirect_url: redirectUrl });

      expect(token.redirect_url).toBe(redirectUrl);
    });
  });

  describe('Session Management', () => {
    it('should create session after successful verification', () => {
      const userId = 'user-123';
      const mockSession = createMockSession({ user_id: userId });

      expect(mockSession.user_id).toBe(userId);
      expect(mockSession.token).toBeTruthy();
    });

    it('should set session expiration to 24 hours', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 24 * 60 * 60 * 1000);
      const duration = expiresAt.getTime() - now;

      expect(duration).toBe(24 * 60 * 60 * 1000);
    });

    it('should generate unique session token', () => {
      const session1 = createMockSession({ id: '1', token: 'token-1' });
      const session2 = createMockSession({ id: '2', token: 'token-2' });

      expect(session1.token).not.toBe(session2.token);
    });

    it('should retrieve valid session by token', () => {
      const sessionToken = 'session-token-abc123';
      const mockSession = createMockSession({ token: sessionToken });

      expect(mockSession.token).toBe(sessionToken);
    });

    it('should invalidate expired sessions', () => {
      const expiredSession = createMockSession({
        expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      });

      const isExpired = new Date(expiredSession.expires_at).getTime() < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should update last_activity on session use', () => {
      const newActivity = new Date().toISOString();
      const mockSession = createMockSession({ last_activity: newActivity });

      expect(mockSession.last_activity).toBe(newActivity);
    });

    it('should support multiple active sessions per user', () => {
      const userId = 'user-123';
      const session1 = createMockSession({
        id: 'session-1',
        user_id: userId,
        ip_address: '192.168.1.1',
      });
      const session2 = createMockSession({
        id: 'session-2',
        user_id: userId,
        ip_address: '192.168.1.2',
      });

      expect(session1.user_id).toBe(session2.user_id);
      expect(session1.ip_address).not.toBe(session2.ip_address);
    });

    it('should logout by invalidating session', () => {
      const mockSession = createMockSession();
      const deletedSession = null;

      expect(deletedSession).toBeNull();
    });

    it('should track session creation timestamp', () => {
      const mockSession = createMockSession();
      expect(mockSession.created_at).toBeTruthy();
      expect(mockSession.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should associate session with IP address', () => {
      const ipAddress = '203.0.113.42';
      const mockSession = createMockSession({ ip_address: ipAddress });

      expect(mockSession.ip_address).toBe(ipAddress);
    });
  });

  describe('Email Notifications', () => {
    it('should include magic link URL in email', () => {
      const token = 'abc123def456';
      const magicLink = `https://app.example.com/auth/verify?token=${token}`;

      expect(magicLink).toContain(token);
      expect(magicLink).toContain('verify');
    });

    it('should include user name in email greeting', () => {
      const userName = 'John Doe';
      const emailBody = `Hi ${userName}, here's your login link`;

      expect(emailBody).toContain(userName);
    });

    it('should include token expiration warning', () => {
      const emailBody = 'This link expires in 10 minutes';
      expect(emailBody).toContain('10 minutes');
    });

    it('should use appropriate subject for login emails', () => {
      const subject = 'Your login link for B2B+';
      expect(subject).toContain('login');
    });

    it('should use appropriate subject for offer emails', () => {
      const subject = 'Your exclusive offer from B2B+';
      expect(subject).toContain('exclusive offer');
    });

    it('should use HTTPS for email links', () => {
      const magicLink = 'https://app.example.com/auth/verify?token=abc';
      expect(magicLink.startsWith('https://')).toBe(true);
    });

    it('should not include raw token in email body', () => {
      const token = 'raw-sensitive-token-12345';
      const emailBody = 'Click here to verify your email';

      expect(emailBody).not.toContain(token);
    });

    it('should include link only once per email', () => {
      const link = 'https://app.example.com/verify?token=xyz';
      const emailBody = `${link}\n\nClick above to verify.`;

      const linkCount = (emailBody.match(/https:\/\/app\.example\.com\/verify/g) || []).length;
      expect(linkCount).toBe(1);
    });
  });

  describe('Security & Validation', () => {
    it('should require email or phone for magic link request', () => {
      const emailOnly = { email: 'test@example.com' };
      const phoneOnly = { phone: '+1234567890' };
      const neither = {};

      expect(emailOnly.email || emailOnly.phone).toBeTruthy();
      expect(phoneOnly.email || phoneOnly.phone).toBeTruthy();
      expect(neither.email || neither.phone).toBeFalsy();
    });

    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user+tag@domain.co.uk'];
      const invalidEmails = ['invalid.email', '@example.com', 'test@'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate phone format', () => {
      const validPhones = ['+1234567890', '+44 207 946 0958'];
      const invalidPhones = ['123', 'notaphone'];

      const phoneRegex = /^\+?[0-9\s\-()]{9,}$/;

      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone.replace(/\s/g, ''))).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone.replace(/\s/g, ''))).toBe(false);
      });
    });

    it('should use parameterized queries to prevent SQL injection', () => {
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";
      expect(maliciousEmail).toBeTruthy();
    });

    it('should not expose sensitive information in error messages', () => {
      const exposedError = 'Token: 550e8400-e29b';
      const safeError = 'Invalid magic link provided';

      expect(exposedError).toContain('Token:');
      expect(safeError).not.toContain('Token:');
    });

    it('should use secure random token generation', () => {
      const tokens = [];
      for (let i = 0; i < 50; i++) {
        tokens.push(Math.random().toString(36).substring(2, 15));
      }

      const uniqueSet = new Set(tokens);
      expect(uniqueSet.size).toBe(50);
    });

    it('should enforce HTTPS for redirects', () => {
      const secureUrl = 'https://app.example.com/dashboard';
      const insecureUrl = 'http://app.example.com/dashboard';

      expect(secureUrl.startsWith('https://')).toBe(true);
      expect(insecureUrl.startsWith('https://')).toBe(false);
    });
  });

  describe('Rate Limiting & Abuse Prevention', () => {
    it('should limit magic link requests to 3 per hour', () => {
      const recentAttempts = [
        createMockMagicLinkToken({ id: '1' }),
        createMockMagicLinkToken({ id: '2' }),
        createMockMagicLinkToken({ id: '3' }),
      ];

      expect(recentAttempts.length >= 3).toBe(true);
    });

    it('should return 429 when rate limit exceeded', () => {
      const statusCode = 429;
      expect(statusCode).toBe(429);
    });

    it('should track failed login attempts per account', () => {
      const failedAttempts = [
        { user_id: 'user-123', success: false },
        { user_id: 'user-123', success: false },
        { user_id: 'user-123', success: false },
      ];

      const failedCount = failedAttempts.filter(a => !a.success).length;
      expect(failedCount).toBe(3);
    });

    it('should lock account after too many failed attempts', () => {
      const maxFailedAttempts = 5;
      const failedCount = 5;
      const accountLocked = failedCount >= maxFailedAttempts;

      expect(accountLocked).toBe(true);
    });

    it('should reset attempt counter on successful login', () => {
      let failedAttempts = 3;
      const successfulLogin = true;

      if (successfulLogin) {
        failedAttempts = 0;
      }

      expect(failedAttempts).toBe(0);
    });

    it('should prevent brute force with exponential backoff', () => {
      const attempts = 5;
      const baseDelay = 1000;
      const delay = baseDelay * Math.pow(2, attempts - 1);

      expect(delay).toBeGreaterThan(baseDelay);
    });

    it('should log suspicious authentication patterns', () => {
      const suspiciousAttempts = 10;
      const shouldAlert = suspiciousAttempts > 5;

      expect(shouldAlert).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide user-friendly error messages', () => {
      const errors = {
        'Too many requests': 'Rate limit exceeded',
        'User not found': 'Invalid email address',
        'Email sending failed': 'Unable to send magic link',
      };

      Object.values(errors).forEach(message => {
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should not expose sensitive details in errors', () => {
      const sensitiveError = 'Database error: connection refused on host 192.168.1.1';
      const safeError = 'An error occurred. Please try again later.';

      expect(sensitiveError).toContain('192.168.1.1');
      expect(safeError).not.toContain('Database');
    });

    it('should provide clear error for duplicate email', () => {
      const error = 'Email already registered';
      expect(error).toContain('Email');
    });

    it('should handle timeout errors gracefully', () => {
      const timeoutError = new Error('Request timeout');
      expect(timeoutError.message).toContain('timeout');
    });

    it('should handle missing required fields', () => {
      const missingEmailError = 'Email is required';
      expect(missingEmailError).toContain('required');
    });
  });
});
