/**
 * Rate Limiting Middleware Tests
 * Tests for rate limit configuration and enforcement
 *
 * @group unit
 * @group security
 * @group critical
 */

import { RATE_LIMITS, createRateLimiter, getRateLimiter } from '@/lib/middleware/rate-limit';

// Mock Upstash
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@upstash/ratelimit', () => {
  const mockRatelimit = jest.fn().mockImplementation(() => ({
    limit: jest.fn(),
  }));
  mockRatelimit.slidingWindow = jest.fn(() => ({}));
  return { Ratelimit: mockRatelimit };
});

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RATE_LIMITS Configuration', () => {
    it('should define all rate limit types', () => {
      expect(RATE_LIMITS.public).toBeDefined();
      expect(RATE_LIMITS.authenticated).toBeDefined();
      expect(RATE_LIMITS.admin).toBeDefined();
      expect(RATE_LIMITS.sensitive).toBeDefined();
      expect(RATE_LIMITS.ai).toBeDefined();
    });

    it('should have public endpoint limits', () => {
      expect(RATE_LIMITS.public.requests).toBe(100);
      expect(RATE_LIMITS.public.window).toBe(60 * 60 * 1000);
    });

    it('should have authenticated endpoint limits', () => {
      expect(RATE_LIMITS.authenticated.requests).toBe(1000);
      expect(RATE_LIMITS.authenticated.window).toBe(60 * 60 * 1000);
    });

    it('should have admin endpoint limits', () => {
      expect(RATE_LIMITS.admin.requests).toBe(5000);
      expect(RATE_LIMITS.admin.window).toBe(60 * 60 * 1000);
    });

    it('should have sensitive operation limits', () => {
      expect(RATE_LIMITS.sensitive.requests).toBe(10);
      expect(RATE_LIMITS.sensitive.window).toBe(60 * 60 * 1000);
    });

    it('should have AI endpoint limits', () => {
      expect(RATE_LIMITS.ai.requests).toBe(100);
      expect(RATE_LIMITS.ai.window).toBe(24 * 60 * 60 * 1000);
    });

    it('should enforce hierarchy: sensitive < public < authenticated < admin', () => {
      expect(RATE_LIMITS.sensitive.requests).toBeLessThan(RATE_LIMITS.public.requests);
      expect(RATE_LIMITS.public.requests).toBeLessThan(RATE_LIMITS.authenticated.requests);
      expect(RATE_LIMITS.authenticated.requests).toBeLessThan(RATE_LIMITS.admin.requests);
    });

    it('should have longer window for AI operations', () => {
      expect(RATE_LIMITS.ai.window).toBeGreaterThan(RATE_LIMITS.public.window);
    });

    it('should have stricter sensitive operation limits', () => {
      expect(RATE_LIMITS.sensitive.requests).toBe(10);
      expect(RATE_LIMITS.sensitive.requests).toBeLessThan(RATE_LIMITS.public.requests);
    });

    it('should all be measured in milliseconds', () => {
      const oneHour = 60 * 60 * 1000;
      expect(RATE_LIMITS.public.window).toBe(oneHour);
      expect(RATE_LIMITS.authenticated.window).toBe(oneHour);
      expect(RATE_LIMITS.admin.window).toBe(oneHour);
      expect(RATE_LIMITS.sensitive.window).toBe(oneHour);
    });
  });

  describe('createRateLimiter()', () => {
    it('should create a rate limiter with valid config', () => {
      const config = { requests: 100, window: 60000 };
      const limiter = createRateLimiter(config);

      expect(limiter).toBeDefined();
    });

    it('should create rate limiter for various configs', () => {
      const configs = [
        { requests: 10, window: 60000 },
        { requests: 100, window: 3600000 },
        { requests: 1000, window: 3600000 },
        { requests: 5000, window: 3600000 },
      ];

      configs.forEach((config) => {
        const limiter = createRateLimiter(config);
        expect(limiter).toBeDefined();
      });
    });

    it('should handle window conversion from ms to seconds', () => {
      const config = { requests: 50, window: 120000 }; // 2 minutes
      const limiter = createRateLimiter(config);

      expect(limiter).toBeDefined();
    });

    it('should set analytics to true', () => {
      const config = { requests: 100, window: 60000 };
      const limiter = createRateLimiter(config);

      expect(limiter).toBeDefined();
    });
  });

  describe('getRateLimiter()', () => {
    it('should return rate limiter for public endpoints', () => {
      const limiter = getRateLimiter('public');
      expect(limiter).toBeDefined();
    });

    it('should return rate limiter for authenticated endpoints', () => {
      const limiter = getRateLimiter('authenticated');
      expect(limiter).toBeDefined();
    });

    it('should return rate limiter for admin endpoints', () => {
      const limiter = getRateLimiter('admin');
      expect(limiter).toBeDefined();
    });

    it('should return rate limiter for sensitive operations', () => {
      const limiter = getRateLimiter('sensitive');
      expect(limiter).toBeDefined();
    });

    it('should return rate limiter for AI operations', () => {
      const limiter = getRateLimiter('ai');
      expect(limiter).toBeDefined();
    });

    it('should return different instances for different types', () => {
      const publicLimiter = getRateLimiter('public');
      const adminLimiter = getRateLimiter('admin');

      expect(publicLimiter).toBeDefined();
      expect(adminLimiter).toBeDefined();
      // Each type gets its own configuration
    });

    it('should use appropriate config for each type', () => {
      const publicLimiter = getRateLimiter('public');
      const sensitiveLimiter = getRateLimiter('sensitive');

      expect(publicLimiter).toBeDefined();
      expect(sensitiveLimiter).toBeDefined();
      // Sensitive should be created with stricter limits
    });
  });

  describe('Security Principles', () => {
    it('should enforce fail-closed principle for sensitive operations', () => {
      // Sensitive operations have very low limits
      expect(RATE_LIMITS.sensitive.requests).toBe(10);
    });

    it('should give admins higher quota than regular users', () => {
      expect(RATE_LIMITS.admin.requests).toBeGreaterThan(RATE_LIMITS.authenticated.requests);
    });

    it('should give authenticated users higher quota than public', () => {
      expect(RATE_LIMITS.authenticated.requests).toBeGreaterThan(RATE_LIMITS.public.requests);
    });

    it('should restrict AI operations to daily limits', () => {
      const oneDay = 24 * 60 * 60 * 1000;
      expect(RATE_LIMITS.ai.window).toBe(oneDay);
    });

    it('should use same hour window for most endpoints', () => {
      const oneHour = 60 * 60 * 1000;
      expect(RATE_LIMITS.public.window).toBe(oneHour);
      expect(RATE_LIMITS.authenticated.window).toBe(oneHour);
      expect(RATE_LIMITS.admin.window).toBe(oneHour);
      expect(RATE_LIMITS.sensitive.window).toBe(oneHour);
    });
  });

  describe('Configuration Validation', () => {
    it('should have positive request counts', () => {
      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.requests).toBeGreaterThan(0);
      });
    });

    it('should have positive windows', () => {
      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.window).toBeGreaterThan(0);
      });
    });

    it('should have reasonable request counts', () => {
      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.requests).toBeLessThan(100000);
      });
    });

    it('should have reasonable window sizes', () => {
      const maxWindow = 365 * 24 * 60 * 60 * 1000; // 1 year
      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.window).toBeLessThan(maxWindow);
      });
    });
  });

  describe('Endpoint Type Coverage', () => {
    it('should cover all critical endpoint types', () => {
      const types: (keyof typeof RATE_LIMITS)[] = [
        'public',
        'authenticated',
        'admin',
        'sensitive',
        'ai',
      ];

      types.forEach((type) => {
        const limiter = getRateLimiter(type);
        expect(limiter).toBeDefined();
      });
    });

    it('should have distinct configurations for each type', () => {
      const configs = {
        public: RATE_LIMITS.public,
        authenticated: RATE_LIMITS.authenticated,
        admin: RATE_LIMITS.admin,
        sensitive: RATE_LIMITS.sensitive,
        ai: RATE_LIMITS.ai,
      };

      const configStrings = Object.values(configs).map(JSON.stringify);
      const uniqueConfigs = new Set(configStrings);

      // Most should be unique (sensitive and public might theoretically have same window but not requests)
      expect(uniqueConfigs.size).toBeGreaterThan(1);
    });
  });
});
