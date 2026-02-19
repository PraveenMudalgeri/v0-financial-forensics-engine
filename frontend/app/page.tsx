'use client';

import { useState, useCallback } from 'react';
import { NetworkGraph } from '@/components/network-graph';
import { MetricsDashboard } from '@/components/metrics-dashboard';
import { FraudRingTable } from '@/components/fraud-ring-table';
import { SuspiciousAccountsTable } from '@/components/suspicious-accounts-table';
import { FileUpload } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalysisResult } from '@/lib/types';
import { Shield, Database, Download, RotateCcw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSampleData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sample-data`);
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setHighlightedNodes([]);
      } else {
        console.error('Sample data error:', data.error);
      }
    } catch (err) {
      console.error('Failed to load sample data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUploaded = async (csvContent: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setHighlightedNodes([]);
      } else {
        console.error('Analysis error:', data.validation?.errors || data.error);
      }
    } catch (err) {
      console.error('Failed to analyze CSV:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRingSelect = useCallback((members: string[]) => {
    setHighlightedNodes(members);
  }, []);

  const handleAccountSelect = useCallback((accountId: string) => {
    setHighlightedNodes([accountId]);
  }, []);

  const downloadJSON = () => {
    if (!analysis) return;
    const blob = new Blob(
      [JSON.stringify(analysis.hackathonOutput, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraud-detection-output-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setHighlightedNodes([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  RIFT 2026 - Financial Crime Detection
                </h1>
                <p className="text-xs text-muted-foreground">
                  Money Muling Network Detection using Graph Theory
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAnalysis}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    New Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSampleData}
                    disabled={isLoading}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Sample Data
                  </Button>
                  <Button variant="default" size="sm" onClick={downloadJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {!analysis ? (
          /* Upload Screen */
          <div className="max-w-2xl mx-auto mt-8">
            <FileUpload onCsvUploaded={handleCsvUploaded} />
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Or start with sample data to explore the detection system
              </p>
              <Button onClick={loadSampleData} disabled={isLoading}>
                <Database className="h-4 w-4 mr-2" />
                {isLoading ? 'Analyzing...' : 'Load Sample Data'}
              </Button>
            </div>
          </div>
        ) : (
          /* Analysis Results */
          <div className="space-y-6">
            {/* Metrics Overview */}
            <MetricsDashboard analysis={analysis} />

            {/* Main Content: Graph + Detection Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Network Visualization */}
              <div className="lg:col-span-2">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <span>Transaction Network Graph</span>
                    {highlightedNodes.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHighlightedNodes([])}
                        className="text-xs"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </h2>
                  <NetworkGraph
                    graphData={analysis.graphData}
                    fraudRings={analysis.fraudRings}
                    highlightedNodes={highlightedNodes}
                    onNodeClick={handleAccountSelect}
                  />
                </div>
              </div>

              {/* Detection Summary Sidebar */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                    Detection Summary
                  </h3>
                  <div className="space-y-4">
                    {/* Pattern breakdown */}
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Cycles (3-5)', count: analysis.fraudRings.filter(r => r.pattern_type === 'cycle').length, color: '#ef4444' },
                        { label: 'Fan-In', count: analysis.fraudRings.filter(r => r.pattern_type === 'fan_in').length, color: '#3b82f6' },
                        { label: 'Fan-Out', count: analysis.fraudRings.filter(r => r.pattern_type === 'fan_out').length, color: '#f97316' },
                        { label: 'Shell Chains', count: analysis.fraudRings.filter(r => r.pattern_type === 'shell_chain').length, color: '#a855f7' },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                          <span className="font-mono font-semibold text-foreground">{item.count}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Suspicious</span>
                          <span className="font-mono font-semibold text-red-500">
                            {analysis.summary.suspicious_accounts_flagged}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Fraud Rings</span>
                          <span className="font-mono font-semibold text-foreground">
                            {analysis.summary.fraud_rings_detected}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Time</span>
                          <span className="font-mono font-semibold text-foreground">
                            {analysis.summary.processing_time_seconds.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Distribution */}
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm font-medium mb-2 text-foreground">Score Distribution</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Critical (70+)', count: analysis.accounts.filter(a => a.suspicion_score > 70).length, color: '#ef4444' },
                          { label: 'High (30-70)', count: analysis.accounts.filter(a => a.suspicion_score > 30 && a.suspicion_score <= 70).length, color: '#f59e0b' },
                          { label: 'Low (1-30)', count: analysis.accounts.filter(a => a.suspicion_score > 0 && a.suspicion_score <= 30).length, color: '#22c55e' },
                          { label: 'Clean (0)', count: analysis.accounts.filter(a => a.suspicion_score === 0).length, color: '#6366f1' },
                        ].map(item => (
                          <div key={item.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: item.color }}>{item.label}</span>
                              <span className="font-mono text-foreground">{item.count}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(item.count / analysis.accounts.length) * 100}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                    Export
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                      onClick={downloadJSON}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Hackathon JSON
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analysis Tabs */}
            <Tabs defaultValue="rings" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="rings">Fraud Rings</TabsTrigger>
                <TabsTrigger value="accounts">Suspicious Accounts</TabsTrigger>
              </TabsList>
              <TabsContent value="rings" className="mt-6">
                <FraudRingTable
                  rings={analysis.fraudRings}
                  onRingSelect={handleRingSelect}
                />
              </TabsContent>
              <TabsContent value="accounts" className="mt-6">
                <SuspiciousAccountsTable
                  accounts={analysis.accounts}
                  onAccountSelect={handleAccountSelect}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>RIFT 2026 Hackathon - Money Muling Detection using Graph Theory</p>
          <p className="mt-1">
            Algorithms: DFS Cycle Detection, 72h Sliding Window Fan-In/Out, BFS Shell Chain Detection
          </p>
        </div>
      </footer>
    </div>
  );
}
