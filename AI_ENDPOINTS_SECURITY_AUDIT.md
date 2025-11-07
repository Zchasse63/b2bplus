# AI Endpoints Security Audit
**Phase 1, Task 2.3: Audit Existing AI Endpoints**

## Audit Status

### Endpoints to Audit (10 total)

1. ✅ `/api/admin/analytics/customer-insights` - Customer insights generation
2. ✅ `/api/admin/analytics/forecast` - Usage forecasting  
3. ✅ `/api/admin/opportunities/detect` - Opportunity detection
4. ⏳ `/api/admin/pricing/optimize` - Pricing optimization
5. ⏳ `/api/admin/sku-mapping/analyze` - SKU matching
6. ⏳ `/api/admin/campaigns/send-personalized` - Personalized emails
7. ⏳ `/api/search/semantic` - Semantic product search
8. ⏳ `/api/admin/import/ai-excel` - Excel column mapping
9. ⏳ `/api/admin/embeddings/generate` - Product embeddings
10. ⏳ `/api/recommendations/*` - Product recommendations

## Security Checklist

For each endpoint, verify:
- [ ] Uses `validateAIRequest()` or `validateAdminAIRequest()` middleware
- [ ] Uses `getCustomerContext()` for data access (where applicable)
- [ ] Never queries across organizations
- [ ] Sanitizes AI responses (Task 2.4)
- [ ] Logs usage to `ai_usage_logs` (Task 2.5)
- [ ] Has proper error handling
- [ ] Returns appropriate HTTP status codes

## Audit Notes

### 1. `/api/admin/analytics/customer-insights`
**File**: `apps/web/app/api/admin/analytics/customer-insights/route.ts`
**Status**: ✅ Partially Secure
**Current Security**:
- ✅ Uses `checkAdminRole()` for authentication
- ✅ Requires `customerId` parameter
- ❌ Does NOT use `validateAIRequest()`
- ❌ Does NOT use `getCustomerContext()`
- ❌ Does NOT log AI usage
- ❌ Does NOT sanitize AI responses

**Required Changes**:
1. Add `validateAdminAIRequest()` at the start
2. Use `getCustomerContext()` to ensure data isolation
3. Add AI usage logging
4. Add response sanitization

### 2. `/api/admin/analytics/forecast`
**File**: `apps/web/app/api/admin/analytics/forecast/route.ts`
**Status**: ✅ Partially Secure
**Current Security**:
- ✅ Uses `checkAdminRole()` for authentication
- ✅ Requires `customerId` parameter
- ❌ Does NOT use `validateAIRequest()`
- ❌ Does NOT use `getCustomerContext()`
- ❌ Does NOT log AI usage

**Required Changes**:
1. Add `validateAdminAIRequest()` at the start
2. Use `getCustomerContext()` to ensure data isolation
3. Add AI usage logging

### 3. `/api/admin/opportunities/detect`
**File**: `apps/web/app/api/admin/opportunities/detect/route.ts`
**Status**: ✅ Partially Secure
**Current Security**:
- ✅ Uses authentication check
- ✅ Requires `customerId` parameter
- ❌ Does NOT use `validateAIRequest()`
- ❌ Does NOT use `getCustomerContext()`
- ❌ Does NOT log AI usage

**Required Changes**:
1. Add `validateAdminAIRequest()` at the start
2. Use `getCustomerContext()` to ensure data isolation
3. Add AI usage logging

## Implementation Strategy

Given the number of endpoints and complexity, we'll:

1. **Create helper wrapper** - Create a reusable wrapper function that adds security to existing endpoints
2. **Update endpoints systematically** - Update each endpoint one by one
3. **Test after each update** - Verify functionality isn't broken
4. **Document changes** - Track all modifications

## Security Wrapper Pattern

```typescript
// Helper to wrap existing AI endpoint handlers
export async function secureAIEndpoint(
  request: NextRequest,
  handler: (context: CustomerContext, params: any) => Promise<any>,
  options: {
    requireAdmin?: boolean;
    rateLimitType?: 'standard' | 'heavy' | 'bulk';
    operationType: string;
  }
) {
  try {
    // Validate request
    const validation = options.requireAdmin
      ? await validateAdminAIRequest(request, getRateLimitConfig(options.rateLimitType || 'standard'))
      : await validateAIRequest(request, getRateLimitConfig(options.rateLimitType || 'standard'));
    
    if (!validation.authorized) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }
    
    // Get customer context
    const context = await getCustomerContext(validation.userId!);
    
    // Parse request body/params
    const params = request.method === 'GET' 
      ? Object.fromEntries(new URL(request.url).searchParams)
      : await request.json();
    
    // Execute handler
    const result = await handler(context, params);
    
    // Log AI usage
    await logAIUsage({
      userId: validation.userId!,
      organizationId: context.organizationId,
      operationType: options.operationType,
      endpoint: new URL(request.url).pathname,
      tokensUsed: result.tokensUsed || 0,
      success: true,
    });
    
    // Sanitize response
    const sanitized = sanitizeAIResponse(result);
    
    return NextResponse.json(sanitized);
    
  } catch (error: any) {
    console.error(`AI endpoint error (${options.operationType}):`, error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Security Infrastructure Complete

✅ **Task 2.1**: Customer Data Isolation Helper - `apps/web/lib/ai/customer-context.ts`
✅ **Task 2.2**: AI Security Middleware - `apps/web/lib/ai-security.ts`
✅ **Task 2.4**: AI Response Sanitization - `apps/web/lib/ai/sanitize.ts`
✅ **Task 2.5**: AI Usage Tracking - `apps/web/lib/ai/usage-tracking.ts`
✅ **Security Wrapper**: Secure Endpoint Wrapper - `apps/web/lib/ai/secure-endpoint.ts`

## Migration Guide

### Option 1: Use Secure Endpoint Wrapper (Recommended)

The `secureAIEndpoint` wrapper provides all security features in one call:

**Before:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAdminRole()
    if (authError) return authError

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    // ... business logic ...

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**After:**
```typescript
import { secureAIGet } from '@/lib/ai/secure-endpoint'

export async function GET(request: NextRequest) {
  return secureAIGet(
    request,
    async (context) => {
      const { customerId } = context.params
      const supabase = await createClient()

      // Business logic with automatic data isolation
      // context.customerContext provides organization-scoped data
      // context.organizationId ensures queries are scoped

      // ... business logic ...

      return {
        data: result,
        tokensUsed: 1500 // for billing
      }
    },
    {
      requireAdmin: true,
      operationType: 'customer-insights',
      rateLimitType: 'standard',
    }
  )
}
```

### Option 2: Manual Security Implementation

If you need more control, use the security modules directly:

```typescript
import { validateAdminAIRequest, getRateLimitConfig } from '@/lib/middleware/ai-security'
import { getCustomerContext } from '@/lib/ai/customer-context'
import { sanitizeAIResponse } from '@/lib/ai/sanitize'
import { logAIUsage } from '@/lib/ai/usage-tracking'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate request
    const validation = await validateAdminAIRequest(
      request,
      getRateLimitConfig('standard')
    )
    if (!validation.authorized) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    // 2. Get customer context
    const context = await getCustomerContext(validation.userId!)

    // 3. Parse params
    const { customerId } = await request.json()

    // 4. Business logic
    const result = await yourBusinessLogic(customerId, context)

    // 5. Sanitize response
    const sanitized = sanitizeAIResponse(result, {
      allowedOrganizationIds: [context.organizationId],
    })

    // 6. Log usage
    await logAIUsage({
      userId: validation.userId!,
      organizationId: context.organizationId,
      endpoint: '/api/your-endpoint',
      operationType: 'your-operation',
      tokensUsed: result.tokensUsed || 0,
      success: true,
    })

    // 7. Return response
    return NextResponse.json({ success: true, data: sanitized.sanitized })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Endpoint Update Status

### ✅ Ready for Migration
All 10 endpoints can now be migrated using the security wrapper:

1. `/api/admin/analytics/customer-insights` - Use `secureAIGet` with `requireAdmin: true`
2. `/api/admin/analytics/forecast` - Use `secureAIPost` with `requireAdmin: true`
3. `/api/admin/opportunities/detect` - Use `secureAIPost` with `requireAdmin: true`
4. `/api/admin/pricing/optimize` - Use `secureAIPost` with `requireAdmin: true`
5. `/api/admin/sku-mapping/analyze` - Use `secureAIPost` with `requireAdmin: true, rateLimitType: 'heavy'`
6. `/api/admin/campaigns/send-personalized` - Use `secureAIPost` with `requireAdmin: true, rateLimitType: 'bulk'`
7. `/api/search/semantic` - Use `secureAIGet` with `requireAdmin: false`
8. `/api/admin/import/ai-excel` - Use `secureAIPost` with `requireAdmin: true, rateLimitType: 'heavy'`
9. `/api/admin/embeddings/generate` - Use `secureAIPost` with `requireAdmin: true, rateLimitType: 'heavy'`
10. `/api/recommendations/*` - Use `secureAIGet` with `requireAdmin: false`

## Next Steps

1. ✅ Security infrastructure complete
2. ⏳ Migrate endpoints to use security wrapper (can be done incrementally)
3. ⏳ Test each endpoint after migration
4. ⏳ Monitor AI usage logs
5. ⏳ Set up alerts for rate limit violations

## Notes

- **Incremental Migration**: Endpoints can be migrated one at a time without breaking existing functionality
- **Backward Compatible**: Old endpoints will continue to work during migration
- **Testing**: Each endpoint should be tested after migration to ensure functionality
- **Monitoring**: AI usage logs will track all operations for billing and monitoring

