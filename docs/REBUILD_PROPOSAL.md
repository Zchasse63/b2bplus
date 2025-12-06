# B2B Plus Platform - Rebuild Proposal

## Executive Summary

This document outlines a complete platform rebuild with proper architecture, focusing on:
1. **Vercel AI SDK** for unified AI layer
2. **Grok 4.1 Fast** as primary LLM (cost-effective with 2M context)
3. **Proper separation of concerns** from day one
4. **Type-safe, streaming-first architecture**

---

## Current State: What Went Wrong

### Problem 1: Direct SDK Usage (No Abstraction)
```typescript
// CURRENT: Tightly coupled to Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

**Issues:**
- Can't swap providers without rewriting 25+ files
- No unified error handling
- Different initialization patterns per file

### Problem 2: Manual JSON Parsing
```typescript
// CURRENT: Manual cleanup of markdown artifacts
let cleanedResponse = response.trim();
if (cleanedResponse.startsWith('```json')) {
  cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
}
return JSON.parse(cleanedResponse); // Brittle, fails often
```

**Issues:**
- JSON parsing errors are common
- No schema validation
- No type safety at runtime

### Problem 3: Scattered AI Logic (25+ Files)
```
lib/ai/
├── chatbot-actions.ts
├── chatbot-prompts.ts
├── customer-context.ts
├── document-processing.ts
├── email-classification.ts
├── invoice-auto-approval.ts
├── invoice-po-matching.ts
├── lead-qualification.ts
├── order-auto-approval.ts
├── pricing-analysis.ts
├── reorder-predictions.ts
└── ... 14 more files
```

**Issues:**
- Duplicated prompt patterns
- Inconsistent error handling
- Hard to maintain/update
- No shared context management

### Problem 4: No Streaming Support
```typescript
// CURRENT: Blocking calls, no real-time feedback
const result = await model.generateContent(prompt);
const response = await result.response;
return response.text(); // User waits for entire response
```

**Issues:**
- Poor UX for long generations
- Can't show partial responses in chatbot
- Higher perceived latency

### Problem 5: Features Added Without Planning
- AI features scattered across 98 API endpoints
- No clear data flow architecture
- Auth/routing issues stem from ad-hoc additions

---

## Proposed Solution: Clean Architecture with Vercel AI SDK

### Why Vercel AI SDK?

| Feature | Current (Raw Gemini) | Vercel AI SDK |
|---------|---------------------|---------------|
| Provider abstraction | ❌ None | ✅ Swap with 1 line |
| Streaming | ❌ Manual | ✅ Built-in `streamText` |
| Structured outputs | ❌ Manual JSON | ✅ `generateObject` + Zod |
| React hooks | ❌ Custom | ✅ `useChat`, `useCompletion` |
| Error handling | ❌ Per-file | ✅ Unified |
| Tool calling | ❌ Manual | ✅ Native support |
| Edge runtime | ❌ Limited | ✅ Full support |

### Why Grok 4.1 Fast?

| Model | Context | Input Cost | Output Cost | Speed |
|-------|---------|------------|-------------|-------|
| Grok 4.1 Fast Reasoning | 2M tokens | $0.30/1M | $0.50/1M | Fast |
| Grok 4.1 Fast Non-Reasoning | 2M tokens | $0.15/1M | $0.50/1M | Faster |
| Gemini 2.5 Flash | 1M tokens | $0.075/1M | $0.30/1M | Fast |
| Gemini 2.5 Pro | 2M tokens | $1.25/1M | $5.00/1M | Slower |
| Claude Sonnet 4 | 200K | $3.00/1M | $15.00/1M | Fast |

**Grok 4.1 Fast Advantages:**
- 2M context window (can process entire customer history)
- Very competitive pricing
- Built-in tools: `web_search`, `x_search`, `code_execution`
- Native Vercel integration (no extra API key management)
- Reasoning mode available when needed

---

## New Architecture

### Directory Structure

```
b2bplus-v2/
├── apps/
│   ├── web/                          # Next.js 15 App Router
│   │   ├── app/
│   │   │   ├── (public)/             # Public routes
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   ├── products/         # Product catalog
│   │   │   │   └── auth/             # Auth pages
│   │   │   ├── (customer)/           # Customer portal (protected)
│   │   │   │   ├── layout.tsx        # Auth guard HERE
│   │   │   │   ├── dashboard/
│   │   │   │   ├── orders/
│   │   │   │   ├── cart/
│   │   │   │   └── chat/
│   │   │   ├── (admin)/              # Admin dashboard (protected)
│   │   │   │   ├── layout.tsx        # Admin auth guard HERE
│   │   │   │   ├── dashboard/
│   │   │   │   ├── analytics/
│   │   │   │   ├── customers/
│   │   │   │   ├── campaigns/
│   │   │   │   └── settings/
│   │   │   └── api/
│   │   │       ├── ai/               # ALL AI endpoints consolidated
│   │   │       │   ├── chat/route.ts
│   │   │       │   ├── analyze/route.ts
│   │   │       │   ├── generate/route.ts
│   │   │       │   └── embed/route.ts
│   │   │       ├── auth/
│   │   │       ├── orders/
│   │   │       ├── pricing/
│   │   │       └── webhooks/
│   │   ├── lib/
│   │   │   ├── ai/                   # AI Layer (SINGLE SOURCE OF TRUTH)
│   │   │   │   ├── provider.ts       # xAI/Grok configuration
│   │   │   │   ├── schemas.ts        # All Zod schemas for AI outputs
│   │   │   │   ├── prompts/          # Organized prompt templates
│   │   │   │   │   ├── chatbot.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   ├── pricing.ts
│   │   │   │   │   └── documents.ts
│   │   │   │   └── actions/          # AI-powered server actions
│   │   │   │       ├── analyze-customer.ts
│   │   │   │       ├── generate-recommendations.ts
│   │   │   │       ├── process-invoice.ts
│   │   │   │       └── qualify-lead.ts
│   │   │   ├── auth/                 # Auth utilities
│   │   │   ├── db/                   # Database utilities
│   │   │   └── services/             # Business logic services
│   │   └── components/
│   │       ├── ai/                   # AI-specific components
│   │       │   ├── chat-interface.tsx
│   │       │   ├── ai-insights.tsx
│   │       │   └── streaming-text.tsx
│   │       ├── ui/                   # Shadcn/UI components
│   │       └── features/             # Feature-specific components
│   └── mobile/                       # Expo app
├── packages/
│   ├── ai/                           # Shared AI package
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── provider.ts           # xAI configuration
│   │   │   ├── schemas/              # Shared Zod schemas
│   │   │   └── types.ts
│   │   └── package.json
│   ├── db/                           # Database package
│   │   ├── src/
│   │   │   ├── client.ts             # Supabase client
│   │   │   ├── queries/              # Type-safe query functions
│   │   │   └── types.ts              # Generated DB types
│   │   └── package.json
│   └── shared/                       # Shared utilities
├── supabase/
│   └── migrations/
└── package.json
```

---

## AI Layer Implementation

### 1. Provider Configuration

```typescript
// packages/ai/src/provider.ts
import { createXai } from '@ai-sdk/xai';

// Initialize xAI provider
export const xai = createXai({
  // API key auto-configured via Vercel Marketplace
  // Or manually: apiKey: process.env.XAI_API_KEY
});

// Model configurations
export const models = {
  // Fast reasoning for complex tasks
  reasoning: xai('grok-4.1-fast-reasoning'),

  // Non-reasoning for simple tasks (cheaper)
  fast: xai('grok-4.1-fast-non-reasoning'),

  // Embeddings (use Voyage AI or OpenAI - xAI doesn't have embeddings yet)
  // Or use Supabase's built-in pgvector with OpenAI embeddings
};

// Default model for most operations
export const defaultModel = models.fast;
```

### 2. Structured Outputs with Zod Schemas

```typescript
// packages/ai/src/schemas/customer-insights.ts
import { z } from 'zod';

export const customerInsightsSchema = z.object({
  summary: z.string().describe('Executive summary of customer insights'),
  churnRisk: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  opportunities: z.array(z.object({
    type: z.enum(['upsell', 'cross-sell', 'retention', 'expansion']),
    product: z.string(),
    probability: z.number().min(0).max(100),
    estimatedValue: z.number(),
    reasoning: z.string(),
  })),
  purchasePatterns: z.object({
    frequency: z.string(),
    averageOrderValue: z.number(),
    preferredCategories: z.array(z.string()),
    seasonality: z.string().optional(),
  }),
  nextBestActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    expectedOutcome: z.string(),
  })),
});

export type CustomerInsights = z.infer<typeof customerInsightsSchema>;
```

### 3. Server Actions with AI

```typescript
// apps/web/lib/ai/actions/analyze-customer.ts
'use server';

import { generateObject } from 'ai';
import { models } from '@b2bplus/ai';
import { customerInsightsSchema } from '@b2bplus/ai/schemas';
import { getCustomerData } from '@/lib/db/queries';

export async function analyzeCustomer(customerId: string) {
  // Get all customer data in one query (batch loader pattern)
  const customer = await getCustomerData(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Generate structured insights using Grok
  const { object: insights } = await generateObject({
    model: models.reasoning, // Use reasoning for complex analysis
    schema: customerInsightsSchema,
    prompt: `Analyze this B2B customer and provide actionable insights.

Customer: ${customer.name}
Industry: ${customer.industry}
Account Age: ${customer.accountAge} months
Total Lifetime Value: $${customer.ltv}

Recent Orders (last 12 months):
${JSON.stringify(customer.recentOrders, null, 2)}

Purchase History by Category:
${JSON.stringify(customer.categoryBreakdown, null, 2)}

Support Tickets:
${JSON.stringify(customer.supportHistory, null, 2)}

Provide comprehensive analysis including churn risk assessment,
cross-sell/upsell opportunities, and recommended next actions.`,
  });

  return insights;
}
```

### 4. Streaming Chat API

```typescript
// apps/web/app/api/ai/chat/route.ts
import { streamText, convertToCoreMessages } from 'ai';
import { models } from '@b2bplus/ai';
import { getCustomerContext } from '@/lib/ai/context';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  // Get customer context for personalization
  const context = await getCustomerContext(user.id);

  const result = streamText({
    model: models.fast,
    system: `You are a helpful B2B commerce assistant for ${context.companyName}.

Customer Context:
- Industry: ${context.industry}
- Pricing Tier: ${context.pricingTier}
- Recent Products: ${context.recentProducts.join(', ')}
- Open Orders: ${context.openOrderCount}

Help the customer with:
- Finding products
- Checking order status
- Understanding pricing
- Recommending products based on their history
- Answering questions about shipping and delivery

Be concise and professional. Use their order history to provide personalized recommendations.`,
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
```

### 5. React Hooks for Frontend

```typescript
// apps/web/components/ai/chat-interface.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect } from 'react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    // Automatically handles streaming
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything..."
            className="flex-1 rounded-lg border px-4 py-2"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 6. Tool Calling for Complex Operations

```typescript
// apps/web/app/api/ai/analyze/route.ts
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { models } from '@b2bplus/ai';
import {
  lookupProduct,
  getCustomerOrders,
  calculatePricing
} from '@/lib/db/queries';

export async function POST(req: Request) {
  const { query, customerId } = await req.json();

  const result = await generateText({
    model: models.reasoning,
    prompt: query,
    tools: {
      lookupProduct: tool({
        description: 'Look up a product by name, SKU, or category',
        parameters: z.object({
          query: z.string().describe('Product name, SKU, or category'),
          limit: z.number().optional().default(5),
        }),
        execute: async ({ query, limit }) => {
          const products = await lookupProduct(query, limit);
          return products;
        },
      }),

      getOrderHistory: tool({
        description: 'Get customer order history',
        parameters: z.object({
          days: z.number().optional().default(90),
        }),
        execute: async ({ days }) => {
          const orders = await getCustomerOrders(customerId, days);
          return orders;
        },
      }),

      calculatePrice: tool({
        description: 'Calculate pricing for a product including discounts',
        parameters: z.object({
          productId: z.string(),
          quantity: z.number(),
        }),
        execute: async ({ productId, quantity }) => {
          const pricing = await calculatePricing(productId, customerId, quantity);
          return pricing;
        },
      }),
    },
    maxSteps: 5, // Allow multi-step reasoning with tool calls
  });

  return Response.json({ result: result.text });
}
```

---

## Route Architecture with Proper Auth Guards

### The Key Fix: Auth Guards in Layout Files

```typescript
// apps/web/app/(customer)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get customer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization) {
    redirect('/onboarding');
  }

  return (
    <CustomerContextProvider profile={profile}>
      <CustomerSidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </CustomerContextProvider>
  );
}
```

```typescript
// apps/web/app/(admin)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/helpers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check admin role
  const adminCheck = await isAdmin(supabase, user.id);

  if (!adminCheck.isAdmin) {
    redirect('/unauthorized');
  }

  return (
    <AdminContextProvider user={user} role={adminCheck.role}>
      <AdminSidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </AdminContextProvider>
  );
}
```

---

## Database Query Patterns (Avoiding N+1)

### Current Problem
```typescript
// BAD: N+1 queries
for (const rec of recommendations) {
  await supabase.from('customer_product_affinities').upsert({...});
}
```

### Solution: Batch Operations
```typescript
// packages/db/src/queries/recommendations.ts
import { createClient } from '../client';

export async function upsertProductAffinities(
  customerId: string,
  affinities: ProductAffinity[]
) {
  const supabase = await createClient();

  // Single batch upsert
  const { error } = await supabase
    .from('customer_product_affinities')
    .upsert(
      affinities.map(a => ({
        customer_id: customerId,
        product_id: a.productId,
        affinity_score: a.score,
        last_interaction_at: new Date().toISOString(),
      })),
      { onConflict: 'customer_id,product_id' }
    );

  if (error) throw error;
}
```

### Data Loader Pattern
```typescript
// packages/db/src/loaders/product-loader.ts
import DataLoader from 'dataloader';
import { createClient } from '../client';

export function createProductLoader() {
  return new DataLoader<string, Product>(async (productIds) => {
    const supabase = await createClient();

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    // Return in same order as requested
    const productMap = new Map(products?.map(p => [p.id, p]));
    return productIds.map(id => productMap.get(id) ?? null);
  });
}
```

---

## Environment & Configuration

### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# xAI (auto-configured via Vercel Marketplace)
# XAI_API_KEY= (optional if using Vercel integration)

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# Optional
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
```

### Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "integrations": ["xai"]  // Auto-configures XAI_API_KEY
}
```

---

## Migration Strategy

### Phase 1: New Project Setup (Week 1)
1. Create new Next.js 15 project with proper structure
2. Set up Turbo monorepo with packages
3. Configure Vercel with xAI integration
4. Implement base AI layer with Vercel AI SDK
5. Set up Supabase with existing schema

### Phase 2: Core Features (Weeks 2-3)
1. Implement auth with proper route guards
2. Build product catalog with AI search
3. Create cart and checkout flow
4. Build customer dashboard

### Phase 3: AI Features (Weeks 4-5)
1. Migrate chatbot to streaming
2. Implement AI analytics with structured outputs
3. Build AI-powered recommendations
4. Add AI-powered search

### Phase 4: Admin Portal (Weeks 6-7)
1. Admin dashboard with analytics
2. Campaign management
3. Customer insights
4. Pricing management

### Phase 5: Polish & Launch (Week 8)
1. Mobile app updates
2. Performance optimization
3. Testing and QA
4. Documentation

---

## Cost Comparison

### Current (Gemini)
| Usage | Monthly Cost |
|-------|-------------|
| Chatbot (10K conversations) | ~$15 |
| Analytics (5K analyses) | ~$50 (Pro model) |
| Embeddings (1M tokens) | ~$10 |
| **Total** | **~$75/month** |

### Proposed (Grok 4.1 Fast)
| Usage | Monthly Cost |
|-------|-------------|
| Chatbot (10K conversations) | ~$5 |
| Analytics (5K analyses) | ~$15 |
| Embeddings (1M tokens) | ~$10 (OpenAI) |
| **Total** | **~$30/month** |

**Savings: ~60%** (plus better performance with 2M context)

---

## Summary

### Key Changes
1. **Vercel AI SDK** replaces raw Gemini SDK
2. **Grok 4.1 Fast** replaces Gemini for cost and performance
3. **Route groups with layouts** for auth guards
4. **Structured outputs with Zod** replace manual JSON parsing
5. **Streaming-first architecture** for better UX
6. **Consolidated AI layer** (4 endpoints vs 98 scattered)
7. **Batch operations** replace N+1 loops
8. **Type-safe queries** with DataLoader pattern

### Expected Benefits
- 60% cost reduction on AI operations
- 50% faster development velocity
- Zero auth/routing bugs (guards in layouts)
- Better UX with streaming responses
- Easy to swap AI providers if needed
- Maintainable, documented architecture

---

## Sources

- [xAI for Vercel Marketplace](https://vercel.com/marketplace/xai)
- [Grok 4.1 Fast on Vercel AI Gateway](https://vercel.com/changelog/grok-4-1-fast-models-now-available-on-vercel-ai-gateway)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [xAI Community Integrations](https://docs.x.ai/docs/resources/community-integrations)
- [xAI and Vercel Partnership](https://vercel.com/blog/xai-and-vercel-partner-to-bring-zero-friction-ai-to-developers)
