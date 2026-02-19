'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PathAnalysis } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface PathsTableProps {
  paths: PathAnalysis[];
  onPathSelect?: (nodes: string[]) => void;
}

export function PathsTable({ paths, onPathSelect }: PathsTableProps) {
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  const handleRowClick = (index: number, path: string[]) => {
    setSelectedPath(index);
    onPathSelect?.(path);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            Suspicious Transaction Paths
          </CardTitle>
          <Badge variant="outline">{paths.length} found</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {paths.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No suspicious paths detected
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Hops</TableHead>
                  <TableHead className="text-right">Time Span</TableHead>
                  <TableHead className="text-right">Suspicion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paths.slice(0, 15).map((path, index) => (
                  <TableRow
                    key={index}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedPath === index ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleRowClick(index, path.path)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {path.path.map((node, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {node}
                            </Badge>
                            {i < path.path.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${path.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {path.hopCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {path.timeSpan.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          path.suspicionScore > 0.7
                            ? 'destructive'
                            : path.suspicionScore > 0.5
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {(path.suspicionScore * 100).toFixed(0)}%
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
