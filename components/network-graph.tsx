'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CytoscapeGraphData, FraudRing } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NetworkGraphProps {
  graphData: CytoscapeGraphData;
  fraudRings: FraudRing[];
  highlightedNodes?: string[];
  onNodeClick?: (accountId: string) => void;
}

// Ring color palette for distinct ring highlighting
const RING_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#a855f7',
];

export function NetworkGraph({
  graphData,
  fraudRings,
  highlightedNodes = [],
  onNodeClick,
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [pinnedNode, setPinnedNode] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build ring color map
  const ringColorMap = new Map<string, string>();
  fraudRings.forEach((ring, idx) => {
    ringColorMap.set(ring.ring_id, RING_COLORS[idx % RING_COLORS.length]);
  });

  // Build node-to-ring mapping for coloring
  const nodeRingColors = new Map<string, string>();
  fraudRings.forEach((ring, idx) => {
    const color = RING_COLORS[idx % RING_COLORS.length];
    ring.members.forEach((member) => {
      if (!nodeRingColors.has(member)) {
        nodeRingColors.set(member, color);
      }
    });
  });

  const initCytoscape = useCallback(async () => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    const cytoscape = (await import('cytoscape')).default;

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements: any[] = [];

    // Add nodes
    graphData.nodes.forEach((node) => {
      const isSuspicious = node.data.is_suspicious;
      const ringColor = nodeRingColors.get(node.data.id);

      elements.push({
        group: 'nodes',
        data: {
          ...node.data,
          nodeColor: isSuspicious
            ? ringColor || '#ef4444'
            : '#6366f1',
          nodeSize: isSuspicious
            ? 30 + Math.min(node.data.suspicion_score / 2, 30)
            : 20,
          borderWidth: isSuspicious ? 4 : 2,
          borderColor: isSuspicious ? '#ffffff' : 'rgba(255,255,255,0.3)',
        },
      });
    });

    // Add edges
    graphData.edges.forEach((edge) => {
      elements.push({
        group: 'edges',
        data: { ...edge.data },
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(nodeColor)',
            label: 'data(label)',
            width: 'data(nodeSize)',
            height: 'data(nodeSize)',
            'font-size': '9px',
            color: '#e2e8f0',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'border-width': 'data(borderWidth)',
            'border-color': 'data(borderColor)',
            'text-outline-width': 2,
            'text-outline-color': '#0f1729',
          } as any,
        },
        {
          selector: 'node[?is_suspicious]',
          style: {
            label: 'data(label)',
            'font-weight': 'bold',
            'font-size': '10px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': 'rgba(99, 102, 241, 0.35)',
            'target-arrow-color': 'rgba(99, 102, 241, 0.5)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          } as any,
        },
        {
          selector: '.highlighted',
          style: {
            'border-color': '#fbbf24',
            'border-width': 5,
            'background-color': '#fbbf24',
            'z-index': 100,
          },
        },
        {
          selector: '.highlighted-edge',
          style: {
            'line-color': '#fbbf24',
            'target-arrow-color': '#fbbf24',
            width: 3,
            'z-index': 100,
          } as any,
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        gravity: 0.3,
        numIter: 300,
        padding: 40,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    // Event handlers
    cy.on('mouseover', 'node', (evt: any) => {
      const node = evt.target;
      const pos = node.renderedPosition();
      setTooltipPos({ x: pos.x, y: pos.y });
      setHoveredNode(node.data());
      node.style('border-color', '#ffffff');
      node.style('border-width', 5);
      containerRef.current!.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node', (evt: any) => {
      const node = evt.target;
      if (!pinnedNode || pinnedNode.id !== node.data().id) {
        setHoveredNode(null);
        node.style('border-color', node.data().borderColor);
        node.style('border-width', node.data().borderWidth);
      }
      containerRef.current!.style.cursor = 'default';
    });

    cy.on('tap', 'node', (evt: any) => {
      const nodeData = evt.target.data();
      setPinnedNode(nodeData);
      setHoveredNode(nodeData);
      const pos = evt.target.renderedPosition();
      setTooltipPos({ x: pos.x, y: pos.y });
      if (onNodeClick) onNodeClick(nodeData.id);
    });

    cy.on('tap', (evt: any) => {
      if (evt.target === cy) {
        setPinnedNode(null);
        setHoveredNode(null);
      }
    });

    cyRef.current = cy;
  }, [graphData, nodeRingColors, onNodeClick, pinnedNode]);

  useEffect(() => {
    initCytoscape();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initCytoscape]);

  // Highlight nodes when selection changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('highlighted highlighted-edge');

    if (highlightedNodes.length > 0) {
      highlightedNodes.forEach((nodeId) => {
        cy.getElementById(nodeId).addClass('highlighted');
      });

      // Highlight edges between highlighted nodes
      cy.edges().forEach((edge: any) => {
        const src = edge.source().id();
        const tgt = edge.target().id();
        if (highlightedNodes.includes(src) && highlightedNodes.includes(tgt)) {
          edge.addClass('highlighted-edge');
        }
      });
    }
  }, [highlightedNodes]);

  const displayNode = pinnedNode || hoveredNode;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full border border-border rounded-lg bg-[#0a0e1a]"
        style={{ height: '600px' }}
      />

      {/* Tooltip / Info panel */}
      {displayNode && (
        <Card className="absolute top-4 right-4 p-4 bg-card/95 backdrop-blur-sm shadow-xl min-w-[280px] max-w-[320px] border-border z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-foreground">
                {displayNode.id}
              </span>
              {displayNode.is_suspicious && (
                <Badge variant="destructive" className="text-xs">
                  SUSPICIOUS
                </Badge>
              )}
            </div>

            {/* Suspicion Score */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Suspicion Score</span>
                <span
                  className="font-bold font-mono"
                  style={{
                    color:
                      displayNode.suspicion_score > 70
                        ? '#ef4444'
                        : displayNode.suspicion_score > 30
                        ? '#f59e0b'
                        : '#22c55e',
                  }}
                >
                  {displayNode.suspicion_score}/100
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${displayNode.suspicion_score}%`,
                    backgroundColor:
                      displayNode.suspicion_score > 70
                        ? '#ef4444'
                        : displayNode.suspicion_score > 30
                        ? '#f59e0b'
                        : '#22c55e',
                  }}
                />
              </div>
            </div>

            {/* Detected Patterns */}
            {displayNode.detected_patterns?.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Detected Patterns
                </span>
                <div className="flex flex-wrap gap-1">
                  {displayNode.detected_patterns.map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ring IDs */}
            {displayNode.ring_ids?.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Ring IDs
                </span>
                <div className="flex flex-wrap gap-1">
                  {displayNode.ring_ids.map((r: string) => (
                    <Badge
                      key={r}
                      className="text-xs"
                      style={{
                        backgroundColor: ringColorMap.get(r) || '#6366f1',
                        color: '#fff',
                      }}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="text-xs space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">In-Degree</span>
                <span className="font-mono text-foreground">{displayNode.in_degree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Out-Degree</span>
                <span className="font-mono text-foreground">{displayNode.out_degree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sent</span>
                <span className="font-mono text-foreground">
                  ${displayNode.total_amount_sent?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Received</span>
                <span className="font-mono text-foreground">
                  ${displayNode.total_amount_received?.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            {/* Explanation */}
            {displayNode.explanation && (
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground block mb-1">
                  Explanation
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {displayNode.explanation}
                </p>
              </div>
            )}

            {pinnedNode && (
              <p className="text-xs text-muted-foreground italic">
                Click background to dismiss
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span className="text-muted-foreground">Suspicious</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
          <span className="text-muted-foreground">Normal</span>
        </div>
        {fraudRings.slice(0, 5).map((ring, idx) => (
          <div key={ring.ring_id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: RING_COLORS[idx % RING_COLORS.length] }}
            />
            <span className="text-muted-foreground">
              {ring.ring_id} ({ring.pattern_type})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
