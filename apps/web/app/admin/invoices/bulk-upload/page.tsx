'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface UploadResult {
  filename: string;
  success: boolean;
  invoice_id?: string;
  invoice_number?: string;
  customer_name?: string;
  total_amount?: number;
  count?: number;
  invoices?: string[];
  error?: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function BulkInvoiceUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [autoDetect, setAutoDetect] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const { toast } = useToast();

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchOrganizations() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Failed to fetch organizations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load customer list',
          variant: 'destructive',
        });
      } else {
        setOrganizations(data || []);
      }
      setLoadingOrgs(false);
    }

    fetchOrganizations();
  }, [toast]);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    // Validate file types (PDF, CSV, Excel)
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const invalidFiles = selectedFiles.filter(
      f => !allowedTypes.includes(f.type) && !f.name.endsWith('.csv')
    );
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid Files',
        description: `Only PDF, CSV, and Excel files are allowed. Found: ${invalidFiles.map(f => f.name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setFiles(selectedFiles);
    setResults([]);
    setSummary(null);
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please select at least one file to upload',
        variant: 'destructive',
      });
      return;
    }

    // Check if CSV/Excel files require organization selection
    const hasCSVOrExcel = files.some(
      f => f.type === 'text/csv' ||
           f.name.endsWith('.csv') ||
           f.type.includes('spreadsheet') ||
           f.type.includes('excel')
    );

    if (hasCSVOrExcel && !selectedOrgId && !autoDetect) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer for CSV/Excel uploads, or enable auto-detect for PDFs',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      if (selectedOrgId) {
        formData.append('organization_id', selectedOrgId);
      }
      formData.append('auto_detect', autoDetect.toString());

      const response = await fetch('/api/admin/invoices/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setResults(result.results);
      setSummary(result.summary);

      toast({
        title: 'Upload Complete',
        description: `Successfully processed ${result.summary.successful} of ${result.summary.total} files`,
      });

    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  function clearFiles() {
    setFiles([]);
    setResults([]);
    setSummary(null);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk Customer Data Upload</h1>
        <p className="text-gray-600 mt-2">
          Upload customer invoices and order data in PDF, CSV, or Excel format.
          AI will automatically parse and link to customer profiles.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Customer Data</CardTitle>
          <CardDescription>
            Upload PDFs (AI extracts data), CSVs, or Excel files with customer invoices and orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer (Optional for PDFs, Required for CSV/Excel)</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                disabled={loadingOrgs || autoDetect}
                className="w-full p-2 border rounded-md"
              >
                <option value="">-- Select Customer (or enable auto-detect) --</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="auto-detect"
                  checked={autoDetect}
                  onChange={(e) => {
                    setAutoDetect(e.target.checked);
                    if (e.target.checked) setSelectedOrgId('');
                  }}
                  className="rounded"
                />
                <label htmlFor="auto-detect" className="text-sm text-gray-600">
                  Auto-detect customer from PDF invoices (AI will try to match or create customers)
                </label>
              </div>
            </div>
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex justify-center gap-4 mb-4">
                <FileText className="w-12 h-12 text-gray-400" />
                <FileSpreadsheet className="w-12 h-12 text-gray-400" />
              </div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to select files
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xls,.xlsx,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">PDF, CSV, or Excel files (up to 50MB each)</p>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Selected Files ({files.length})</h3>
                  <Button variant="outline" size="sm" onClick={clearFiles}>
                    Clear All
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="flex-1 text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing {files.length} file{files.length !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Process {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {summary && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-3xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-3xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <div className="text-3xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Details */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>Detailed results for each uploaded invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{result.filename}</div>
                      {result.success ? (
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          {result.count ? (
                            <>
                              <div>Created {result.count} invoice{result.count !== 1 ? 's' : ''}</div>
                              {result.invoices && result.invoices.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Invoice #s: {result.invoices.slice(0, 3).join(', ')}
                                  {result.invoices.length > 3 && ` +${result.invoices.length - 3} more`}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>Invoice #: {result.invoice_number}</div>
                              <div>Customer: {result.customer_name}</div>
                              <div>Amount: ${result.total_amount?.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">ID: {result.invoice_id}</div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {files.length === 0 && results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">📄 PDF Files (AI-Powered)</h3>
                <ul className="list-disc list-inside ml-4 text-sm text-gray-600 space-y-1">
                  <li>AI automatically extracts all invoice data</li>
                  <li>Can auto-detect customer or link to selected customer</li>
                  <li>Best for scanned or digital invoices</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">📊 CSV/Excel Files</h3>
                <ul className="list-disc list-inside ml-4 text-sm text-gray-600 space-y-1">
                  <li>Must select a customer before uploading</li>
                  <li>Expected columns: invoice_number, invoice_date, product_name, quantity, unit_price, total_amount</li>
                  <li>Can have multiple line items per invoice</li>
                  <li>Best for bulk historical data import</li>
                </ul>
                <a
                  href="/docs/invoice-upload-csv-template.csv"
                  download
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  📥 Download CSV Template
                </a>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> For CSV/Excel files, group rows by invoice_number. Each unique invoice_number creates one invoice with multiple line items.
                </p>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This feature is for uploading historical customer invoices (accounts receivable).
                  For vendor invoices (accounts payable), use the regular invoice upload page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

