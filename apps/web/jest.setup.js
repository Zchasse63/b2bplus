import '@testing-library/jest-dom';

// Polyfill for Next.js Request/Response in Jest
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

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
process.env.GOOGLE_API_KEY = 'test-api-key-for-testing';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
