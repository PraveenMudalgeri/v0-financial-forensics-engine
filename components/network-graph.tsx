'use client';

import { useEffect, useRef, useState } from 'react';
import { Account, Transaction, NetworkNode, NetworkLink } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NetworkGraphProps {
  accounts: Account[];
  transactions: Transaction[];
  highlightedNodes?: string[];
  onNodeClick?: (accountId: string) => void;
}

export function NetworkGraph({ 
  accounts, 
  transactions, 
  highlightedNodes = [],
  onNodeClick 
}: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Build network data
    const nodeMap = new Map<string, NetworkNode>();
    const linkMap = new Map<string, { value: number; count: number }>();

    accounts.forEach((account) => {
      nodeMap.set(account.id, {
        ...account,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
      });
    });

    transactions.forEach((tx) => {
      const key = `${tx.from}-${tx.to}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, { value: 0, count: 0 });
      }
      const link = linkMap.get(key)!;
      link.value += tx.amount;
      link.count++;
    });

    const networkNodes = Array.from(nodeMap.values());
    const networkLinks: NetworkLink[] = [];

    linkMap.forEach((data, key) => {
      const [source, target] = key.split('-');
      if (nodeMap.has(source) && nodeMap.has(target)) {
        networkLinks.push({
          source,
          target,
          value: data.value,
          transactionCount: data.count,
        });
      }
    });

    setNodes(networkNodes);
    setLinks(networkLinks);
  }, [accounts, transactions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Force simulation
    const simulate = () => {
      // Apply forces
      nodes.forEach((node) => {
        // Center force
        node.vx = ((node.vx || 0) + (width / 2 - (node.x || 0)) * 0.001);
        node.vy = ((node.vy || 0) + (height / 2 - (node.y || 0)) * 0.001);

        // Repulsion between nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;
          const dx = (node.x || 0) - (other.x || 0);
          const dy = (node.y || 0) - (other.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);
          node.vx = (node.vx || 0) + (dx / dist) * force;
          node.vy = (node.vy || 0) + (dy / dist) * force;
        });

        // Damping
        node.vx = (node.vx || 0) * 0.8;
        node.vy = (node.vy || 0) * 0.8;

        // Update position
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);

        // Bounds
        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      });

      // Link forces
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        const dx = (target.x || 0) - (source.x || 0);
        const dy = (target.y || 0) - (source.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 150;
        const force = (dist - targetDist) * 0.05;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx = (source.vx || 0) + fx;
        source.vy = (source.vy || 0) + fy;
        target.vx = (target.vx || 0) - fx;
        target.vy = (target.vy || 0) - fy;
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw links
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        const value = link.value / 10000;
        ctx.strokeStyle = `rgba(99, 102, 241, ${Math.min(value, 0.6)})`;
        ctx.lineWidth = Math.max(1, Math.min(value * 2, 5));
        ctx.beginPath();
        ctx.moveTo(source.x || 0, source.y || 0);
        ctx.lineTo(target.x || 0, target.y || 0);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2((target.y || 0) - (source.y || 0), (target.x || 0) - (source.x || 0));
        const arrowSize = 8;
        const arrowX = (target.x || 0) - Math.cos(angle) * 15;
        const arrowY = (target.y || 0) - Math.sin(angle) * 15;

        ctx.fillStyle = `rgba(99, 102, 241, ${Math.min(value, 0.6)})`;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const radius = 8 + node.riskScore * 8;
        const isHighlighted = highlightedNodes.includes(node.id);
        const isHovered = hoveredNode?.id === node.id;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
        
        if (node.isMule) {
          ctx.fillStyle = '#ef4444';
        } else if (node.riskScore > 0.7) {
          ctx.fillStyle = '#f59e0b';
        } else if (node.riskScore > 0.4) {
          ctx.fillStyle = '#eab308';
        } else {
          ctx.fillStyle = '#6366f1';
        }

        if (isHighlighted) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 20;
        } else if (isHovered) {
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 15;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = isHighlighted || isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = isHighlighted || isHovered ? 3 : 1;
        ctx.stroke();

        // Label
        if (isHighlighted || isHovered || node.isMule) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(node.id, node.x || 0, (node.y || 0) + radius + 12);
        }
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, hoveredNode, highlightedNodes]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = nodes.find((node) => {
      const dx = (node.x || 0) - x;
      const dy = (node.y || 0) - y;
      const radius = 8 + node.riskScore * 8;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    setHoveredNode(hovered || null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode && onNodeClick) {
      onNodeClick(hoveredNode.id);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={1200}
        height={700}
        className="w-full border border-border rounded-lg bg-card cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {hoveredNode && (
        <Card className="absolute top-4 left-4 p-4 bg-card/95 backdrop-blur-sm shadow-lg min-w-[250px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{hoveredNode.id}</span>
              {hoveredNode.isMule && (
                <Badge variant="destructive" className="text-xs">MULE</Badge>
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Score:</span>
                <span className="font-semibold" style={{
                  color: hoveredNode.riskScore > 0.7 ? '#ef4444' : 
                         hoveredNode.riskScore > 0.4 ? '#f59e0b' : '#22c55e'
                }}>
                  {(hoveredNode.riskScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total In:</span>
                <span className="font-mono">${hoveredNode.totalIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Out:</span>
                <span className="font-mono">${hoveredNode.totalOut.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions:</span>
                <span className="font-mono">{hoveredNode.transactionCount}</span>
              </div>
              {hoveredNode.totalIn > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pass-through:</span>
                  <span className="font-mono">
                    {((hoveredNode.totalOut / hoveredNode.totalIn) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span className="text-muted-foreground">Confirmed Mule</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span className="text-muted-foreground">High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span className="text-muted-foreground">Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
          <span className="text-muted-foreground">Low Risk</span>
        </div>
      </div>
    </div>
  );
}
