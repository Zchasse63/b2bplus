# Bulk Customer Invoice Upload

Upload historical customer invoices and order data to populate usage history for AI-powered insights.

## Features

- **Multi-format support**: PDF, CSV, and Excel files
- **AI-powered extraction**: Automatically extracts data from PDF invoices
- **Customer linking**: Link invoices to existing customers or auto-detect from PDFs
- **Bulk processing**: Upload multiple files at once
- **Historical data**: Populate customer usage history for better AI recommendations

## Access

Navigate to: **Admin Portal → Invoices → Bulk Upload**

URL: `/admin/invoices/bulk-upload`

## File Formats

### 📄 PDF Files (AI-Powered)

**Best for**: Scanned or digital invoices

**Features**:
- AI automatically extracts all invoice data
- Can auto-detect customer or link to selected customer
- Extracts: invoice number, date, line items, amounts, customer info

**How to use**:
1. Select customer from dropdown OR enable "Auto-detect customer"
2. Upload one or more PDF files
3. AI processes each invoice and creates records

### 📊 CSV Files

**Best for**: Bulk historical data import from spreadsheets

**Requirements**:
- Must select a customer before uploading
- CSV must have header row with column names

**Required columns**:
- `invoice_number` - Unique invoice identifier
- `invoice_date` - Date in YYYY-MM-DD format
- `product_name` - Product/item name
- `quantity` - Quantity ordered
- `unit_price` - Price per unit
- `total_amount` - Total invoice amount

**Optional columns**:
- `due_date` - Payment due date
- `po_number` - Purchase order number
- `sku` - Product SKU/code
- `line_total` - Line item total (calculated if not provided)
- `subtotal` - Invoice subtotal
- `tax_amount` - Tax amount
- `shipping_amount` - Shipping cost
- `payment_terms` - Payment terms (e.g., "Net 30")
- `notes` - Additional notes

**Format**:
- Multiple rows with same `invoice_number` = multiple line items for one invoice
- First row of each invoice should have totals (subtotal, tax, shipping, total_amount)
- Subsequent rows for same invoice can omit totals

**Example**:
```csv
invoice_number,invoice_date,sku,product_name,quantity,unit_price,line_total,total_amount
INV-001,2024-01-15,SKU-001,Coffee Beans,10,25.00,250.00,501.00
INV-001,2024-01-15,SKU-002,Espresso Machine,2,100.00,200.00,
INV-002,2024-01-20,SKU-003,Coffee Filters,50,2.00,100.00,118.00
```

Download template: [invoice-upload-csv-template.csv](/docs/invoice-upload-csv-template.csv)

### 📈 Excel Files

**Status**: Coming soon (convert to CSV for now)

## Workflow

### Option 1: PDF Upload with Auto-Detect

1. Navigate to `/admin/invoices/bulk-upload`
2. Check "Auto-detect customer from PDF invoices"
3. Select one or more PDF files
4. Click "Upload & Process"
5. AI extracts data and matches/creates customers automatically

### Option 2: PDF Upload with Selected Customer

1. Navigate to `/admin/invoices/bulk-upload`
2. Select customer from dropdown
3. Select one or more PDF files
4. Click "Upload & Process"
5. All invoices linked to selected customer

### Option 3: CSV Upload

1. Navigate to `/admin/invoices/bulk-upload`
2. **Must select customer from dropdown** (required for CSV)
3. Select CSV file with invoice data
4. Click "Upload & Process"
5. System creates invoices with line items from CSV

## Results

After upload, you'll see:

**Summary**:
- Total files processed
- Successful uploads
- Failed uploads

**Details for each file**:
- ✅ Success: Invoice number, customer name, amount
- ❌ Failure: Error message

## Data Storage

**Invoices table**:
- Invoice number, dates, amounts
- Customer/organization link
- Payment status (defaults to "unpaid" for historical data)
- Metadata with source info

**Metadata includes**:
- Source: `bulk_upload_pdf` or `bulk_upload_csv`
- Original filename
- Extracted customer info (for PDFs)
- Line items (for CSVs)

## Use Cases

1. **Onboarding new customers**: Upload their historical invoices to populate usage patterns
2. **Data migration**: Import invoices from old system
3. **AI training**: Provide historical data for better recommendations
4. **Customer insights**: Analyze past purchasing behavior

## Tips

- **PDFs**: Best quality results with clear, well-formatted invoices
- **CSVs**: Group line items by invoice_number for proper invoice creation
- **Customer matching**: Auto-detect uses fuzzy matching on customer name
- **Large batches**: Process in chunks of 10-20 files for best performance
- **Validation**: Review results after upload to ensure accuracy

## Troubleshooting

**"Customer Required" error**:
- CSV/Excel files require customer selection
- Either select a customer OR enable auto-detect for PDFs

**"Missing required fields" error**:
- PDF: Invoice must have invoice_number and invoice_date
- CSV: Check that required columns are present

**"Failed to create organization" warning**:
- Auto-detect couldn't match customer name
- Invoice created without customer link
- Manually link invoice to customer later

**Low extraction confidence**:
- PDF quality may be poor
- Try rescanning at higher resolution
- Or manually enter data via CSV

## API Endpoint

**POST** `/api/admin/invoices/bulk-upload`

**Request**: `multipart/form-data`
- `files`: File[] (PDFs, CSVs, or Excel)
- `organization_id`: string (optional - customer ID)
- `auto_detect`: boolean (optional - enable auto-detect for PDFs)

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "filename": "invoice.pdf",
      "success": true,
      "invoice_id": "uuid",
      "invoice_number": "INV-001",
      "customer_name": "Acme Corp",
      "total_amount": 1250.00
    }
  ],
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 1
  }
}
```

## Security

- **Admin only**: Requires admin or super_admin role
- **RLS policies**: All invoices protected by row-level security
- **Audit logging**: All uploads logged via `log_admin_activity()`
- **File validation**: Only PDF, CSV, Excel files accepted (max 50MB)

## Future Enhancements

- [ ] Excel file processing (currently requires CSV conversion)
- [ ] Batch customer creation from CSV
- [ ] Invoice validation rules
- [ ] Duplicate detection
- [ ] Preview before final import
- [ ] Undo/rollback capability

