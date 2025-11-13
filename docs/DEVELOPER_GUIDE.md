# B2B+ Developer Guide

**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Author:** Manus AI

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Database Schema](#database-schema)
5. [Pricing Engine](#pricing-engine)
6. [Search and Filtering](#search-and-filtering)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [API Reference](#api-reference)
10. [Testing](#testing)
11. [Deployment](#deployment)

---

## 1. Introduction

B2B+ is a comprehensive B2B e-commerce platform designed for suppliers to manage their product catalogs, pricing strategies, and customer relationships. This guide provides developers with the information needed to understand, extend, and maintain the platform.

### Key Features

- **Multi-tenant Architecture:** Support for multiple supplier and customer organizations
- **Advanced Pricing Engine:** Flexible pricing with support for contracts, tiers, volume discounts, and promotions
- **Product Categorization:** Hierarchical category system for improved product discovery
- **Full-Text Search:** Optimized search with faceted filtering
- **Order Management:** Complete order lifecycle from cart to delivery
- **Campaign Management:** Email and SMS marketing campaigns
- **Approval Workflows:** Configurable approval processes for large orders

---

## 2. Architecture Overview

### Technology Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL with Row-Level Security (RLS)
- **Deployment:** Vercel (recommended)

### Project Structure

```
b2bplus/
├── apps/
│   └── web/              # Next.js web application
│       ├── app/          # App router pages and API routes
│       ├── components/   # React components
│       └── lib/          # Utility functions and configurations
├── packages/
│   └── shared/           # Shared code across applications
│       ├── src/
│       │   ├── services/ # Business logic services
│       │   └── utils/    # Utility functions
├── supabase/
│   └── migrations/       # Database migrations
└── scripts/              # Utility scripts
```

---

## 3. Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Zchasse63/b2bplus.git
   cd b2bplus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Database Schema

### Core Tables

#### Organizations

Represents both supplier and customer organizations.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'supplier', 'restaurant', 'hotel', 'school', etc.
  tax_id TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Products

Product catalog with full-text search support.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  base_price DECIMAL(10,2) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  search_vector TSVECTOR, -- For full-text search
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Categories

Hierarchical product categories.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
```

### Pricing Tables

#### Pricing Tiers

Quantity-based pricing tiers.

```sql
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  tier_name TEXT NOT NULL,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  unit_price DECIMAL(10,2) NOT NULL,
  priority INTEGER DEFAULT 0
);
```

#### Promotional Codes

Discount codes and promotions.

```sql
CREATE TABLE promotional_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping'
  discount_value DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0
);
```

---

## 5. Pricing Engine

The pricing engine is a centralized service that calculates product prices based on multiple pricing strategies with a clear priority system.

### Pricing Priority

1. **Price Locks** (highest priority) - Time-limited guaranteed prices
2. **Contract Prices** - Negotiated contract rates
3. **Customer-Specific Prices** - Custom pricing for specific customers
4. **Promotional Codes** - Temporary discounts
5. **Volume Pricing** - Quantity-based discounts
6. **Pricing Tiers** - Customer tier-based pricing
7. **Base Price** (lowest priority) - Default product price

### Usage Example

```typescript
import { PricingService } from '@repo/shared/services/pricing.service';

const pricingResult = await PricingService.calculatePrice(
  {
    product: productData,
    quantity: 100,
    customer_organization_id: 'customer-uuid',
    supplier_organization_id: 'supplier-uuid',
    promo_code: 'SAVE10'
  },
  {
    priceLocks: [],
    contractPrices: [],
    customerPrices: [],
    promoCode: promoCodeData,
    volumePricing: volumePricingData,
    pricingTiers: pricingTiersData
  }
);

console.log(pricingResult);
// {
//   unit_price: 45.99,
//   line_total: 4599.00,
//   base_price: 50.99,
//   discount_amount: 500.00,
//   discount_percentage: 10,
//   pricing_source: 'promotional',
//   pricing_details: { promo_code: 'SAVE10', ... }
// }
```

### API Endpoint

```typescript
POST /api/pricing/calculate

Request Body:
{
  "product_id": "uuid",
  "quantity": 100,
  "customer_organization_id": "uuid",
  "promo_code": "SAVE10",
  "order_subtotal": 1000.00
}

Response:
{
  "success": true,
  "pricing": {
    "unit_price": 45.99,
    "line_total": 4599.00,
    "discount_amount": 500.00,
    ...
  }
}
```

---

## 6. Search and Filtering

### Full-Text Search

The platform uses PostgreSQL's full-text search capabilities with `tsvector` for efficient product search.

#### Search Utilities

```typescript
import { buildFullTextSearchQuery } from '@repo/shared/utils/search.utils';

const searchTerm = 'paper cups';
const tsquery = buildFullTextSearchQuery(searchTerm);
// Returns: "paper:* & cups:*"
```

#### Search API

```typescript
GET /api/products/search?q=paper+cups&category=cups&min_price=10&max_price=50

Response:
{
  "items": [...],
  "total_count": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "facets": {
    "categories": [...],
    "brands": [...],
    "price_ranges": [...]
  }
}
```

### Faceted Filtering

Use the search utilities to build faceted filters:

```typescript
import { buildFilterWhereClause } from '@repo/shared/utils/search.utils';

const filters = {
  category_ids: ['cat-uuid-1', 'cat-uuid-2'],
  min_price: 10,
  max_price: 50,
  in_stock: true,
  brands: ['BrandA', 'BrandB']
};

const { conditions, params } = buildFilterWhereClause(filters);
```

---

## 7. Error Handling

### Custom Error Classes

The platform provides custom error classes for different scenarios:

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  InsufficientStockError
} from '@repo/shared/utils/error-handler';

// Validation error
throw new ValidationError('Invalid email format', { email });

// Resource not found
throw new NotFoundError('Product', productId);

// Insufficient stock
throw new InsufficientStockError('Paper Cups', 1000, 500);
```

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "email": "invalid@" },
    "timestamp": "2025-10-31T12:00:00Z",
    "path": "/api/users/register"
  }
}
```

### Validation Helpers

```typescript
import {
  validateRequired,
  validateEmail,
  validateUUID,
  validatePositiveNumber
} from '@repo/shared/utils/error-handler';

// Validate required fields
validateRequired(email, 'Email');

// Validate email format
validateEmail(email);

// Validate UUID format
validateUUID(productId, 'Product ID');

// Validate positive number
validatePositiveNumber(quantity, 'Quantity');
```

---

## 8. Performance Optimization

### Caching

Use the built-in cache for frequently accessed data:

```typescript
import { Cache } from '@repo/shared/utils/performance.utils';

const productCache = new Cache<Product>(300000); // 5 minutes TTL

// Set cache
productCache.set(productId, productData);

// Get from cache
const product = productCache.get(productId);
```

### Rate Limiting

Protect API endpoints with rate limiting:

```typescript
import { RateLimiter } from '@repo/shared/utils/performance.utils';

const limiter = new RateLimiter(100, 60000); // 100 requests per minute

if (!limiter.isAllowed(userId)) {
  throw new Error('Rate limit exceeded');
}
```

### Batch Operations

Reduce database round trips with batch operations:

```typescript
import { batchOperation } from '@repo/shared/utils/performance.utils';

const results = await batchOperation(
  productIds,
  async (batch) => {
    return await supabase
      .from('products')
      .select('*')
      .in('id', batch);
  },
  100 // Batch size
);
```

### Performance Monitoring

Track performance metrics:

```typescript
import { PerformanceMonitor } from '@repo/shared/utils/performance.utils';

const monitor = new PerformanceMonitor();

const end = monitor.start('database-query');
// ... perform operation
end();

const stats = monitor.getStats('database-query');
console.log(stats); // { count, min, max, avg, median }
```

---

## 9. API Reference

### Authentication

All API routes require authentication via Supabase Auth.

```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Common Endpoints

#### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create a new product (supplier only)
- `PUT /api/products/:id` - Update a product (supplier only)
- `DELETE /api/products/:id` - Delete a product (supplier only)

#### Orders

- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create a new order
- `PUT /api/orders/:id` - Update order status

#### Pricing

- `POST /api/pricing/calculate` - Calculate product price

---

## 10. Testing

### Unit Tests

Run unit tests with:

```bash
npm test
```

### Integration Tests

Run integration tests with:

```bash
npm run test:integration
```

### Test Coverage

Generate coverage report:

```bash
npm run test:coverage
```

---

## 11. Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with:
   ```bash
   vercel --prod
   ```

### Environment Variables

Required environment variables for production:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Support

For questions or issues, please contact the development team or open an issue on GitHub.
