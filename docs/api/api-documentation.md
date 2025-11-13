# B2B Plus API Documentation

## Overview

The B2B Plus API provides endpoints for managing orders, pricing, invoices, campaigns, inventory, and more. All endpoints require authentication unless otherwise specified.

## Base URL

```
Production: https://api.b2bplus.com
Staging: https://staging-api.b2bplus.com
Development: http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Obtaining a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

## Rate Limiting

Rate limits are applied per endpoint and user tier:

- **Public endpoints**: 30 requests per 15 minutes
- **API endpoints**: 100 requests per minute
- **AI endpoints**: 100 requests per hour
- **Admin endpoints**: 500 requests per minute

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request parameters
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Endpoints

### Orders

#### List Orders
```
GET /api/orders
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- status: string (pending, processing, shipped, delivered)
- sort: string (created_at, updated_at, total)

Response:
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### Create Order
```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product_id": "prod_123",
      "quantity": 10,
      "unit_price": 99.99
    }
  ],
  "shipping_address": { ... },
  "billing_address": { ... }
}

Response:
{
  "order_id": "ord_123",
  "status": "pending",
  "total": 999.90,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get Order
```
GET /api/orders/{order_id}
Authorization: Bearer <token>

Response:
{
  "order_id": "ord_123",
  "status": "processing",
  "items": [...],
  "total": 999.90,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Pricing

#### Calculate Price
```
POST /api/pricing/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product_id": "prod_123",
      "quantity": 10
    }
  ],
  "customer_id": "cust_123"
}

Response:
{
  "subtotal": 999.90,
  "discount": 99.99,
  "tax": 88.00,
  "shipping": 50.00,
  "total": 1137.91,
  "breakdown": { ... }
}
```

### Invoices

#### Generate Invoice
```
POST /api/invoices/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": "ord_123"
}

Response:
{
  "invoice_id": "inv_123",
  "pdf_url": "https://...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### List Invoices
```
GET /api/invoices
Authorization: Bearer <token>

Query Parameters:
- page: number
- limit: number
- status: string (draft, sent, paid, overdue)

Response:
{
  "invoices": [...],
  "pagination": { ... }
}
```

### AI Endpoints

#### Get Customer Insights
```
POST /api/ai/insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "cust_123",
  "analysis_type": "purchase_patterns"
}

Response:
{
  "insights": "...",
  "recommendations": [...],
  "confidence": 0.95
}
```

#### Generate Email
```
POST /api/ai/generate-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "cust_123",
  "email_type": "promotional",
  "context": { ... }
}

Response:
{
  "subject": "...",
  "body": "...",
  "preview": "..."
}
```

### Admin Endpoints

#### List Campaigns
```
GET /api/admin/campaigns
Authorization: Bearer <token>

Response:
{
  "campaigns": [...],
  "total": 50
}
```

#### Create Campaign
```
POST /api/admin/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q1 Promotion",
  "description": "...",
  "recipients": [...],
  "email_template": { ... }
}

Response:
{
  "campaign_id": "camp_123",
  "status": "draft"
}
```

## Webhooks

### Stripe Webhooks
```
POST /api/webhooks/stripe

Events:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
```

### SendGrid Webhooks
```
POST /api/webhooks/sendgrid

Events:
- delivered
- opened
- clicked
- bounced
- unsubscribe
```

## Pagination

Endpoints that return lists support pagination:

```
GET /api/orders?page=2&limit=50

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

## Filtering

List endpoints support filtering:

```
GET /api/orders?status=pending&created_after=2024-01-01

Supported filters vary by endpoint. See endpoint documentation.
```

## Sorting

List endpoints support sorting:

```
GET /api/orders?sort=-created_at

Use - prefix for descending order.
```

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

## Versioning

The API uses URL versioning:

```
/api/v1/orders
/api/v2/orders
```

Current version: v1

## Support

For API support, contact:
- Email: api-support@b2bplus.com
- Documentation: https://docs.b2bplus.com
- Status: https://status.b2bplus.com

