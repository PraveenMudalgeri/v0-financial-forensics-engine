// RIFT 2026 – Temporal Cycle Validation
// ═══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE
//   For every detected cycle (A → B → C → A), verify that the transactions
//   actually occurred in chronological order.  A cycle is only meaningful when
//   money can plausibly flow along the path in time.  Additionally, amounts
//   must not drop more than 50% between consecutive hops (excessive leakage
//   signals a broken flow, not a laundering circuit).
//
// VALIDATION RULES
//   1. Chronological ordering:  t(A→B) ≤ t(B→C) ≤ t(C→A)
//      Uses the *earliest* qualifying transaction per hop.
//   2. Amount continuity:  amt(hop_i+1) >= 50% of amt(hop_i)
//
// ACTIONS ON INVALID CYCLES
//   • Remove the cycle's ring from the fraud_rings list
//   • Remove the ring_id from member accounts
//   • Subtract the cycle score contribution (–40) from affected accounts
//   • Clamp suspicion_score to [0, 100]
//
// INTEGRATION
//   Called AFTER scoring + fraud-ring construction, BEFORE centrality analysis.
// ═══════════════════════════════════════════════════════════════════════════════

import { AccountNode, FraudRing, RawTransaction } from './types';

interface CycleValidationResult {
  /** Ring IDs that were invalidated and removed */
  invalidatedRingIds: string[];
  /** Number of cycles that passed validation */
  validCount: number;
  /** Number of cycles that failed validation */
  invalidCount: number;
}

// ─── Find the earliest transaction for a directed hop ────────────────────────

function findEarliestTx(
  from: string,
  to: string,
  transactions: RawTransaction[]
): RawTransaction | undefined {
  let earliest: RawTransaction | undefined;
  let earliestTime = Infinity;
  for (const tx of transactions) {
    if (tx.sender_id === from && tx.receiver_id === to) {
      const t = new Date(tx.timestamp).getTime();
      if (t < earliestTime) {
        earliestTime = t;
        earliest = tx;
      }
    }
  }
  return earliest;
}

// ─── Validate a single cycle ─────────────────────────────────────────────────

function validateCycle(
  cycle: string[],
  transactions: RawTransaction[]
): { valid: boolean; reason?: string } {
  const hopCount = cycle.length; // cycle: [A,B,C] means hops A→B, B→C, C→A
  const hopTxs: RawTransaction[] = [];

  for (let i = 0; i < hopCount; i++) {
    const from = cycle[i];
    const to = cycle[(i + 1) % hopCount];
    const tx = findEarliestTx(from, to, transactions);
    if (!tx) {
      return { valid: false, reason: `No transaction found for hop ${from} → ${to}` };
    }
    hopTxs.push(tx);
  }

  // 1. Chronological ordering: t(hop_0) ≤ t(hop_1) ≤ … ≤ t(hop_n-1)
  for (let i = 1; i < hopTxs.length; i++) {
    const prev = new Date(hopTxs[i - 1].timestamp).getTime();
    const curr = new Date(hopTxs[i].timestamp).getTime();
    if (curr < prev) {
      return {
        valid: false,
        reason: `Temporal ordering violated: hop ${i - 1} (${hopTxs[i - 1].timestamp}) > hop ${i} (${hopTxs[i].timestamp})`,
      };
    }
  }

  // 2. Amount continuity: no hop drops more than 50%
  for (let i = 1; i < hopTxs.length; i++) {
    if (hopTxs[i].amount < hopTxs[i - 1].amount * 0.5) {
      return {
        valid: false,
        reason: `Amount drop >50%: hop ${i - 1} ($${hopTxs[i - 1].amount}) → hop ${i} ($${hopTxs[i].amount})`,
      };
    }
  }

  return { valid: true };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate all cycle-type fraud rings for temporal ordering and amount
 * continuity.  Invalid rings are removed from the `fraudRings` array, and
 * member accounts are adjusted accordingly.
 *
 * Mutates `accounts` and `fraudRings` in-place.  Returns a summary of which
 * rings were invalidated.
 */
export function validateTemporalCycles(
  accounts: AccountNode[],
  fraudRings: FraudRing[],
  cycles: string[][],
  transactions: RawTransaction[]
): CycleValidationResult {
  const accountIdx = new Map<string, AccountNode>();
  for (const a of accounts) accountIdx.set(a.account_id, a);

  // Map ring_id → cycle path for cycle-type rings
  const cycleRingIds = new Map<string, string[]>();
  for (const ring of fraudRings) {
    if (ring.pattern_type === 'cycle') {
      cycleRingIds.set(ring.ring_id, ring.members);
    }
  }

  const invalidatedRingIds: string[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const [ringId, members] of cycleRingIds) {
    const result = validateCycle(members, transactions);

    if (result.valid) {
      validCount++;
      continue;
    }

    invalidCount++;
    invalidatedRingIds.push(ringId);

    // Remove ring_id from member accounts and subtract cycle score
    for (const memberId of members) {
      const account = accountIdx.get(memberId);
      if (!account) continue;

      // Remove this ring_id
      account.ring_ids = account.ring_ids.filter((id) => id !== ringId);

      // Check if this account still participates in any *other* cycle-type ring
      const stillInCycle = account.ring_ids.some((rid) => {
        const r = fraudRings.find((fr) => fr.ring_id === rid);
        return r?.pattern_type === 'cycle';
      });

      if (!stillInCycle) {
        // Remove cycle score contribution
        account.pattern_scores.cycle = 0;

        // Recalculate total from per-pattern scores
        const ps = account.pattern_scores;
        let total = ps.fan_in + ps.fan_out + ps.cycle + ps.shell + ps.velocity;
        total = Math.min(100, Math.max(0, total));
        account.suspicion_score = total;

        // Remove 'cycle' from detected_patterns
        account.detected_patterns = account.detected_patterns.filter((p) => p !== 'cycle');

        // Update explanation
        account.explanation += `. Cycle ring ${ringId} invalidated: ${result.reason}`;

        // Update is_suspicious
        account.is_suspicious = account.suspicion_score > 0;
      }
    }
  }

  // Remove invalidated rings from the array (mutate in-place)
  for (let i = fraudRings.length - 1; i >= 0; i--) {
    if (invalidatedRingIds.includes(fraudRings[i].ring_id)) {
      fraudRings.splice(i, 1);
    }
  }

  return { invalidatedRingIds, validCount, invalidCount };
}
