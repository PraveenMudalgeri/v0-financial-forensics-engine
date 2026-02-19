// Sample data generator for RIFT 2026 hackathon
// Generates transactions that trigger all detection patterns:
// cycles (3-5), fan-in (10+ in 72h), fan-out (10+ in 72h), shell chains (3+ hops)

import { RawTransaction } from './types';

function ts(daysAgo: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() + hoursOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let txCounter = 0;
function tx(
  sender: string,
  receiver: string,
  amount: number,
  timestamp: string
): RawTransaction {
  txCounter++;
  return {
    transaction_id: `TXN_${String(txCounter).padStart(5, '0')}`,
    sender_id: sender,
    receiver_id: receiver,
    amount: Math.round(amount * 100) / 100,
    timestamp,
  };
}

export function generateSampleData(): RawTransaction[] {
  txCounter = 0;
  const transactions: RawTransaction[] = [];

  // ── SCENARIO 1: Cycle of length 3 (A->B->C->A) ──
  transactions.push(tx('ACCT_001', 'ACCT_002', 5000, ts(10, 0)));
  transactions.push(tx('ACCT_002', 'ACCT_003', 4800, ts(10, 2)));
  transactions.push(tx('ACCT_003', 'ACCT_001', 4600, ts(10, 4)));
  // Second rotation
  transactions.push(tx('ACCT_001', 'ACCT_002', 5200, ts(8, 0)));
  transactions.push(tx('ACCT_002', 'ACCT_003', 5000, ts(8, 1)));
  transactions.push(tx('ACCT_003', 'ACCT_001', 4900, ts(8, 3)));

  // ── SCENARIO 2: Cycle of length 4 ──
  transactions.push(tx('ACCT_010', 'ACCT_011', 8000, ts(12, 0)));
  transactions.push(tx('ACCT_011', 'ACCT_012', 7500, ts(12, 3)));
  transactions.push(tx('ACCT_012', 'ACCT_013', 7200, ts(12, 5)));
  transactions.push(tx('ACCT_013', 'ACCT_010', 7000, ts(12, 8)));

  // ── SCENARIO 3: Cycle of length 5 ──
  transactions.push(tx('ACCT_020', 'ACCT_021', 3000, ts(15, 0)));
  transactions.push(tx('ACCT_021', 'ACCT_022', 2900, ts(15, 1)));
  transactions.push(tx('ACCT_022', 'ACCT_023', 2800, ts(15, 2)));
  transactions.push(tx('ACCT_023', 'ACCT_024', 2700, ts(15, 3)));
  transactions.push(tx('ACCT_024', 'ACCT_020', 2600, ts(15, 5)));

  // ── SCENARIO 4: Fan-in (12 senders -> 1 receiver within 72h) ──
  const fanInTarget = 'ACCT_050';
  for (let i = 1; i <= 12; i++) {
    transactions.push(
      tx(
        `ACCT_F${String(i).padStart(2, '0')}`,
        fanInTarget,
        2000 + Math.random() * 500,
        ts(5, i * 2) // All within 24h window
      )
    );
  }

  // ── SCENARIO 5: Fan-out (1 sender -> 11 receivers within 72h) ──
  const fanOutSource = 'ACCT_060';
  for (let i = 1; i <= 11; i++) {
    transactions.push(
      tx(
        fanOutSource,
        `ACCT_R${String(i).padStart(2, '0')}`,
        1500 + Math.random() * 300,
        ts(3, i * 3)
      )
    );
  }

  // ── SCENARIO 6: Shell chain (4 hops through low-activity intermediaries) ──
  // ACCT_070 -> SHELL_01 -> SHELL_02 -> SHELL_03 -> ACCT_075
  transactions.push(tx('ACCT_070', 'SHELL_01', 15000, ts(7, 0)));
  transactions.push(tx('SHELL_01', 'SHELL_02', 14500, ts(7, 1)));
  transactions.push(tx('SHELL_02', 'SHELL_03', 14000, ts(7, 2)));
  transactions.push(tx('SHELL_03', 'ACCT_075', 13500, ts(7, 4)));

  // ── SCENARIO 7: Another shell chain ──
  transactions.push(tx('ACCT_080', 'SHELL_04', 9000, ts(6, 0)));
  transactions.push(tx('SHELL_04', 'SHELL_05', 8800, ts(6, 2)));
  transactions.push(tx('SHELL_05', 'ACCT_085', 8600, ts(6, 4)));

  // ── SCENARIO 8: Normal legitimate accounts (control group) ──
  const legitimateAccounts = [
    'LEGIT_01',
    'LEGIT_02',
    'LEGIT_03',
    'LEGIT_04',
    'LEGIT_05',
  ];
  for (let i = 0; i < 30; i++) {
    const from =
      legitimateAccounts[Math.floor(Math.random() * legitimateAccounts.length)];
    let to =
      legitimateAccounts[Math.floor(Math.random() * legitimateAccounts.length)];
    while (to === from) {
      to =
        legitimateAccounts[
          Math.floor(Math.random() * legitimateAccounts.length)
        ];
    }
    transactions.push(
      tx(from, to, Math.random() * 3000 + 100, ts(Math.random() * 30, Math.random() * 24))
    );
  }

  // ── SCENARIO 9: Mule pattern (many in -> pass through -> many out) ──
  const mule = 'MULE_001';
  for (let i = 1; i <= 6; i++) {
    transactions.push(
      tx(`SRC_${String(i).padStart(2, '0')}`, mule, 10000, ts(4, i))
    );
  }
  for (let i = 1; i <= 6; i++) {
    transactions.push(
      tx(mule, `DST_${String(i).padStart(2, '0')}`, 9500, ts(4, i + 8))
    );
  }

  // ── SCENARIO 10: Complex cycle with fan-out ──
  transactions.push(tx('CMPLX_01', 'CMPLX_02', 6000, ts(9, 0)));
  transactions.push(tx('CMPLX_02', 'CMPLX_03', 5800, ts(9, 1)));
  transactions.push(tx('CMPLX_03', 'CMPLX_01', 5500, ts(9, 3)));
  // CMPLX_02 also fans out
  for (let i = 1; i <= 5; i++) {
    transactions.push(
      tx('CMPLX_02', `CMPLX_OUT_${i}`, 1000, ts(9, i + 4))
    );
  }

  return transactions;
}
