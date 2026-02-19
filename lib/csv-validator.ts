// CSV Validation and Parsing
// Strict schema validation for RIFT 2026 hackathon format

import { RawTransaction } from './types';

const REQUIRED_COLUMNS = [
  'transaction_id',
  'sender_id',
  'receiver_id',
  'amount',
  'timestamp',
];

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export interface ValidationResult {
  success: boolean;
  transactions: RawTransaction[];
  errors: string[];
  warnings: string[];
}

export function validateAndParseCSV(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: RawTransaction[] = [];

  // Check for empty file
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, transactions: [], errors: ['File is empty'], warnings: [] };
  }

  const lines = trimmed.split('\n');
  if (lines.length < 2) {
    return {
      success: false,
      transactions: [],
      errors: ['File must have a header row and at least one data row'],
      warnings: [],
    };
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Validate required columns exist
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    return {
      success: false,
      transactions: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}. Required: ${REQUIRED_COLUMNS.join(', ')}`],
      warnings: [],
    };
  }

  // Get column indices
  const colIdx = {
    transaction_id: headers.indexOf('transaction_id'),
    sender_id: headers.indexOf('sender_id'),
    receiver_id: headers.indexOf('receiver_id'),
    amount: headers.indexOf('amount'),
    timestamp: headers.indexOf('timestamp'),
  };

  // Check for duplicate transaction IDs
  const seenIds = new Set<string>();

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip blank lines

    const values = line.split(',').map((v) => v.trim());
    const lineNum = i + 1;

    // Check column count
    if (values.length < headers.length) {
      errors.push(`Row ${lineNum}: Expected ${headers.length} columns but got ${values.length}`);
      continue;
    }

    const transactionId = values[colIdx.transaction_id];
    const senderId = values[colIdx.sender_id];
    const receiverId = values[colIdx.receiver_id];
    const amountStr = values[colIdx.amount];
    const timestamp = values[colIdx.timestamp];

    // Validate transaction_id
    if (!transactionId) {
      errors.push(`Row ${lineNum}: Missing transaction_id`);
      continue;
    }

    // Check duplicates
    if (seenIds.has(transactionId)) {
      warnings.push(`Row ${lineNum}: Duplicate transaction_id "${transactionId}"`);
    }
    seenIds.add(transactionId);

    // Validate sender_id
    if (!senderId) {
      errors.push(`Row ${lineNum}: Missing sender_id`);
      continue;
    }

    // Validate receiver_id
    if (!receiverId) {
      errors.push(`Row ${lineNum}: Missing receiver_id`);
      continue;
    }

    // Self-transfer check
    if (senderId === receiverId) {
      warnings.push(`Row ${lineNum}: Self-transfer from ${senderId}`);
    }

    // Validate amount
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${lineNum}: Invalid amount "${amountStr}" - must be a positive number`);
      continue;
    }

    // Validate timestamp format
    if (!TIMESTAMP_REGEX.test(timestamp)) {
      // Try to parse anyway
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        errors.push(`Row ${lineNum}: Invalid timestamp "${timestamp}" - expected format: YYYY-MM-DD HH:MM:SS`);
        continue;
      }
      warnings.push(`Row ${lineNum}: Timestamp "${timestamp}" not in exact format YYYY-MM-DD HH:MM:SS but was parseable`);
    }

    transactions.push({
      transaction_id: transactionId,
      sender_id: senderId,
      receiver_id: receiverId,
      amount: Math.round(amount * 100) / 100,
      timestamp,
    });
  }

  // Max size check
  if (transactions.length > 50000) {
    warnings.push(`Large dataset: ${transactions.length} transactions. Processing may take longer.`);
  }

  if (errors.length > 10) {
    return {
      success: false,
      transactions: [],
      errors: [
        `Too many errors (${errors.length}). First 10:`,
        ...errors.slice(0, 10),
      ],
      warnings,
    };
  }

  return {
    success: errors.length === 0,
    transactions,
    errors,
    warnings,
  };
}
