import { useEffect, useRef, useState } from 'react';
import type { GraphLink, GraphNode } from '../types';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  type: string;
  linkType: string;
  label?: string;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

const NODE_RADIUS: Record<string, number> = {
  person: 20,
  case: 14,
  issue: 11,
};

const NODE_COLOR: Record<string, string> = {
  person: '#b8956a',
  case: '#47689a',
  issue: '#4ab487',
};

const LINK_COLOR: Record<string, string> = {
  direct: '#6989b3',
  inferred: '#46464d',
};

export function ForceGraph({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  width = 600,
  height = 480,
}: ForceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const animFrameRef = useRef<number>(0);
  const draggingRef = useRef<SimNode | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const existing = new Map(simNodesRef.current.map((n) => [n.id, n]));
    const simNodes: SimNode[] = nodes.map((n) => {
      const prev = existing.get(n.id);
      if (prev) {
        return { ...n, x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy };
      }
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = links
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        type: l.type,
        linkType: l.linkType,
        label: l.label,
      }));

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    let alpha = 1;
    const alphaDecay = 0.008;
    const velocityDecay = 0.82;

    const tick = () => {
      if (alpha < 0.01) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const centerStrength = 0.018;
      for (const n of simNodes) {
        if (n.fx !== undefined) {
          n.x = n.fx;
          n.y = n.fy ?? n.y;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx += (width / 2 - n.x) * centerStrength * alpha;
        n.vy += (height / 2 - n.y) * centerStrength * alpha;
      }

      const linkStrength = 0.04 * alpha;
      const linkDist: Record<string, number> = {
        'person-case': 90,
        'person-issue': 70,
        'case-issue': 65,
      };
      for (const link of simLinks) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = linkDist[link.type] || 80;
        const force = (dist - target) * linkStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (link.source.fx === undefined) {
          link.source.vx += fx;
          link.source.vy += fy;
        }
        if (link.target.fx === undefined) {
          link.target.vx -= fx;
          link.target.vy -= fy;
        }
      }

      const repulsion = 1200 * alpha;
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist > 200) continue;
          const force = repulsion / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (a.fx === undefined) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (b.fx === undefined) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      for (const n of simNodes) {
        if (n.fx !== undefined) continue;
        n.vx *= velocityDecay;
        n.vy *= velocityDecay;
        n.x += n.vx;
        n.y += n.vy;
        const r = NODE_RADIUS[n.type] || 12;
        n.x = Math.max(r + 5, Math.min(width - r - 5, n.x));
        n.y = Math.max(r + 5, Math.min(height - r - 5, n.y));
      }

      alpha *= 1 - alphaDecay;
      draw();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);
      }
      ctx.clearRect(0, 0, width, height);

      const selected = selectedNodeId
        ? simNodesRef.current.find((n) => n.id === selectedNodeId)
        : null;
      const connectedIds = new Set<string>();
      if (selected) {
        connectedIds.add(selected.id);
        for (const link of simLinksRef.current) {
          if (link.source.id === selected.id) connectedIds.add(link.target.id);
          if (link.target.id === selected.id) connectedIds.add(link.source.id);
        }
      }

      for (const link of simLinksRef.current) {
        const isHighlighted =
          !selectedNodeId ||
          (connectedIds.has(link.source.id) && connectedIds.has(link.target.id));
        ctx.strokeStyle = LINK_COLOR[link.linkType] || '#46464d';
        ctx.globalAlpha = isHighlighted ? 0.6 : 0.12;
        ctx.lineWidth = link.linkType === 'direct' ? 1.5 : 1;
        ctx.setLineDash(link.linkType === 'inferred' ? [4, 3] : []);
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      for (const n of simNodesRef.current) {
        const isSelected = n.id === selectedNodeId;
        const isConnected = connectedIds.has(n.id);
        const isHovered = hoveredNode?.id === n.id;
        const dimmed = selectedNodeId && !isConnected;
        const r = NODE_RADIUS[n.type] || 12;
        ctx.globalAlpha = dimmed ? 0.2 : 1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, r + (isSelected ? 6 : isHovered ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = NODE_COLOR[n.type] || '#6989b3';
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + (isSelected ? 6 : 3), 0, Math.PI * 2);
          ctx.strokeStyle = '#f0e8d9';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.globalAlpha = dimmed ? 0.25 : 1;
        ctx.fillStyle = '#d9e2ec';
        ctx.font = `${n.type === 'person' ? '600' : '400'} ${n.type === 'person' ? '11px' : '10px'} Inter, sans-serif`;
        ctx.textAlign = 'center';
        const label =
          n.type === 'person' ? n.label :
          n.type === 'case' ? (n.label.length > 28 ? n.label.slice(0, 26) + '…' : n.label) :
          n.label;
        ctx.fillText(label, n.x, n.y + r + 12);
        if (n.score !== undefined && n.type === 'person') {
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = '#b8956a';
          ctx.fillText(`${n.score}`, n.x, n.y - r - 5);
        }
        ctx.globalAlpha = 1;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [nodes, links, width, height, selectedNodeId, hoveredNode]);

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findNode = (x: number, y: number): SimNode | null => {
    for (const n of simNodesRef.current) {
      const r = NODE_RADIUS[n.type] || 12;
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy < (r + 4) * (r + 4)) return n;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    const node = findNode(x, y);
    if (node) {
      draggingRef.current = node;
      offsetRef.current = { x: x - node.x, y: y - node.y };
      node.fx = x;
      node.fy = y;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    if (draggingRef.current) {
      draggingRef.current.fx = x - offsetRef.current.x;
      draggingRef.current.fy = y - offsetRef.current.y;
    } else {
      const node = findNode(x, y);
      setHoveredNode(node);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = node ? 'pointer' : 'default';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingRef.current) {
      draggingRef.current.fx = undefined;
      draggingRef.current.fy = undefined;
      const { x, y } = getMousePos(e);
      const node = findNode(x, y);
      if (node && node === draggingRef.current) {
        onSelectNode(node);
      }
      draggingRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (draggingRef.current) return;
    const { x, y } = getMousePos(e);
    const node = findNode(x, y);
    if (node) onSelectNode(node);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        draggingRef.current = null;
        setHoveredNode(null);
      }}
      onClick={handleClick}
      className="rounded-lg"
      style={{ display: 'block' }}
    />
  );
}
