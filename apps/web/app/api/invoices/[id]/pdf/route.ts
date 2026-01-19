import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, NotFoundError } from '@/lib/middleware/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'authenticated');
    if (!allowed) return rateLimitResponse!;

    const supabase = createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('Unauthorized');
    }

    // Get invoice details with all related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        orders (
          id,
          order_number,
          po_number,
          order_items (
            id,
            quantity,
            unit_price,
            line_total,
            sku,
            name
          )
        ),
        organizations (
          name,
          email,
          phone
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      throw new NotFoundError('Invoice', params.id);
    }
    
    // Generate PDF HTML content
    const pdfHtml = generateInvoicePDF(invoice);
    
    // Return HTML for now (can be converted to PDF using a library like puppeteer or jsPDF)
    return new NextResponse(pdfHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.html"`,
      },
    });

  } catch (error) {
    return handleError(error);
  }
}

function generateInvoicePDF(invoice: any): string {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0066cc;
    }
    
    .company-info h1 {
      color: #0066cc;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-info h2 {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    
    .invoice-number {
      font-size: 18px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .status-unpaid {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .status-paid {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .status-overdue {
      background-color: #fee2e2;
      color: #991b1b;
    }
    
    .details-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .detail-box h3 {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    
    .detail-box p {
      margin-bottom: 5px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table thead {
      background-color: #f3f4f6;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table .text-right {
      text-align: right;
    }
    
    .items-table .item-name {
      font-weight: 500;
    }
    
    .items-table .item-sku {
      font-size: 14px;
      color: #666;
    }
    
    .totals-section {
      margin-left: auto;
      width: 300px;
      margin-bottom: 40px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row.grand-total {
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      font-size: 20px;
      font-weight: 700;
      color: #0066cc;
      margin-top: 10px;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>B2B+</h1>
      <p>${invoice.organizations.name}</p>
      ${invoice.organizations.email ? `<p>${invoice.organizations.email}</p>` : ''}
      ${invoice.organizations.phone ? `<p>${invoice.organizations.phone}</p>` : ''}
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p class="invoice-number">${invoice.invoice_number}</p>
      <p>Issue Date: ${formatDate(invoice.issue_date)}</p>
      ${invoice.due_date ? `<p>Due Date: ${formatDate(invoice.due_date)}</p>` : ''}
      <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
    </div>
  </div>
  
  <div class="details-section">
    <div class="detail-box">
      <h3>Bill To</h3>
      <p><strong>${invoice.organizations.name}</strong></p>
      ${invoice.organizations.email ? `<p>${invoice.organizations.email}</p>` : ''}
      ${invoice.organizations.phone ? `<p>${invoice.organizations.phone}</p>` : ''}
    </div>
    <div class="detail-box">
      <h3>Order Information</h3>
      <p><strong>Order:</strong> ${invoice.orders.order_number}</p>
      ${invoice.orders.po_number ? `<p><strong>PO Number:</strong> ${invoice.orders.po_number}</p>` : ''}
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.orders.order_items.map((item: any) => `
        <tr>
          <td>
            <div class="item-name">${item.name}</div>
            <div class="item-sku">SKU: ${item.sku}</div>
          </td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.line_total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals-section">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    <div class="total-row">
      <span>Tax</span>
      <span>${formatCurrency(invoice.tax_amount)}</span>
    </div>
    <div class="total-row">
      <span>Shipping</span>
      <span>${invoice.shipping_amount === 0 ? 'FREE' : formatCurrency(invoice.shipping_amount)}</span>
    </div>
    <div class="total-row grand-total">
      <span>Total</span>
      <span>${formatCurrency(invoice.total_amount)}</span>
    </div>
  </div>
  
  ${invoice.paid_at ? `
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="color: #065f46; font-weight: 600;">
        ✓ Paid on ${formatDate(invoice.paid_at)}
        ${invoice.payment_method ? ` via ${invoice.payment_method}` : ''}
      </p>
    </div>
  ` : ''}
  
  ${invoice.notes ? `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; color: #666; margin-bottom: 10px;">Notes</h3>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>For questions about this invoice, please contact ${invoice.organizations.email || 'support@b2bplus.com'}</p>
  </div>
  
  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="padding: 12px 24px; background-color: #0066cc; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
      Print Invoice
    </button>
  </div>
</body>
</html>
  `.trim();
}
