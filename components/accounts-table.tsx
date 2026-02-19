'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Account } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users } from 'lucide-react';

interface AccountsTableProps {
  accounts: Account[];
  onAccountSelect?: (accountId: string) => void;
}

export function AccountsTable({ accounts, onAccountSelect }: AccountsTableProps) {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const filteredAccounts = accounts
    .filter((account) =>
      account.id.toLowerCase().includes(search.toLowerCase()) ||
      account.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.riskScore - a.riskScore);

  const handleRowClick = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountSelect?.(accountId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Account Analysis
          </CardTitle>
          <Badge variant="outline">{accounts.length} accounts</Badge>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total In</TableHead>
                <TableHead className="text-right">Total Out</TableHead>
                <TableHead className="text-right">Pass-through</TableHead>
                <TableHead className="text-right">TX Count</TableHead>
                <TableHead className="text-right">Risk Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.slice(0, 20).map((account) => {
                const passThrough = account.totalIn > 0
                  ? (account.totalOut / account.totalIn) * 100
                  : 0;

                return (
                  <TableRow
                    key={account.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedAccount === account.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleRowClick(account.id)}
                  >
                    <TableCell className="font-mono font-medium">
                      {account.id}
                    </TableCell>
                    <TableCell>
                      {account.isMule ? (
                        <Badge variant="destructive">MULE</Badge>
                      ) : account.riskScore > 0.7 ? (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          HIGH RISK
                        </Badge>
                      ) : account.riskScore > 0.4 ? (
                        <Badge variant="secondary">MEDIUM</Badge>
                      ) : (
                        <Badge variant="outline">NORMAL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${account.totalIn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${account.totalOut.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {passThrough.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {account.transactionCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${account.riskScore * 100}%`,
                              backgroundColor:
                                account.riskScore > 0.7
                                  ? '#ef4444'
                                  : account.riskScore > 0.4
                                  ? '#f59e0b'
                                  : '#22c55e',
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs w-10 text-right">
                          {(account.riskScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filteredAccounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No accounts found matching your search
          </div>
        )}
      </CardContent>
    </Card>
  );
}
