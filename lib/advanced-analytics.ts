// Advanced Graph Analytics for Money Muling Detection
// Implements Community Detection, Centrality Analysis, and Temporal Patterns

import { Transaction, Account, Community, CentralityMetrics, TemporalPattern } from './types';

/**
 * COMMUNITY DETECTION using Modularity-based Louvain Algorithm
 * 
 * Purpose: Identify tightly connected clusters that transact heavily with each other.
 * Criminal rings often appear as graph communities with high internal density
 * and low external connections.
 * 
 * Time Complexity: O(n log n) where n is the number of nodes
 */
export function detectCommunities(
  transactions: Transaction[],
  accounts: Account[]
): Community[] {
  // Build adjacency structure with weights
  const graph = new Map<string, Map<string, number>>();
  const accountSet = new Set(accounts.map(a => a.id));
  
  // Initialize graph
  accountSet.forEach(acc => graph.set(acc, new Map()));
  
  transactions.forEach(tx => {
    if (!graph.has(tx.from)) graph.set(tx.from, new Map());
    if (!graph.has(tx.to)) graph.set(tx.to, new Map());
    
    const currentWeight = graph.get(tx.from)!.get(tx.to) || 0;
    graph.get(tx.from)!.set(tx.to, currentWeight + tx.amount);
  });

  // Initialize each node in its own community
  const communityMap = new Map<string, number>();
  const nodes = Array.from(accountSet);
  nodes.forEach((node, idx) => communityMap.set(node, idx));

  // Calculate total edge weight
  let totalWeight = 0;
  graph.forEach(neighbors => {
    neighbors.forEach(weight => totalWeight += weight);
  });

  // Simplified Louvain: iterate to maximize modularity
  let improved = true;
  let iterations = 0;
  const maxIterations = 10;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (const node of nodes) {
      const currentCommunity = communityMap.get(node)!;
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      // Get neighboring communities
      const neighborCommunities = new Set<number>();
      const neighbors = graph.get(node);
      if (neighbors) {
        neighbors.forEach((_, neighbor) => {
          neighborCommunities.add(communityMap.get(neighbor)!);
        });
      }

      // Try moving to each neighbor community
      for (const targetCommunity of neighborCommunities) {
        if (targetCommunity === currentCommunity) continue;

        const gain = calculateModularityGain(
          node,
          currentCommunity,
          targetCommunity,
          graph,
          communityMap,
          totalWeight
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = targetCommunity;
        }
      }

      if (bestCommunity !== currentCommunity) {
        communityMap.set(node, bestCommunity);
        improved = true;
      }
    }
  }

  // Build community structures
  const communitiesById = new Map<number, string[]>();
  communityMap.forEach((commId, nodeId) => {
    if (!communitiesById.has(commId)) {
      communitiesById.set(commId, []);
    }
    communitiesById.get(commId)!.push(nodeId);
  });

  // Analyze each community
  const communities: Community[] = [];
  let communityIdCounter = 0;

  communitiesById.forEach((members, _) => {
    if (members.length < 2) return; // Skip single-node communities

    const community = analyzeCommunity(
      communityIdCounter++,
      members,
      transactions,
      accounts,
      graph
    );
    
    if (community.internalDensity > 0.3 || community.suspicionScore > 0.5) {
      communities.push(community);
    }
  });

  return communities.sort((a, b) => b.suspicionScore - a.suspicionScore);
}

function calculateModularityGain(
  node: string,
  fromCommunity: number,
  toCommunity: number,
  graph: Map<string, Map<string, number>>,
  communityMap: Map<string, number>,
  totalWeight: number
): number {
  // Simplified modularity gain calculation
  let internalWeightFrom = 0;
  let internalWeightTo = 0;

  const neighbors = graph.get(node);
  if (neighbors) {
    neighbors.forEach((weight, neighbor) => {
      if (communityMap.get(neighbor) === fromCommunity) {
        internalWeightFrom += weight;
      }
      if (communityMap.get(neighbor) === toCommunity) {
        internalWeightTo += weight;
      }
    });
  }

  return (internalWeightTo - internalWeightFrom) / (totalWeight + 1);
}

function analyzeCommunity(
  id: number,
  members: string[],
  transactions: Transaction[],
  accounts: Account[],
  graph: Map<string, Map<string, number>>
): Community {
  // Calculate internal edges
  let internalEdges = 0;
  let internalValue = 0;
  
  members.forEach(node => {
    const neighbors = graph.get(node);
    if (neighbors) {
      neighbors.forEach((weight, neighbor) => {
        if (members.includes(neighbor)) {
          internalEdges++;
          internalValue += weight;
        }
      });
    }
  });

  // Calculate external connections
  let externalConnections = 0;
  members.forEach(node => {
    const neighbors = graph.get(node);
    if (neighbors) {
      neighbors.forEach((_, neighbor) => {
        if (!members.includes(neighbor)) {
          externalConnections++;
        }
      });
    }
  });

  // Calculate density: actual edges / possible edges
  const possibleEdges = members.length * (members.length - 1);
  const internalDensity = possibleEdges > 0 ? internalEdges / possibleEdges : 0;

  // Calculate average risk score
  const accountMap = new Map(accounts.map(a => [a.id, a]));
  const memberAccounts = members.map(id => accountMap.get(id)).filter(Boolean) as Account[];
  const avgRiskScore = memberAccounts.reduce((sum, acc) => sum + acc.riskScore, 0) / memberAccounts.length;

  // Calculate suspicion score
  let suspicionScore = 0;
  if (internalDensity > 0.6) suspicionScore += 0.3; // High internal connectivity
  if (externalConnections < members.length * 2) suspicionScore += 0.2; // Low external connections
  if (avgRiskScore > 0.6) suspicionScore += 0.3; // High risk members
  if (members.length >= 3 && members.length <= 8) suspicionScore += 0.2; // Typical ring size

  const explanation = generateCommunityExplanation(
    members.length,
    internalDensity,
    externalConnections,
    avgRiskScore
  );

  return {
    id,
    nodes: members,
    internalDensity,
    externalConnections,
    totalValue: internalValue,
    suspicionScore: Math.min(suspicionScore, 1),
    avgRiskScore,
    explanation,
  };
}

function generateCommunityExplanation(
  size: number,
  density: number,
  external: number,
  avgRisk: number
): string {
  const reasons: string[] = [];
  
  if (density > 0.7) reasons.push('very high internal transaction density');
  else if (density > 0.5) reasons.push('high internal connectivity');
  
  if (external < size * 2) reasons.push('isolated from broader network');
  if (avgRisk > 0.7) reasons.push('majority high-risk accounts');
  if (size >= 3 && size <= 8) reasons.push('typical money muling ring size');

  return `Community of ${size} accounts with ${reasons.join(', ')}`;
}

/**
 * CENTRALITY ANALYSIS
 * 
 * Computes Degree, Betweenness, and PageRank centrality
 * to identify aggregators, brokers, and coordinators
 */
export function calculateAdvancedCentrality(
  transactions: Transaction[],
  accounts: Account[]
): CentralityMetrics[] {
  const graph = buildWeightedGraph(transactions);
  const metrics: CentralityMetrics[] = [];

  accounts.forEach(account => {
    const degree = calculateDegreeCentrality(account.id, graph);
    const betweenness = calculateBetweennessCentrality(account.id, graph, accounts);
    const pageRank = calculatePageRank(account.id, graph, accounts);

    const role = determineRole(degree, betweenness, pageRank);
    const explanation = generateCentralityExplanation(degree, betweenness, pageRank, role);

    metrics.push({
      accountId: account.id,
      degreeCentrality: degree,
      betweennessCentrality: betweenness,
      pageRank,
      role,
      explanation,
    });
  });

  return metrics;
}

function buildWeightedGraph(transactions: Transaction[]): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();
  
  transactions.forEach(tx => {
    if (!graph.has(tx.from)) graph.set(tx.from, new Map());
    if (!graph.has(tx.to)) graph.set(tx.to, new Map());
    
    const current = graph.get(tx.from)!.get(tx.to) || 0;
    graph.get(tx.from)!.set(tx.to, current + 1);
  });

  return graph;
}

function calculateDegreeCentrality(
  nodeId: string,
  graph: Map<string, Map<string, number>>
): number {
  let outDegree = graph.get(nodeId)?.size || 0;
  let inDegree = 0;

  graph.forEach(neighbors => {
    if (neighbors.has(nodeId)) inDegree++;
  });

  return outDegree + inDegree;
}

function calculateBetweennessCentrality(
  nodeId: string,
  graph: Map<string, Map<string, number>>,
  accounts: Account[]
): number {
  // Simplified betweenness: count shortest paths through this node
  let pathsThrough = 0;
  const nodes = accounts.map(a => a.id);

  // Sample pairs to avoid O(n³) complexity
  const sampleSize = Math.min(20, nodes.length);
  for (let i = 0; i < sampleSize; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)];
    if (source === nodeId) continue;

    const shortestPaths = bfsShortestPaths(source, graph);
    
    // Check if nodeId is on paths to other nodes
    shortestPaths.forEach((path, target) => {
      if (target !== nodeId && path.includes(nodeId)) {
        pathsThrough++;
      }
    });
  }

  return pathsThrough / sampleSize;
}

function bfsShortestPaths(
  source: string,
  graph: Map<string, Map<string, number>>
): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const queue: [string, string[]][] = [[source, [source]]];
  const visited = new Set<string>([source]);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;
    paths.set(current, path);

    const neighbors = graph.get(current);
    if (neighbors) {
      neighbors.forEach((_, neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      });
    }
  }

  return paths;
}

function calculatePageRank(
  nodeId: string,
  graph: Map<string, Map<string, number>>,
  accounts: Account[]
): number {
  // Simplified PageRank: iterate a few times
  const dampingFactor = 0.85;
  const iterations = 10;
  const nodes = accounts.map(a => a.id);
  const n = nodes.length;

  // Initialize ranks
  const ranks = new Map<string, number>();
  nodes.forEach(node => ranks.set(node, 1 / n));

  // Build reverse graph (incoming edges)
  const reverseGraph = new Map<string, Set<string>>();
  nodes.forEach(node => reverseGraph.set(node, new Set()));
  
  graph.forEach((neighbors, from) => {
    neighbors.forEach((_, to) => {
      reverseGraph.get(to)!.add(from);
    });
  });

  // Iterate
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();

    nodes.forEach(node => {
      let rank = (1 - dampingFactor) / n;
      
      const incoming = reverseGraph.get(node)!;
      incoming.forEach(inNode => {
        const outDegree = graph.get(inNode)?.size || 1;
        rank += dampingFactor * (ranks.get(inNode)! / outDegree);
      });

      newRanks.set(node, rank);
    });

    // Update ranks
    newRanks.forEach((rank, node) => ranks.set(node, rank));
  }

  return ranks.get(nodeId) || 0;
}

function determineRole(
  degree: number,
  betweenness: number,
  pageRank: number
): 'aggregator' | 'broker' | 'coordinator' | 'normal' {
  if (betweenness > 10) return 'coordinator'; // High betweenness = bridges communities
  if (degree > 15) return 'aggregator'; // High degree = many connections
  if (pageRank > 0.02) return 'broker'; // High PageRank = influential
  return 'normal';
}

function generateCentralityExplanation(
  degree: number,
  betweenness: number,
  pageRank: number,
  role: string
): string {
  const explanations: string[] = [];
  
  if (degree > 15) explanations.push(`high degree (${degree} connections)`);
  if (betweenness > 10) explanations.push(`high betweenness (appears in ${betweenness.toFixed(1)} paths)`);
  if (pageRank > 0.02) explanations.push(`high PageRank (${(pageRank * 100).toFixed(1)}%)`);

  const roleDesc = {
    aggregator: 'Aggregator: collects funds from many sources',
    broker: 'Broker: influential node in network',
    coordinator: 'Coordinator: bridges different groups (layering suspect)',
    normal: 'Normal: standard network participant'
  }[role];

  return `${roleDesc}. ${explanations.length > 0 ? 'Flagged due to: ' + explanations.join(', ') : ''}`;
}

/**
 * TEMPORAL PATTERN DETECTION
 * 
 * Analyzes 72-hour sliding windows for velocity, dormancy, and burst detection
 */
export function detectTemporalPatterns(
  transactions: Transaction[],
  accounts: Account[]
): TemporalPattern[] {
  const patterns: TemporalPattern[] = [];
  const now = Date.now();
  const window72h = 72 * 60 * 60 * 1000;

  accounts.forEach(account => {
    const accountTxs = transactions.filter(
      tx => tx.from === account.id || tx.to === account.id
    );

    if (accountTxs.length === 0) return;

    // Sort by timestamp
    const sorted = [...accountTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate transactions in last 72 hours
    const recent = sorted.filter(
      tx => now - new Date(tx.timestamp).getTime() < window72h
    );

    // Calculate average daily rate
    const timeSpan = new Date(sorted[sorted.length - 1].timestamp).getTime() - 
                     new Date(sorted[0].timestamp).getTime();
    const days = Math.max(timeSpan / (1000 * 60 * 60 * 24), 1);
    const avgDailyRate = accountTxs.length / days;

    // Detect pattern
    let pattern: TemporalPattern['pattern'] = 'steady';
    let suspicionScore = 0;

    // Velocity spike: recent activity >> average
    if (recent.length > avgDailyRate * 3 * 3) { // 3x daily rate in 3 days
      pattern = 'velocity_spike';
      suspicionScore = 0.7;
    }

    // Dormancy activation: no activity, then sudden burst
    const dormancyPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    const recentActivity = now - new Date(sorted[sorted.length - 1].timestamp).getTime();
    const previousActivity = sorted.length > 1 ? 
      new Date(sorted[sorted.length - 1].timestamp).getTime() - 
      new Date(sorted[sorted.length - 2].timestamp).getTime() : 0;

    if (previousActivity > dormancyPeriod && recentActivity < window72h && recent.length > 5) {
      pattern = 'dormancy_activation';
      suspicionScore = 0.8;
    }

    // Burst activity: many transactions in very short time
    if (recent.length > 10) {
      const recentTimeSpan = new Date(recent[recent.length - 1].timestamp).getTime() - 
                             new Date(recent[0].timestamp).getTime();
      const hours = recentTimeSpan / (1000 * 60 * 60);
      if (hours < 24) {
        pattern = 'burst_activity';
        suspicionScore = 0.75;
      }
    }

    if (pattern !== 'steady' || suspicionScore > 0) {
      patterns.push({
        accountId: account.id,
        pattern,
        transactionsIn72h: recent.length,
        avgDailyRate,
        suspicionScore,
      });
    }
  });

  return patterns.sort((a, b) => b.suspicionScore - a.suspicionScore);
}

/**
 * LEGITIMATE PATTERN DETECTION
 * 
 * Identifies merchants and payroll patterns to reduce false positives
 */
export function detectLegitimatePatterns(
  account: Account,
  transactions: Transaction[]
): 'merchant' | 'payroll' | null {
  const outgoing = transactions.filter(tx => tx.from === account.id);
  const incoming = transactions.filter(tx => tx.to === account.id);

  // Merchant Pattern: many unique incoming, no cycles, regular pattern
  if (incoming.length > 20) {
    const uniqueSenders = new Set(incoming.map(tx => tx.from));
    const repeatCustomers = incoming.length - uniqueSenders.size;
    const repeatRatio = repeatCustomers / incoming.length;

    // Merchants have many unique customers with some repeats
    if (uniqueSenders.size > 15 && repeatRatio < 0.7 && outgoing.length < incoming.length * 0.2) {
      return 'merchant';
    }
  }

  // Payroll Pattern: one-to-many, regular intervals, consistent amounts
  if (outgoing.length > 10 && incoming.length < 5) {
    const uniqueRecipients = new Set(outgoing.map(tx => tx.to));
    
    // Check for regular intervals (e.g., weekly, biweekly, monthly)
    const timestamps = outgoing.map(tx => new Date(tx.timestamp).getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Check if intervals are consistent (within 20%)
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const consistentIntervals = intervals.filter(
        i => Math.abs(i - avgInterval) / avgInterval < 0.2
      );

      if (consistentIntervals.length / intervals.length > 0.7 && uniqueRecipients.size > 5) {
        return 'payroll';
      }
    }
  }

  return null;
}
