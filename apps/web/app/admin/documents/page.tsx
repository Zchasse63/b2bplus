'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  description: string | null;
  document_type: string;
  ai_classified_type: string | null;
  file_path: string;
  file_size: number;
  mime_type: string;
  extraction_status: string;
  extraction_confidence: number | null;
  classification_confidence: number | null;
  extracted_text: string | null;
  is_public: boolean;
  created_at: string;
  similarity_score?: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();
  }, [filterType, filterStatus]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('document_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('extraction_status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: searchQuery,
          document_type: filterType !== 'all' ? filterType : undefined,
          extraction_status: filterStatus !== 'all' ? filterStatus : undefined,
          limit: 50,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Search failed');
      }

      setDocuments(result.documents || []);
      
      toast({
        title: 'Search Complete',
        description: `Found ${result.documents.length} documents`,
      });
    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message,
        variant: 'destructive',
      });
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

      const response = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Success',
        description: result.message,
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Document Deleted',
        description: 'Document has been deleted successfully.',
      });

      fetchDocuments();
      setSelectedDocument(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      processing: { color: 'bg-blue-500', icon: Clock },
      completed: { color: 'bg-green-500', icon: CheckCircle },
      failed: { color: 'bg-red-500', icon: XCircle },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function getDocumentIcon(mimeType: string) {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('image')) return '🖼️';
    return '📁';
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-gray-600 mt-2">AI-powered document management and search</p>
        </div>
        <div>
          <Label htmlFor="document-upload" className="cursor-pointer">
            <Button disabled={uploading} asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </span>
            </Button>
          </Label>
          <Input
            id="document-upload"
            type="file"
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Semantic Search</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Search documents by content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                  <SelectItem value="quote">Quotes</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="packing_slip">Packing Slips</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </p>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Display */}
      {loading ? (
        <div className="text-center py-12">Loading documents...</div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No documents found</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedDocument(doc)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-3xl mb-2">{getDocumentIcon(doc.mime_type)}</div>
                    <CardTitle className="text-lg line-clamp-2">{doc.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {doc.document_type.replace('_', ' ')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{formatFileSize(doc.file_size)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(doc.extraction_status)}
                  </div>
                  {doc.similarity_score && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Match:</span>
                      <span className="font-medium">{(doc.similarity_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedDocument(doc)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">{getDocumentIcon(doc.mime_type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{doc.name}</h3>
                      <p className="text-sm text-gray-600">
                        {doc.document_type.replace('_', ' ')} • {formatFileSize(doc.file_size)} • 
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {doc.similarity_score && (
                      <Badge variant="outline">
                        {(doc.similarity_score * 100).toFixed(0)}% match
                      </Badge>
                    )}
                    {getStatusBadge(doc.extraction_status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Details Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedDocument.name}</CardTitle>
                  <CardDescription>
                    {selectedDocument.document_type.replace('_', ' ')} • 
                    {formatFileSize(selectedDocument.file_size)}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedDocument(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Extraction Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedDocument.extraction_status)}</div>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="mt-1">{new Date(selectedDocument.created_at).toLocaleString()}</p>
                  </div>
                  {selectedDocument.extraction_confidence && (
                    <div>
                      <Label>Extraction Confidence</Label>
                      <p className="mt-1">{(selectedDocument.extraction_confidence * 100).toFixed(0)}%</p>
                    </div>
                  )}
                  {selectedDocument.ai_classified_type && (
                    <div>
                      <Label>AI Classification</Label>
                      <p className="mt-1">{selectedDocument.ai_classified_type}</p>
                    </div>
                  )}
                </div>
                {selectedDocument.extracted_text && (
                  <div>
                    <Label>Extracted Content</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{selectedDocument.extracted_text.substring(0, 1000)}...</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => handleDelete(selectedDocument.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

