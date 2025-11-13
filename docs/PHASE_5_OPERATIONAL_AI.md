# Phase 5: Operational AI
## Weeks 19-22 | Medium Priority 🟣

**Part of**: [Master Implementation Plan](./MASTER_IMPLEMENTATION_PLAN.md)  
**Previous Phase**: [Phase 4: Admin AI Tools](./PHASE_4_ADMIN_AI_TOOLS.md)  
**Timeline**: 4 weeks  
**Status**: Not Started  
**Priority**: MEDIUM - Operational efficiency and automation

---

## Overview

Phase 5 implements autonomous AI agents that automate operational workflows, reducing manual data entry and improving efficiency.

**Why This Phase Comes Fifth**:
- Requires secure foundation from Phase 1
- Requires AI backend from Phase 2
- Operational automation has high ROI
- Reduces manual work for admin team

**What This Phase Delivers**:
- ✅ Invoice Reconciliation Agent (Auto-match invoices to POs)
- ✅ Document Processing (Extract data from PDFs)
- ✅ Auto-Approval Workflows (Approve routine orders automatically)
- ✅ Email Processing Agent (Parse and route customer emails)

---

## Week 19: Invoice Reconciliation Agent

### Task 19.1: Invoice Upload & Processing (2 days)

**File**: `apps/web/app/api/admin/invoices/upload/route.ts`

**Purpose**: Upload invoice PDFs and extract data using Gemini.

**Implementation**:
```typescript
import { generateJSON } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.FormData();
  const file = formData.get('invoice') as File;
  
  if (!file || file.type !== 'application/pdf') {
    return new Response('Invalid file type', { status: 400 });
  }
  
  // Upload to Supabase Storage
  const supabase = createClient();
  const fileName = `invoices/${Date.now()}_${file.name}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);
  
  if (uploadError) {
    return new Response('Upload failed', { status: 500 });
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);
  
  // Extract invoice data using Gemini
  const invoiceData = await extractInvoiceData(publicUrl);
  
  // Save to database
  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      file_url: publicUrl,
      vendor_name: invoiceData.vendorName,
      invoice_number: invoiceData.invoiceNumber,
      invoice_date: invoiceData.invoiceDate,
      total_amount: invoiceData.totalAmount,
      line_items: invoiceData.lineItems,
      status: 'pending_review'
    })
    .select()
    .single();
  
  // Attempt auto-matching to PO
  const matchResult = await matchInvoiceToPO(invoice);
  
  return Response.json({
    success: true,
    invoice,
    matchResult
  });
}

async function extractInvoiceData(pdfUrl: string) {
  // Use Gemini to extract structured data from invoice PDF
  const prompt = `Extract the following information from this invoice PDF:
  
  - Vendor name
  - Invoice number
  - Invoice date
  - Total amount
  - Line items (product, quantity, unit price, total)
  - Payment terms
  - Due date
  
  Return as JSON with this structure:
  {
    "vendorName": "...",
    "invoiceNumber": "...",
    "invoiceDate": "YYYY-MM-DD",
    "totalAmount": 0.00,
    "lineItems": [
      { "product": "...", "quantity": 0, "unitPrice": 0.00, "total": 0.00 }
    ],
    "paymentTerms": "...",
    "dueDate": "YYYY-MM-DD"
  }`;
  
  // Note: Gemini multimodal can process PDFs
  const invoiceData = await generateJSON(prompt, {
    temperature: 0.1, // Low temperature for accuracy
    // Include PDF in request
  });
  
  return invoiceData;
}

async function matchInvoiceToPO(invoice: any) {
  const supabase = createClient();
  
  // Find matching PO by vendor and amount
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('vendor_name', invoice.vendor_name)
    .gte('total_amount', invoice.total_amount * 0.95) // Allow 5% variance
    .lte('total_amount', invoice.total_amount * 1.05)
    .eq('status', 'pending');
  
  if (!pos || pos.length === 0) {
    return { matched: false, reason: 'No matching PO found' };
  }
  
  if (pos.length > 1) {
    return { matched: false, reason: 'Multiple possible matches', candidates: pos };
  }
  
  const po = pos[0];
  
  // Use AI to verify line items match
  const verificationPrompt = `Compare these invoice line items to PO line items:
  
  INVOICE:
  ${JSON.stringify(invoice.line_items)}
  
  PO:
  ${JSON.stringify(po.line_items)}
  
  Do they match? Return JSON:
  {
    "match": true/false,
    "confidence": 0-1,
    "discrepancies": ["..."]
  }`;
  
  const verification = await generateJSON(verificationPrompt, { temperature: 0.1 });
  
  if (verification.match && verification.confidence > 0.9) {
    // Auto-match
    await supabase
      .from('invoices')
      .update({
        purchase_order_id: po.id,
        status: 'matched',
        matched_at: new Date()
      })
      .eq('id', invoice.id);
    
    return { matched: true, po, confidence: verification.confidence };
  }
  
  return {
    matched: false,
    reason: 'Line items do not match',
    discrepancies: verification.discrepancies,
    suggestedPO: po
  };
}
```

**Deliverable**: Invoice upload and auto-matching

---

### Task 19.2: Invoice Review UI (2 days)

**File**: `apps/web/app/(app)/admin/invoices/page.tsx`

**Purpose**: Review invoices and approve/reject matches.

**Features**:
- List all invoices (pending, matched, approved, rejected)
- View invoice PDF side-by-side with extracted data
- Approve/reject matches
- Manual PO assignment
- Discrepancy resolution

**Deliverable**: Invoice review dashboard

---

### Task 19.3: Auto-Approval Rules (1 day)

**Feature**: Automatically approve invoices that meet criteria.

**Rules**:
```typescript
const AUTO_APPROVAL_RULES = {
  maxAmount: 5000, // Auto-approve up to $5K
  minConfidence: 0.95, // 95% match confidence
  trustedVendors: ['Vendor A', 'Vendor B'], // Whitelist
  requiresApproval: ['Vendor C'] // Blacklist
};

async function checkAutoApproval(invoice: any, matchResult: any) {
  // Check if invoice meets auto-approval criteria
  if (invoice.total_amount > AUTO_APPROVAL_RULES.maxAmount) {
    return { autoApprove: false, reason: 'Amount exceeds limit' };
  }
  
  if (matchResult.confidence < AUTO_APPROVAL_RULES.minConfidence) {
    return { autoApprove: false, reason: 'Low confidence match' };
  }
  
  if (AUTO_APPROVAL_RULES.requiresApproval.includes(invoice.vendor_name)) {
    return { autoApprove: false, reason: 'Vendor requires manual approval' };
  }
  
  // Auto-approve
  return { autoApprove: true };
}
```

**Deliverable**: Auto-approval logic for invoices

---

## Week 20: Document Processing

### Task 20.1: Generic Document Upload (2 days)

**File**: `apps/web/app/api/admin/documents/upload/route.ts`

**Purpose**: Upload any document (contract, PO, quote) and extract data.

**Supported Document Types**:
- Purchase Orders
- Contracts
- Quotes
- Packing Slips
- Receipts

**Implementation**: Similar to invoice processing but with dynamic schema detection.

**Deliverable**: Generic document processing API

---

### Task 20.2: Document Library UI (2 days)

**File**: `apps/web/app/(app)/admin/documents/page.tsx`

**Features**:
- Upload documents
- View extracted data
- Search by content
- Tag and categorize
- Link to customers/orders

**Deliverable**: Document management UI

---

### Task 20.3: Document Search (1 day)

**Feature**: Semantic search across all documents.

**Implementation**: Use embeddings to search document content.

**Deliverable**: Document search functionality

---

## Week 21: Auto-Approval Workflows

### Task 21.1: Order Auto-Approval (2 days)

**Feature**: Automatically approve routine orders.

**Rules**:
```typescript
const ORDER_AUTO_APPROVAL_RULES = {
  // Auto-approve if:
  maxAmount: 10000, // Order under $10K
  repeatCustomer: true, // Customer has 5+ previous orders
  goodPaymentHistory: true, // No late payments
  withinCreditLimit: true, // Order within credit limit
  standardProducts: true // No custom/special order items
};

async function checkOrderAutoApproval(order: any, customer: any) {
  const supabase = createClient();
  
  // Check order amount
  if (order.total > ORDER_AUTO_APPROVAL_RULES.maxAmount) {
    return { autoApprove: false, reason: 'Amount exceeds limit' };
  }
  
  // Check customer history
  const { data: previousOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('status', 'completed');
  
  if (!previousOrders || previousOrders.length < 5) {
    return { autoApprove: false, reason: 'New customer - requires manual review' };
  }
  
  // Check payment history
  const { data: latePayments } = await supabase
    .from('invoices')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('status', 'overdue');
  
  if (latePayments && latePayments.length > 0) {
    return { autoApprove: false, reason: 'Customer has late payments' };
  }
  
  // Check credit limit
  const creditAvailable = customer.credit_limit - customer.current_balance;
  if (order.total > creditAvailable) {
    return { autoApprove: false, reason: 'Exceeds credit limit' };
  }
  
  // Check for custom items
  const hasCustomItems = order.items.some(item => item.product.is_custom);
  if (hasCustomItems) {
    return { autoApprove: false, reason: 'Contains custom items' };
  }
  
  // Auto-approve
  return { autoApprove: true };
}
```

**Deliverable**: Order auto-approval logic

---

### Task 21.2: Approval Queue UI (1 day)

**File**: `apps/web/app/(app)/admin/approvals/page.tsx`

**Purpose**: Review orders that require manual approval.

**Features**:
- List orders pending approval
- Show why auto-approval failed
- Approve/reject with notes
- Bulk actions

**Deliverable**: Approval queue dashboard

---

### Task 21.3: Approval Notifications (1 day)

**Feature**: Notify admins when orders need approval.

**Channels**:
- Email notification
- In-app notification badge
- Slack integration (optional)

**Deliverable**: Approval notifications

---

### Task 21.4: Approval Analytics (1 day)

**Feature**: Track approval metrics.

**Metrics**:
- Auto-approval rate
- Average approval time
- Rejection reasons
- Approval bottlenecks

**Deliverable**: Approval analytics dashboard

---

## Week 22: Email Processing Agent

### Task 22.1: Email Ingestion (2 days)

**Feature**: Monitor support email inbox and process messages.

**Implementation**:
```typescript
// Webhook from email service (SendGrid, Mailgun, etc.)
export async function POST(request: Request) {
  const emailData = await request.json();
  
  // Extract email content
  const { from, subject, body, attachments } = emailData;
  
  // Use AI to classify email
  const classification = await classifyEmail(subject, body);
  
  // Route based on classification
  switch (classification.type) {
    case 'order_inquiry':
      await handleOrderInquiry(from, body);
      break;
    case 'support_request':
      await createSupportTicket(from, subject, body);
      break;
    case 'quote_request':
      await createQuoteRequest(from, body);
      break;
    case 'complaint':
      await escalateToManager(from, subject, body);
      break;
    default:
      await routeToGeneralInbox(emailData);
  }
  
  return Response.json({ success: true });
}

async function classifyEmail(subject: string, body: string) {
  const prompt = `Classify this email:
  
  Subject: ${subject}
  Body: ${body}
  
  Return JSON:
  {
    "type": "order_inquiry" | "support_request" | "quote_request" | "complaint" | "other",
    "urgency": "low" | "medium" | "high",
    "sentiment": "positive" | "neutral" | "negative",
    "suggestedAction": "..."
  }`;
  
  return await generateJSON(prompt, { temperature: 0.3 });
}
```

**Deliverable**: Email processing webhook

---

### Task 22.2: Auto-Response System (1 day)

**Feature**: Automatically respond to common inquiries.

**Examples**:
- Order status → Look up order and send status
- Product availability → Check inventory and respond
- Pricing inquiry → Send pricing info (if authorized customer)

**Deliverable**: Auto-response for common emails

---

### Task 22.3: Email Routing Dashboard (1 day)

**File**: `apps/web/app/(app)/admin/emails/page.tsx`

**Purpose**: View processed emails and AI actions.

**Features**:
- List all processed emails
- Show AI classification
- View auto-responses sent
- Manual override/escalation

**Deliverable**: Email processing dashboard

---

### Task 22.4: Email Analytics (1 day)

**Feature**: Track email processing metrics.

**Metrics**:
- Emails processed
- Auto-response rate
- Classification accuracy
- Response time

**Deliverable**: Email analytics

---

## Dependencies

**This Phase Depends On**:
- ✅ [Phase 1: Foundation & Security](./PHASE_1_FOUNDATION_SECURITY.md) - Security foundation
- ✅ [Phase 2: AI Backend Logic](./PHASE_2_AI_BACKEND_LOGIC.md) - AI capabilities

**This Phase Enables**:
- 80% reduction in manual data entry
- Faster invoice processing
- Automated order approvals
- Improved email response times

---

## Success Criteria

- ✅ Invoices auto-matched to POs with 90%+ accuracy
- ✅ Documents processed and data extracted automatically
- ✅ Routine orders auto-approved
- ✅ Emails classified and routed correctly
- ✅ 80% reduction in manual data entry time
- ✅ Positive feedback from operations team

---

## Next Phase

**[Phase 6: Polish & Optimization →](./PHASE_6_POLISH_OPTIMIZATION.md)**

Final testing, optimization, and production deployment.

