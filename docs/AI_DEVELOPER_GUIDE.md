# B2B Plus AI Features - Developer Guide

## Architecture Overview

### Tech Stack

- **AI Provider**: Google Gemini 2.5 (Flash and Pro models)
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Caching**: In-memory cache with TTL
- **Testing**: Jest, Playwright

### Directory Structure

```
apps/web/
├── app/
│   ├── api/
│   │   ├── chatbot/          # Chatbot endpoints
│   │   └── admin/            # Admin AI endpoints
│   └── admin/
│       ├── opportunities/    # Opportunity management UI
│       ├── pricing/          # Pricing optimization UI
│       └── monitoring/       # Metrics dashboard
├── lib/
│   ├── ai/
│   │   ├── chatbot-actions.ts      # Chatbot action handlers
│   │   ├── customer-context.ts     # Customer data retrieval
│   │   ├── parallel-execution.ts   # Parallel AI calls
│   │   └── optimized-prompts.ts    # Token-optimized prompts
│   ├── cache/
│   │   └── ai-cache.ts            # Response caching
│   ├── gemini.ts                  # Gemini AI client
│   ├── metrics/
│   │   └── ai-metrics.ts          # Metrics tracking
│   └── middleware/
│       └── ai-security.ts         # Rate limiting & auth
└── e2e/                           # Playwright E2E tests
```

## Core Components

### 1. Gemini AI Client (`lib/gemini.ts`)

```typescript
import { generateTextPro, generateTextFlash, generateJSON } from '@/lib/gemini';

// Use Flash for simple tasks (faster, cheaper)
const response = await generateTextFlash('Summarize this order');

// Use Pro for complex tasks (more capable)
const analysis = await generateTextPro('Analyze customer churn risk');

// Generate structured JSON
const data = await generateJSON<{ score: number }>('Score this opportunity');
```

**Model Selection:**
- **Flash 2.5**: Chatbot, simple queries, summaries
- **Pro 2.5**: Opportunity detection, pricing optimization, complex analysis

### 2. Caching Layer (`lib/cache/ai-cache.ts`)

```typescript
import { aiCache, getCachedOrGenerate, CACHE_PREFIXES } from '@/lib/cache/ai-cache';

// Get or generate with caching
const result = await getCachedOrGenerate(
  CACHE_PREFIXES.CHATBOT_RESPONSE,
  { query: 'user question' },
  async () => {
    return await generateTextFlash('AI prompt');
  },
  60 // TTL in minutes
);

// Invalidate cache when data changes
import { invalidateCacheForUser } from '@/lib/cache/ai-cache';
invalidateCacheForUser(userId);
```

**Cache Strategy:**
- Default TTL: 60 minutes
- Automatic cleanup: Every 5 minutes
- Invalidation: On data mutations

### 3. Parallel Execution (`lib/ai/parallel-execution.ts`)

```typescript
import { generateTextsInParallel } from '@/lib/ai/parallel-execution';

// Execute multiple AI calls in parallel
const [insight1, insight2, insight3] = await generateTextsInParallel([
  { prompt: 'Analyze purchase patterns', usePro: false },
  { prompt: 'Detect churn risk', usePro: true },
  { prompt: 'Recommend products', usePro: false },
]);
```

**Performance:**
- 3x faster than sequential execution
- Reduces total response time by 60%+

### 4. Metrics Tracking (`lib/metrics/ai-metrics.ts`)

```typescript
import { trackAIOperation } from '@/lib/metrics/ai-metrics';

// Automatically track AI operations
const result = await trackAIOperation(
  {
    organizationId: 'org-123',
    userId: 'user-456',
    metricType: 'chatbot',
    operationName: 'generate_response',
    modelName: 'gemini-2.5-flash',
  },
  async () => {
    return await generateTextFlash(prompt);
  }
);
```

**Tracked Metrics:**
- Response time
- Token usage
- Cache hits
- Success/failure
- Error messages

## API Endpoints

### Chatbot API

**POST `/api/chatbot/message`**

```typescript
// Request
{
  "message": "What's my order status?",
  "conversationId": "optional-uuid"
}

// Response
{
  "response": "Your recent order #12345 is shipped...",
  "conversationId": "uuid",
  "action": {
    "type": "check_order_status",
    "result": { /* order data */ }
  }
}
```

**Authentication**: Required (customer or admin)
**Rate Limit**: 10 requests/minute

### Opportunity Detection API

**POST `/api/admin/opportunities/detect`**

```typescript
// Request
{
  "customerId": "optional-customer-id",
  "opportunityType": "stopped_buying" | "cross_sell" | "upsell"
}

// Response
{
  "opportunities": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "opportunityType": "stopped_buying",
      "opportunityScore": 85,
      "aiInsights": "Customer stopped buying...",
      "estimatedValue": 5000
    }
  ]
}
```

**Authentication**: Required (admin only)
**Rate Limit**: 5 requests/minute

### Pricing Optimization API

**POST `/api/admin/pricing/optimize`**

```typescript
// Request
{
  "customerId": "uuid",
  "productId": "uuid"
}

// Response
{
  "currentPrice": 100,
  "suggestedPrice": 95,
  "winProbability": 0.85,
  "expectedRevenue": 950,
  "reasoning": "Based on historical data..."
}
```

**Authentication**: Required (admin only)
**Rate Limit**: 5 requests/minute

### Invoice Processing API

**POST `/api/admin/invoices/upload`**

```typescript
// Request (multipart/form-data)
{
  "file": File // PDF only
}

// Response
{
  "invoiceNumber": "INV-12345",
  "vendorName": "Acme Corp",
  "invoiceDate": "2025-01-15",
  "totalAmount": 1500.00,
  "lineItems": [
    {
      "productName": "Widget A",
      "quantity": 10,
      "unitPrice": 150
    }
  ],
  "extractionStatus": "success"
}
```

**Authentication**: Required (admin only)
**Rate Limit**: 3 requests/minute
**File Limits**: 10MB max, PDF only

## Database Schema

### AI Metrics Tables

```sql
-- AI Usage Metrics
CREATE TABLE ai_usage_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  metric_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Metrics
CREATE TABLE ai_business_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  customer_id UUID,
  product_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics
CREATE TABLE ai_performance_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  aggregation_period TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

### Row Level Security (RLS)

All AI data is protected by RLS policies:

```sql
-- Users can only access their organization's data
CREATE POLICY "org_isolation" ON ai_usage_metrics
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

### Rate Limiting

Implemented in `lib/middleware/ai-security.ts`:

```typescript
import { checkRateLimit } from '@/lib/middleware/ai-security';

// In API route
const { allowed, remaining } = await checkRateLimit(userId, 'chatbot', 10);

if (!allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### Authentication

All AI endpoints require authentication:

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### Admin Authorization

Admin endpoints verify role:

```typescript
const { data: membership } = await supabase
  .from('organization_members')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (membership?.role !== 'admin') {
  return NextResponse.json(
    { error: 'Admin access required' },
    { status: 403 }
  );
}
```

## Testing

### Unit Tests (Jest)

```typescript
// lib/gemini.test.ts
describe('Gemini AI', () => {
  it('generates text with Flash model', async () => {
    const result = await generateTextFlash('test prompt');
    expect(result).toBeDefined();
  });
});
```

**Run Tests:**
```bash
cd apps/web
pnpm jest
```

### Integration Tests

```typescript
// lib/ai/chatbot-integration.test.ts
describe('Chatbot Integration', () => {
  it('handles complete conversation flow', async () => {
    // Test with mocked Supabase and Gemini
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/customer-chatbot.spec.ts
test('customer can chat and get response', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('input', 'What is my order status?');
  await page.click('button[type="submit"]');
  await expect(page.locator('.message')).toBeVisible();
});
```

**Run E2E Tests:**
```bash
cd apps/web
pnpm exec playwright test
```

## Performance Optimization

### 1. Caching Strategy

- Cache common queries for 60 minutes
- Invalidate on data changes
- Monitor cache hit rate (target: >50%)

### 2. Parallel Execution

- Run independent AI calls in parallel
- Use `Promise.all()` for concurrent operations
- Reduces total time by 60%+

### 3. Token Optimization

- Summarize data before sending to AI
- Limit order history to last 5 orders
- Use concise prompts
- Reduces token usage by 70%+

### 4. Database Optimization

- Indexes on common query patterns
- Limit result sets
- Use RLS for security and performance

## Monitoring

### Key Metrics

```typescript
import { getAIUsageStats } from '@/lib/metrics/ai-metrics';

const stats = await getAIUsageStats(organizationId);
// Returns: requests, tokens, avg response time, cache hit rate, error rate
```

### Performance Targets

- Response time: < 2 seconds
- Cache hit rate: > 50%
- Error rate: < 5%
- Token efficiency: 70%+ reduction vs. baseline

## Deployment

### Environment Variables

```env
# Required
GOOGLE_GEMINI_API_KEY=your-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional
AI_CACHE_TTL_MINUTES=60
AI_RATE_LIMIT_CHATBOT=10
AI_RATE_LIMIT_ADMIN=5
```

### Database Migrations

```bash
# Apply migrations
cd packages/supabase
pnpm supabase db push

# Or manually
psql -f migrations/20250111_ai_metrics.sql
psql -f migrations/20250111_performance_indexes.sql
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Rate limits configured
- [ ] Monitoring dashboard accessible
- [ ] Error tracking enabled
- [ ] Backup strategy in place

## Troubleshooting

### Common Issues

**Issue: "Gemini API Error"**
- Check API key is valid
- Verify API quota not exceeded
- Check network connectivity

**Issue: "Rate Limit Exceeded"**
- Increase rate limits in config
- Implement request queuing
- Use caching more aggressively

**Issue: "Slow Response Times"**
- Check cache hit rate
- Review database query performance
- Optimize prompts to reduce tokens
- Use parallel execution

## Contributing

### Adding New AI Features

1. Create feature in `lib/ai/`
2. Add API endpoint in `app/api/`
3. Implement caching
4. Add metrics tracking
5. Write tests (unit + integration + E2E)
6. Update documentation

### Code Style

- Use TypeScript strict mode
- Follow Next.js conventions
- Add JSDoc comments
- Include error handling
- Log important operations

---

*Last Updated: January 2025*
*Version: 1.0*

