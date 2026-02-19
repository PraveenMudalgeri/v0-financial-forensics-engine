'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RingStructure } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';

interface RingsTableProps {
  rings: RingStructure[];
  onRingSelect?: (nodes: string[]) => void;
}

export function RingsTable({ rings, onRingSelect }: RingsTableProps) {
  const [selectedRing, setSelectedRing] = useState<number | null>(null);

  const handleRowClick = (index: number, nodes: string[]) => {
    setSelectedRing(index);
    onRingSelect?.(nodes);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Detected Ring Structures
          </CardTitle>
          <Badge variant="outline">{rings.length} found</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {rings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No ring structures detected
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ring Size</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Avg Time Gap</TableHead>
                  <TableHead className="text-right">Suspicion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rings.slice(0, 10).map((ring, index) => (
                  <TableRow
                    key={index}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedRing === index ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleRowClick(index, ring.nodes)}
                  >
                    <TableCell className="font-medium">{ring.nodes.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ring.nodes.slice(0, 3).map((node) => (
                          <Badge key={node} variant="secondary" className="text-xs font-mono">
                            {node}
                          </Badge>
                        ))}
                        {ring.nodes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{ring.nodes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${ring.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ring.avgTimeGap.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          ring.suspicionScore > 0.7
                            ? 'destructive'
                            : ring.suspicionScore > 0.4
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {(ring.suspicionScore * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
