# Incremental Migration Plan: Vercel AI SDK + Grok

## Overview

This plan migrates the existing B2B Plus platform to Vercel AI SDK with Grok **without a full rewrite**. Each step is independent and can be deployed separately.

---

## Phase 1: Add Vercel AI SDK Alongside Existing Code (Day 1-2)

### Step 1.1: Install Dependencies

```bash
cd apps/web
pnpm add ai @ai-sdk/xai zod
```

### Step 1.2: Create New AI Provider (Coexists with Gemini)

```typescript
// apps/web/lib/ai/providers/xai.ts
import { createXai } from '@ai-sdk/xai';

// xAI provider - will use XAI_API_KEY from environment
export const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

// Model configurations
export const grokModels = {
  // For complex reasoning tasks
  reasoning: xai('grok-4.1-fast-reasoning'),

  // For simple/fast tasks (cheaper)
  fast: xai('grok-4.1-fast-non-reasoning'),
};

// Default model
export const defaultModel = grokModels.fast;
```

### Step 1.3: Add Environment Variable

```env
# .env.local
XAI_API_KEY=your-xai-api-key-here
```

**Result:** New AI provider available, existing Gemini code still works.

---

## Phase 2: Create Wrapper Functions (Day 2-3)

Create drop-in replacements for existing Gemini functions that use Vercel AI SDK internally.

### Step 2.1: Create Compatibility Layer

```typescript
// apps/web/lib/ai/providers/unified.ts
import { generateText as aiGenerateText, generateObject } from 'ai';
import { z } from 'zod';
import { defaultModel, grokModels } from './xai';

// Feature flag to control rollout
const USE_GROK = process.env.USE_GROK === 'true';

/**
 * Drop-in replacement for existing generateText
 * Falls back to Gemini if USE_GROK is false
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  if (!USE_GROK) {
    // Use existing Gemini implementation
    const { generateText: geminiGenerateText } = await import('../gemini');
    return geminiGenerateText(prompt, options);
  }

  const result = await aiGenerateText({
    model: defaultModel,
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 8192,
  });

  return result.text;
}

/**
 * Drop-in replacement for existing generateJSON
 * Uses Zod schema for type-safe structured output
 */
export async function generateJSON<T>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    schema?: z.ZodType<T>;
  }
): Promise<T> {
  if (!USE_GROK) {
    // Use existing Gemini implementation
    const { generateJSON: geminiGenerateJSON } = await import('../gemini');
    return geminiGenerateJSON<T>(prompt, options);
  }

  // If schema provided, use generateObject for type safety
  if (options?.schema) {
    const result = await generateObject({
      model: defaultModel,
      schema: options.schema,
      prompt: options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt,
      temperature: options?.temperature ?? 0.3,
    });
    return result.object;
  }

  // Fallback to text generation with JSON instruction
  const result = await aiGenerateText({
    model: defaultModel,
    prompt: `${options?.systemPrompt || ''}\n\nRespond with valid JSON only.\n\n${prompt}`,
    temperature: options?.temperature ?? 0.3,
  });

  return JSON.parse(result.text);
}

/**
 * Drop-in replacement for generateTextPro (complex reasoning)
 */
export async function generateTextPro(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  if (!USE_GROK) {
    const { generateTextPro: geminiGenerateTextPro } = await import('../gemini');
    return geminiGenerateTextPro(prompt, options);
  }

  const result = await aiGenerateText({
    model: grokModels.reasoning, // Use reasoning model
    prompt: options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt,
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 8192,
  });

  return result.text;
}

/**
 * Drop-in replacement for generateJSONPro
 */
export async function generateJSONPro<T>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    schema?: z.ZodType<T>;
  }
): Promise<T> {
  if (!USE_GROK) {
    const { generateJSONPro: geminiGenerateJSONPro } = await import('../gemini');
    return geminiGenerateJSONPro<T>(prompt, options);
  }

  if (options?.schema) {
    const result = await generateObject({
      model: grokModels.reasoning,
      schema: options.schema,
      prompt: options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt,
      temperature: options?.temperature ?? 0.2,
    });
    return result.object;
  }

  const result = await aiGenerateText({
    model: grokModels.reasoning,
    prompt: `${options?.systemPrompt || ''}\n\nRespond with valid JSON only.\n\n${prompt}`,
    temperature: options?.temperature ?? 0.2,
  });

  return JSON.parse(result.text);
}
```

**Result:** Feature-flagged migration - flip `USE_GROK=true` to switch providers.

---

## Phase 3: Migrate Endpoints One-by-One (Day 3-7)

### Priority Order (by usage/importance):

1. **Chatbot** - Highest user impact, benefits most from streaming
2. **Analytics** - Admin-facing, complex reasoning
3. **Recommendations** - Customer-facing
4. **Pricing** - Business critical
5. **Everything else**

### Step 3.1: Migrate Chatbot to Streaming

```typescript
// apps/web/app/api/chatbot/message/route.ts
import { streamText, convertToCoreMessages } from 'ai';
import { grokModels } from '@/lib/ai/providers/xai';
import { createClient } from '@/lib/supabase/server';
import { getCustomerContext } from '@/lib/ai/customer-context';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, conversationId } = await req.json();

  // Get customer context (reuse existing function)
  const context = await getCustomerContext(user.id);

  // Use streaming with Vercel AI SDK
  const result = streamText({
    model: grokModels.fast,
    system: `You are a helpful B2B commerce assistant.

Customer: ${context.customerName}
Company: ${context.companyName}
Pricing Tier: ${context.pricingTier}
Recent Orders: ${context.recentOrders?.length || 0}

Help with product search, order status, pricing questions, and recommendations.
Be concise and professional.`,
    messages: convertToCoreMessages(messages),
  });

  // Return streaming response
  return result.toDataStreamResponse();
}
```

### Step 3.2: Update Chatbot Frontend to Use Streaming

```typescript
// apps/web/components/EmbeddedAIAssistantPanel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';

interface Props {
  mode: 'products' | 'cart' | 'dashboard' | 'analytics' | 'admin';
}

export function EmbeddedAIAssistantPanel({ mode }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chatbot/message',
    id: `chat-${mode}`, // Unique conversation per mode
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>How can I help you today?</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-b2b-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 animate-pulse">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-b2b-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-b2b-blue-600 text-white rounded-lg px-4 py-2 hover:bg-b2b-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 3.3: Migrate Analytics with Zod Schemas

```typescript
// apps/web/lib/ai/schemas/analytics.ts
import { z } from 'zod';

export const customerInsightsSchema = z.object({
  summary: z.string(),
  churnRisk: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  opportunities: z.array(z.object({
    type: z.enum(['upsell', 'cross_sell', 'retention']),
    productId: z.string().optional(),
    productName: z.string(),
    probability: z.number().min(0).max(100),
    estimatedValue: z.number(),
    reasoning: z.string(),
  })),
  nextBestActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    expectedOutcome: z.string(),
  })),
});

export type CustomerInsights = z.infer<typeof customerInsightsSchema>;
```

```typescript
// apps/web/app/api/admin/analytics/customer-insights/route.ts
import { generateObject } from 'ai';
import { grokModels } from '@/lib/ai/providers/xai';
import { customerInsightsSchema } from '@/lib/ai/schemas/analytics';
import { checkAdminRole } from '@/lib/middleware/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const adminCheck = await checkAdminRole();
  if (!adminCheck.authorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return Response.json({ error: 'customerId required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Get customer data
  const { data: customer } = await supabase
    .from('customer_purchase_analytics')
    .select('*, products(*)')
    .eq('customer_id', customerId);

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Generate insights with structured output - NO MANUAL JSON PARSING!
  const { object: insights } = await generateObject({
    model: grokModels.reasoning,
    schema: customerInsightsSchema,
    prompt: `Analyze this B2B customer and provide actionable insights.

Customer Purchase History:
${JSON.stringify(customer, null, 2)}

Recent Orders:
${JSON.stringify(orders, null, 2)}

Provide:
1. Executive summary
2. Churn risk assessment with specific factors
3. Upsell/cross-sell opportunities with estimated values
4. Prioritized next best actions`,
  });

  // insights is fully typed as CustomerInsights!
  return Response.json(insights);
}
```

---

## Phase 4: Fix Auth Guards (Day 4-5)

### Step 4.1: Add Auth Check to Admin Layout

```typescript
// apps/web/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?redirect=/admin');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Also check organization membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'owner'])
    .limit(1)
    .single();

  if (!isAdmin && !membership) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen">
      {/* Your existing admin layout */}
      {children}
    </div>
  );
}
```

### Step 4.2: Add Auth Check to Customer Layout

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

  // Get profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, current_organization:organizations(*)')
    .eq('id', user.id)
    .single();

  if (!profile?.current_organization) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-screen">
      {/* Your existing customer layout */}
      {children}
    </div>
  );
}
```

---

## Phase 5: Fix Critical Bugs (Day 5-6)

### Step 5.1: Fix Toast Auto-Dismiss

```typescript
// apps/web/hooks/use-toast.ts
// Change this line:
const TOAST_REMOVE_DELAY = 1000000; // BUG: 11+ days!

// To:
const TOAST_REMOVE_DELAY = 5000; // 5 seconds
```

### Step 5.2: Remove Hardcoded Emails

```typescript
// apps/web/lib/sendgrid.ts
export const EMAIL_CONFIG = {
  // Remove hardcoded defaults - require env vars
  fromEmail: process.env.SENDGRID_FROM_EMAIL!,
  fromName: process.env.SENDGRID_FROM_NAME!,
  replyTo: process.env.SENDGRID_REPLY_TO_EMAIL,
};

// Add validation
if (!EMAIL_CONFIG.fromEmail || !EMAIL_CONFIG.fromName) {
  throw new Error('SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME are required');
}
```

### Step 5.3: Add XSS Protection to Campaigns

```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

```typescript
// apps/web/app/admin/campaigns/[id]/page.tsx
import DOMPurify from 'dompurify';

// Replace:
// dangerouslySetInnerHTML={{ __html: campaign.html_content }}

// With:
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(campaign.html_content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}}
```

---

## Phase 6: Create Missing Endpoints (Day 6-7)

### Step 6.1: Document Upload Endpoint

```typescript
// apps/web/app/api/admin/documents/upload/route.ts
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function POST(req: Request) {
  const adminCheck = await checkAdminRole();
  if (!adminCheck.authorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const entityType = formData.get('entityType') as string;
  const entityId = formData.get('entityId') as string;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const supabase = await createClient();

  // Upload to Supabase Storage
  const fileName = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  // Create document record
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      name: file.name,
      file_path: uploadData.path,
      file_size: file.size,
      mime_type: file.type,
      [`${entityType}_id`]: entityId,
    })
    .select()
    .single();

  if (docError) {
    return Response.json({ error: docError.message }, { status: 500 });
  }

  return Response.json({ document });
}
```

### Step 6.2: Bulk Order Upload Endpoint

```typescript
// apps/web/app/api/orders/bulk-upload/route.ts
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkOrderItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().positive(),
});

const bulkOrderSchema = z.object({
  items: z.array(bulkOrderItemSchema),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const parsed = bulkOrderSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { items } = parsed.data;

  // Look up products by SKU
  const skus = items.map(i => i.sku);
  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, base_price')
    .in('sku', skus);

  const productMap = new Map(products?.map(p => [p.sku, p]));

  // Validate all SKUs exist
  const notFound = items.filter(i => !productMap.has(i.sku));
  if (notFound.length > 0) {
    return Response.json({
      error: 'Some SKUs not found',
      notFound: notFound.map(i => i.sku),
    }, { status: 400 });
  }

  // Build cart items
  const cartItems = items.map(item => {
    const product = productMap.get(item.sku)!;
    return {
      user_id: user.id,
      product_id: product.id,
      quantity: item.quantity,
    };
  });

  // Upsert to cart (batch operation)
  const { error } = await supabase
    .from('cart_items')
    .upsert(cartItems, { onConflict: 'user_id,product_id' });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    itemsAdded: cartItems.length,
  });
}
```

---

## Migration Checklist

### Week 1: Foundation
- [ ] Install Vercel AI SDK and @ai-sdk/xai
- [ ] Create unified provider with feature flag
- [ ] Add XAI_API_KEY to environment
- [ ] Test with USE_GROK=false (Gemini)
- [ ] Test with USE_GROK=true (Grok)

### Week 2: Critical Fixes
- [ ] Fix toast auto-dismiss bug
- [ ] Remove hardcoded emails from sendgrid.ts
- [ ] Add XSS protection to campaigns page
- [ ] Add auth guard to admin layout
- [ ] Add auth guard to customer layout

### Week 3: AI Migration
- [ ] Migrate chatbot to streaming
- [ ] Update chatbot frontend with useChat
- [ ] Create Zod schemas for analytics
- [ ] Migrate customer-insights endpoint
- [ ] Migrate churn-risk endpoint
- [ ] Migrate recommendations endpoints

### Week 4: Missing Features
- [ ] Create /api/admin/documents/upload
- [ ] Create /api/admin/invoices/upload
- [ ] Create /api/orders/bulk-upload
- [ ] Create /api/orders/bulk-submit
- [ ] Add rate limiting to auth verify endpoints

### Week 5: Cleanup
- [ ] Remove old Gemini code (after full migration)
- [ ] Remove USE_GROK feature flag
- [ ] Update documentation
- [ ] Performance testing
- [ ] Cost monitoring setup

---

## Rollback Plan

If issues arise, the feature flag allows instant rollback:

```env
# Rollback to Gemini
USE_GROK=false
```

No code changes needed - just environment variable.

---

## Cost Tracking

Set up usage tracking to compare:

```typescript
// apps/web/lib/ai/usage-tracker.ts
export async function trackAIUsage(
  provider: 'gemini' | 'grok',
  model: string,
  tokensUsed: number,
  operation: string
) {
  const supabase = await createClient();

  await supabase.from('ai_usage_metrics').insert({
    provider,
    model,
    tokens_used: tokensUsed,
    operation,
    // Estimated cost
    estimated_cost: calculateCost(provider, model, tokensUsed),
    created_at: new Date().toISOString(),
  });
}
```

This lets you compare actual costs between providers before fully switching.
