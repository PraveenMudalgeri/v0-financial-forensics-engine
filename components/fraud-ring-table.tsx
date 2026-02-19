'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FraudRing } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';

interface FraudRingTableProps {
  rings: FraudRing[];
  onRingSelect?: (members: string[]) => void;
}

const PATTERN_LABELS: Record<string, { label: string; color: string }> = {
  cycle: { label: 'Cycle', color: '#ef4444' },
  fan_in: { label: 'Fan-In', color: '#3b82f6' },
  fan_out: { label: 'Fan-Out', color: '#f97316' },
  shell_chain: { label: 'Shell Chain', color: '#a855f7' },
};

export function FraudRingTable({ rings, onRingSelect }: FraudRingTableProps) {
  const [selectedRing, setSelectedRing] = useState<string | null>(null);

  const handleRowClick = (ring: FraudRing) => {
    setSelectedRing(ring.ring_id);
    onRingSelect?.(ring.members);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Fraud Ring Summary
          </CardTitle>
          <Badge variant="outline">{rings.length} rings detected</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {rings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No fraud rings detected
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ring ID</TableHead>
                  <TableHead>Pattern Type</TableHead>
                  <TableHead className="text-right">Member Count</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead>Member Account IDs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rings.map((ring) => {
                  const pattern = PATTERN_LABELS[ring.pattern_type] || {
                    label: ring.pattern_type,
                    color: '#6366f1',
                  };
                  return (
                    <TableRow
                      key={ring.ring_id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedRing === ring.ring_id ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleRowClick(ring)}
                    >
                      <TableCell className="font-mono font-medium text-foreground">
                        {ring.ring_id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: pattern.color,
                            color: '#fff',
                          }}
                        >
                          {pattern.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-foreground">
                        {ring.member_count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            ring.risk_score > 70
                              ? 'destructive'
                              : ring.risk_score > 30
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {ring.risk_score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate text-xs font-mono text-muted-foreground">
                          {ring.members.join(', ')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
