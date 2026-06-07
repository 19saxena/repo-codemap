import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import { GraphData, GraphNode as GNode, FileNodeData } from "./types";
import { computeLayout, langColor, complexityColor } from "./utils/layout";
import { CodeNode } from "./components/CodeNode";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";
import { EmptyState } from "./components/EmptyState";

const nodeTypes = { codeNode: CodeNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FileNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: FileNodeData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<GraphData["meta"] | null>(null);
  const repoRoot = useRef<string>("");

  const handleAnalyze = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    repoRoot.current = path;

    try {
      const res = await fetch(`/api/analyze?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      const data: GraphData = await res.json();

      if (data.nodes.length === 0) {
        setError("No supported source files found in this directory.");
        setNodes([]);
        setEdges([]);
        setMeta(null);
        return;
      }

      // Apply layout
      const positioned = computeLayout(data.nodes, data.edges);

      // Convert to React Flow format
      const rfNodes: Node<FileNodeData>[] = positioned.map((n: GNode) => ({
        id: n.id,
        type: "codeNode",
        position: n.position,
        data: n.data,
        selected: false,
      }));

      const rfEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#4a9eff60", strokeWidth: 1.5 },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
      setMeta(data.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FileNodeData>) => {
      setSelectedNode({ id: node.id, data: node.data });
      // Highlight edges connected to this node
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: e.source === node.id || e.target === node.id,
          style: {
            stroke:
              e.source === node.id
                ? langColor(node.data.language)
                : e.target === node.id
                ? "#39d0d8"
                : "#4a9eff30",
            strokeWidth: e.source === node.id || e.target === node.id ? 2 : 1,
          },
        }))
      );
    },
    [setEdges]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: false,
        style: { stroke: "#4a9eff60", strokeWidth: 1.5 },
      }))
    );
  }, [setEdges]);

  const panelOpen = selectedNode !== null;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar
        onAnalyze={handleAnalyze}
        loading={loading}
        error={error}
        meta={meta}
      />

      <div
        style={{
          flex: 1,
          marginTop: "56px",
          marginRight: panelOpen ? "360px" : "0",
          transition: "margin-right 0.25s ease",
          position: "relative",
        }}
      >
        {nodes.length === 0 && !loading && <EmptyState />}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { stroke: "#4a9eff60", strokeWidth: 1.5 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#21262d"
          />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(n: Node<FileNodeData>) => {
              const d = n.data as FileNodeData;
              return d ? langColor(d.language) : "#484f58";
            }}
            nodeStrokeWidth={0}
            maskColor="rgba(8,11,15,0.85)"
            style={{ width: 160, height: 100 }}
          />
        </ReactFlow>

        {/* Complexity legend */}
        {nodes.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              background: "#0d111790",
              backdropFilter: "blur(8px)",
              border: "1px solid #21262d",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "#484f58",
              pointerEvents: "none",
            }}
          >
            <div style={{ marginBottom: "6px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Complexity
            </div>
            {[
              { label: "Low (≤5)", c: 3 },
              { label: "Medium (≤15)", c: 10 },
              { label: "High (≤30)", c: 20 },
              { label: "Critical (>30)", c: 40 },
            ].map(({ label, c }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: complexityColor(c),
                    flexShrink: 0,
                  }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SidePanel
        node={selectedNode}
        repoRoot={repoRoot.current}
        onClose={() => {
          setSelectedNode(null);
          setEdges((eds) =>
            eds.map((e) => ({
              ...e,
              animated: false,
              style: { stroke: "#4a9eff60", strokeWidth: 1.5 },
            }))
          );
        }}
      />
    </div>
  );
}
