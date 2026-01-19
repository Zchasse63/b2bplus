// Load environment variables from .env.local for integration tests
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (this allows tests to use real Supabase credentials)
config({ path: resolve(process.cwd(), '.env.local') });

import '@testing-library/jest-dom';

// Polyfill for Next.js Request/Response in Jest
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for Response (required by integration tests)
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.ok = this.status >= 200 && this.status < 300;
    }
  };
}

// Polyfill for Request (required by integration tests)
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body;
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Polyfill fetch for Node.js test environment (required for security regression tests)
// Use native Node.js fetch (available in Node 18+)
if (typeof global.fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

// Polyfill for window.matchMedia (used by Button.tsx and other components)
// Only define if window exists (not needed in Node environment tests)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock NextRequest and NextResponse for testing
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
      this.cookies = {
        get: (name) => {
          const cookieHeader = init.headers?.cookie || '';
          const cookies = {};
          cookieHeader.split(';').forEach(cookie => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) {
              cookies[key] = { value: value.trim() };
            }
          });
          return cookies[name];
        },
      };
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }
  },
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    }),
    redirect: (url, status) => ({
      url,
      status: status || 307,
      headers: new Map(),
    }),
  },
}));

// Set up test environment variables
// Use existing environment variables if available (for integration tests with real Supabase),
// otherwise fall back to mock values for unit tests
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-api-key-for-testing';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.local';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test-api-key';
process.env.SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'test@example.com';
process.env.SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Test Sender';
process.env.SENDGRID_REPLY_TO_EMAIL = process.env.SENDGRID_REPLY_TO_EMAIL || 'test-reply@example.com';
process.env.TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@example.com';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Mock Supabase client for tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => {
    const mockChain = {
      select: jest.fn(() => mockChain),
      insert: jest.fn(() => mockChain),
      update: jest.fn(() => mockChain),
      delete: jest.fn(() => mockChain),
      eq: jest.fn(() => mockChain),
      neq: jest.fn(() => mockChain),
      gte: jest.fn(() => mockChain),
      lte: jest.fn(() => mockChain),
      in: jest.fn(() => mockChain),
      order: jest.fn(() => mockChain),
      limit: jest.fn(() => mockChain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    };

    return {
      from: jest.fn(() => mockChain),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
        signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
        refreshSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
    };
  }),
}));
