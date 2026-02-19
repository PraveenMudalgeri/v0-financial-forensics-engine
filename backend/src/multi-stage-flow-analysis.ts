// RIFT 2026 – Multi-Stage Laundering Flow Detection
// ═══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE
//   Identify accounts that participate in **multiple distinct pattern types**
//   in a temporal sequence — a strong indicator of structured money laundering
//   that spans several phases (placement → layering → integration).
//
//   For example, an account that appears in a fan_in pattern AND a shell_chain
//   AND a cycle is likely acting as a multi-stage intermediary.
//
// SCORING
//   Accounts flagged as MULTI_STAGE receive +20 suspicion-score boost (cap 100).
//
// ALGORITHM
//   1. For each account, collect the fraud rings it belongs to.
//   2. Extract the distinct pattern_types from those rings.
//   3. If the account participates in ≥ 2 distinct pattern types, tag it.
//   4. Order the patterns by the earliest transaction timestamp associated
//      with each pattern to produce a temporal flow sequence.
//
// INTEGRATION
//   Called AFTER centrality analysis (last post-detection enrichment step).
// ═══════════════════════════════════════════════════════════════════════════════

import { AccountNode, FraudRing, RawTransaction } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * For a given account and pattern type, find the earliest transaction timestamp
 * that connects the account to a ring of that pattern type.
 */
function earliestTimestampForPattern(
  accountId: string,
  patternType: string,
  ringsOfType: FraudRing[],
  transactions: RawTransaction[]
): number {
  // Collect all ring members across rings of this type that include accountId
  const peerNodes = new Set<string>();
  for (const ring of ringsOfType) {
    if (ring.members.includes(accountId)) {
      for (const m of ring.members) peerNodes.add(m);
    }
  }

  let earliest = Infinity;
  for (const tx of transactions) {
    const involves =
      (tx.sender_id === accountId && peerNodes.has(tx.receiver_id)) ||
      (tx.receiver_id === accountId && peerNodes.has(tx.sender_id));
    if (involves) {
      const t = new Date(tx.timestamp).getTime();
      if (t < earliest) earliest = t;
    }
  }
  return earliest;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect accounts that span ≥ 2 distinct pattern types across their fraud ring
 * memberships.  Tag them as `MULTI_STAGE`, record the ordered flow pattern, and
 * apply a +20 score boost (capped at 100).
 *
 * Mutates `accounts` in-place.
 */
export function detectMultiStageFlows(
  accounts: AccountNode[],
  fraudRings: FraudRing[],
  transactions: RawTransaction[]
): void {
  if (fraudRings.length === 0) return;

  // Index rings by pattern_type
  const ringsByType = new Map<string, FraudRing[]>();
  for (const ring of fraudRings) {
    if (!ringsByType.has(ring.pattern_type)) ringsByType.set(ring.pattern_type, []);
    ringsByType.get(ring.pattern_type)!.push(ring);
  }

  // Build account → set of pattern types + ring membership
  const accountRings = new Map<string, Set<string>>();
  for (const ring of fraudRings) {
    for (const memberId of ring.members) {
      if (!accountRings.has(memberId)) accountRings.set(memberId, new Set());
      accountRings.get(memberId)!.add(ring.pattern_type);
    }
  }

  const accountIdx = new Map<string, AccountNode>();
  for (const a of accounts) accountIdx.set(a.account_id, a);

  for (const [accountId, patternTypes] of accountRings) {
    if (patternTypes.size < 2) continue;

    const account = accountIdx.get(accountId);
    if (!account) continue;

    // Build temporally-ordered flow pattern
    const patternsWithTime: { pattern: string; t: number }[] = [];
    for (const pt of patternTypes) {
      const t = earliestTimestampForPattern(
        accountId,
        pt,
        ringsByType.get(pt) || [],
        transactions
      );
      patternsWithTime.push({ pattern: pt, t });
    }
    patternsWithTime.sort((a, b) => a.t - b.t);

    const flowPattern = patternsWithTime.map((p) => p.pattern);

    // Tag the account
    account.laundering_stage = 'MULTI_STAGE';
    account.flow_pattern = flowPattern;

    // Score boost
    account.suspicion_score = Math.min(100, account.suspicion_score + 20);

    if (!account.triggered_algorithms.includes('Multi-Stage Flow Detection')) {
      account.triggered_algorithms.push('Multi-Stage Flow Detection');
    }

    const flowStr = flowPattern.join(' → ');
    account.explanation += `. Multi-stage laundering flow detected: ${flowStr} (${patternTypes.size} distinct patterns)`;

    // Update detected_patterns if 'multi_stage' not already present
    if (!account.detected_patterns.includes('multi_stage')) {
      account.detected_patterns.push('multi_stage');
    }
  }
}
