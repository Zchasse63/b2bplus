# Error Handling Architecture

## Overview

This document describes the standardized error handling patterns used in the B2B Plus application. The system provides consistent error responses, proper error classification, and integration with monitoring tools.

## Error Classes

All custom errors extend the base `AppError` class, which provides:
- Consistent error codes via `ErrorCode` enum
- Automatic HTTP status code mapping
- Serialization to JSON for API responses
- Integration with Sentry for error tracking

### Available Error Classes

| Class | Use Case | HTTP Status |
|-------|----------|-------------|
| `AppError` | Base class for all application errors | Varies |
| `ValidationError` | Invalid input data | 422 |
| `AuthError` | Authentication failures | 401 |
| `ForbiddenError` | Authorization failures | 403 |
| `NotFoundError` | Missing resources | 404 |
| `DatabaseError` | Database operation failures | 500 |
| `ExternalServiceError` | Third-party API failures | 502 |
| `RateLimitError` | Too many requests | 429 |
| `ConflictError` | Resource conflicts | 409 |
| `BadRequestError` | Malformed requests | 400 |

### Error Codes

```typescript
enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}
```

## Usage Examples

### Throwing Errors

```typescript
import {
  ValidationError,
  AuthError,
  NotFoundError,
  DatabaseError,
  ForbiddenError,
} from '@/lib/errors';

// Validation error with field-specific errors
throw new ValidationError('Validation failed', {
  email: ['Invalid email format'],
  password: ['Password must be at least 8 characters'],
});

// Authentication error
throw AuthError.sessionExpired();
throw AuthError.invalidCredentials();

// Not found error
throw new NotFoundError('Order', orderId);

// Database error
throw DatabaseError.queryFailed('orders', 'select');

// Authorization error
throw ForbiddenError.insufficientRole('admin');
```

### Using the Error Handler Middleware

```typescript
import { handleError, withErrorHandler } from '@/lib/middleware/error-handler';

// Option 1: Wrap entire handler
export const GET = withErrorHandler(async (req) => {
  // Your handler code
  // Errors are automatically caught and formatted
});

// Option 2: Manual error handling
export async function POST(req: Request) {
  try {
    // Your handler code
  } catch (error) {
    return handleError(error, { requestId: 'xxx' });
  }
}
```

### Assertion Helpers

```typescript
import {
  assertExists,
  assertAuthenticated,
  assertRole,
  safeDbOperation,
} from '@/lib/middleware/error-handler';

// Assert resource exists (throws NotFoundError if null)
const order = await getOrder(orderId);
assertExists(order, 'Order', orderId);

// Assert user is authenticated (throws AuthError if null)
assertAuthenticated(user);

// Assert user has required role (throws ForbiddenError if not)
assertRole(user.role, ['admin', 'owner']);

// Safe database operation
const result = await safeDbOperation(
  () => supabase.from('orders').select().eq('id', orderId).single(),
  'orders',
  'select'
);
```

## Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": {
        "email": ["Invalid email format"]
      }
    },
    "requestId": "abc-123-def"
  }
}
```

Success responses follow this format (when using `createSuccessResponse`):

```json
{
  "success": true,
  "data": { /* your data */ },
  "requestId": "abc-123-def"
}
```

## Integration with Sentry

Errors are automatically reported to Sentry based on these rules:

1. **Operational errors** (expected errors like validation, not found): Logged but not reported to Sentry
2. **Non-operational errors** (unexpected errors): Reported to Sentry with context
3. **Server errors (5xx)**: Always logged at error level
4. **Client errors (4xx)**: Logged at warning level

## Best Practices

1. **Use specific error classes**: Instead of throwing generic errors, use the appropriate error class
2. **Include context**: Always provide meaningful error messages and details
3. **Don't expose internals**: In production, internal error details are hidden from responses
4. **Use assertion helpers**: They provide consistent error handling for common patterns
5. **Request IDs**: Always include request IDs for correlation in logs and responses

## Migration Guide

To migrate existing routes to use the new error handling:

```typescript
// Before (inconsistent error handling)
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// After (using error classes)
import { AuthError } from '@/lib/errors';
import { handleError } from '@/lib/middleware/error-handler';

try {
  if (!user) {
    throw new AuthError('Unauthorized');
  }
  // ... rest of handler
} catch (error) {
  return handleError(error);
}

// Or even better (using assertion helpers)
import { assertAuthenticated } from '@/lib/middleware/error-handler';

try {
  assertAuthenticated(user);
  // ... rest of handler
} catch (error) {
  return handleError(error);
}
```

## Files

- `lib/errors/index.ts` - Error class definitions
- `lib/errors/api-error.ts` - Error response helpers (legacy, still supported)
- `lib/middleware/error-handler.ts` - Error handling middleware and utilities
