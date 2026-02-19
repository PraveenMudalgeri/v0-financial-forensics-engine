# Financial Forensics Engine - Technical Architecture

## Enhanced Graph Modeling

### Property Graph Model
The system models the financial network as a **directed weighted property graph**:

**Nodes (Accounts):**
- `id`, `name`, `type`
- `totalAmountSent`, `totalAmountReceived` - Property graph attributes
- `firstSeenTimestamp`, `lastSeenTimestamp` - Temporal tracking
- `transactionCount` - Aggregated metrics
- `degreeCentrality`, `betweennessCentrality`, `pageRank` - Graph analytics
- `communityId` - Community detection results
- `isLegitimatePattern` - False positive filtering
- `riskFactors[]` - Explainability data

**Edges (Transactions):**
- `from`, `to`, `amount`, `timestamp`
- `frequency` - Transaction count on edge
- `temporalCluster` - Time window grouping

### Data Structure: Adjacency List

**Why Adjacency Lists over Matrices?**
- **Space Efficiency**: O(V + E) vs O(V²) for sparse graphs
- **Iteration Speed**: Only traverse actual edges, not empty connections
- **Scalability**: Financial networks are sparse (avg degree << total nodes)
- **Dynamic Updates**: Easy to add/remove edges

Implementation: `Map<string, Map<string, Transaction[]>>`
- Outer map: source account → neighbors
- Inner map: target account → transaction list
- Supports multi-edges (multiple transactions between same accounts)

### Temporal Graph Layer

**72-Hour Sliding Windows:**
```typescript
const window72h = 72 * 60 * 60 * 1000;
const recentTxs = transactions.filter(
  tx => now - new Date(tx.timestamp).getTime() < window72h
);
```

**Efficient Temporal Queries:**
- Pre-sorted transaction arrays by timestamp
- Binary search for time range queries: O(log n)
- Maintains first/last seen timestamps per account
- Velocity calculated as: txCount / timeSpan

**Detections:**
- **Velocity Spikes**: Recent activity >> historical average
- **Dormancy Activation**: Long gap → sudden burst
- **Burst Activity**: Many transactions in < 24h

---

## Advanced Graph Analytics

### 1. Community Detection (Louvain Algorithm)

**Purpose**: Identify tightly connected clusters that transact heavily together. Criminal rings appear as high-density communities with low external connections.

**Algorithm**: Modularity-based optimization
```typescript
modularity = Σ(internal_edges / total_edges - expected_random)
```

**Time Complexity**: O(n log n)
- Linear in edges for each iteration
- Typically converges in < 10 iterations

**Why Criminal Rings = Communities:**
- Money mule rings circulate funds internally
- Minimize external exposure
- High trust within group (repeated transactions)
- Form natural graph clusters

**Implementation Highlights:**
- Initialize each node in own community
- Iteratively move nodes to maximize modularity gain
- Track internal density & external connections
- Flag communities with:
  - Internal density > 0.6
  - Suspicion score > 0.5
  - Typical ring size (3-8 accounts)

### 2. Centrality Analysis

#### Degree Centrality
```typescript
degree(v) = in_degree(v) + out_degree(v)
```
**Identifies**: **Aggregators** - accounts with many connections
- High degree = collecting/distributing funds
- Typical in placement/layering phases

#### Betweenness Centrality
```typescript
betweenness(v) = Σ(σ(s,t|v) / σ(s,t))
```
**Identifies**: **Brokers/Coordinators** - accounts that bridge different groups
- Appears on many shortest paths
- Critical for layering operations
- Removing these nodes fragments network

**Time Complexity**: O(VE) for all nodes
- Sampled version: O(kE) where k = sample size
- Uses BFS for shortest paths

#### PageRank
```typescript
PR(v) = (1-d)/N + d × Σ(PR(u) / out_degree(u))
```
**Identifies**: **Influential Nodes** - accounts receiving from important sources
- Damping factor: 0.85
- Converges in ~10 iterations
- Detects reputation-based influence

**Role Classification:**
- `coordinator`: betweenness > 10 (layering suspect)
- `aggregator`: degree > 15 (collection point)
- `broker`: pageRank > 0.02 (influential)
- `normal`: below thresholds

### 3. Path Analysis

**Multi-Hop Tracing** (3-6 hops):
- DFS-based path enumeration with depth limit
- Tracks total value through intermediaries
- Detects layering structures spanning multiple accounts

**Max-Flow Style Analysis:**
- Sum transaction amounts along path
- Compare input/output at each hop
- Flag near-perfect pass-through ratios

**Layering Detection:**
```
Source → Mule1 → Mule2 → Mule3 → Destination
```
- Each hop: 80-95% pass-through
- Quick turnaround times (< 24h)
- Similar amounts (structuring)

### 4. Cycle Detection (Johnson's Algorithm Variant)

**Upgraded Implementation:**
- DFS with recursion stack tracking
- Detects all simple cycles (no repeated nodes except start/end)
- Size filtering: 3-10 nodes (typical ring size)

**Time Complexity**: O(V + E + C) where C = cycle count
- Linear in edges for DFS
- Each cycle found once
- Pruned by size constraints

**Why Cycles = Money Muling:**
- Circular movement obfuscates origin
- Creates false transaction history
- Returns funds to original coordinator
- Common in placement/integration phases

---

## Multi-Factor Risk Scoring Engine

### Risk Components (Weighted)

```typescript
totalScore = 
  structuralRisk × 0.35 +
  behavioralRisk × 0.30 +
  networkRisk × 0.25 +
  temporalRisk × 0.10 +
  propagatedRisk × 0.15
```

#### 1. Structural Risk (35%)
- **Cycle Participation**: Part of detected ring
- **Community Anomaly**: Member of high-risk cluster
- **Centrality Anomalies**: Unusual graph position

#### 2. Behavioral Risk (30%)
- **High Velocity**: > 10 transactions/day
- **Pass-Through Ratio**: > 90% funds moved out
- **Structuring**: > 70% round amounts ($1000, $9999)
- **Quick Turnaround**: < 24h in/out times

#### 3. Network Risk (25%)
- **High Betweenness**: Coordinator role
- **Connected to High-Risk**: Transacts with confirmed mules
- **High-Risk Cluster Member**: Community avg risk > 0.7

#### 4. Temporal Risk (10%)
- **Activity Spike**: Recent >> average
- **Dormancy Activation**: Long gap → burst

### Risk Propagation

**Concept**: Risk spreads through network connections
```typescript
propagation = min(connectedHighRiskNodes × 0.15, 0.6)
```

**Why It Works:**
- Money mules often recruited in clusters
- Coordinators connect multiple mules
- Associates share similar patterns
- Network effects amplify detection

**Capped at 60%** to prevent false cascade

### Score Decay

**Why Needed:** Old activity less relevant
```typescript
if (daysSince < 30) decay = 1.0
else if (daysSince < 180) decay = 1.0 - (daysSince-30)/150 × 0.5
else decay = 0.5
```

**Prevents**: Flagging reformed accounts with old suspicious activity

### Score Normalization

All components normalized to [0, 1]
- Prevents any single factor dominating
- Allows interpretable percentage scores
- Enables threshold-based alerts

---

## False Positive Intelligence

### 1. Merchant Pattern Detection

**Characteristics:**
- High in-degree (many customers)
- Low out-degree (few suppliers/banks)
- Many unique counterparties
- Some repeat customers
- No cycle participation

**Heuristic:**
```typescript
if (
  uniqueSenders > 15 &&
  repeatRatio < 0.7 &&
  outgoing < incoming × 0.2
) → merchant
```

**Why Naive Fan-Out Mislabels Merchants:**
- High degree alone flags aggregators
- But merchants have legitimate fan-in
- No pass-through to other accounts
- Regular business pattern, not laundering

**False Positive Reduction:** 40% score dampening

### 2. Payroll Pattern Detection

**Characteristics:**
- One-to-many structure (company → employees)
- Regular periodic intervals (weekly/bi-weekly)
- Consistent amounts
- Low incoming, high outgoing

**Heuristic:**
```typescript
if (
  outgoing > 10 &&
  incoming < 5 &&
  intervalConsistency > 0.7 &&
  uniqueRecipients > 5
) → payroll
```

**False Positive Reduction:** 30% score dampening

---

## Explainability Module

### Per-Account Risk Factors

Each account gets detailed `riskFactors[]`:
```typescript
{
  type: 'structural' | 'behavioral' | 'network' | 'temporal',
  factor: 'high_passthrough',
  score: 0.4,
  explanation: '95% of incoming funds immediately transferred out (mule indicator)',
  algorithmSource: 'Pass-Through Analysis'
}
```

### Graph Visualization Tooltips

**Implementation:**
- Hover over node → show top 3 risk factors
- Color-coded by risk level (red/amber/blue)
- Click node → full risk breakdown panel
- Edge thickness = transaction volume

**Example Tooltip:**
```
Account A123
Risk Score: 87%

Flagged due to:
• High pass-through ratio (0.4)
• Part of 4-node cycle (0.3)
• High betweenness centrality (0.35)

Algorithm: Multi-Factor Risk Scoring
```

### Ring/Path Explanations

Every detected structure includes:
```typescript
{
  explanation: "Ring of 4 accounts with rapid_movement, similar_amounts. 
                Average time: 2.3h. Total value: $125,000.",
  detectionAlgorithm: "DFS Cycle Detection (Johnson's variant)",
  riskFactors: ['rapid_movement', 'similar_amounts', 'structuring']
}
```

### Why Explainability Matters for Regulators

1. **Compliance**: GDPR/CCPA require decision explanations
2. **Auditability**: Investigators need to justify actions
3. **Defense**: Court cases require algorithmic transparency
4. **Tuning**: Understanding false positives improves system
5. **Trust**: Human experts must validate AI decisions

**Regulatory Standards:**
- FATF (Financial Action Task Force) guidelines
- FinCEN SAR (Suspicious Activity Report) requirements
- BSA/AML compliance audits

---

## Scalability Architecture

### Current Implementation (In-Memory)

**Data Structures:**
- Adjacency lists: `Map<string, Map<string, Transaction[]>>`
- Account index: `Map<string, Account>`
- Community cache: `Community[]`

**Complexity Analysis:**
| Operation | Complexity | Notes |
|-----------|------------|-------|
| Add Transaction | O(1) | HashMap insert |
| Find Neighbors | O(1) | Direct lookup |
| DFS Cycle Detection | O(V + E) | Linear in graph size |
| Community Detection | O(n log n) | Louvain iterations |
| Betweenness Centrality | O(VE) | BFS from each node |
| PageRank | O(kE) | k iterations |

### Scaling Beyond 10K Transactions

**Option 1: Batch Processing**
- Process daily transaction dumps
- Pre-compute communities/centrality
- Store results in SQL database
- Real-time queries against precomputed data

**Option 2: Graph Database (Neo4j)**
```cypher
MATCH (a:Account)-[t:TRANSACTION]->(b:Account)
WHERE t.amount > 10000 AND t.timestamp > datetime() - duration('P3D')
RETURN a, b, t
```

**Advantages:**
- Native graph traversals
- Cypher query language
- Built-in algorithms (PageRank, community detection)
- ACID transactions

**When to Use:**
- > 100K accounts
- > 1M transactions
- Real-time query requirements
- Complex multi-hop queries

**Option 3: TigerGraph**
- Parallel processing
- Real-time deep link analytics
- GSQL for graph algorithms
- Petabyte-scale capability

### Incremental Updates

**Batch Mode** (Current):
- Full graph rebuild on each analysis
- O(V + E) construction time
- Suitable for < 50K transactions

**Streaming Mode** (Future):
- Update data structures incrementally
- Maintain running community assignments
- Recompute centrality for affected subgraph only
- Event-driven architecture

**Implementation Strategy:**
```typescript
class GraphAnalyzer {
  addTransaction(tx: Transaction) {
    this.graph.addEdge(tx.from, tx.to, tx);
    this.updateAffectedCommunity(tx.from, tx.to);
    this.updateLocalCentrality(tx.from, tx.to);
  }
}
```

### Why NetworkX vs Neo4j vs Implementation Choice

**In-Memory (Current Choice):**
- ✅ Fast for < 10K nodes
- ✅ No external dependencies
- ✅ Full algorithmic control
- ✅ Easy deployment
- ❌ Memory limited
- ❌ No persistence

**NetworkX (Python):**
- ✅ Rich algorithm library
- ✅ Research/prototyping
- ❌ Python performance
- ❌ Not real-time

**Neo4j:**
- ✅ Production-ready
- ✅ Persistent storage
- ✅ ACID guarantees
- ✅ Visual tools
- ❌ Operational overhead
- ❌ Cost

**Recommendation:**
- < 10K nodes: In-memory (current)
- 10K-100K: Neo4j + caching layer
- > 100K: TigerGraph or custom distributed system

---

## Innovation Section (Advanced Concepts)

### 1. Graph Neural Networks (GNN) - Conceptual

**Concept**: Learn account embeddings from graph structure
```python
# Conceptual architecture
class GNNMuleDetector(nn.Module):
    def forward(self, node_features, adjacency_matrix):
        # Message passing
        h1 = self.gcn1(node_features, adjacency_matrix)
        h2 = self.gcn2(h1, adjacency_matrix)
        
        # Classification
        return self.classifier(h2)
```

**Why It Works:**
- Learns from graph topology automatically
- Captures complex relational patterns
- Generalizes to unseen accounts
- End-to-end optimization

**Training Data:**
- Historical confirmed mule cases
- Network snapshots
- Supervised learning from investigations

### 2. Node2Vec Embeddings

**Algorithm**: Random walk + Skip-gram
```typescript
// Conceptual
function node2vec(graph, dimensions=128) {
  walks = generateRandomWalks(graph, p=1, q=0.5);
  model = skipGram(walks, dimensions);
  return model.embeddings;
}
```

**Applications:**
- Cluster similar accounts in embedding space
- Anomaly detection via embedding distance
- Visual exploration in 2D (t-SNE projection)

### 3. Unsupervised Anomaly Detection

**Isolation Forest on Embeddings:**
```typescript
// Conceptual
embeddings = node2vec(graph);
isolationForest = new IsolationForest();
anomalies = isolationForest.fit_predict(embeddings);
```

**Advantages:**
- No labeled data required
- Discovers novel patterns
- Adapts to evolving tactics

### 4. Risk Diffusion Model

**Concept**: Model risk as fluid flowing through network
```typescript
// Heat equation on graph
R_t+1(v) = R_t(v) + α × Σ(R_t(u) - R_t(v)) / degree(v)
```

**Interpretation:**
- High-risk nodes "heat" neighbors
- Diffusion rate = connection strength
- Equilibrium = stable risk distribution

**Use Case:**
- Predict next mule recruitment
- Identify coordinator entry points
- Prioritize investigation targets

### 5. Real-Time Streaming Architecture

**Conceptual Design:**
```
[Transaction Stream] 
    ↓
[Kafka/Pulsar]
    ↓
[Flink/Spark Streaming]
    ↓
[Incremental Graph Update]
    ↓
[Anomaly Detection]
    ↓
[Alert Dashboard]
```

**Challenges:**
- Maintaining graph state
- Low-latency requirements (< 1s)
- High throughput (1000s tx/s)
- Consistency guarantees

**Solution:**
- Windowed processing (tumbling/sliding)
- Approximate algorithms (HyperLogLog for cardinality)
- Pre-computed indices
- Distributed graph partitioning

---

## Technical Accuracy & Implementation Status

| Feature | Status | Complexity |
|---------|--------|------------|
| Property Graph Model | ✅ Implemented | O(1) access |
| Adjacency List | ✅ Implemented | O(V+E) space |
| Temporal Windows | ✅ Implemented | O(log n) query |
| Community Detection (Louvain) | ✅ Implemented | O(n log n) |
| Degree Centrality | ✅ Implemented | O(V+E) |
| Betweenness Centrality | ✅ Implemented (sampled) | O(kE) |
| PageRank | ✅ Implemented | O(kE) |
| Cycle Detection (DFS) | ✅ Implemented | O(V+E+C) |
| Multi-Factor Risk Scoring | ✅ Implemented | O(V) |
| Risk Propagation | ✅ Implemented | O(E) |
| Legitimate Pattern Detection | ✅ Implemented | O(V) |
| Explainability | ✅ Implemented | O(1) per account |
| GNN (Conceptual) | 📝 Described | N/A |
| Node2Vec (Conceptual) | 📝 Described | N/A |

---

## Key Differentiators

1. **Explainable AI**: Every decision traceable to specific algorithms
2. **False Positive Intelligence**: Merchant/payroll pattern filtering
3. **Multi-Factor Scoring**: Holistic risk assessment (structural + behavioral + network)
4. **Real Implementation**: Not just theory - working code with complexity analysis
5. **Scalability Awareness**: Clear path from prototype to production
6. **Regulatory Compliance**: Designed for AML/BSA requirements
7. **Graph Theory Foundation**: Proven algorithms (Louvain, PageRank, Johnson's)

This architecture demonstrates deep understanding of both **graph theory** and **financial crime detection**, combining academic rigor with practical implementation.
