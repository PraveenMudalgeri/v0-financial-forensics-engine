'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ValidationState {
  success: boolean;
  errors: string[];
  warnings: string[];
  transactionCount?: number;
}

interface FileUploadProps {
  onCsvUploaded: (csvContent: string) => void;
}

export function FileUpload({ onCsvUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setValidation({
        success: false,
        errors: ['Please upload a CSV file (.csv extension required)'],
        warnings: [],
      });
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setValidation({
        success: false,
        errors: ['File too large. Maximum size is 50MB.'],
        warnings: [],
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setValidation(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Quick client-side check: verify header has required columns
      const firstLine = content.split('\n')[0]?.toLowerCase() || '';
      const requiredCols = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'];
      const missingCols = requiredCols.filter(col => !firstLine.includes(col));

      if (missingCols.length > 0) {
        setValidation({
          success: false,
          errors: [`Missing required columns: ${missingCols.join(', ')}`],
          warnings: [],
        });
        setIsProcessing(false);
        return;
      }

      const lineCount = content.split('\n').filter(l => l.trim()).length - 1;
      setValidation({
        success: true,
        errors: [],
        warnings: [],
        transactionCount: lineCount,
      });
      setIsProcessing(false);

      // Send CSV content to parent for backend processing
      onCsvUploaded(content);
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setValidation({
        success: false,
        errors: ['Failed to read file. Please try again.'],
        warnings: [],
      });
    };

    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName(null);
    setValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : validation && !validation.success
          ? 'border-red-500/50'
          : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-10">
        {!fileName ? (
          <>
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              Upload Transaction CSV
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Drag and drop your CSV file here, or click to browse
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Select CSV File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground max-w-sm">
              <p className="font-semibold mb-2 text-foreground">Required CSV columns:</p>
              <code className="block bg-card p-2 rounded text-xs font-mono">
                transaction_id, sender_id, receiver_id, amount, timestamp
              </code>
              <p className="mt-2">
                Timestamp format: <code>YYYY-MM-DD HH:MM:SS</code>
              </p>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {isProcessing
                    ? 'Uploading and processing...'
                    : validation?.success
                    ? `${validation.transactionCount ?? 0} transactions detected`
                    : 'Validation failed'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Validation feedback */}
            {validation && !validation.success && validation.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-red-400">
                    <p className="font-semibold mb-1">Validation Errors:</p>
                    {validation.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {validation && validation.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-400">
                    <p className="font-semibold mb-1">Warnings:</p>
                    {validation.warnings.slice(0, 5).map((warn, i) => (
                      <p key={i}>{warn}</p>
                    ))}
                    {validation.warnings.length > 5 && (
                      <p>...and {validation.warnings.length - 5} more</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {validation?.success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-400 font-medium">
                    CSV validated successfully - {validation.transactionCount ?? 0}{' '}
                    transactions sent for analysis
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
