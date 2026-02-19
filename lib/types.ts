// Core data types for the Money Muling Detection Engine

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  currency: string;
  description?: string;
  frequency?: number; // Transaction frequency on this edge
  temporalCluster?: number; // Which time window cluster
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
  // Property Graph Attributes
  totalAmountSent: number;
  totalAmountReceived: number;
  firstSeenTimestamp?: string;
  lastSeenTimestamp?: string;
  // Advanced Analytics
  degreeCentrality?: number;
  betweennessCentrality?: number;
  pageRank?: number;
  communityId?: number;
  // Pattern Detection
  isLegitimatePattern?: 'merchant' | 'payroll' | null;
  // Explainability
  riskFactors?: RiskFactor[];
  metadata?: {
    createdAt?: string;
    country?: string;
    kycStatus?: string;
  };
}

export interface RiskFactor {
  type: 'structural' | 'behavioral' | 'network' | 'temporal';
  factor: string;
  score: number;
  explanation: string;
  algorithmSource: string;
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
  detectionAlgorithm: string;
  explanation: string;
  riskFactors: string[];
}

export interface PathAnalysis {
  path: string[];
  totalValue: number;
  hopCount: number;
  avgTransactionAmount: number;
  timeSpan: number;
  suspicionScore: number;
  explanation: string;
  layeringDepth?: number;
}

export interface Community {
  id: number;
  nodes: string[];
  internalDensity: number;
  externalConnections: number;
  totalValue: number;
  suspicionScore: number;
  avgRiskScore: number;
  explanation: string;
}

export interface CentralityMetrics {
  accountId: string;
  degreeCentrality: number;
  betweennessCentrality: number;
  pageRank: number;
  role: 'aggregator' | 'broker' | 'coordinator' | 'normal';
  explanation: string;
}

export interface TemporalPattern {
  accountId: string;
  pattern: 'velocity_spike' | 'dormancy_activation' | 'burst_activity' | 'steady';
  transactionsIn72h: number;
  avgDailyRate: number;
  suspicionScore: number;
}

export interface AnalysisResult {
  accounts: Account[];
  transactions: Transaction[];
  rings: RingStructure[];
  suspiciousPaths: PathAnalysis[];
  communities: Community[];
  centralityMetrics: CentralityMetrics[];
  temporalPatterns: TemporalPattern[];
  networkMetrics: {
    totalAccounts: number;
    totalTransactions: number;
    totalValue: number;
    avgRiskScore: number;
    highRiskAccounts: number;
    detectedMules: number;
    communityCount: number;
    isolatedAccounts: number;
  };
  scalabilityInfo: {
    graphStructure: 'adjacency_list';
    nodeCount: number;
    edgeCount: number;
    avgComplexity: string;
    recommendedApproach: string;
  };
}

export interface GraphMetrics {
  density: number;
  avgDegree: number;
  maxDegree: number;
  components: number;
  transitivity: number;
}
