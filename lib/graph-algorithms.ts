// Graph Theory Algorithms for Money Muling Detection

import { Transaction, Account, RingStructure, PathAnalysis, GraphMetrics } from './types';

/**
 * Build an adjacency list from transactions
 */
export function buildGraph(transactions: Transaction[]): Map<string, Map<string, Transaction[]>> {
  const graph = new Map<string, Map<string, Transaction[]>>();

  transactions.forEach((tx) => {
    if (!graph.has(tx.from)) {
      graph.set(tx.from, new Map());
    }
    if (!graph.get(tx.from)!.has(tx.to)) {
      graph.get(tx.from)!.set(tx.to, []);
    }
    graph.get(tx.from)!.get(tx.to)!.push(tx);
  });

  return graph;
}

/**
 * Detect cycles (rings) in the transaction graph using DFS
 */
export function detectRings(
  transactions: Transaction[],
  accounts: Account[]
): RingStructure[] {
  const graph = buildGraph(transactions);
  const rings: RingStructure[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const [neighbor] of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = currentPath.indexOf(neighbor);
          if (cycleStart !== -1) {
            const ring = currentPath.slice(cycleStart);
            if (ring.length >= 3 && ring.length <= 10) {
              // Only consider rings of reasonable size
              const ringTxs = getRingTransactions(ring, transactions);
              const totalValue = ringTxs.reduce((sum, tx) => sum + tx.amount, 0);
              const timeGaps = calculateTimeGaps(ringTxs);
              const avgTimeGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;

              // Calculate suspicion score based on velocity and pattern
              const suspicionScore = calculateRingSuspicion(ring, ringTxs, accounts);

              const riskFactors: string[] = [];
              if (avgTimeGap < 24) riskFactors.push('rapid_movement');
              if (avgTimeGap < 1) riskFactors.push('extreme_velocity');
              
              const amounts = ringTxs.map(tx => tx.amount);
              const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
              const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
              const stdDev = Math.sqrt(variance);
              const cv = stdDev / avgAmount;
              if (cv < 0.1) riskFactors.push('similar_amounts');

              const roundAmounts = amounts.filter((amt) => amt % 1000 === 0 || amt % 500 === 0);
              if (roundAmounts.length / amounts.length > 0.7) riskFactors.push('structuring');

              const explanation = `Ring of ${ring.length} accounts with ${riskFactors.join(', ')}. Average time between transactions: ${avgTimeGap.toFixed(1)}h. Total value: $${totalValue.toLocaleString()}.`;

              rings.push({
                nodes: ring,
                totalValue,
                suspicionScore,
                avgTimeGap,
                detectionAlgorithm: 'DFS Cycle Detection (Johnson\'s Algorithm variant)',
                explanation,
                riskFactors,
              });
            }
          }
        }
      }
    }

    currentPath.pop();
    recStack.delete(node);
  }

  // Start DFS from each unvisited node
  accounts.forEach((account) => {
    if (!visited.has(account.id)) {
      dfs(account.id, []);
    }
  });

  // Sort rings by suspicion score
  return rings.sort((a, b) => b.suspicionScore - a.suspicionScore).slice(0, 20);
}

/**
 * Find all paths between two nodes with length constraints
 */
export function findPaths(
  from: string,
  to: string,
  transactions: Transaction[],
  maxDepth: number = 5
): string[][] {
  const graph = buildGraph(transactions);
  const paths: string[][] = [];

  function dfs(current: string, target: string, path: string[], depth: number): void {
    if (depth > maxDepth) return;

    if (current === target && path.length > 1) {
      paths.push([...path]);
      return;
    }

    const neighbors = graph.get(current);
    if (neighbors) {
      for (const [neighbor] of neighbors) {
        if (!path.includes(neighbor) || neighbor === target) {
          dfs(neighbor, target, [...path, neighbor], depth + 1);
        }
      }
    }
  }

  dfs(from, to, [from], 0);
  return paths;
}

/**
 * Analyze transaction paths for suspicious patterns
 */
export function analyzePaths(
  transactions: Transaction[],
  accounts: Account[]
): PathAnalysis[] {
  const paths: PathAnalysis[] = [];
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  
  // Find accounts with high throughput (potential mules)
  const potentialMules = accounts
    .filter((a) => {
      const ratio = a.totalIn > 0 ? a.totalOut / a.totalIn : 0;
      return ratio > 0.8 && a.totalIn > 10000 && a.transactionCount > 5;
    })
    .sort((a, b) => b.totalIn - a.totalIn)
    .slice(0, 10);

  // Analyze paths through potential mules
  potentialMules.forEach((mule) => {
    const incomingTxs = transactions.filter((tx) => tx.to === mule.id);
    const outgoingTxs = transactions.filter((tx) => tx.from === mule.id);

    incomingTxs.forEach((inTx) => {
      outgoingTxs.forEach((outTx) => {
        const path = [inTx.from, mule.id, outTx.to];
        const totalValue = inTx.amount + outTx.amount;
        const timeSpan = new Date(outTx.timestamp).getTime() - new Date(inTx.timestamp).getTime();
        
        // Calculate suspicion score
        const suspicionScore = calculatePathSuspicion(
          path,
          [inTx, outTx],
          accountMap
        );

        if (suspicionScore > 0.5) {
          const explanation = `Money movement through ${mule.id} (pass-through: ${((outTx.amount / inTx.amount) * 100).toFixed(0)}%). Turnaround time: ${(timeSpan / (1000 * 60 * 60)).toFixed(1)}h. Layering depth: 2 hops.`;
          
          paths.push({
            path,
            totalValue,
            hopCount: 2,
            avgTransactionAmount: totalValue / 2,
            timeSpan: timeSpan / (1000 * 60 * 60), // hours
            suspicionScore,
            explanation,
            layeringDepth: 2,
          });
        }
      });
    });
  });

  return paths.sort((a, b) => b.suspicionScore - a.suspicionScore).slice(0, 30);
}

/**
 * Calculate network metrics
 */
export function calculateGraphMetrics(
  transactions: Transaction[],
  accounts: Account[]
): GraphMetrics {
  const graph = buildGraph(transactions);
  const nodes = accounts.length;
  let edges = 0;
  let totalDegree = 0;
  let maxDegree = 0;

  graph.forEach((neighbors) => {
    const degree = neighbors.size;
    edges += degree;
    totalDegree += degree;
    maxDegree = Math.max(maxDegree, degree);
  });

  const density = nodes > 1 ? edges / (nodes * (nodes - 1)) : 0;
  const avgDegree = nodes > 0 ? totalDegree / nodes : 0;

  // Count connected components using Union-Find
  const components = countComponents(accounts.map(a => a.id), transactions);

  return {
    density,
    avgDegree,
    maxDegree,
    components,
    transitivity: 0, // Simplified for now
  };
}

/**
 * Calculate degree centrality for each account
 */
export function calculateCentrality(
  transactions: Transaction[],
  accounts: Account[]
): Map<string, number> {
  const graph = buildGraph(transactions);
  const centrality = new Map<string, number>();

  accounts.forEach((account) => {
    const outDegree = graph.get(account.id)?.size || 0;
    let inDegree = 0;

    graph.forEach((neighbors) => {
      if (neighbors.has(account.id)) {
        inDegree++;
      }
    });

    centrality.set(account.id, outDegree + inDegree);
  });

  return centrality;
}

// Helper functions

function getRingTransactions(ring: string[], transactions: Transaction[]): Transaction[] {
  const txs: Transaction[] = [];
  for (let i = 0; i < ring.length; i++) {
    const from = ring[i];
    const to = ring[(i + 1) % ring.length];
    const matchingTxs = transactions.filter((tx) => tx.from === from && tx.to === to);
    txs.push(...matchingTxs);
  }
  return txs;
}

function calculateTimeGaps(transactions: Transaction[]): number[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime();
    gaps.push(gap / (1000 * 60 * 60)); // hours
  }
  return gaps.length > 0 ? gaps : [0];
}

function calculateRingSuspicion(
  ring: string[],
  transactions: Transaction[],
  accounts: Account[]
): number {
  let score = 0;

  // Factor 1: Small time gaps (rapid movement)
  const timeGaps = calculateTimeGaps(transactions);
  const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
  if (avgGap < 24) score += 0.3; // Less than 24 hours
  if (avgGap < 1) score += 0.2; // Less than 1 hour (very suspicious)

  // Factor 2: Similar amounts (structured)
  const amounts = transactions.map((tx) => tx.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avgAmount;
  if (cv < 0.1) score += 0.3; // Very similar amounts

  // Factor 3: Round amounts (structuring indicator)
  const roundAmounts = amounts.filter((amt) => amt % 1000 === 0 || amt % 500 === 0);
  if (roundAmounts.length / amounts.length > 0.7) score += 0.2;

  return Math.min(score, 1);
}

function calculatePathSuspicion(
  path: string[],
  transactions: Transaction[],
  accountMap: Map<string, Account>
): number {
  let score = 0;

  // Factor 1: High pass-through ratio
  const middleAccount = accountMap.get(path[1]);
  if (middleAccount) {
    const ratio = middleAccount.totalIn > 0 ? middleAccount.totalOut / middleAccount.totalIn : 0;
    if (ratio > 0.9) score += 0.4;
  }

  // Factor 2: Quick turnaround
  if (transactions.length >= 2) {
    const timeGap = new Date(transactions[1].timestamp).getTime() - new Date(transactions[0].timestamp).getTime();
    const hours = timeGap / (1000 * 60 * 60);
    if (hours < 24) score += 0.3;
    if (hours < 1) score += 0.2;
  }

  // Factor 3: Similar amounts
  if (transactions.length >= 2) {
    const diff = Math.abs(transactions[0].amount - transactions[1].amount);
    const avg = (transactions[0].amount + transactions[1].amount) / 2;
    if (diff / avg < 0.1) score += 0.3;
  }

  return Math.min(score, 1);
}

function countComponents(nodes: string[], transactions: Transaction[]): number {
  const parent = new Map<string, string>();
  
  // Initialize each node as its own parent
  nodes.forEach((node) => parent.set(node, node));

  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string): void {
    const px = find(x);
    const py = find(y);
    if (px !== py) {
      parent.set(px, py);
    }
  }

  // Union all connected nodes
  transactions.forEach((tx) => {
    union(tx.from, tx.to);
  });

  // Count unique components
  const components = new Set(nodes.map((node) => find(node)));
  return components.size;
}
