// Core data types for the Money Muling Detection Engine

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  currency: string;
  description?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'business' | 'unknown';
  riskScore: number;
  isMule?: boolean;
  totalIn: number;
  totalOut: number;
  transactionCount: number;
  metadata?: {
    createdAt?: string;
    country?: string;
    kycStatus?: string;
  };
}

export interface NetworkNode extends Account {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
  transactionCount: number;
}

export interface RingStructure {
  nodes: string[];
  totalValue: number;
  suspicionScore: number;
  avgTimeGap: number;
}

export interface PathAnalysis {
  path: string[];
  totalValue: number;
  hopCount: number;
  avgTransactionAmount: number;
  timeSpan: number;
  suspicionScore: number;
}

export interface AnalysisResult {
  accounts: Account[];
  transactions: Transaction[];
  rings: RingStructure[];
  suspiciousPaths: PathAnalysis[];
  networkMetrics: {
    totalAccounts: number;
    totalTransactions: number;
    totalValue: number;
    avgRiskScore: number;
    highRiskAccounts: number;
    detectedMules: number;
  };
}

export interface GraphMetrics {
  density: number;
  avgDegree: number;
  maxDegree: number;
  components: number;
  transitivity: number;
}
