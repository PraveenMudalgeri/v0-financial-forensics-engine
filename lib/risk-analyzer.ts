// Enhanced Risk Analysis with Multi-Factor Scoring

import { Transaction, Account, AnalysisResult } from './types';
import { detectRings, analyzePaths, calculateGraphMetrics, calculateCentrality } from './graph-algorithms';
import { detectCommunities, calculateAdvancedCentrality, detectTemporalPatterns, detectLegitimatePatterns } from './advanced-analytics';
import { calculateMultiFactorRiskScore, applyFalsePositiveDampening } from './multi-factor-risk-scoring';

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
 * Process transaction data and perform complete ENHANCED analysis
 */
export function analyzeTransactionNetwork(
  rawTransactions: Transaction[]
): AnalysisResult {
  console.log('[v0] Starting enhanced transaction network analysis...');
  
  // Build account summaries with property graph attributes
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
        totalAmountSent: 0,
        totalAmountReceived: 0,
        firstSeenTimestamp: tx.timestamp,
        lastSeenTimestamp: tx.timestamp,
      });
    }
    const sender = accountMap.get(tx.from)!;
    sender.totalOut += tx.amount;
    sender.totalAmountSent += tx.amount;
    sender.transactionCount++;
    sender.lastSeenTimestamp = tx.timestamp;

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
        totalAmountSent: 0,
        totalAmountReceived: 0,
        firstSeenTimestamp: tx.timestamp,
        lastSeenTimestamp: tx.timestamp,
      });
    }
    const receiver = accountMap.get(tx.to)!;
    receiver.totalIn += tx.amount;
    receiver.totalAmountReceived += tx.amount;
    receiver.transactionCount++;
    receiver.lastSeenTimestamp = tx.timestamp;
  });

  const accounts = Array.from(accountMap.values());
  console.log(`[v0] Processed ${accounts.length} accounts`);

  // ADVANCED ANALYTICS
  console.log('[v0] Running community detection...');
  const communities = detectCommunities(rawTransactions, accounts);
  console.log(`[v0] Detected ${communities.length} communities`);

  console.log('[v0] Calculating centrality metrics...');
  const centralityMetrics = calculateAdvancedCentrality(rawTransactions, accounts);
  
  // Apply centrality to accounts
  centralityMetrics.forEach(metric => {
    const account = accountMap.get(metric.accountId);
    if (account) {
      account.degreeCentrality = metric.degreeCentrality;
      account.betweennessCentrality = metric.betweennessCentrality;
      account.pageRank = metric.pageRank;
    }
  });

  // Apply community IDs to accounts
  communities.forEach(community => {
    community.nodes.forEach(nodeId => {
      const account = accountMap.get(nodeId);
      if (account) {
        account.communityId = community.id;
      }
    });
  });

  console.log('[v0] Detecting temporal patterns...');
  const temporalPatterns = detectTemporalPatterns(rawTransactions, accounts);
  console.log(`[v0] Found ${temporalPatterns.length} temporal anomalies`);

  // MULTI-FACTOR RISK SCORING
  console.log('[v0] Calculating multi-factor risk scores...');
  const highRiskNodes = new Set<string>();
  
  accounts.forEach(account => {
    // Detect legitimate patterns first
    const legitimatePattern = detectLegitimatePatterns(account, rawTransactions);
    account.isLegitimatePattern = legitimatePattern;

    // Calculate multi-factor risk score
    let riskComponents = calculateMultiFactorRiskScore(
      account,
      rawTransactions,
      accounts,
      communities,
      centralityMetrics,
      highRiskNodes
    );

    // Apply false positive dampening for legitimate patterns
    if (legitimatePattern) {
      riskComponents = applyFalsePositiveDampening(riskComponents, legitimatePattern);
    }

    account.riskScore = riskComponents.totalScore;
    account.riskFactors = riskComponents.factors;

    // Track high-risk nodes for propagation in next iteration
    if (account.riskScore > 0.7) {
      highRiskNodes.add(account.id);
    }
  });

  // Re-calculate scores with risk propagation
  accounts.forEach(account => {
    if (highRiskNodes.has(account.id)) return; // Already high-risk

    const legitimatePattern = account.isLegitimatePattern;
    let riskComponents = calculateMultiFactorRiskScore(
      account,
      rawTransactions,
      accounts,
      communities,
      centralityMetrics,
      highRiskNodes
    );

    if (legitimatePattern) {
      riskComponents = applyFalsePositiveDampening(riskComponents, legitimatePattern);
    }

    account.riskScore = riskComponents.totalScore;
    account.riskFactors = riskComponents.factors;
  });

  // Identify mules with enhanced criteria
  const mules = accounts.filter(account => {
    const ratio = account.totalIn > 0 ? account.totalOut / account.totalIn : 0;
    return (
      ratio > 0.8 &&
      account.totalIn > 5000 &&
      account.riskScore > 0.6 &&
      !account.isLegitimatePattern // Exclude legitimate patterns
    );
  });

  mules.forEach(mule => {
    const account = accountMap.get(mule.id);
    if (account) {
      account.isMule = true;
    }
  });

  console.log(`[v0] Identified ${mules.length} money mules`);

  // Detect suspicious patterns with enhanced explainability
  console.log('[v0] Detecting ring structures...');
  const rings = detectRings(rawTransactions, accounts);
  
  console.log('[v0] Analyzing suspicious paths...');
  const suspiciousPaths = analyzePaths(rawTransactions, accounts);
  
  const metrics = calculateGraphMetrics(rawTransactions, accounts);

  // Calculate summary metrics
  const totalValue = rawTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const avgRiskScore = accounts.reduce((sum, a) => sum + a.riskScore, 0) / accounts.length;
  const highRiskAccounts = accounts.filter(a => a.riskScore > 0.7).length;
  
  // Count isolated accounts (no connections)
  const connectedAccounts = new Set<string>();
  rawTransactions.forEach(tx => {
    connectedAccounts.add(tx.from);
    connectedAccounts.add(tx.to);
  });
  const isolatedAccounts = accounts.length - connectedAccounts.size;

  // Build edge count for scalability info
  const edgeCount = rawTransactions.length;

  console.log('[v0] Analysis complete!');

  return {
    accounts,
    transactions: rawTransactions,
    rings,
    suspiciousPaths,
    communities,
    centralityMetrics,
    temporalPatterns,
    networkMetrics: {
      totalAccounts: accounts.length,
      totalTransactions: rawTransactions.length,
      totalValue,
      avgRiskScore,
      highRiskAccounts,
      detectedMules: mules.length,
      communityCount: communities.length,
      isolatedAccounts,
    },
    scalabilityInfo: {
      graphStructure: 'adjacency_list',
      nodeCount: accounts.length,
      edgeCount,
      avgComplexity: `O(V+E) for most operations, O(V²) for centrality`,
      recommendedApproach: accounts.length > 10000
        ? 'Consider Neo4j or TigerGraph for production scale'
        : 'In-memory adjacency list optimal for this dataset size',
    },
  };
}

// Helper functions

function getTimeSpan(transactions: Transaction[]): number {
  const timestamps = transactions.map((tx) => new Date(tx.timestamp).getTime());
  return Math.max(...timestamps) - Math.min(...timestamps);
}
