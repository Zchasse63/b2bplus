# Gemini 2.5 Flash Migration Plan
**Date:** November 1, 2025  
**Status:** Ready to Execute  
**Model:** gemini-2.5-flash (latest generation)

---

## 📊 Current State Analysis

### Files Using OpenAI (10 API routes found):

1. **`/api/admin/import/ai-excel/route.ts`** ⚠️ Already references `gemini-2.5-flash` but uses OpenAI SDK
   - **Purpose:** Excel column mapping with AI
   - **Current:** OpenAI SDK with gemini model name (won't work)
   - **Action:** Replace with Google Generative AI SDK

2. **`/api/admin/embeddings/generate/route.ts`**
   - **Purpose:** Generate product embeddings for semantic search
   - **Current:** OpenAI text-embedding-3-small
   - **Action:** Replace with Gemini text-embedding-004

3. **`/api/search/semantic/route.ts`**
   - **Purpose:** Semantic product search
   - **Current:** OpenAI embeddings
   - **Action:** Replace with Gemini text-embedding-004

4. **`/api/admin/sku-mapping/analyze/route.ts`**
   - **Purpose:** SKU matching using embeddings
   - **Current:** OpenAI embeddings
   - **Action:** Replace with Gemini text-embedding-004

5. **`/api/admin/pricing/optimize/route.ts`**
   - **Purpose:** AI-powered pricing optimization
   - **Current:** OpenAI chat completions
   - **Action:** Replace with gemini-2.5-flash

6. **`/api/admin/campaigns/send-personalized/route.ts`**
   - **Purpose:** Personalized email generation
   - **Current:** OpenAI chat completions
   - **Action:** Replace with gemini-2.5-flash

7. **`/api/admin/analytics/customer-insights/route.ts`**
   - **Purpose:** Customer behavior insights
   - **Current:** OpenAI chat completions
   - **Action:** Replace with gemini-2.5-flash

8. **`/api/admin/analytics/forecast/route.ts`**
   - **Purpose:** Sales forecasting
   - **Current:** OpenAI chat completions
   - **Action:** Replace with gemini-2.5-flash

9. **`/api/admin/opportunities/detect/route.ts`**
   - **Purpose:** Business opportunity detection
   - **Current:** OpenAI chat completions
   - **Action:** Replace with gemini-2.5-flash

10. **`/api/admin/leads/import/route.ts`**
    - **Purpose:** Lead data import and enrichment
    - **Current:** OpenAI chat completions
    - **Action:** Replace with gemini-2.5-flash

---

## 🎯 Migration Strategy

### Phase 1: Install Dependencies
```bash
cd /home/ubuntu/b2bplus/apps/web
pnpm add @google/generative-ai
```

### Phase 2: Create Gemini Utility Helper
Create `/apps/web/lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// For text generation (Excel mapping, insights, etc.)
export const getFlashModel = () => {
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });
};

// For embeddings (semantic search)
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ 
    model: "text-embedding-004"
  });
};

// Helper for chat completions (similar to OpenAI interface)
export async function generateText(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 8192,
    }
  });

  const chat = model.startChat({
    history: options?.systemPrompt ? [
      {
        role: "user",
        parts: [{ text: options.systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'll follow those instructions." }],
      }
    ] : [],
  });

  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}

// Helper for embeddings
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await model.embedContent(text);
  return result.embedding.values;
}
```

### Phase 3: Update Each API Route

#### Pattern for Text Generation:
**Before (OpenAI):**
```typescript
import { OpenAI } from 'openai';
const openai = new OpenAI();

const completion = await openai.chat.completions.create({
  model: 'gpt-4-mini',
  messages: [
    { role: 'system', content: 'You are...' },
    { role: 'user', content: prompt }
  ],
  temperature: 0.7
});

const response = completion.choices[0].message.content;
```

**After (Gemini):**
```typescript
import { generateText } from '@/lib/gemini';

const response = await generateText(prompt, {
  temperature: 0.7,
  systemPrompt: 'You are...'
});
```

#### Pattern for Embeddings:
**Before (OpenAI):**
```typescript
import { OpenAI } from 'openai';
const openai = new OpenAI();

const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text
});

const embedding = embeddingResponse.data[0].embedding;
```

**After (Gemini):**
```typescript
import { generateEmbedding } from '@/lib/gemini';

const embedding = await generateEmbedding(text);
```

---

## 📝 Detailed Migration Steps

### 1. Excel Column Mapping (`/api/admin/import/ai-excel/route.ts`)

**Current Issue:** Uses OpenAI SDK with `gemini-2.5-flash` model name (won't work)

**Changes:**
```typescript
// Remove
import { OpenAI } from 'openai';
const openai = new OpenAI();

// Add
import { generateText } from '@/lib/gemini';

// Replace
const completion = await openai.chat.completions.create({
  model: 'gemini-2.5-flash',
  messages: [...],
  temperature: 0.3,
  response_format: { type: 'json_object' }
});
const aiResponse = completion.choices[0].message.content;

// With
const aiResponse = await generateText(prompt, {
  temperature: 0.3,
  systemPrompt: 'You are a data mapping expert. Always respond with valid JSON only, no additional text.'
});
```

### 2. Embeddings Generation (`/api/admin/embeddings/generate/route.ts`)

**Changes:**
```typescript
// Remove
import { OpenAI } from 'openai';
const openai = new OpenAI();

// Add
import { generateEmbedding } from '@/lib/gemini';

// Replace
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: searchableText
});
const embedding = embeddingResponse.data[0].embedding;

// With
const embedding = await generateEmbedding(searchableText);
```

### 3. Semantic Search (`/api/search/semantic/route.ts`)

**Changes:** Same as #2 (embeddings)

### 4. SKU Mapping (`/api/admin/sku-mapping/analyze/route.ts`)

**Changes:** Same as #2 (embeddings) - used twice in this file

### 5-10. All Other Routes

**Pattern:** Replace OpenAI chat completions with `generateText()` helper

---

## ✅ Testing Checklist

After each migration:

### Embeddings (Routes 2, 3, 4):
- [ ] Generate embeddings for test products
- [ ] Verify embedding dimensions (Gemini returns 768-dim vectors)
- [ ] Test semantic search returns relevant results
- [ ] Test SKU matching accuracy
- [ ] Check performance (should be similar or faster)

### Text Generation (Routes 1, 5-10):
- [ ] Test Excel column mapping with sample file
- [ ] Test pricing optimization suggestions
- [ ] Test personalized email generation
- [ ] Test customer insights generation
- [ ] Test sales forecasting
- [ ] Test opportunity detection
- [ ] Test lead import enrichment
- [ ] Verify JSON parsing works correctly
- [ ] Check response quality

### General:
- [ ] No OpenAI imports remain
- [ ] All API routes return expected data structure
- [ ] Error handling works correctly
- [ ] Performance is acceptable
- [ ] Costs are lower (monitor API usage)

---

## 🔧 Implementation Order

**Recommended sequence:**

1. ✅ **Install dependencies** (5 min)
2. ✅ **Create `/lib/gemini.ts` helper** (10 min)
3. ✅ **Migrate embeddings routes first** (30 min)
   - `/api/admin/embeddings/generate`
   - `/api/search/semantic`
   - `/api/admin/sku-mapping/analyze`
   - **Why first:** Simpler, less complex logic
4. ✅ **Migrate text generation routes** (60 min)
   - `/api/admin/import/ai-excel` (already references gemini)
   - `/api/admin/pricing/optimize`
   - `/api/admin/campaigns/send-personalized`
   - `/api/admin/analytics/customer-insights`
   - `/api/admin/analytics/forecast`
   - `/api/admin/opportunities/detect`
   - `/api/admin/leads/import`
5. ✅ **Test each route** (30 min)
6. ✅ **Remove OpenAI package** (5 min)
   ```bash
   pnpm remove openai
   ```
7. ✅ **Update documentation** (10 min)

**Total Estimated Time:** 2.5-3 hours

---

## 💰 Cost Comparison

### Current (OpenAI):
- **text-embedding-3-small:** $0.02 per 1M tokens
- **gpt-4-mini:** $0.15 per 1M input tokens, $0.60 per 1M output tokens

### After (Gemini):
- **text-embedding-004:** $0.00001 per token (~$0.01 per 1M tokens)
- **gemini-2.5-flash:** $0.075 per 1M input tokens, $0.30 per 1M output tokens

### Savings:
- **Embeddings:** ~50% cheaper
- **Text Generation:** ~50% cheaper
- **Overall:** ~50% reduction in AI costs

---

## 🚨 Important Notes

### Embedding Dimensions:
- **OpenAI text-embedding-3-small:** 1536 dimensions
- **Gemini text-embedding-004:** 768 dimensions

**Action Required:** Update database schema if storing embeddings:
```sql
-- Check current vector dimension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If embeddings are stored, may need to regenerate all embeddings
-- The vector search will still work, just with different dimensions
```

### JSON Response Format:
- OpenAI has `response_format: { type: 'json_object' }`
- Gemini doesn't have this exact parameter
- **Solution:** Use clear prompts requesting JSON, parse response carefully

### Rate Limits:
- Gemini has different rate limits than OpenAI
- Monitor for rate limit errors
- Implement retry logic if needed

---

## 📊 Success Metrics

### Before Migration:
- [ ] Document current API costs (check OpenAI dashboard)
- [ ] Measure current response times
- [ ] Test all AI features work correctly

### After Migration:
- [ ] Verify 50% cost reduction
- [ ] Ensure response times are similar or better
- [ ] Confirm all features work correctly
- [ ] No OpenAI dependencies remain

---

## 🎯 Rollback Plan

If issues arise:

1. **Keep OpenAI package installed** until fully tested
2. **Git commit** after each successful route migration
3. **Feature flag** to switch between OpenAI/Gemini if needed
4. **Monitor errors** in production logs

---

## 📋 Next Steps

1. **Review this plan** - Confirm approach
2. **Start migration** - Follow implementation order
3. **Test thoroughly** - Use testing checklist
4. **Monitor costs** - Track API usage
5. **Update docs** - Reflect Gemini usage

---

**Ready to start?** Let's begin with Phase 1: Install dependencies!
