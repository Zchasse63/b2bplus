# Upstash Redis & pgvector RAG Setup Guide

Reference document for configuring caching and semantic search for food service disposables B2B platform.

---

## Part 1: Upstash Redis Setup

### Current Status: ✅ Code Ready, Needs Configuration

The Redis client and rate limiting are implemented. You just need to add credentials.

### Steps

1. **Create Upstash Account**
   - Go to [upstash.com](https://upstash.com)
   - Create a new Redis database (free tier available)
   - Select region closest to your Vercel deployment

2. **Get Credentials**
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

3. **Add to Environment**
   ```bash
   # In .env.local (local development)
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   
   # In Vercel/Netlify dashboard for production
   ```

4. **Verify Connection**
   ```bash
   curl "https://your-db.upstash.io/ping" \
     -H "Authorization: Bearer your-token"
   ```

### Already Implemented

| Feature | File |
|---------|------|
| Redis client | `lib/cache/redis-cache.ts` |
| Rate limiting | `lib/middleware/rate-limit.ts` |
| Env validation | `lib/env.ts` |

---

## Part 2: pgvector RAG Setup

### Current Status: ✅ Infrastructure Ready, Needs Data

The database, tables, and API endpoints exist. You need to populate with your product data.

### Database Schema (Already Created)

```sql
-- Enabled in migration
CREATE EXTENSION IF NOT EXISTS "vector";

-- Existing table
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  embedding VECTOR(768),  -- 768 dimensions for Gemini
  model_version TEXT DEFAULT 'text-embedding-004',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX idx_product_embeddings_vector 
ON product_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## Part 3: Data to Embed (Priority Order)

### Tier 1: Product Catalog (Essential)

**What to include for each product:**

```typescript
interface ProductEmbeddingData {
  // Identifiers
  sku: string;              // "FC-12-1000"
  itemCode: string;         // Your internal code
  upc?: string;             // If available
  
  // Descriptions (primary search content)
  name: string;             // "12oz Foam Cup"
  description: string;      // Full marketing description
  shortDescription: string; // One-liner
  
  // Categories
  category: string;         // "Cups & Lids"
  subcategory: string;      // "Foam Cups"
  
  // Pack/Quantity (critical for matching)
  packSize: string;         // "1000/case"
  unitOfMeasure: string;    // "case", "sleeve", "each"
  unitsPerCase: number;     // 1000
  
  // Attributes
  material: string;         // "Expanded Polystyrene"
  color?: string;
  size: string;             // "12 oz"
  brand?: string;
}
```

**Concatenated text for embedding:**
```typescript
const embeddingText = `
  SKU: ${sku}
  ${name} - ${description}
  Category: ${category} > ${subcategory}
  Pack: ${packSize} (${unitsPerCase} per case)
  Material: ${material}
  Size: ${size}
`.trim();
```

### Tier 2: Business Knowledge

Create a `business_knowledge` table for additional context:

```sql
CREATE TABLE business_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- 'synonyms', 'uom', 'policies'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Content to add:**

| Category | Examples |
|----------|----------|
| `synonyms` | "Styrofoam = Polystyrene Foam = EPS" |
| `synonyms` | "To-go container = Hinged lid = Clamshell" |
| `synonyms` | "Napkin = Serviette = Paper napkin" |
| `uom_conversions` | "1 case = 20 sleeves, 1 sleeve = 50 cups" |
| `uom_conversions` | "Bulk = 1000+ units, Pack = individual unit" |
| `common_misspellings` | "Styrafoam, stirofome → Styrofoam" |

### Tier 3: Company Knowledge

**What to include:**

| Topic | Content |
|-------|---------|
| Shipping policies | "Orders over $500 ship free. Standard delivery 3-5 business days." |
| Order minimums | "Minimum order $100. Case quantity required for most items." |
| Payment terms | "Net 30 for approved accounts. Credit card for new customers." |
| Lead times | "Stock items ship same day if ordered by 2pm EST." |
| Return policy | "Unused items returnable within 30 days with 15% restocking fee." |
| Company info | "Family-owned since 1985, serving the Midwest region." |

---

## Part 4: Implementation Steps

### Step 1: Prepare Product Data Export

```sql
-- Export products for embedding
SELECT 
  p.id,
  p.sku,
  p.name,
  p.description,
  c.name as category,
  p.pack_size,
  p.unit_of_measure
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.active = true;
```

### Step 2: Generate Embeddings

Use existing API endpoint:
```bash
POST /api/admin/embeddings/generate
```

Or bulk generate with script:
```bash
npx tsx scripts/generate-embeddings.ts
```

### Step 3: Add Business Knowledge

```sql
INSERT INTO business_knowledge (category, title, content) VALUES
('synonyms', 'Cup terminology', 'Hot cup = Coffee cup = Paper cup with handle'),
('uom', 'Case conversion', '1 case of 12oz cups = 20 sleeves × 50 = 1000 cups'),
('policy', 'Shipping', 'Free shipping on orders over $500. Standard 3-5 days.');

-- Then generate embeddings for each
```

### Step 4: Update Search Function

Modify semantic search to query both tables:

```sql
-- Semantic search across products AND knowledge base
WITH combined AS (
  SELECT 
    'product' as type,
    p.id,
    p.name as title,
    1 - (pe.embedding <=> query_embedding) as similarity
  FROM product_embeddings pe
  JOIN products p ON pe.product_id = p.id
  
  UNION ALL
  
  SELECT 
    'knowledge' as type,
    bk.id,
    bk.title,
    1 - (bk.embedding <=> query_embedding) as similarity
  FROM business_knowledge bk
)
SELECT * FROM combined
ORDER BY similarity DESC
LIMIT 10;
```

---

## Part 5: Testing the RAG

### Test Customer Order Parsing

**Input:** "Need 10 cases of those white styrofoam soup bowls, 16oz"

**Expected AI behavior:**
1. Embed the query
2. Search pgvector for similar products
3. Find: "16oz Foam Container" (SKU: FC-16-500)
4. Confirm pack size with customer
5. Add to order

### Test Fuzzy Matching

| Customer Says | You Have | Should Match? |
|---------------|----------|---------------|
| "Kirkland napkins" | "Premium 2-ply napkin" | ✅ (synonym) |
| "dozen plates" | "12ct Paper Plates" | ✅ (UOM) |
| "those cups we usually get" | Historical orders | ⚡ (needs order history) |

---

## Quick Reference

| Task | Command/Location |
|------|------------------|
| Generate embeddings | `POST /api/admin/embeddings/generate` |
| Semantic search | `POST /api/search/semantic` |
| View embeddings count | Supabase dashboard → `product_embeddings` table |
| Test similarity | SQL: `SELECT 1 - (a.embedding <=> b.embedding)` |

---

*Created: 2024-12-07 | Reference for future implementation*
