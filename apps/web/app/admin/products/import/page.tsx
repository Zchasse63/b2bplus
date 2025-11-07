'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Button } from '@/components/b2b';
import { Input } from '@/components/b2b';
import { Card } from '@/components/b2b';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/b2b';
import { ArrowLeft, RefreshCw, Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ImportProductsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const requiredFields = ['name', 'sku', 'category', 'base_price'];
  const optionalFields = ['description', 'stock_quantity', 'image_url'];
  const allFields = [...requiredFields, ...optionalFields];

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    setCSVHeaders(headers);

    // Auto-map columns if they match exactly
    const autoMapping: { [key: string]: string } = {};
    allFields.forEach(field => {
      const matchingHeader = headers.find(h => 
        h.toLowerCase() === field.toLowerCase() || 
        h.toLowerCase().replace(/_/g, ' ') === field.toLowerCase().replace(/_/g, ' ')
      );
      if (matchingHeader) {
        autoMapping[field] = matchingHeader;
      }
    });
    setColumnMapping(autoMapping);

    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setCSVData(data);
    };
    reader.readAsText(selectedFile);
  };

  const handleMappingChange = (field: string, csvColumn: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: csvColumn }));
  };

  const validateMapping = (): boolean => {
    for (const field of requiredFields) {
      if (!columnMapping[field]) {
        alert(`Please map the required field: ${field}`);
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateMapping()) return;

    setImporting(true);
    const supabase = createClient();
    const results: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        // Map CSV columns to product fields
        const productData: any = {};
        
        // Required fields
        productData.name = row[columnMapping.name];
        productData.sku = row[columnMapping.sku];
        productData.category = row[columnMapping.category];
        productData.base_price = parseFloat(row[columnMapping.base_price]);

        // Optional fields
        if (columnMapping.description) {
          productData.description = row[columnMapping.description] || null;
        }
        if (columnMapping.stock_quantity) {
          const stock = parseInt(row[columnMapping.stock_quantity]);
          productData.stock_quantity = isNaN(stock) ? null : stock;
        }
        if (columnMapping.image_url) {
          productData.image_url = row[columnMapping.image_url] || null;
        }

        // Validate required data
        if (!productData.name || !productData.sku || !productData.category || isNaN(productData.base_price)) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Missing or invalid required fields`);
          continue;
        }

        // Insert product
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2} (${productData.sku}): ${error.message}`);
        } else {
          results.success++;
          
          // Log activity
          await supabase.rpc('log_admin_activity', {
            p_action: 'import',
            p_entity_type: 'product',
            p_entity_id: data.id,
            p_details: { product_name: data.name, sku: data.sku, source: 'csv_import' },
          });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    setImportResult(results);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = 'name,sku,category,description,base_price,stock_quantity,image_url\n' +
                    '16oz White Paper Hot Cup,CUP-16OZ-WHT-1000,Cups,Premium white paper hot cup,89.99,500,https://example.com/cup.jpg\n' +
                    '10" White Paper Plates,PLATE-10IN-WHT-500,Plates,Disposable white paper plates,52.99,1000,https://example.com/plate.jpg';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-8 w-8" />
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Import Products from CSV</h1>
        <p className="text-muted-foreground mt-1">
          Bulk upload products using a CSV file
        </p>
      </div>

      {/* Download Template */}
      <Card className="mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">Step 1: Download Template</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download our CSV template to ensure your data is formatted correctly
          </p>
        </div>
        <div>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
        </div>
      </Card>

      {/* Upload File */}
      <Card className="mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">Step 2: Upload CSV File</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select your CSV file containing product data
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div>
              <label htmlFor="csv-file">CSV File</label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>
            {file && (
              <div className="text-sm text-muted-foreground">
                File: {file.name} ({csvData.length} rows)
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Column Mapping */}
      {csvHeaders.length > 0 && (
        <Card className="mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-navy-700 dark:text-white">Step 3: Map Columns</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Match your CSV columns to product fields (* = required)
            </p>
          </div>
          <div>
            <div className="space-y-4">
              {allFields.map(field => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <label>
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {requiredFields.includes(field) && <span className="text-destructive"> *</span>}
                  </label>
                  <Select
                    value={columnMapping[field] || ''}
                    onValueChange={(value) => handleMappingChange(field, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not mapped --</SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Import Button */}
      {csvData.length > 0 && (
        <Card className="mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-navy-700 dark:text-white">Step 4: Import Products</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review your mapping and click import to add products
            </p>
          </div>
          <div>
            <Button 
              onClick={handleImport} 
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <motion.div
                    className="inline-block mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </motion.div>
                  Importing {csvData.length} products...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {csvData.length} Products
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-navy-700 dark:text-white">Import Results</h2>
          </div>
          <div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{importResult.success} products imported successfully</span>
              </div>
              {importResult.failed > 0 && (
                <>
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">{importResult.failed} products failed</span>
                  </div>
                  <div className="mt-4">
                    <label>Errors:</label>
                    <div className="mt-2 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-muted-foreground mb-1">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Link href="/admin/products">
                <Button className="mt-4">
                  View Products
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
