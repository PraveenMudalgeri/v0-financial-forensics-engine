'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AccountNode } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users } from 'lucide-react';

interface SuspiciousAccountsTableProps {
  accounts: AccountNode[];
  onAccountSelect?: (accountId: string) => void;
}

export function SuspiciousAccountsTable({
  accounts,
  onAccountSelect,
}: SuspiciousAccountsTableProps) {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const filtered = accounts
    .filter(
      (a) =>
        a.account_id.toLowerCase().includes(search.toLowerCase()) ||
        a.detected_patterns.some((p) =>
          p.toLowerCase().includes(search.toLowerCase())
        )
    )
    .sort((a, b) => b.suspicion_score - a.suspicion_score);

  const handleRowClick = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountSelect?.(accountId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-blue-500" />
            Suspicious Accounts
          </CardTitle>
          <Badge variant="outline">
            {accounts.filter((a) => a.is_suspicious).length} flagged
          </Badge>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts or patterns..."
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
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Patterns</TableHead>
                <TableHead>Ring IDs</TableHead>
                <TableHead className="text-right">In-Deg</TableHead>
                <TableHead className="text-right">Out-Deg</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 30).map((account) => (
                <TableRow
                  key={account.account_id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedAccount === account.account_id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleRowClick(account.account_id)}
                >
                  <TableCell className="font-mono font-medium text-foreground">
                    {account.account_id}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${account.suspicion_score}%`,
                            backgroundColor:
                              account.suspicion_score > 70
                                ? '#ef4444'
                                : account.suspicion_score > 30
                                ? '#f59e0b'
                                : '#22c55e',
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs w-8 text-right text-foreground">
                        {account.suspicion_score}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.detected_patterns.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="text-xs"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.ring_ids.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs font-mono">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {account.in_degree}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {account.out_degree}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    ${account.total_amount_sent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    ${account.total_amount_received.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No accounts found matching your search
          </div>
        )}
      </CardContent>
    </Card>
  );
}
