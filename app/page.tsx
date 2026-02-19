'use client';

import { useState, useEffect } from 'react';
import { NetworkGraph } from '@/components/network-graph';
import { MetricsDashboard } from '@/components/metrics-dashboard';
import { RingsTable } from '@/components/rings-table';
import { PathsTable } from '@/components/paths-table';
import { AccountsTable } from '@/components/accounts-table';
import { FileUpload } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction, AnalysisResult } from '@/lib/types';
import { analyzeTransactionNetwork } from '@/lib/risk-analyzer';
import { generateSampleData } from '@/lib/sample-data';
import { Shield, Database, Download } from 'lucide-react';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSampleData = () => {
    setIsLoading(true);
    const sampleData = generateSampleData();
    setTransactions(sampleData);
    const result = analyzeTransactionNetwork(sampleData);
    setAnalysis(result);
    setIsLoading(false);
  };

  const handleDataLoaded = (data: Transaction[]) => {
    setIsLoading(true);
    setTransactions(data);
    const result = analyzeTransactionNetwork(data);
    setAnalysis(result);
    setIsLoading(false);
  };

  const handleRingSelect = (nodes: string[]) => {
    setHighlightedNodes(nodes);
  };

  const handlePathSelect = (nodes: string[]) => {
    setHighlightedNodes(nodes);
  };

  const handleAccountSelect = (accountId: string) => {
    setHighlightedNodes([accountId]);
  };

  const exportReport = () => {
    if (!analysis) return;

    const report = {
      summary: analysis.networkMetrics,
      detectedRings: analysis.rings,
      suspiciousPaths: analysis.suspiciousPaths,
      highRiskAccounts: analysis.accounts
        .filter((a) => a.riskScore > 0.7)
        .sort((a, b) => b.riskScore - a.riskScore),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensics-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Auto-load sample data on mount
    loadSampleData();
  }, []);

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
                  Financial Forensics Engine
                </h1>
                <p className="text-xs text-muted-foreground">
                  Money Muling Detection & Network Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSampleData}
                disabled={isLoading}
              >
                <Database className="h-4 w-4 mr-2" />
                Load Sample Data
              </Button>
              {analysis && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={exportReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {!analysis ? (
          <div className="max-w-2xl mx-auto mt-12">
            <FileUpload onDataLoaded={handleDataLoaded} />
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Or start with sample data to explore the system
              </p>
              <Button onClick={loadSampleData} disabled={isLoading}>
                <Database className="h-4 w-4 mr-2" />
                {isLoading ? 'Loading...' : 'Load Sample Data'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <MetricsDashboard analysis={analysis} />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Network Visualization */}
              <div className="lg:col-span-2">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    accounts={analysis.accounts}
                    transactions={analysis.transactions}
                    highlightedNodes={highlightedNodes}
                    onNodeClick={handleAccountSelect}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                    Detection Summary
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Risk Distribution</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-red-500">High Risk</span>
                            <span className="font-mono">
                              {analysis.accounts.filter((a) => a.riskScore > 0.7).length}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{
                                width: `${
                                  (analysis.accounts.filter((a) => a.riskScore > 0.7).length /
                                    analysis.accounts.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-amber-500">Medium Risk</span>
                            <span className="font-mono">
                              {
                                analysis.accounts.filter(
                                  (a) => a.riskScore > 0.4 && a.riskScore <= 0.7
                                ).length
                              }
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{
                                width: `${
                                  (analysis.accounts.filter(
                                    (a) => a.riskScore > 0.4 && a.riskScore <= 0.7
                                  ).length /
                                    analysis.accounts.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-500">Low Risk</span>
                            <span className="font-mono">
                              {analysis.accounts.filter((a) => a.riskScore <= 0.4).length}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${
                                  (analysis.accounts.filter((a) => a.riskScore <= 0.4).length /
                                    analysis.accounts.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Detected Patterns</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ring Structures</span>
                          <span className="font-mono font-semibold">
                            {analysis.rings.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Suspicious Paths</span>
                          <span className="font-mono font-semibold">
                            {analysis.suspiciousPaths.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Money Mules</span>
                          <span className="font-mono font-semibold text-red-500">
                            {analysis.networkMetrics.detectedMules}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                    Investigation Tools
                  </h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      Export Evidence Package
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      Generate Case Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      Flag for Review
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analysis Tabs */}
            <Tabs defaultValue="rings" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="rings">Ring Structures</TabsTrigger>
                <TabsTrigger value="paths">Suspicious Paths</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
              </TabsList>
              <TabsContent value="rings" className="mt-6">
                <RingsTable rings={analysis.rings} onRingSelect={handleRingSelect} />
              </TabsContent>
              <TabsContent value="paths" className="mt-6">
                <PathsTable paths={analysis.suspiciousPaths} onPathSelect={handlePathSelect} />
              </TabsContent>
              <TabsContent value="accounts" className="mt-6">
                <AccountsTable
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
          <p>
            Financial Forensics Engine - Advanced Money Muling Detection using Graph Theory
          </p>
          <p className="mt-1">For law enforcement and financial institution use only</p>
        </div>
      </footer>
    </div>
  );
}
