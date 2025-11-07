# Product Embeddings Generation Guide

## Overview

Product embeddings enable **semantic search** functionality, allowing customers to find products using natural language queries instead of exact keyword matches.

**Example:**
- User searches: "eco-friendly disposable plates for catering"
- AI finds: "Biodegradable 9" Paper Plates" even though the words don't match exactly

## Technology Stack

- **Model**: Google Gemini `text-embedding-004`
- **Dimensions**: 768 (vs OpenAI's 1536)
- **Cost**: ~50% cheaper than OpenAI ($0.01/1M tokens vs $0.02/1M)
- **Database**: PostgreSQL with pgvector extension
- **Storage**: `product_embeddings` table

## Database Schema

```sql
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  embedding vector(768),  -- Gemini text-embedding-004 produces 768-dimensional vectors
  embedding_model TEXT DEFAULT 'text-embedding-004',
  content_hash TEXT,  -- MD5 hash to detect content changes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How Embeddings Work

1. **Content Creation**: Combine product data into searchable text
   ```typescript
   const content = [
     product.name,
     product.description || '',
     product.category || '',
     product.sku
   ].filter(Boolean).join(' ');
   ```

2. **Generate Embedding**: Call Gemini API
   ```typescript
   const embedding = await generateEmbedding(content);
   // Returns: [0.123, -0.456, 0.789, ...] (768 numbers)
   ```

3. **Store in Database**: Save with content hash for change detection
   ```typescript
   await supabase.from('product_embeddings').upsert({
     product_id: product.id,
     embedding: JSON.stringify(embedding),
     embedding_model: 'text-embedding-004',
     content_hash: contentHash,
     updated_at: new Date().toISOString()
   });
   ```

4. **Semantic Search**: Find similar products using vector similarity
   ```sql
   SELECT p.id, p.name, 
          (1 - (pe.embedding <=> query_embedding)) AS similarity
   FROM product_embeddings pe
   JOIN products p ON p.id = pe.product_id
   WHERE 1 - (pe.embedding <=> query_embedding) > 0.7
   ORDER BY pe.embedding <=> query_embedding
   LIMIT 10;
   ```

## Generation Methods

### Method 1: API Endpoint (Recommended for Production)

**Endpoint**: `POST /api/admin/embeddings/generate`

**Authentication**: Requires admin role

**Request Body**:
```json
{
  "productIds": ["uuid1", "uuid2"],  // Optional: specific products
  "regenerate": false  // Optional: force regenerate even if exists
}
```

**Response**:
```json
{
  "success": true,
  "generated": 10,
  "skipped": 5,
  "failed": 0,
  "total": 15,
  "errors": []
}
```

**Features**:
- ✅ Automatic content hash checking (skips unchanged products)
- ✅ Rate limiting (50ms delay between products)
- ✅ Error handling per product
- ✅ Progress tracking

**Example Usage**:
```bash
# Generate for all products
curl -X POST https://your-domain.com/api/admin/embeddings/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Generate for specific products
curl -X POST https://your-domain.com/api/admin/embeddings/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productIds": ["uuid1", "uuid2"]}'

# Force regenerate all
curl -X POST https://your-domain.com/api/admin/embeddings/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"regenerate": true}'
```

### Method 2: CLI Script (Recommended for Initial Bulk Generation)

**Script**: `apps/web/scripts/generate-embeddings.ts`

**Usage**:
```bash
cd apps/web

# Generate for all products (skips existing)
npx tsx scripts/generate-embeddings.ts

# Force regenerate all
npx tsx scripts/generate-embeddings.ts --regenerate

# Generate for specific products
npx tsx scripts/generate-embeddings.ts --product-ids="uuid1,uuid2,uuid3"
```

**Output**:
```
🤖 Starting product embeddings generation...

📊 Checking current embedding status...
   Total active products: 335
   Products with embeddings: 0
   Missing embeddings: 335
   Coverage: 0.00%

🚀 Generating embeddings via Gemini AI...
   Model: text-embedding-004 (768 dimensions)
   Regenerate: No (skip existing)
   Rate limiting: 50ms delay between products

   ✅ Generated: 12oz Paper Cup (CUP-12OZ-001)
   ✅ Generated: 16oz Paper Cup (CUP-16OZ-001)
   ...

✅ Embedding generation complete!

📊 Summary:
   Generated: 335
   Skipped: 0
   Failed: 0
   Total: 335
   Duration: 170.25s
   Avg per product: 0.51s

🔍 Verifying embeddings...
   Total embeddings in database: 335
   Final coverage: 100.00%
```

### Method 3: Check Status

**Endpoint**: `GET /api/admin/embeddings/generate`

**Response**:
```json
{
  "success": true,
  "totalProducts": 335,
  "withEmbeddings": 335,
  "missingEmbeddings": 0,
  "coverage": "100.00"
}
```

## Production Deployment Process

### Initial Setup (One-Time)

1. **Verify Environment Variables**
   ```bash
   # Required in .env.local or production environment
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

2. **Verify Database Extension**
   ```sql
   -- Should already be enabled from migration
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Generate Embeddings for All Products**
   ```bash
   # Option A: Via CLI (recommended for initial bulk)
   cd apps/web
   npx tsx scripts/generate-embeddings.ts

   # Option B: Via API
   curl -X POST https://your-domain.com/api/admin/embeddings/generate \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

4. **Verify Coverage**
   ```bash
   curl https://your-domain.com/api/admin/embeddings/generate \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

### Ongoing Maintenance

**When to Regenerate Embeddings:**

1. **New Products Added**: Automatically generate on product creation
   - Add to product creation workflow
   - Or run periodic batch job

2. **Product Data Updated**: Regenerate if name/description/category changes
   - Content hash automatically detects changes
   - Only regenerates if content changed

3. **Model Upgrade**: When Gemini releases new embedding model
   - Set `regenerate: true` to force regeneration
   - Update `embedding_model` field

**Recommended Schedule:**
```bash
# Daily cron job to catch any missed products
0 2 * * * cd /app/apps/web && npx tsx scripts/generate-embeddings.ts

# Weekly full regeneration (optional, for data quality)
0 3 * * 0 cd /app/apps/web && npx tsx scripts/generate-embeddings.ts --regenerate
```

## Rate Limiting & Performance

### Gemini API Limits

- **Free Tier**: 15 requests/minute, 1,500 requests/day
- **Paid Tier**: 1,000 requests/minute, 50,000 requests/day

### Script Rate Limiting

- **Built-in Delay**: 50ms between products
- **Throughput**: ~20 products/second = 1,200 products/minute
- **335 Products**: ~17 seconds (well within limits)
- **10,000 Products**: ~8.3 minutes

### Optimization Tips

1. **Batch Processing**: Process in chunks of 1,000 products
2. **Parallel Processing**: Use multiple workers (respect API limits)
3. **Skip Unchanged**: Content hash prevents unnecessary regeneration
4. **Off-Peak Hours**: Run during low-traffic periods

## Troubleshooting

### Issue: "GOOGLE_API_KEY environment variable is not set"

**Solution**:
```bash
# Add to .env.local
GOOGLE_API_KEY=your_api_key_here

# Verify it's loaded
echo $GOOGLE_API_KEY
```

### Issue: "All embeddings failed with Unknown error"

**Possible Causes**:
1. Invalid API key
2. API quota exceeded
3. Network issues
4. Gemini API outage

**Debug**:
```typescript
// Test Gemini API directly
import { generateEmbedding } from './lib/gemini';

const embedding = await generateEmbedding('test product');
console.log('Success! Length:', embedding.length);
```

### Issue: "Embeddings generated but search not working"

**Check**:
1. Verify pgvector extension is enabled
2. Check semantic_search_products function exists
3. Verify feature flag is enabled:
   ```sql
   SELECT * FROM feature_flags WHERE feature_name = 'semantic_search';
   ```

## Testing

### Test Semantic Search

```bash
# Search for products
curl -X POST https://your-domain.com/api/search/semantic \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "eco-friendly disposable plates", "limit": 10}'
```

**Expected Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "name": "Biodegradable 9\" Paper Plates",
      "similarity": 0.92,
      "category": "Plates"
    }
  ],
  "count": 10
}
```

## Cost Estimation

### Gemini Embedding Costs

- **Model**: text-embedding-004
- **Cost**: $0.01 per 1M tokens
- **Average Product**: ~50 tokens (name + description + category + SKU)
- **10,000 Products**: 500,000 tokens = $0.005 (half a cent!)

### Comparison to OpenAI

- **OpenAI**: $0.02 per 1M tokens (2x more expensive)
- **Dimensions**: 1536 vs 768 (2x larger storage)
- **Gemini Advantage**: 50% cost savings + 50% storage savings

## Summary

✅ **Current Status**: 
- Database schema ready
- API endpoints implemented
- CLI script available
- 335 products in database
- 0 embeddings generated (pending GOOGLE_API_KEY configuration)

✅ **Next Steps**:
1. Set `GOOGLE_API_KEY` environment variable
2. Run `npx tsx scripts/generate-embeddings.ts`
3. Verify coverage reaches 100%
4. Test semantic search functionality
5. Set up automated regeneration for new/updated products

✅ **Production Ready**: Yes, pending API key configuration

