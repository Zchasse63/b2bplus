# AI Testing Implementation Guide

## Overview

This document provides instructions for implementing comprehensive tests for the new Vercel AI SDK + Grok integration. The project has been migrated from Gemini to use xAI's Grok models through the Vercel AI SDK.

---

## 1. Testing Framework & Configuration

### Current Setup
- **Unit & Integration Tests**: Jest with React Testing Library
- **E2E Tests**: Playwright
- **Coverage Target**: 80% (branches, functions, lines, statements)

### Key Files
```
apps/web/jest.config.js        # Jest configuration
apps/web/jest.setup.js         # Test setup with matchers
apps/web/playwright.config.ts  # E2E configuration
```

---

## 2. Files to REMOVE (Old Gemini Tests)

Delete or significantly refactor these tests that directly test the old Gemini module:

```bash
# Remove completely:
apps/web/lib/gemini.test.ts    # Direct Gemini SDK tests - no longer needed

# Refactor these to use new unified provider:
apps/web/__tests__/api/chatbot-routes.test.ts     # Update mocks
apps/web/__tests__/api/admin-analytics-routes.test.ts
apps/web/__tests__/api/admin-campaigns-pricing-routes.test.ts
apps/web/__tests__/api/admin-comprehensive-routes.test.ts
apps/web/lib/ai/chatbot-integration.test.ts
apps/web/lib/ai/performance-benchmark.test.ts
```

---

## 3. NEW Tests to Create

### 3.1 AI Provider Tests

#### `apps/web/lib/ai/providers/xai.test.ts`
```typescript
/**
 * Tests for xAI (Grok) provider configuration
 */
import { xai, grokModels, defaultModel, defaultSettings } from './xai';

describe('xAI Provider Configuration', () => {
  describe('Provider Initialization', () => {
    it('should create xAI provider with API key from environment');
    it('should throw error if XAI_API_KEY is not set');
  });

  describe('Model Configuration', () => {
    it('should export grok-4.1-fast model');
    it('should export grok-4.1-fast-reasoning model');
    it('should set correct default model to fast');
  });

  describe('Default Settings', () => {
    it('should have correct fast model settings (temp: 0.7, tokens: 4096)');
    it('should have correct reasoning model settings (temp: 0.3, tokens: 16384)');
    it('should have correct structured output settings (temp: 0.2)');
  });
});
```

#### `apps/web/lib/ai/providers/unified.test.ts`
```typescript
/**
 * Tests for unified AI provider with feature flag
 */
describe('Unified AI Provider', () => {
  describe('Feature Flag Behavior', () => {
    it('should use Grok when USE_GROK=true (default)');
    it('should fall back to Gemini when USE_GROK=false');
  });

  describe('generateText', () => {
    it('should generate text with default options');
    it('should respect temperature option');
    it('should include system prompt when provided');
    it('should respect maxTokens option');
  });

  describe('generateJSON', () => {
    it('should generate and parse valid JSON');
    it('should use generateObject when schema provided');
    it('should handle JSON without schema');
  });

  describe('generateTextPro (reasoning)', () => {
    it('should use reasoning model for complex tasks');
    it('should use lower temperature for analytical tasks');
  });

  describe('generateJSONPro', () => {
    it('should use reasoning model with schema');
    it('should parse complex JSON structures');
  });

  describe('streamTextResponse', () => {
    it('should return streaming response');
    it('should use reasoning model when specified');
  });

  describe('generateStructuredObject', () => {
    it('should validate output against Zod schema');
    it('should reject invalid structures');
  });

  describe('Fallback Functions', () => {
    it('analyzeImageJSON should fall back to Gemini');
    it('processDocumentJSON should fall back to Gemini');
    it('generateEmbedding should use Gemini');
  });
});
```

### 3.2 Zod Schema Tests

#### `apps/web/lib/ai/schemas/documents.test.ts`
```typescript
import {
  parsedInvoiceSchema,
  parsedPurchaseOrderSchema,
  parsedPriceListSchema,
  documentAnalysisSchema
} from './documents';

describe('Document Schemas', () => {
  describe('parsedInvoiceSchema', () => {
    it('should validate complete invoice');
    it('should require invoice number');
    it('should validate line items structure');
    it('should reject invalid totals');
  });

  describe('parsedPurchaseOrderSchema', () => {
    it('should validate complete PO');
    it('should require PO number and date');
    it('should validate ship-to address');
  });

  describe('parsedPriceListSchema', () => {
    it('should validate price list with regions');
    it('should handle 5 regional pricing columns');
    it('should validate item structure');
  });

  describe('documentAnalysisSchema', () => {
    it('should validate analysis with confidence scores');
    it('should validate column mappings');
    it('should include warnings array');
  });
});
```

#### `apps/web/lib/ai/schemas/analytics.test.ts`
```typescript
import {
  customerInsightsSchema,
  revenueMetricsSchema,
  executiveSummarySchema
} from './analytics';

describe('Analytics Schemas', () => {
  describe('customerInsightsSchema', () => {
    it('should validate customer segment data');
    it('should include churn risk metrics');
    it('should validate opportunity scores');
  });

  describe('revenueMetricsSchema', () => {
    it('should validate revenue time series');
    it('should include top products array');
    it('should calculate growth correctly');
  });

  describe('executiveSummarySchema', () => {
    it('should validate key metrics');
    it('should include recommendations');
    it('should validate trends');
  });
});
```

### 3.3 AI Tools Tests (84 Tools across 10 domains)

Create a test file for each tool domain:

#### `apps/web/lib/ai/tools/products.test.ts`
```typescript
import { productTools } from './products';

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Product Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } }
    });
  });

  describe('searchProducts', () => {
    it('should search by name or SKU');
    it('should filter by category');
    it('should respect limit parameter');
    it('should include pricing for authenticated users');
  });

  describe('getProductDetails', () => {
    it('should return product with full details');
    it('should include related products');
    it('should throw for non-existent product');
  });

  describe('getProductAvailability', () => {
    it('should return stock status');
    it('should include warehouse availability');
  });

  describe('compareProducts', () => {
    it('should compare 2-5 products');
    it('should reject more than 5 products');
    it('should highlight differences');
  });

  describe('getCustomerPricing', () => {
    it('should return tier-based pricing');
    it('should require authentication');
  });

  describe('requestQuote', () => {
    it('should create quote request');
    it('should validate quantities');
  });
});
```

#### `apps/web/lib/ai/tools/cart.test.ts`
```typescript
describe('Cart Tools', () => {
  describe('getCart', () => {
    it('should return current cart contents');
    it('should calculate totals');
  });

  describe('addToCart', () => {
    it('should add new item');
    it('should update quantity for existing item');
    it('should validate product exists');
  });

  describe('updateCartQuantity', () => {
    it('should update item quantity');
    it('should remove item if quantity is 0');
  });

  describe('applyPromoCode', () => {
    it('should apply valid promo code');
    it('should reject expired codes');
    it('should respect usage limits');
  });

  describe('saveCartAsQuote', () => {
    it('should create quote from cart');
    it('should require authentication');
  });
});
```

#### `apps/web/lib/ai/tools/orders.test.ts`
```typescript
describe('Order Tools', () => {
  describe('searchOrders', () => {
    it('should search by order number');
    it('should filter by status');
    it('should limit to user orders for customers');
  });

  describe('createOrder', () => {
    it('should create order from cart');
    it('should validate shipping address');
    it('should apply customer pricing');
  });

  describe('reorderPrevious', () => {
    it('should copy items from previous order');
    it('should update quantities');
  });

  describe('updateOrderStatus (admin)', () => {
    it('should update order status');
    it('should require admin role');
    it('should create timeline entry');
  });
});
```

#### `apps/web/lib/ai/tools/documents.test.ts`
```typescript
describe('Document Tools', () => {
  describe('analyzeDocumentStructure', () => {
    it('should detect invoice structure');
    it('should detect PO structure');
    it('should detect price list with regions');
    it('should return confidence scores');
    it('should use reasoning model');
  });

  describe('parseInvoice', () => {
    it('should extract invoice header');
    it('should extract line items');
    it('should calculate totals');
    it('should match SKUs to products');
  });

  describe('parsePurchaseOrder', () => {
    it('should extract PO header');
    it('should extract ship-to address');
    it('should extract line items');
  });

  describe('parsePriceList', () => {
    it('should detect regional pricing columns');
    it('should handle 4-5 price tiers');
    it('should extract product info');
  });

  describe('validateParsedDocument', () => {
    it('should validate SKUs against catalog');
    it('should return validation errors');
    it('should suggest corrections');
  });

  describe('importInvoiceHistory', () => {
    it('should create invoice records');
    it('should link to customer');
    it('should handle missing SKUs gracefully');
  });
});
```

#### `apps/web/lib/ai/tools/analytics.test.ts`
```typescript
describe('Analytics Tools (Admin Only)', () => {
  describe('Authorization', () => {
    it('should reject non-admin users for all tools');
  });

  describe('getRevenueMetrics', () => {
    it('should calculate revenue by period');
    it('should group by day/week/month');
    it('should return top products');
  });

  describe('getCustomerInsights', () => {
    it('should segment customers');
    it('should calculate lifetime value');
  });

  describe('predictChurnRisk', () => {
    it('should identify at-risk customers');
    it('should calculate risk scores');
  });

  describe('getExecutiveSummary', () => {
    it('should generate period summary');
    it('should compare to previous period');
  });
});
```

#### Similar patterns for:
- `apps/web/lib/ai/tools/customers.test.ts`
- `apps/web/lib/ai/tools/campaigns.test.ts`
- `apps/web/lib/ai/tools/invoices.test.ts`
- `apps/web/lib/ai/tools/profile.test.ts`
- `apps/web/lib/ai/tools/navigation.test.ts`

#### `apps/web/lib/ai/tools/index.test.ts`
```typescript
import { allTools, getToolsForRole, toolCounts } from './index';

describe('Tool Registry', () => {
  describe('allTools', () => {
    it('should export all 84 tools');
    it('should have unique tool names');
  });

  describe('getToolsForRole', () => {
    it('should return all tools for admin');
    it('should return limited tools for customer');
    it('should return minimal tools for null role');
  });

  describe('toolCounts', () => {
    it('should have correct counts per category');
    it('should sum to total count');
  });
});
```

### 3.4 API Endpoint Tests

#### `apps/web/__tests__/api/ai-companion.test.ts`
```typescript
describe('POST /api/ai/companion', () => {
  it('should require authentication');
  it('should stream response');
  it('should execute tool calls');
  it('should respect user role for tool access');
  it('should log usage to ai_conversations');
  it('should use reasoning model when specified');
  it('should include context in system prompt');
});

describe('GET /api/ai/companion', () => {
  it('should return health check');
});
```

#### `apps/web/__tests__/api/ai-documents.test.ts`
```typescript
describe('POST /api/ai/documents/upload', () => {
  it('should accept CSV files');
  it('should accept Excel files');
  it('should accept PDF files');
  it('should reject files over 10MB');
  it('should reject unsupported file types');
  it('should return file preview for spreadsheets');
  it('should store PDFs for async processing');
});

describe('POST /api/ai/documents/analyze', () => {
  it('should detect invoice structure');
  it('should detect PO structure');
  it('should detect price list structure');
  it('should return column mappings');
  it('should include confidence scores');
});

describe('POST /api/ai/documents/import', () => {
  it('should require admin role');
  it('should import invoice data');
  it('should import PO data');
  it('should import price list data');
  it('should handle validation errors gracefully');
  it('should return import statistics');
});
```

#### `apps/web/__tests__/api/chatbot-stream.test.ts`
```typescript
describe('POST /api/chatbot/stream', () => {
  it('should stream response');
  it('should sanitize user input');
  it('should include customer context');
  it('should save conversation history');
  it('should execute tool calls');
  it('should log AI usage');
});
```

### 3.5 Component Tests

#### `apps/web/components/ai/AICompanion.test.tsx`
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AICompanion } from './AICompanion';

// Mock useChat from @ai-sdk/react
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    error: null,
    setMessages: jest.fn(),
    append: jest.fn(),
  })),
}));

describe('AICompanion', () => {
  it('should render toggle button');
  it('should open chat on toggle click');
  it('should show welcome message when empty');
  it('should show suggestion chips');
  it('should display user messages');
  it('should display assistant messages with markdown');
  it('should show loading indicator');
  it('should display tool invocation results');
  it('should handle reasoning mode toggle');
  it('should clear chat history');
  it('should auto-scroll to new messages');
});
```

#### `apps/web/components/ai/DocumentUpload.test.tsx`
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentUpload } from './DocumentUpload';

describe('DocumentUpload', () => {
  it('should render drop zone');
  it('should highlight on drag over');
  it('should accept dropped files');
  it('should accept clicked file selection');
  it('should validate file type');
  it('should validate file size');
  it('should show selected file info');
  it('should show upload progress');
  it('should call onUploadComplete on success');
  it('should display error messages');
  it('should allow file removal');
});
```

#### `apps/web/components/ai/DocumentPreview.test.tsx`
```typescript
describe('DocumentPreview', () => {
  it('should display file info');
  it('should show analyzing state');
  it('should display column mappings');
  it('should allow mapping changes');
  it('should display data preview');
  it('should show warnings from analysis');
  it('should display import options');
  it('should call onImport with mappings');
  it('should call onCancel');
  it('should show importing state');
});
```

### 3.6 E2E Tests

#### `apps/web/e2e/ai-companion.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Companion', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
  });

  test('should open chat interface', async ({ page }) => {
    await page.click('[data-testid="ai-companion-toggle"]');
    await expect(page.locator('[data-testid="ai-companion-chat"]')).toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    await page.click('[data-testid="ai-companion-toggle"]');
    await page.fill('[data-testid="chat-input"]', 'Search for chicken');
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('.assistant-message')).toBeVisible();
  });

  test('should execute product search tool', async ({ page }) => {
    // Test tool execution results display
  });
});
```

#### `apps/web/e2e/document-processing.spec.ts`
```typescript
test.describe('Document Processing (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
  });

  test('should upload CSV file', async ({ page }) => {
    await page.goto('/admin/documents/process');
    await page.setInputFiles('[data-testid="file-input"]', 'test-data/invoice.csv');
    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
  });

  test('should analyze document structure', async ({ page }) => {
    // Upload and wait for analysis
    await expect(page.locator('[data-testid="column-mappings"]')).toBeVisible();
  });

  test('should import data with mappings', async ({ page }) => {
    // Full import flow
    await page.click('[data-testid="import-button"]');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
  });
});
```

---

## 4. Mocking Strategy

### 4.1 Mock Supabase
```typescript
// __mocks__/supabase.ts
export const createMockSupabase = (overrides = {}) => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    }),
    ...overrides.auth,
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides.from,
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
    })),
  },
  ...overrides,
});
```

### 4.2 Mock Vercel AI SDK
```typescript
// __mocks__/vercel-ai.ts
export const mockStreamText = jest.fn(() => ({
  toDataStreamResponse: jest.fn(() => new Response('stream')),
}));

export const mockGenerateObject = jest.fn(async ({ schema }) => ({
  object: schema.parse({}), // Returns minimal valid object
}));

export const mockGenerateText = jest.fn(async () => ({
  text: 'Generated text response',
}));

jest.mock('ai', () => ({
  streamText: mockStreamText,
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
}));
```

### 4.3 Mock xAI Provider
```typescript
// __mocks__/xai.ts
jest.mock('@/lib/ai/providers/xai', () => ({
  xai: jest.fn(),
  grokModels: {
    fast: 'mock-fast-model',
    reasoning: 'mock-reasoning-model',
  },
  defaultModel: 'mock-fast-model',
  defaultSettings: {
    fast: { temperature: 0.7, maxTokens: 4096 },
    reasoning: { temperature: 0.3, maxTokens: 16384 },
    structured: { temperature: 0.2 },
  },
}));
```

---

## 5. Test Data Fixtures

Create test data files:

```
apps/web/__tests__/fixtures/
├── documents/
│   ├── sample-invoice.csv
│   ├── sample-po.xlsx
│   ├── sample-price-list.csv
│   └── sample-catalog.csv
├── products/
│   └── mock-products.json
├── orders/
│   └── mock-orders.json
└── users/
    └── mock-users.json
```

---

## 6. Running Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test -- apps/web/lib/ai/providers/unified.test.ts

# Run AI-related tests only
pnpm test -- --testPathPattern="ai"

# Run E2E tests
pnpm e2e

# Run specific E2E test
pnpm e2e -- ai-companion.spec.ts
```

---

## 7. Coverage Requirements

Ensure these thresholds are met:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Priority order for test coverage:
1. AI Tools (all 84 tools)
2. API Endpoints (ai/companion, ai/documents/*, chatbot/stream)
3. Components (AICompanion, DocumentUpload, DocumentPreview)
4. Schemas (documents, analytics)
5. Providers (unified, xai)

---

## 8. Additional Notes

### Files that need import updates in existing tests:
Any test file that mocks `@/lib/gemini` should be updated to mock `@/lib/ai/providers/unified` instead.

### Environment Variables for Tests:
```bash
XAI_API_KEY=test-key
USE_GROK=true
```

### Key Testing Patterns:
1. Always mock Supabase - never hit real database
2. Mock AI providers - don't make real API calls
3. Test tool authorization (admin vs customer roles)
4. Test streaming responses for chat endpoints
5. Validate Zod schemas with edge cases
6. Test error handling and fallbacks

---

## 9. Estimated Effort

| Category | Files | Estimated Hours |
|----------|-------|-----------------|
| Provider Tests | 2 | 4 |
| Schema Tests | 3 | 3 |
| Tool Tests | 10 | 20 |
| API Tests | 4 | 8 |
| Component Tests | 3 | 6 |
| E2E Tests | 2 | 4 |
| Refactor Old Tests | 6 | 6 |
| **Total** | **30** | **~51 hours** |

---

## 10. Deliverables Checklist

- [ ] Remove `apps/web/lib/gemini.test.ts`
- [ ] Create `apps/web/lib/ai/providers/xai.test.ts`
- [ ] Create `apps/web/lib/ai/providers/unified.test.ts`
- [ ] Create `apps/web/lib/ai/schemas/*.test.ts` (2 files)
- [ ] Create `apps/web/lib/ai/tools/*.test.ts` (10 files)
- [ ] Create `apps/web/__tests__/api/ai-*.test.ts` (3 files)
- [ ] Create `apps/web/components/ai/*.test.tsx` (3 files)
- [ ] Create `apps/web/e2e/ai-*.spec.ts` (2 files)
- [ ] Update existing tests to use unified provider mocks
- [ ] Add test fixtures for documents
- [ ] Achieve 80% coverage on new code
- [ ] All tests passing in CI
