"use client";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

const STATUS_COLORS: Record<string, string> = {
  pending: "#dee2e6",
  blocked: "#adb5bd",
  in_progress: "#ffc107",
  completed: "#28a745",
  failed: "#dc3545",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "\u23F3",
  blocked: "\uD83D\uDD12",
  in_progress: "\u2699\uFE0F",
  completed: "\u2705",
  failed: "\u274C",
};

interface Workstream {
  id: string;
  name: string;
  status: string;
  dependencies: string[];
  assignedAgent: string | null;
}

interface DependencyGraphProps {
  workstreams: Workstream[];
  onNodeClick?: (wsId: string) => void;
}

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "LR") {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { nodes: layoutedNodes, edges };
}

function WorkstreamNode({ data }: { data: Record<string, unknown> }) {
  const status = (data.status as string) || "pending";
  const color = STATUS_COLORS[status] || "#dee2e6";
  const icon = STATUS_ICONS[status] || "";
  const isActive = status === "in_progress";

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `2px solid ${color}`,
        borderWidth: isActive ? 3 : 2,
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        minWidth: 160,
        maxWidth: NODE_WIDTH,
        boxShadow: isActive ? `0 0 12px ${color}44` : "var(--shadow)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: "0.85rem" }}>{icon}</span>
        <strong
          style={{
            fontSize: "0.8rem",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--color-text)",
          }}
        >
          {String(data.name)}
        </strong>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            padding: "1px 8px",
            borderRadius: 10,
            background: `${color}22`,
            color: color === "#ffc107" ? "#856404" : color,
          }}
        >
          {status.replace("_", " ")}
        </span>
        {typeof data.assignedAgent === "string" && (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: 10,
              background: "var(--color-agent-bg)",
              color: "var(--color-agent-text)",
            }}
          >
            @{data.assignedAgent as string}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workstream: WorkstreamNode,
};

export function DependencyGraph({ workstreams, onNodeClick }: DependencyGraphProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const nodes: Node[] = workstreams.map((ws) => ({
      id: ws.id,
      type: "workstream",
      position: { x: 0, y: 0 },
      data: {
        name: ws.name,
        status: ws.status,
        assignedAgent: ws.assignedAgent,
      },
    }));

    const edges: Edge[] = [];
    for (const ws of workstreams) {
      for (const dep of ws.dependencies) {
        const depWs = workstreams.find((w) => w.id === dep || w.name === dep);
        if (depWs) {
          const depCompleted = depWs.status === "completed";
          const depActive = depWs.status === "in_progress";
          edges.push({
            id: `${depWs.id}-${ws.id}`,
            source: depWs.id,
            target: ws.id,
            animated: depActive,
            style: {
              stroke: depCompleted ? "#28a745" : depActive ? "#ffc107" : "#adb5bd",
              strokeWidth: 2,
            },
            markerEnd: {
              type: "arrowclosed" as const,
              color: depCompleted ? "#28a745" : depActive ? "#ffc107" : "#adb5bd",
            },
          });
        }
      }
    }

    return getLayoutedElements(nodes, edges);
  }, [workstreams]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-border)" gap={20} size={1} />
        <Controls
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const status = (node.data?.status as string) || "pending";
            return STATUS_COLORS[status] || "#dee2e6";
          }}
          maskColor="rgba(0,0,0,0.1)"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        />
      </ReactFlow>
    </div>
  );
}
