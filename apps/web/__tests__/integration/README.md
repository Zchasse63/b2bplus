# Integration Tests

Integration tests verify API route logic, authentication flows, and database interactions.

## Running Integration Tests

### Unit Test Mode (Default)

By default, integration tests run in **mock mode** without requiring a live Supabase instance:

```bash
npm run test:integration
```

In this mode:
- Uses mock Supabase URLs (`https://mock.supabase.local`)
- Test utilities return mock data without hitting database
- Tests verify API route logic, validation, and error handling
- Faster execution, no database cleanup needed

### Full Integration Mode (with Real Database)

For complete integration testing including RLS verification, configure real Supabase credentials:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run integration tests
npm run test:integration
```

In this mode:
- Creates real test users in Supabase
- Tests actual database operations and RLS policies
- Verifies authentication flows end-to-end
- Automatically cleans up test data after completion

**Warning:** Running in full integration mode will create and delete test data in your Supabase instance. Use a development/test project, not production.

## Test Structure

```
__tests__/integration/
├── README.md                    # This file
├── auth-routes.test.ts          # Auth API route tests
├── chatbot-routes.test.ts       # Chatbot API route tests
├── ai-routes.test.ts            # AI companion API route tests
├── helpers/
│   ├── test-utils.ts            # Shared test utilities
│   └── ai-mocks.ts              # AI SDK mocking helpers
└── fixtures/
    ├── auth.ts                  # Authentication test data
    ├── users.ts                 # User test data
    ├── products.ts              # Product test data
    ├── chatbot.ts               # Chatbot test data
    └── ai-tools.ts              # AI tool mock responses
```

## Writing Integration Tests

### Example: Testing API Route

```typescript
import { describe, it, expect } from '@jest/globals';
import { POST as handler } from '@/app/api/your-route/route';
import { createMockRequest } from './helpers/test-utils';

describe('POST /api/your-route', () => {
  it('should validate request and return success', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { key: 'value' },
    });

    const response = await handler(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Example: Testing with Test User

```typescript
import { createTestUser, cleanupTestUser } from './helpers/test-utils';

describe('User-specific tests', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser({ role: 'customer' });
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  it('should perform user-specific operation', async () => {
    // Test using testUser.id, testUser.email, etc.
  });
});
```

## Best Practices

1. **Mock External Services**: Always mock SendGrid, AI SDK, and other external APIs
2. **Clean Up Test Data**: Use `afterAll` hooks to cleanup test users/data
3. **Unique Test Data**: Use `randomUUID()` for unique emails, names, SKUs
4. **Avoid Rate Limits**: Mock rate limiters in tests
5. **Test in Isolation**: Each test should be independent
6. **Document Required Setup**: Add comments explaining test prerequisites

## Troubleshooting

### Tests fail with "ENOTFOUND test.supabase.co"
- This is expected in mock mode for tests that require real database
- Either:
  - Accept that some tests skip in mock mode (they'll pass but not fully test)
  - Configure real Supabase credentials to run full integration tests

### Tests timeout
- Integration tests with real DB can be slow (creating users, organizations)
- Increase Jest timeout: `jest.setTimeout(30000)` in test file

### RLS policy tests fail
- RLS verification requires real Supabase instance
- Run with real credentials or skip RLS-specific tests in mock mode

## Coverage

Target: 80%+ coverage on API routes

View coverage report:
```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in browser to see detailed coverage.
