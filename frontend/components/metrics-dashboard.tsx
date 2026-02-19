'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisResult } from '@/lib/types';
import {
  AlertTriangle,
  Users,
  Activity,
  DollarSign,
  Network,
  Clock,
} from 'lucide-react';

interface MetricsDashboardProps {
  analysis: AnalysisResult;
}

export function MetricsDashboard({ analysis }: MetricsDashboardProps) {
  const { summary } = analysis;

  const metrics = [
    {
      title: 'Total Accounts',
      value: summary.total_accounts_analyzed.toLocaleString(),
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Transactions',
      value: summary.total_transactions.toLocaleString(),
      icon: Activity,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Suspicious Accounts',
      value: summary.suspicious_accounts_flagged.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Fraud Rings',
      value: summary.fraud_rings_detected.toLocaleString(),
      icon: Network,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Total Value',
      value: `$${(analysis.transactions.reduce((s, t) => s + t.amount, 0) / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Processing Time',
      value: `${summary.processing_time_seconds.toFixed(3)}s`,
      icon: Clock,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metric.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
