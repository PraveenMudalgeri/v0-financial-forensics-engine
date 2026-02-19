'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisResult } from '@/lib/types';
import { AlertTriangle, TrendingUp, Users, DollarSign, Activity, Network } from 'lucide-react';

interface MetricsDashboardProps {
  analysis: AnalysisResult;
}

export function MetricsDashboard({ analysis }: MetricsDashboardProps) {
  const { networkMetrics } = analysis;

  const metrics = [
    {
      title: 'Total Accounts',
      value: networkMetrics.totalAccounts.toLocaleString(),
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Transactions',
      value: networkMetrics.totalTransactions.toLocaleString(),
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Value',
      value: `$${(networkMetrics.totalValue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Detected Mules',
      value: networkMetrics.detectedMules.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'High Risk Accounts',
      value: networkMetrics.highRiskAccounts.toLocaleString(),
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Avg Risk Score',
      value: `${(networkMetrics.avgRiskScore * 100).toFixed(0)}%`,
      icon: Network,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
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
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
