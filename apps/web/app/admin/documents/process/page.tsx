'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentUpload } from '@/components/ai/DocumentUpload';
import { DocumentPreview } from '@/components/ai/DocumentPreview';
import { Button } from '@/components/b2b/Button';

interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileType: string;
  documentType: string;
  headers?: string[];
  rowCount?: number;
  preview?: any[][];
  status: string;
  error?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
}

type DocumentType = 'invoice' | 'purchase_order' | 'price_list' | 'product_catalog';

export default function DocumentProcessingPage() {
  const [activeTab, setActiveTab] = useState<DocumentType>('invoice');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [recentImports, setRecentImports] = useState<any[]>([]);

  const handleUploadComplete = useCallback(async (result: UploadResult) => {
    setUploadResult(result);
    setAnalysis(null);
    setImportResult(null);

    // Automatically analyze the uploaded document
    if (result.status === 'ready_for_analysis') {
      setIsAnalyzing(true);
      try {
        const response = await fetch('/api/ai/documents/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: result.fileId,
            headers: result.headers,
            sampleRows: result.preview,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis);
        }
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const handleImport = useCallback(async (mappings: any[], options: any) => {
    if (!uploadResult) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/ai/documents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          documentType: analysis?.documentType || activeTab,
          mappings,
          data: {
            ...analysis,
          },
          options,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setRecentImports((prev) => [
          {
            id: result.fileId,
            fileName: uploadResult.fileName,
            type: analysis?.documentType || activeTab,
            imported: result.imported,
            errors: result.errors?.length || 0,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  }, [uploadResult, analysis, activeTab]);

  const handleCancel = useCallback(() => {
    setUploadResult(null);
    setAnalysis(null);
    setImportResult(null);
  }, []);

  const tabs: { key: DocumentType; label: string; icon: string }[] = [
    { key: 'invoice', label: 'Invoices', icon: '🧾' },
    { key: 'purchase_order', label: 'Purchase Orders', icon: '📋' },
    { key: 'price_list', label: 'Price Lists', icon: '💰' },
    { key: 'product_catalog', label: 'Product Catalog', icon: '📦' },
  ];

  return (
    <div className="min-h-screen bg-b2b-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-b2b-text mb-2">
            🤖 AI Document Processing
          </h1>
          <p className="text-b2b-text-light">
            Upload and process documents with AI-assisted parsing using Grok 4.1 Fast Reasoning.
            <br />
            Supports CSV, Excel, and PDF files with automatic column detection.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-b2b-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    handleCancel();
                  }}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'border-b2b-blue text-b2b-blue'
                      : 'border-transparent text-b2b-text-light hover:text-b2b-text'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {!uploadResult ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="max-w-2xl mx-auto">
                    <h2 className="text-lg font-semibold text-b2b-text mb-4">
                      Upload {tabs.find((t) => t.key === activeTab)?.label}
                    </h2>
                    <p className="text-b2b-text-light mb-6">
                      {activeTab === 'invoice' &&
                        'Upload historical invoices to import customer order history. The AI will extract item numbers, quantities, and pricing.'}
                      {activeTab === 'purchase_order' &&
                        'Upload customer purchase orders to create new orders automatically. Supports multi-line POs with different ship-to addresses.'}
                      {activeTab === 'price_list' &&
                        'Upload price lists with multiple regional pricing columns. The AI detects up to 5 different price tiers automatically.'}
                      {activeTab === 'product_catalog' &&
                        'Upload product catalogs to add or update products including pack sizes, categories, and specifications.'}
                    </p>
                    <DocumentUpload
                      onUploadComplete={handleUploadComplete}
                      documentType={activeTab}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <DocumentPreview
                    fileId={uploadResult.fileId}
                    fileName={uploadResult.fileName}
                    headers={uploadResult.headers || []}
                    preview={uploadResult.preview || []}
                    rowCount={uploadResult.rowCount || 0}
                    analysis={analysis}
                    onImport={handleImport}
                    onCancel={handleCancel}
                    isAnalyzing={isAnalyzing}
                    isImporting={isImporting}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Import Result */}
        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-6 rounded-xl ${
                importResult.errors.length === 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">
                {importResult.errors.length === 0 ? '✅ Import Complete' : '⚠️ Import Completed with Errors'}
              </h3>
              <p className="text-b2b-text-light mb-4">
                Successfully imported {importResult.imported} records.
                {importResult.errors.length > 0 && ` ${importResult.errors.length} errors encountered.`}
                {importResult.warnings.length > 0 && ` ${importResult.warnings.length} warnings.`}
              </p>

              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-red-500">
                        +{importResult.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <Button variant="outline" onClick={handleCancel}>
                Process Another Document
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Imports */}
        {recentImports.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-b2b-text mb-4">
              📋 Recent Imports
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-b2b-text-light border-b border-b2b-gray-200">
                    <th className="pb-3 font-medium">File</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Records</th>
                    <th className="pb-3 font-medium">Errors</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentImports.map((item, i) => (
                    <tr key={i} className="border-b border-b2b-gray-100">
                      <td className="py-3">{item.fileName}</td>
                      <td className="py-3 capitalize">{item.type.replace('_', ' ')}</td>
                      <td className="py-3">{item.imported}</td>
                      <td className="py-3">
                        {item.errors > 0 ? (
                          <span className="text-red-600">{item.errors}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="py-3 text-b2b-text-light">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-b2b-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-b2b-blue mb-2">💡 Tips for Best Results</h3>
          <ul className="text-sm text-b2b-text space-y-2">
            <li>• <strong>Invoices:</strong> Include invoice number, date, customer info, and line items with SKUs</li>
            <li>• <strong>Purchase Orders:</strong> Include PO number, ship-to address, and product quantities</li>
            <li>• <strong>Price Lists:</strong> Use consistent column headers for regional pricing (e.g., "Region 1", "Zone A")</li>
            <li>• <strong>Product Catalogs:</strong> Include SKU, name, description, and category information</li>
            <li>• The AI uses Grok 4.1 Fast Reasoning for complex document analysis and mapping</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
