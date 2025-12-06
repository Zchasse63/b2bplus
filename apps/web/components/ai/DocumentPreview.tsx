'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/b2b/Button';

interface DocumentPreviewProps {
  className?: string;
  fileId: string;
  fileName: string;
  headers: string[];
  preview: any[][];
  rowCount: number;
  analysis?: DocumentAnalysis | null;
  onImport?: (mappings: ColumnMapping[], options: ImportOptions) => void;
  onCancel?: () => void;
  isAnalyzing?: boolean;
  isImporting?: boolean;
}

interface DocumentAnalysis {
  documentType: 'invoice' | 'purchase_order' | 'price_list' | 'product_catalog' | 'unknown';
  confidence: number;
  detectedColumns: Array<{
    originalHeader: string;
    mappedTo: string;
    confidence: number;
    sampleValues: string[];
  }>;
  warnings: Array<{
    type: string;
    message: string;
    rowNumbers?: number[];
    suggestion?: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

interface ColumnMapping {
  originalHeader: string;
  mappedTo: string;
  skip: boolean;
}

interface ImportOptions {
  createMissingProducts: boolean;
  createCategories: boolean;
  updateExisting: boolean;
  dryRun: boolean;
}

/**
 * Document Preview Component
 *
 * Shows parsed document data with AI-detected column mappings.
 * Allows user to review and adjust before importing.
 */
export function DocumentPreview({
  className,
  fileId,
  fileName,
  headers,
  preview,
  rowCount,
  analysis,
  onImport,
  onCancel,
  isAnalyzing = false,
  isImporting = false,
}: DocumentPreviewProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    createMissingProducts: false,
    createCategories: true,
    updateExisting: true,
    dryRun: false,
  });
  const [showAllRows, setShowAllRows] = useState(false);

  // Initialize mappings from analysis
  useEffect(() => {
    if (analysis?.detectedColumns) {
      setMappings(
        analysis.detectedColumns.map((col) => ({
          originalHeader: col.originalHeader,
          mappedTo: col.mappedTo,
          skip: false,
        }))
      );
    } else {
      setMappings(
        headers.map((header) => ({
          originalHeader: header,
          mappedTo: '',
          skip: false,
        }))
      );
    }
  }, [analysis, headers]);

  const handleMappingChange = (index: number, field: keyof ColumnMapping, value: any) => {
    setMappings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleImport = () => {
    onImport?.(mappings, options);
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'purchase_order':
        return 'Purchase Order';
      case 'price_list':
        return 'Price List';
      case 'product_catalog':
        return 'Product Catalog';
      default:
        return 'Unknown Document';
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return '🧾';
      case 'purchase_order':
        return '📋';
      case 'price_list':
        return '💰';
      case 'product_catalog':
        return '📦';
      default:
        return '📄';
    }
  };

  const standardFields: Record<string, string[]> = {
    invoice: [
      'invoice_number', 'invoice_date', 'due_date', 'customer_name', 'customer_account',
      'item_number', 'description', 'quantity', 'unit_price', 'extended_price',
      'subtotal', 'tax', 'total',
    ],
    purchase_order: [
      'po_number', 'po_date', 'ship_to', 'item_number', 'description',
      'quantity', 'requested_date', 'unit_price',
    ],
    price_list: [
      'item_number', 'description', 'pack_size', 'category',
      'region1_price', 'region2_price', 'region3_price', 'region4_price', 'region5_price',
    ],
    product_catalog: [
      'item_number', 'name', 'description', 'category', 'brand',
      'pack_size', 'base_price', 'unit',
    ],
  };

  const availableFields = analysis?.documentType
    ? standardFields[analysis.documentType] || []
    : Object.values(standardFields).flat();

  return (
    <div className={cn('w-full bg-white rounded-xl shadow-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-b2b-gray-50 px-6 py-4 border-b border-b2b-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {isAnalyzing ? '🔄' : getDocumentTypeIcon(analysis?.documentType || 'unknown')}
            </span>
            <div>
              <h3 className="font-semibold text-b2b-text">{fileName}</h3>
              <p className="text-sm text-b2b-text-light">
                {isAnalyzing
                  ? 'Analyzing document structure...'
                  : `${getDocumentTypeLabel(analysis?.documentType || 'unknown')} • ${rowCount} rows`}
              </p>
            </div>
          </div>
          {analysis && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  analysis.confidence >= 80
                    ? 'bg-green-100 text-green-700'
                    : analysis.confidence >= 50
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {analysis.confidence}% confidence
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Loading State */}
      {isAnalyzing && (
        <div className="p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block text-4xl mb-4"
          >
            🔄
          </motion.div>
          <p className="text-b2b-text-light">
            AI is analyzing your document structure...
          </p>
        </div>
      )}

      {/* Warnings */}
      {analysis?.warnings && analysis.warnings.length > 0 && (
        <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
          <ul className="space-y-1">
            {analysis.warnings.slice(0, 5).map((warning, i) => (
              <li key={i} className="text-sm text-yellow-700">
                {warning.message}
                {warning.suggestion && (
                  <span className="text-yellow-600"> — {warning.suggestion}</span>
                )}
              </li>
            ))}
            {analysis.warnings.length > 5 && (
              <li className="text-sm text-yellow-600">
                +{analysis.warnings.length - 5} more warnings
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Column Mappings */}
      {!isAnalyzing && (
        <div className="px-6 py-4 border-b border-b2b-gray-200">
          <h4 className="font-medium text-b2b-text mb-3">Column Mappings</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {mappings.map((mapping, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-4 p-2 rounded-lg',
                  mapping.skip ? 'bg-b2b-gray-100 opacity-50' : 'bg-white'
                )}
              >
                <div className="w-1/3">
                  <span className="text-sm font-medium text-b2b-text">
                    {mapping.originalHeader}
                  </span>
                </div>
                <span className="text-b2b-text-light">→</span>
                <div className="flex-1">
                  <select
                    value={mapping.mappedTo}
                    onChange={(e) => handleMappingChange(index, 'mappedTo', e.target.value)}
                    disabled={mapping.skip}
                    className="w-full rounded-lg border border-b2b-gray-200 px-3 py-1.5 text-sm"
                  >
                    <option value="">Skip this column</option>
                    {availableFields.map((field) => (
                      <option key={field} value={field}>
                        {field.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-1 text-sm text-b2b-text-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mapping.skip}
                    onChange={(e) => handleMappingChange(index, 'skip', e.target.checked)}
                    className="rounded"
                  />
                  Skip
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Preview */}
      {!isAnalyzing && (
        <div className="px-6 py-4 border-b border-b2b-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-b2b-text">Data Preview</h4>
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="text-sm text-b2b-blue hover:underline"
            >
              {showAllRows ? 'Show less' : `Show all ${preview.length} rows`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-b2b-gray-50">
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-b2b-text-light whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllRows ? preview : preview.slice(0, 5)).map((row, i) => (
                  <tr key={i} className="border-t border-b2b-gray-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-b2b-text whitespace-nowrap">
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Options */}
      {!isAnalyzing && (
        <div className="px-6 py-4 border-b border-b2b-gray-200">
          <h4 className="font-medium text-b2b-text mb-3">Import Options</h4>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={options.createMissingProducts}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, createMissingProducts: e.target.checked }))
                }
                className="rounded"
              />
              <span>Create missing products</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={options.createCategories}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, createCategories: e.target.checked }))
                }
                className="rounded"
              />
              <span>Create missing categories</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={options.updateExisting}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, updateExisting: e.target.checked }))
                }
                className="rounded"
              />
              <span>Update existing records</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={options.dryRun}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, dryRun: e.target.checked }))
                }
                className="rounded"
              />
              <span>Dry run (preview only)</span>
            </label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 bg-b2b-gray-50 flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <div className="flex gap-3">
          {analysis && (
            <Button
              variant="primary"
              onClick={handleImport}
              loading={isImporting}
              disabled={isAnalyzing || isImporting}
            >
              {options.dryRun ? 'Preview Import' : 'Import Data'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentPreview;
