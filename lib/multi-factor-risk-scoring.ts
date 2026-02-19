// Multi-Factor Risk Scoring Engine with Explainability
// Combines structural, behavioral, and network risk factors

import { Transaction, Account, RiskFactor, Community, CentralityMetrics } from './types';

export interface RiskScoreComponents {
  structuralRisk: number;
  behavioralRisk: number;
  networkRisk: number;
  temporalRisk: number;
  totalScore: number;
  factors: RiskFactor[];
  propagatedRisk: number;
}

/**
 * MULTI-FACTOR RISK SCORING
 * 
 * Combines multiple dimensions of risk with explainability
 */
export function calculateMultiFactorRiskScore(
  account: Account,
  transactions: Transaction[],
  allAccounts: Account[],
  communities: Community[],
  centralityMetrics: CentralityMetrics[],
  highRiskNodes: Set<string>
): RiskScoreComponents {
  const factors: RiskFactor[] = [];

  // 1. STRUCTURAL RISK (35% weight)
  const structuralRisk = calculateStructuralRisk(
    account,
    transactions,
    allAccounts,
    communities,
    factors
  );

  // 2. BEHAVIORAL RISK (30% weight)
  const behavioralRisk = calculateBehavioralRisk(
    account,
    transactions,
    factors
  );

  // 3. NETWORK RISK (25% weight)
  const networkRisk = calculateNetworkRisk(
    account,
    centralityMetrics,
    communities,
    highRiskNodes,
    factors
  );

  // 4. TEMPORAL RISK (10% weight)
  const temporalRisk = calculateTemporalRisk(
    account,
    transactions,
    factors
  );

  // Calculate weighted total
  let totalScore = 
    structuralRisk * 0.35 +
    behavioralRisk * 0.30 +
    networkRisk * 0.25 +
    temporalRisk * 0.10;

  // RISK PROPAGATION: Connected to known high-risk node
  let propagatedRisk = 0;
  if (highRiskNodes.size > 0) {
    propagatedRisk = calculateRiskPropagation(
      account,
      transactions,
      highRiskNodes,
      factors
    );
    totalScore += propagatedRisk * 0.15; // 15% additional weight
  }

  // Apply score decay for old transactions
  const decayFactor = calculateScoreDecay(transactions);
  totalScore *= decayFactor;

  // Cap at 100 (represented as 1.0)
  totalScore = Math.min(totalScore, 1.0);

  return {
    structuralRisk,
    behavioralRisk,
    networkRisk,
    temporalRisk,
    totalScore,
    factors,
    propagatedRisk,
  };
}

/**
 * STRUCTURAL RISK
 * Based on graph topology and patterns
 */
function calculateStructuralRisk(
  account: Account,
  transactions: Transaction[],
  allAccounts: Account[],
  communities: Community[],
  factors: RiskFactor[]
): number {
  let risk = 0;

  // Cycle participation
  const accountCommunity = communities.find(c => c.nodes.includes(account.id));
  if (accountCommunity) {
    if (accountCommunity.internalDensity > 0.7) {
      risk += 0.4;
      factors.push({
        type: 'structural',
        factor: 'cycle_participation',
        score: 0.4,
        explanation: `Part of tight-knit community (${accountCommunity.internalDensity.toFixed(2)} density) with ${accountCommunity.nodes.length} members`,
        algorithmSource: 'Louvain Community Detection'
      });
    } else if (accountCommunity.internalDensity > 0.5) {
      risk += 0.25;
      factors.push({
        type: 'structural',
        factor: 'community_member',
        score: 0.25,
        explanation: `Member of moderately connected community`,
        algorithmSource: 'Louvain Community Detection'
      });
    }

    // Community anomaly
    if (accountCommunity.suspicionScore > 0.7) {
      risk += 0.3;
      factors.push({
        type: 'structural',
        factor: 'suspicious_community',
        score: 0.3,
        explanation: `Community flagged as high-risk (${(accountCommunity.suspicionScore * 100).toFixed(0)}% suspicion)`,
        algorithmSource: 'Community Risk Analysis'
      });
    }
  }

  // Centrality anomalies (covered in network risk)

  return Math.min(risk, 1.0);
}

/**
 * BEHAVIORAL RISK
 * Based on transaction patterns and activities
 */
function calculateBehavioralRisk(
  account: Account,
  transactions: Transaction[],
  factors: RiskFactor[]
): number {
  let risk = 0;
  const accountTxs = transactions.filter(
    tx => tx.from === account.id || tx.to === account.id
  );

  // High velocity
  if (accountTxs.length > 0) {
    const timeSpan = getTimeSpan(accountTxs);
    const days = Math.max(timeSpan / (1000 * 60 * 60 * 24), 1);
    const txPerDay = accountTxs.length / days;

    if (txPerDay > 20) {
      risk += 0.35;
      factors.push({
        type: 'behavioral',
        factor: 'high_velocity',
        score: 0.35,
        explanation: `Extremely high transaction velocity: ${txPerDay.toFixed(1)} transactions/day`,
        algorithmSource: 'Velocity Analysis'
      });
    } else if (txPerDay > 10) {
      risk += 0.2;
      factors.push({
        type: 'behavioral',
        factor: 'elevated_velocity',
        score: 0.2,
        explanation: `High transaction velocity: ${txPerDay.toFixed(1)} transactions/day`,
        algorithmSource: 'Velocity Analysis'
      });
    }
  }

  // Pass-through ratio
  const passThroughRatio = account.totalIn > 0 ? account.totalOut / account.totalIn : 0;
  if (passThroughRatio > 0.95 && account.totalIn > 5000) {
    risk += 0.4;
    factors.push({
      type: 'behavioral',
      factor: 'high_passthrough',
      score: 0.4,
      explanation: `${(passThroughRatio * 100).toFixed(1)}% of incoming funds immediately transferred out (mule indicator)`,
      algorithmSource: 'Pass-Through Analysis'
    });
  } else if (passThroughRatio > 0.85 && account.totalIn > 5000) {
    risk += 0.25;
    factors.push({
      type: 'behavioral',
      factor: 'elevated_passthrough',
      score: 0.25,
      explanation: `${(passThroughRatio * 100).toFixed(1)}% pass-through ratio`,
      algorithmSource: 'Pass-Through Analysis'
    });
  }

  // Structuring detection (round amounts)
  const outgoingTxs = transactions.filter(tx => tx.from === account.id);
  if (outgoingTxs.length > 0) {
    const roundAmounts = outgoingTxs.filter(
      tx => tx.amount % 1000 === 0 || tx.amount % 500 === 0 || tx.amount === 9999 || tx.amount === 9500
    );
    const structuringRatio = roundAmounts.length / outgoingTxs.length;

    if (structuringRatio > 0.7) {
      risk += 0.3;
      factors.push({
        type: 'behavioral',
        factor: 'structuring_pattern',
        score: 0.3,
        explanation: `${(structuringRatio * 100).toFixed(0)}% of transactions use round/structured amounts`,
        algorithmSource: 'Structuring Detection'
      });
    } else if (structuringRatio > 0.5) {
      risk += 0.15;
      factors.push({
        type: 'behavioral',
        factor: 'possible_structuring',
        score: 0.15,
        explanation: `${(structuringRatio * 100).toFixed(0)}% round amounts detected`,
        algorithmSource: 'Structuring Detection'
      });
    }
  }

  // Quick turnaround times
  const incomingTxs = transactions.filter(tx => tx.to === account.id);
  let quickTurnarounds = 0;
  
  incomingTxs.forEach(inTx => {
    const correspondingOut = outgoingTxs.find(outTx => {
      const gap = new Date(outTx.timestamp).getTime() - new Date(inTx.timestamp).getTime();
      return gap > 0 && gap < 24 * 60 * 60 * 1000; // Within 24 hours
    });
    if (correspondingOut) quickTurnarounds++;
  });

  const turnaroundRatio = incomingTxs.length > 0 ? quickTurnarounds / incomingTxs.length : 0;
  if (turnaroundRatio > 0.6 && quickTurnarounds > 3) {
    risk += 0.25;
    factors.push({
      type: 'behavioral',
      factor: 'quick_turnaround',
      score: 0.25,
      explanation: `${(turnaroundRatio * 100).toFixed(0)}% of incoming funds moved out within 24 hours`,
      algorithmSource: 'Turnaround Time Analysis'
    });
  }

  return Math.min(risk, 1.0);
}

/**
 * NETWORK RISK
 * Based on graph position and connections
 */
function calculateNetworkRisk(
  account: Account,
  centralityMetrics: CentralityMetrics[],
  communities: Community[],
  highRiskNodes: Set<string>,
  factors: RiskFactor[]
): number {
  let risk = 0;

  // Find centrality for this account
  const centrality = centralityMetrics.find(c => c.accountId === account.id);
  
  if (centrality) {
    // High betweenness = coordinator/broker
    if (centrality.betweennessCentrality > 10) {
      risk += 0.35;
      factors.push({
        type: 'network',
        factor: 'high_betweenness',
        score: 0.35,
        explanation: `Acts as bridge between ${centrality.betweennessCentrality.toFixed(1)} different transaction paths (layering coordinator)`,
        algorithmSource: 'Betweenness Centrality'
      });
    }

    // Role-based risk
    if (centrality.role === 'coordinator') {
      risk += 0.3;
      factors.push({
        type: 'network',
        factor: 'coordinator_role',
        score: 0.3,
        explanation: centrality.explanation,
        algorithmSource: 'Centrality Role Classification'
      });
    } else if (centrality.role === 'aggregator') {
      risk += 0.2;
      factors.push({
        type: 'network',
        factor: 'aggregator_role',
        score: 0.2,
        explanation: centrality.explanation,
        algorithmSource: 'Centrality Role Classification'
      });
    }
  }

  // Part of high-risk cluster
  const accountCommunity = communities.find(c => c.nodes.includes(account.id));
  if (accountCommunity && accountCommunity.avgRiskScore > 0.7) {
    risk += 0.25;
    factors.push({
      type: 'network',
      factor: 'high_risk_cluster',
      score: 0.25,
      explanation: `Member of high-risk cluster with average risk score ${(accountCommunity.avgRiskScore * 100).toFixed(0)}%`,
      algorithmSource: 'Community Risk Aggregation'
    });
  }

  return Math.min(risk, 1.0);
}

/**
 * TEMPORAL RISK
 * Based on time-based patterns
 */
function calculateTemporalRisk(
  account: Account,
  transactions: Transaction[],
  factors: RiskFactor[]
): number {
  let risk = 0;
  const accountTxs = transactions.filter(
    tx => tx.from === account.id || tx.to === account.id
  );

  if (accountTxs.length === 0) return 0;

  // Sudden spike in activity
  const now = Date.now();
  const window72h = 72 * 60 * 60 * 1000;
  const recentTxs = accountTxs.filter(
    tx => now - new Date(tx.timestamp).getTime() < window72h
  );

  const timeSpan = getTimeSpan(accountTxs);
  const days = Math.max(timeSpan / (1000 * 60 * 60 * 24), 1);
  const avgDaily = accountTxs.length / days;

  if (recentTxs.length > avgDaily * 5 && recentTxs.length > 5) {
    risk += 0.4;
    factors.push({
      type: 'temporal',
      factor: 'activity_spike',
      score: 0.4,
      explanation: `Sudden spike: ${recentTxs.length} transactions in 72h vs ${avgDaily.toFixed(1)} daily average`,
      algorithmSource: 'Temporal Velocity Analysis'
    });
  }

  // Dormancy followed by activation
  const sorted = [...accountTxs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sorted.length > 2) {
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(
        new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime()
      );
    }

    const maxGap = Math.max(...gaps);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Dormancy: long gap followed by sudden activity
    if (maxGap > 30 * 24 * 60 * 60 * 1000 && maxGap > avgGap * 10) {
      risk += 0.3;
      factors.push({
        type: 'temporal',
        factor: 'dormancy_activation',
        score: 0.3,
        explanation: `Account dormant for ${(maxGap / (24 * 60 * 60 * 1000)).toFixed(0)} days then suddenly activated`,
        algorithmSource: 'Dormancy Detection'
      });
    }
  }

  return Math.min(risk, 1.0);
}

/**
 * RISK PROPAGATION
 * Score increases based on connections to known high-risk accounts
 */
function calculateRiskPropagation(
  account: Account,
  transactions: Transaction[],
  highRiskNodes: Set<string>,
  factors: RiskFactor[]
): number {
  const connectedHighRisk = transactions.filter(
    tx => (tx.from === account.id && highRiskNodes.has(tx.to)) ||
          (tx.to === account.id && highRiskNodes.has(tx.from))
  );

  if (connectedHighRisk.length === 0) return 0;

  const uniqueHighRiskConnections = new Set(
    connectedHighRisk.map(tx => tx.from === account.id ? tx.to : tx.from)
  );

  const propagationScore = Math.min(uniqueHighRiskConnections.size * 0.15, 0.6);

  factors.push({
    type: 'network',
    factor: 'risk_propagation',
    score: propagationScore,
    explanation: `Connected to ${uniqueHighRiskConnections.size} confirmed high-risk account(s) with ${connectedHighRisk.length} transaction(s)`,
    algorithmSource: 'Risk Propagation Model'
  });

  return propagationScore;
}

/**
 * SCORE DECAY
 * Reduce score for accounts with only old transactions
 */
function calculateScoreDecay(transactions: Transaction[]): number {
  if (transactions.length === 0) return 1.0;

  const now = Date.now();
  const mostRecent = Math.max(
    ...transactions.map(tx => new Date(tx.timestamp).getTime())
  );
  const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);

  // No decay for recent activity (< 30 days)
  if (daysSince < 30) return 1.0;

  // Linear decay from 30-180 days
  if (daysSince < 180) {
    return 1.0 - ((daysSince - 30) / 150) * 0.5; // Max 50% reduction
  }

  // Older than 180 days: 50% score
  return 0.5;
}

/**
 * FALSE POSITIVE DAMPENING
 * Reduce score for accounts matching legitimate patterns
 */
export function applyFalsePositiveDampening(
  riskComponents: RiskScoreComponents,
  legitimatePattern: 'merchant' | 'payroll' | null
): RiskScoreComponents {
  if (!legitimatePattern) return riskComponents;

  const dampening = legitimatePattern === 'merchant' ? 0.6 : 0.7;
  const explanation = legitimatePattern === 'merchant'
    ? 'Score reduced by 40%: Matches merchant pattern (high fan-in, no cycles, regular activity)'
    : 'Score reduced by 30%: Matches payroll pattern (one-to-many, regular intervals)';

  riskComponents.factors.push({
    type: 'behavioral',
    factor: 'legitimate_pattern',
    score: -dampening,
    explanation,
    algorithmSource: 'Legitimate Pattern Detection'
  });

  riskComponents.totalScore *= dampening;

  return riskComponents;
}

// Helper function
function getTimeSpan(transactions: Transaction[]): number {
  const timestamps = transactions.map(tx => new Date(tx.timestamp).getTime());
  return Math.max(...timestamps) - Math.min(...timestamps);
}
