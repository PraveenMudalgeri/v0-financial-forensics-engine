// Risk Analysis and Mule Detection

import { Transaction, Account, AnalysisResult } from './types';
import { detectRings, analyzePaths, calculateGraphMetrics, calculateCentrality } from './graph-algorithms';

/**
 * Calculate risk score for an account based on transaction patterns
 */
export function calculateRiskScore(
  account: Account,
  transactions: Transaction[]
): number {
  let score = 0;

  // Factor 1: Pass-through ratio (high = suspicious)
  const ratio = account.totalIn > 0 ? account.totalOut / account.totalIn : 0;
  if (ratio > 0.9) score += 0.25;
  if (ratio > 0.95) score += 0.15;

  // Factor 2: High velocity
  const accountTxs = transactions.filter(
    (tx) => tx.from === account.id || tx.to === account.id
  );
  if (accountTxs.length > 0) {
    const timeSpan = getTimeSpan(accountTxs);
    const txPerDay = accountTxs.length / (timeSpan / (1000 * 60 * 60 * 24));
    if (txPerDay > 10) score += 0.2;
    if (txPerDay > 20) score += 0.1;
  }

  // Factor 3: Round amounts (structuring)
  const outgoingTxs = transactions.filter((tx) => tx.from === account.id);
  const roundAmounts = outgoingTxs.filter(
    (tx) => tx.amount % 1000 === 0 || tx.amount % 500 === 0
  );
  const roundRatio = outgoingTxs.length > 0 ? roundAmounts.length / outgoingTxs.length : 0;
  if (roundRatio > 0.6) score += 0.2;

  // Factor 4: Quick turnaround times
  const incomingTxs = transactions.filter((tx) => tx.to === account.id);
  let quickTurnarounds = 0;
  incomingTxs.forEach((inTx) => {
    const correspondingOut = outgoingTxs.find((outTx) => {
      const gap = new Date(outTx.timestamp).getTime() - new Date(inTx.timestamp).getTime();
      return gap > 0 && gap < 24 * 60 * 60 * 1000; // Within 24 hours
    });
    if (correspondingOut) quickTurnarounds++;
  });
  const turnaroundRatio = incomingTxs.length > 0 ? quickTurnarounds / incomingTxs.length : 0;
  if (turnaroundRatio > 0.5) score += 0.2;

  return Math.min(score, 1);
}

/**
 * Identify potential money mules
 */
export function identifyMules(accounts: Account[], transactions: Transaction[]): Account[] {
  return accounts
    .filter((account) => {
      const riskScore = calculateRiskScore(account, transactions);
      const ratio = account.totalIn > 0 ? account.totalOut / account.totalIn : 0;
      
      // Mule criteria:
      // - High pass-through ratio (> 80%)
      // - Significant transaction volume
      // - High risk score
      return ratio > 0.8 && account.totalIn > 5000 && riskScore > 0.5;
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Process transaction data and perform complete analysis
 */
export function analyzeTransactionNetwork(
  rawTransactions: Transaction[]
): AnalysisResult {
  // Build account summaries
  const accountMap = new Map<string, Account>();

  rawTransactions.forEach((tx) => {
    // Process sender
    if (!accountMap.has(tx.from)) {
      accountMap.set(tx.from, {
        id: tx.from,
        name: tx.from,
        type: 'unknown',
        riskScore: 0,
        totalIn: 0,
        totalOut: 0,
        transactionCount: 0,
      });
    }
    const sender = accountMap.get(tx.from)!;
    sender.totalOut += tx.amount;
    sender.transactionCount++;

    // Process receiver
    if (!accountMap.has(tx.to)) {
      accountMap.set(tx.to, {
        id: tx.to,
        name: tx.to,
        type: 'unknown',
        riskScore: 0,
        totalIn: 0,
        totalOut: 0,
        transactionCount: 0,
      });
    }
    const receiver = accountMap.get(tx.to)!;
    receiver.totalIn += tx.amount;
    receiver.transactionCount++;
  });

  const accounts = Array.from(accountMap.values());

  // Calculate risk scores
  accounts.forEach((account) => {
    account.riskScore = calculateRiskScore(account, rawTransactions);
  });

  // Identify mules
  const mules = identifyMules(accounts, rawTransactions);
  mules.forEach((mule) => {
    const account = accountMap.get(mule.id);
    if (account) {
      account.isMule = true;
    }
  });

  // Detect suspicious patterns
  const rings = detectRings(rawTransactions, accounts);
  const suspiciousPaths = analyzePaths(rawTransactions, accounts);
  const metrics = calculateGraphMetrics(rawTransactions, accounts);

  // Calculate summary metrics
  const totalValue = rawTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const avgRiskScore = accounts.reduce((sum, a) => sum + a.riskScore, 0) / accounts.length;
  const highRiskAccounts = accounts.filter((a) => a.riskScore > 0.7).length;

  return {
    accounts,
    transactions: rawTransactions,
    rings,
    suspiciousPaths,
    networkMetrics: {
      totalAccounts: accounts.length,
      totalTransactions: rawTransactions.length,
      totalValue,
      avgRiskScore,
      highRiskAccounts,
      detectedMules: mules.length,
    },
  };
}

// Helper functions

function getTimeSpan(transactions: Transaction[]): number {
  const timestamps = transactions.map((tx) => new Date(tx.timestamp).getTime());
  return Math.max(...timestamps) - Math.min(...timestamps);
}
