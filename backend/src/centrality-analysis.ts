// RIFT 2026 – Ring Leadership Detection via Betweenness Centrality
// ═══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE
//   After fraud rings are constructed, this module builds a subgraph for each
//   ring (nodes + internal edges), computes **betweenness centrality** for every
//   member, and assigns a leadership role:
//
//     ORCHESTRATOR  – highest centrality (top 1 node per ring)
//     INTERMEDIARY  – mid-range centrality (middle tier)
//     PERIPHERAL    – lowest centrality (bottom tier)
//
//   Orchestrators receive a +10 suspicion-score boost (capped at 100).
//
// ALGORITHM
//   Brandes' algorithm adapted for small dense subgraphs.
//   Time complexity per ring: O(V * E)  where V,E are ring-local.
//   Since rings are typically 3–20 nodes this is effectively O(1) per ring.
//
// INTEGRATION
//   Called in the detection pipeline AFTER fraud ring construction.
// ═══════════════════════════════════════════════════════════════════════════════

import { AccountNode, FraudRing, RawTransaction, RingRole } from './types';

// ─── Betweenness Centrality (Brandes, unweighted, directed) ──────────────────
// Returns a Map<nodeId, centrality> for the given subgraph.

function brandesBetweenness(
  nodes: string[],
  edges: Map<string, string[]>
): Map<string, number> {
  const cb = new Map<string, number>();
  for (const v of nodes) cb.set(v, 0);

  for (const s of nodes) {
    // BFS / shortest-path DAG
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    const delta = new Map<string, number>();

    for (const v of nodes) {
      pred.set(v, []);
      sigma.set(v, 0);
      dist.set(v, -1);
      delta.set(v, 0);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    const queue: string[] = [s];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      const neighbors = edges.get(v) || [];
      for (const w of neighbors) {
        // w found for the first time?
        if (dist.get(w) === -1) {
          queue.push(w);
          dist.set(w, dist.get(v)! + 1);
        }
        // shortest path to w via v?
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    // Back-propagation of dependencies
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        const d = delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, d);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // Normalise to [0, 1] range
  const maxCb = Math.max(...Array.from(cb.values()), 1e-9);
  for (const [v, val] of cb) {
    cb.set(v, val / maxCb);
  }
  return cb;
}

// ─── Build ring-local directed edge list from transactions ───────────────────

function buildRingEdges(
  members: Set<string>,
  transactions: RawTransaction[]
): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const m of members) edges.set(m, []);

  const seen = new Set<string>();
  for (const tx of transactions) {
    if (!members.has(tx.sender_id) || !members.has(tx.receiver_id)) continue;
    const key = `${tx.sender_id}->${tx.receiver_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.get(tx.sender_id)!.push(tx.receiver_id);
  }
  return edges;
}

// ─── Assign role based on centrality rank ────────────────────────────────────

function assignRole(rank: number, totalMembers: number): RingRole {
  if (rank === 0) return 'ORCHESTRATOR';
  if (totalMembers <= 3) {
    // Small rings: top is orchestrator, rest peripheral
    return 'PERIPHERAL';
  }
  // Larger rings: top = orchestrator, bottom third = peripheral, rest intermediary
  const cutoff = Math.ceil(totalMembers * 0.66);
  return rank < cutoff ? 'INTERMEDIARY' : 'PERIPHERAL';
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute betweenness centrality for each fraud ring, assign leadership roles,
 * and apply an ORCHESTRATOR score boost (+10, capped at 100).
 *
 * Mutates `accounts` in-place.
 */
export function analyzeRingLeadership(
  accounts: AccountNode[],
  fraudRings: FraudRing[],
  transactions: RawTransaction[]
): void {
  if (fraudRings.length === 0) return;

  const accountIdx = new Map<string, AccountNode>();
  for (const a of accounts) accountIdx.set(a.account_id, a);

  for (const ring of fraudRings) {
    const memberSet = new Set(ring.members);
    if (memberSet.size < 2) continue;

    const edges = buildRingEdges(memberSet, transactions);
    const centrality = brandesBetweenness(ring.members, edges);

    // Sort descending by centrality
    const ranked = ring.members
      .map((id) => ({ id, c: centrality.get(id) ?? 0 }))
      .sort((a, b) => b.c - a.c);

    for (let i = 0; i < ranked.length; i++) {
      const { id, c } = ranked[i];
      const account = accountIdx.get(id);
      if (!account) continue;

      const role = assignRole(i, ranked.length);

      // Keep highest centrality if account appears in multiple rings
      if (account.centrality_score === undefined || c > account.centrality_score) {
        account.centrality_score = Math.round(c * 1000) / 1000;
        account.ring_role = role;
      }

      // Orchestrator boost
      if (role === 'ORCHESTRATOR') {
        account.suspicion_score = Math.min(100, account.suspicion_score + 10);
        if (!account.triggered_algorithms.includes('Ring Leadership Centrality')) {
          account.triggered_algorithms.push('Ring Leadership Centrality');
        }
        if (!account.explanation.includes('ORCHESTRATOR')) {
          account.explanation += `. Identified as ORCHESTRATOR (centrality ${account.centrality_score}) in ${ring.ring_id}`;
        }
      }
    }
  }
}
