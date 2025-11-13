'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Badge, Input } from '@/components/b2b';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface VendorInvoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  file_url: string;
  file_name: string;
  extraction_status: string;
  extraction_confidence: number | null;
  match_status: string;
  match_confidence: number | null;
  approval_status: string;
  payment_status: string;
  line_items: any[];
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      let query = supabase
        .from('vendor_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('approval_status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/invoices/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('Invoice uploaded successfully:', result.message);

      // Refresh invoices list
      fetchInvoices();
    } catch (error: any) {
      console.error('Upload failed:', error.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleApprove(invoiceId: string) {
    try {
      const { error } = await supabase
        .from('vendor_invoices')
        .update({
          approval_status: 'manually_approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      setSuccessMessage('Invoice approved');
      setTimeout(() => setSuccessMessage(null), 3000);

      fetchInvoices();
      setSelectedInvoice(null);
      setShowApproveConfirm(false);
    } catch (error: any) {
      console.error('Error approving invoice:', error.message);
    }
  }

  async function handleReject(invoiceId: string) {
    try {
      const { error } = await supabase
        .from('vendor_invoices')
        .update({
          approval_status: 'rejected',
          rejection_reason: 'Rejected by admin',
        })
        .eq('id', invoiceId);

      if (error) throw error;

      setSuccessMessage('Invoice rejected');
      setTimeout(() => setSuccessMessage(null), 3000);

      fetchInvoices();
      setSelectedInvoice(null);
      setShowRejectConfirm(false);
    } catch (error: any) {
      console.error('Error rejecting invoice:', error.message);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      auto_approved: { color: 'bg-green-500', icon: CheckCircle },
      manually_approved: { color: 'bg-blue-500', icon: CheckCircle },
      rejected: { color: 'bg-red-500', icon: XCircle },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  }

  function getMatchBadge(status: string, confidence: number | null) {
    if (status === 'matched') {
      return (
        <Badge className="bg-green-500 text-white">
          Matched ({confidence ? `${(confidence * 100).toFixed(0)}%` : 'N/A'})
        </Badge>
      );
    } else if (status === 'partial_match') {
      return (
        <Badge className="bg-yellow-500 text-white">
          Partial Match ({confidence ? `${(confidence * 100).toFixed(0)}%` : 'N/A'})
        </Badge>
      );
    } else if (status === 'no_match') {
      return <Badge className="bg-red-500 text-white">No Match</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">Unmatched</Badge>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vendor Invoices</h1>
          <p className="text-gray-600 mt-2">AI-powered invoice processing and reconciliation</p>
        </div>
        <div>
          <Button
            disabled={uploading}
            onClick={() => document.getElementById('invoice-upload')?.click()}
            data-testid="upload-invoice-button"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Invoice'}
          </Button>
          <Input
            id="invoice-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'auto_approved', 'manually_approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-b2b-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <Card className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No invoices found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3
                          className="text-xl font-bold text-navy-700 dark:text-white cursor-pointer hover:text-b2b-blue"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          {invoice.invoice_number}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {invoice.vendor_name} • {new Date(invoice.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${invoice.total_amount.toFixed(2)}</div>
                        <div className="flex gap-2 mt-2">
                          {getStatusBadge(invoice.approval_status)}
                          {getMatchBadge(invoice.match_status, invoice.match_confidence)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className="font-medium">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Extraction</p>
                        <p className="font-medium">
                          {invoice.extraction_confidence
                            ? `${(invoice.extraction_confidence * 100).toFixed(0)}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Line Items</p>
                        <p className="font-medium">{invoice.line_items?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payment</p>
                        <p className="font-medium capitalize">{invoice.payment_status}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {invoice.approval_status === 'pending' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowApproveConfirm(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowRejectConfirm(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && !showApproveConfirm && !showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-navy-700 dark:text-white">{selectedInvoice.invoice_number}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedInvoice.vendor_name}</p>
                </div>
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Date</p>
                  <p>{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</p>
                  <p className="text-2xl font-bold">${selectedInvoice.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</p>
                  <div className="border rounded-lg p-4 mt-2">
                    {selectedInvoice.line_items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.unit_price}
                          </p>
                        </div>
                        <p className="font-bold">${item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {selectedInvoice.approval_status === 'pending' && (
                <div className="flex gap-2 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setShowApproveConfirm(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectConfirm(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Approval</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve invoice {selectedInvoice.invoice_number} for ${selectedInvoice.total_amount.toFixed(2)}?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveConfirm(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleApprove(selectedInvoice.id)}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Rejection</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject invoice {selectedInvoice.invoice_number}?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectConfirm(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(selectedInvoice.id)}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
    </div>
  );
}

