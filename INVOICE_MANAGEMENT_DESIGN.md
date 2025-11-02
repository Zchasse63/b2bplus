# Invoice Management Feature Design

**Date**: October 31, 2025
**Feature**: Invoice Management
**Priority**: 1 - Critical
**Effort**: High

---

## Overview

Implement comprehensive invoice generation and management for B2B orders. Allow users to view, download, and print invoices in PDF format with professional formatting.

---

## User Stories

1. **As a customer**, I want to generate invoices for my orders so that I can submit them for payment approval.

2. **As a customer**, I want to download invoices as PDF so that I can save them for my records.

3. **As a customer**, I want to view invoice history so that I can track all my invoices in one place.

4. **As an admin**, I want invoices to be automatically generated when orders are placed so that customers can access them immediately.

5. **As a customer**, I want invoices to include all order details, pricing, and tax information so that they meet accounting requirements.

---

## Database Schema

### New Table: `invoices`

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Invoice Details
  issue_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, overdue, cancelled
  
  -- Amounts (stored for historical accuracy)
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment Info
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
```

---

## Features

### 1. Automatic Invoice Generation
- Generate invoice when order status changes to 'submitted'
- Invoice number format: `INV-YYYY-MM-XXXXX` (e.g., INV-2025-10-00001)
- Copy order details to invoice for historical accuracy

### 2. Invoice Viewing
- View invoice details on web
- Professional invoice layout
- Company branding (logo, colors)
- All order line items
- Tax and shipping breakdown

### 3. PDF Generation
- Generate PDF invoices using `react-pdf` or `pdfkit`
- Professional formatting
- Download and print options
- Email invoice (future enhancement)

### 4. Invoice Management
- List all invoices
- Filter by status, date, amount
- Search by invoice number or order number
- Mark invoices as paid
- Add payment information

---

## Invoice Number Generation

**Format**: `INV-YYYY-MM-XXXXX`

**Logic**:
```typescript
const generateInvoiceNumber = async (organizationId: string) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${year}-${month}-`
  
  // Get the latest invoice number for this month
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
  
  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number
    const lastSequence = parseInt(lastNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }
  
  return `${prefix}${String(sequence).padStart(5, '0')}`
}
```

---

## UI Components

### Invoice List Page (`/invoices`)
- Table view of all invoices
- Columns: Invoice #, Order #, Date, Amount, Status, Actions
- Filter by status, date range
- Search by invoice/order number
- Download PDF button
- View details button

### Invoice Details Page (`/invoices/[id]`)
- Full invoice display
- Download PDF button
- Print button
- Mark as paid button (if unpaid)
- Order details link

### Invoice PDF Template
- Company header with logo
- Invoice number and date
- Bill to / Ship to addresses
- Line items table
- Subtotal, tax, shipping, total
- Payment terms
- Footer with company info

---

## API Endpoints

### 1. Generate Invoice
**POST** `/api/invoices/generate`
```typescript
{
  orderId: string
}
// Returns: { invoiceId, invoiceNumber }
```

### 2. Get Invoice
**GET** `/api/invoices/[id]`
```typescript
// Returns: Invoice with order details
```

### 3. List Invoices
**GET** `/api/invoices`
```typescript
// Query params: status, startDate, endDate, search
// Returns: Invoice[]
```

### 4. Download Invoice PDF
**GET** `/api/invoices/[id]/pdf`
```typescript
// Returns: PDF file
```

### 5. Mark as Paid
**PATCH** `/api/invoices/[id]/paid`
```typescript
{
  paymentMethod: string,
  paymentReference: string
}
```

---

## Implementation Steps

### Phase 1: Database & Backend
1. Create `invoices` table migration
2. Create invoice generation function
3. Create API endpoints
4. Add invoice generation trigger on order submission

### Phase 2: Frontend UI
1. Create Invoice List page
2. Create Invoice Details page
3. Add "View Invoice" button to Order Details
4. Add invoice status badges

### Phase 3: PDF Generation
1. Install PDF library (`react-pdf` or `pdfkit`)
2. Create invoice PDF template
3. Implement PDF download endpoint
4. Add download/print buttons

### Phase 4: Testing & Polish
1. Test invoice generation
2. Test PDF generation
3. Test payment marking
4. Polish UI and UX

---

## PDF Library Options

### Option 1: `@react-pdf/renderer` (Recommended)
- React-based PDF generation
- Declarative syntax
- Good for complex layouts
- Client or server-side rendering

### Option 2: `pdfkit`
- Node.js PDF generation
- More control over layout
- Server-side only
- Smaller bundle size

**Recommendation**: Use `@react-pdf/renderer` for easier React integration

---

## Invoice Template Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Company Logo]                          INVOICE        │
│  Company Name                            #INV-2025-...  │
│  Address                                 Date: Oct 31   │
│  Phone | Email                           Due: Nov 30    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Bill To:                    Ship To:                   │
│  Organization Name           Shipping Address           │
│  Contact Name                Contact Name               │
│  Address                     Address                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Order #: ORD-...            PO #: PO-2025-001         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Item                  Qty    Unit Price    Total       │
│  ─────────────────────────────────────────────────      │
│  Product Name           10    $50.00        $500.00    │
│  Product Name 2          5    $30.00        $150.00    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                      Subtotal: $650.00  │
│                                      Tax (8%): $52.00   │
│                                      Shipping: $50.00   │
│                                      ──────────────────  │
│                                      Total:    $752.00  │
├─────────────────────────────────────────────────────────┤
│  Payment Terms: Net 30                                  │
│  Notes: [Order notes if any]                            │
│                                                          │
│  Thank you for your business!                           │
└─────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **Authorization**: Only allow users to view invoices for their organization
2. **Invoice Immutability**: Once generated, invoice amounts should not change
3. **Audit Trail**: Log all invoice status changes
4. **PDF Security**: Ensure PDFs can't be tampered with

---

## Success Metrics

- Invoices generated for 100% of submitted orders
- < 2 seconds to generate PDF
- 95%+ user satisfaction with invoice format
- Reduced support requests for invoice access

---

## Future Enhancements

1. **Email Invoices**: Send invoices via email
2. **Recurring Invoices**: For subscription-based orders
3. **Payment Integration**: Stripe/PayPal payment links
4. **Multi-Currency**: Support for different currencies
5. **Custom Templates**: Organization-specific invoice templates
6. **Batch Download**: Download multiple invoices as ZIP
7. **Invoice Reminders**: Automated payment reminders

---

## Testing Checklist

- [ ] Invoice generated on order submission
- [ ] Invoice number is unique and sequential
- [ ] Invoice displays all order details correctly
- [ ] PDF generation works
- [ ] PDF download works
- [ ] Invoice list filtering works
- [ ] Invoice search works
- [ ] Mark as paid functionality works
- [ ] Only organization members can view their invoices
- [ ] Invoice amounts match order amounts

---

## Dependencies

- `@react-pdf/renderer` - PDF generation
- Existing order and organization data
- Supabase storage (optional, for PDF storage)

---

## Conclusion

Invoice Management is a critical feature for B2B customers. This implementation provides a solid foundation with room for future enhancements like payment integration and automated reminders.
