'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/b2b/Button';

interface DocumentUploadProps {
  className?: string;
  onUploadComplete?: (result: UploadResult) => void;
  allowedTypes?: ('csv' | 'xlsx' | 'pdf')[];
  documentType?: 'invoice' | 'purchase_order' | 'price_list' | 'product_catalog' | 'auto';
}

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

/**
 * Document Upload Component
 *
 * Handles file uploads for AI-assisted document processing.
 * Supports drag and drop, with progress indication.
 */
export function DocumentUpload({
  className,
  onUploadComplete,
  allowedTypes = ['csv', 'xlsx', 'pdf'],
  documentType = 'auto',
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedTypes.includes(extension as any)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, [allowedTypes]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/ai/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const result = await response.json();
      onUploadComplete?.(result);
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, documentType, onUploadComplete]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const acceptTypes = allowedTypes.map((type) => {
    switch (type) {
      case 'csv':
        return '.csv,text/csv';
      case 'xlsx':
        return '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
      case 'pdf':
        return '.pdf,application/pdf';
      default:
        return '';
    }
  }).join(',');

  return (
    <div className={cn('w-full', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-colors',
          isDragging
            ? 'border-b2b-blue bg-b2b-blue-50'
            : 'border-b2b-gray-300 hover:border-b2b-blue-300',
          selectedFile && 'border-b2b-green bg-b2b-green-50'
        )}
      >
        <input
          type="file"
          accept={acceptTypes}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="text-center">
          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-4xl mb-2">
                  {selectedFile.name.endsWith('.pdf') ? '📄' : '📊'}
                </div>
                <p className="font-medium text-b2b-text">{selectedFile.name}</p>
                <p className="text-sm text-b2b-text-light mt-1">
                  {formatFileSize(selectedFile.size)}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-4xl mb-2">📁</div>
                <p className="font-medium text-b2b-text">
                  {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-sm text-b2b-text-light mt-1">
                  or click to browse
                </p>
                <p className="text-xs text-b2b-text-light mt-2">
                  Supported: {allowedTypes.map((t) => t.toUpperCase()).join(', ')} (max 10MB)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-600 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between text-sm text-b2b-text-light mb-2">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-b2b-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-b2b-blue"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {selectedFile && !isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex gap-3"
        >
          <Button
            variant="outline"
            onClick={removeFile}
            className="flex-1"
          >
            Remove
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            className="flex-1"
          >
            Upload & Analyze
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default DocumentUpload;
