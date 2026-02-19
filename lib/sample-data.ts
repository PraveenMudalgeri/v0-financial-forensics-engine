// Sample data generator for demonstration

import { Transaction } from './types';

/**
 * Generate sample transaction data with money muling patterns
 */
export function generateSampleData(): Transaction[] {
  const transactions: Transaction[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Scenario 1: Classic ring structure (A -> B -> C -> D -> A)
  const ring1 = ['ACC001', 'ACC002', 'ACC003', 'ACC004'];
  for (let i = 0; i < ring1.length; i++) {
    transactions.push({
      id: `TX${transactions.length + 1}`,
      from: ring1[i],
      to: ring1[(i + 1) % ring1.length],
      amount: 5000 + Math.random() * 500,
      timestamp: new Date(now - day * (30 - i * 2)).toISOString(),
      currency: 'USD',
      description: 'Wire transfer',
    });
  }

  // Scenario 2: Money mule (hub pattern - many IN, many OUT)
  const mule = 'ACC010';
  const sources = ['ACC011', 'ACC012', 'ACC013', 'ACC014'];
  const destinations = ['ACC015', 'ACC016', 'ACC017', 'ACC018'];

  sources.forEach((source, i) => {
    transactions.push({
      id: `TX${transactions.length + 1}`,
      from: source,
      to: mule,
      amount: 10000,
      timestamp: new Date(now - day * (25 - i)).toISOString(),
      currency: 'USD',
      description: 'Deposit',
    });
  });

  destinations.forEach((dest, i) => {
    transactions.push({
      id: `TX${transactions.length + 1}`,
      from: mule,
      to: dest,
      amount: 9500,
      timestamp: new Date(now - day * (25 - i) + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      currency: 'USD',
      description: 'Wire transfer',
    });
  });

  // Scenario 3: Layering pattern (quick succession through multiple accounts)
  const layer = ['ACC020', 'ACC021', 'ACC022', 'ACC023', 'ACC024'];
  for (let i = 0; i < layer.length - 1; i++) {
    transactions.push({
      id: `TX${transactions.length + 1}`,
      from: layer[i],
      to: layer[i + 1],
      amount: 15000 - i * 500,
      timestamp: new Date(now - day * 20 + i * 60 * 60 * 1000).toISOString(), // 1 hour apart
      currency: 'USD',
      description: 'Transfer',
    });
  }

  // Scenario 4: Structuring (multiple small transactions just under reporting threshold)
  const structurer = 'ACC030';
  const targets = ['ACC031', 'ACC032', 'ACC033'];
  targets.forEach((target, i) => {
    for (let j = 0; j < 5; j++) {
      transactions.push({
        id: `TX${transactions.length + 1}`,
        from: structurer,
        to: target,
        amount: 9000 + Math.random() * 500, // Just under $10k
        timestamp: new Date(now - day * (15 - i) + j * 2 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        description: 'Cash deposit',
      });
    }
  });

  // Scenario 5: Normal transactions (control group)
  const normalAccounts = ['ACC100', 'ACC101', 'ACC102', 'ACC103', 'ACC104'];
  for (let i = 0; i < 20; i++) {
    const from = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    let to = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    while (to === from) {
      to = normalAccounts[Math.floor(Math.random() * normalAccounts.length)];
    }

    transactions.push({
      id: `TX${transactions.length + 1}`,
      from,
      to,
      amount: Math.random() * 5000 + 500,
      timestamp: new Date(now - Math.random() * 30 * day).toISOString(),
      currency: 'USD',
      description: 'Payment',
    });
  }

  // Scenario 6: Another ring with faster velocity
  const ring2 = ['ACC040', 'ACC041', 'ACC042'];
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < ring2.length; i++) {
      transactions.push({
        id: `TX${transactions.length + 1}`,
        from: ring2[i],
        to: ring2[(i + 1) % ring2.length],
        amount: 7500,
        timestamp: new Date(now - day * (10 - cycle * 2) + i * 30 * 60 * 1000).toISOString(), // 30 min apart
        currency: 'USD',
        description: 'Instant transfer',
      });
    }
  }

  // Scenario 7: Fan-out pattern (one source, many destinations - potential laundering)
  const source = 'ACC050';
  const fanOut = ['ACC051', 'ACC052', 'ACC053', 'ACC054', 'ACC055', 'ACC056'];
  fanOut.forEach((dest, i) => {
    transactions.push({
      id: `TX${transactions.length + 1}`,
      from: source,
      to: dest,
      amount: 5000,
      timestamp: new Date(now - day * 8 + i * 15 * 60 * 1000).toISOString(),
      currency: 'USD',
      description: 'Distribution',
    });
  });

  return transactions;
}
