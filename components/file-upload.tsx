'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, X } from 'lucide-react';
import { Transaction } from '@/lib/types';

interface FileUploadProps {
  onDataLoaded: (transactions: Transaction[]) => void;
}

export function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      alert('Please upload a JSON or CSV file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let transactions: Transaction[];

        if (file.name.endsWith('.json')) {
          transactions = JSON.parse(content);
        } else {
          // Parse CSV
          transactions = parseCSV(content);
        }

        // Validate data structure
        if (!Array.isArray(transactions) || transactions.length === 0) {
          throw new Error('Invalid data format');
        }

        onDataLoaded(transactions);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format.');
        setFileName(null);
      }
    };

    reader.readAsText(file);
  };

  const parseCSV = (content: string): Transaction[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map((v) => v.trim());
      const row: any = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i];
      });

      return {
        id: row.id || `TX${index + 1}`,
        from: row.from || row.source || '',
        to: row.to || row.target || row.destination || '',
        amount: parseFloat(row.amount || row.value || '0'),
        timestamp: row.timestamp || row.date || new Date().toISOString(),
        currency: row.currency || 'USD',
        description: row.description || '',
      };
    });
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-12">
        {!fileName ? (
          <>
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Transaction Data</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Drag and drop your JSON or CSV file here, or click to browse
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileJson className="h-4 w-4 mr-2" />
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mt-6 text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Required fields:</p>
              <p>from, to, amount, timestamp</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground">File loaded successfully</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
