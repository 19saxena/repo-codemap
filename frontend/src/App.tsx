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
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import { GraphData, GraphNode as GNode, FileNodeData } from "./types";
import { computeLayout, langColor, complexityColor, folderColor } from "./utils/layout";
import { CodeNode } from "./components/CodeNode";
import { FolderGroup } from "./components/FolderGroup";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";
import { EmptyState } from "./components/EmptyState";

const nodeTypes = {
  codeNode: CodeNode,
  folderGroup: FolderGroup,
};

function labelToIndex(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return hash % 8;
}

// Inner component that can use useReactFlow hook
function AppInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: FileNodeData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<GraphData["meta"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const repoRoot = useRef<string>("");
  const { getNodes, fitView } = useReactFlow();

  const handleAnalyze = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setSearchQuery("");
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
        setNodes([]); setEdges([]); setAllNodes([]); setAllEdges([]); setMeta(null);
        return;
      }

      const { fileNodes, groupNodes } = computeLayout(data.nodes, data.edges);

      const rfGroupNodes: Node[] = groupNodes.map((g) => ({
        id: g.id,
        type: "folderGroup",
        position: g.position,
        style: g.style,
        data: g.data,
        draggable: true,
        selectable: false,
        zIndex: 0,
      }));

      const rfFileNodes: Node<FileNodeData>[] = fileNodes.map((n: GNode) => ({
        id: n.id,
        type: "codeNode",
        position: n.position,
        data: n.data,
        // @ts-ignore
        parentNode: n.parentNode,
        extent: "parent",
        zIndex: 10,
      }));

      const rfEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: false,
        zIndex: 20,
        style: { stroke: "#4a9eff60", strokeWidth: 1.5 },
      }));

      const allN = [...rfGroupNodes, ...rfFileNodes];
      const allE = rfEdges;

      setAllNodes(allN);
      setAllEdges(allE);
      setNodes(allN);
      setEdges(allE);
      setMeta(data.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      // Restore all nodes at full opacity
      setNodes(allNodes.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
      setEdges(allEdges.map(e => ({ ...e, style: { ...e.style, stroke: "#4a9eff60", opacity: 1 } })));
      return;
    }

    const q = query.toLowerCase();
    const matchingIds = new Set<string>();

    allNodes.forEach(n => {
      if (n.type !== "codeNode") return;
      const d = n.data as FileNodeData;
      if (d.label.toLowerCase().includes(q) || d.path.toLowerCase().includes(q)) {
        matchingIds.add(n.id);
      }
    });

    // Also keep parent group nodes of matched files visible
    const matchingGroups = new Set<string>();
    allNodes.forEach(n => {
      if (n.type === "codeNode" && matchingIds.has(n.id)) {
        // @ts-ignore
        if (n.parentNode) matchingGroups.add(n.parentNode);
      }
    });

    setNodes(allNodes.map(n => {
      if (n.type === "folderGroup") {
        return { ...n, style: { ...n.style, opacity: matchingGroups.has(n.id) ? 1 : 0.15 } };
      }
      const matches = matchingIds.has(n.id);
      return { ...n, style: { ...n.style, opacity: matches ? 1 : 0.12 } };
    }));

    setEdges(allEdges.map(e => ({
      ...e,
      style: {
        ...e.style,
        stroke: matchingIds.has(e.source) && matchingIds.has(e.target) ? "#4a9eff" : "#4a9eff15",
        opacity: matchingIds.has(e.source) && matchingIds.has(e.target) ? 1 : 0.2,
      },
    })));
  }, [allNodes, allEdges, setNodes, setEdges]);

  // ── Export PNG ────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    // Dynamically import html-to-image only when needed
    try {
      const { toPng } = await import("html-to-image");
      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement;
      if (!viewport) return;

      // Temporarily remove opacity for clean export
      const rfWrapper = document.querySelector(".react-flow") as HTMLElement;

      const dataUrl = await toPng(rfWrapper, {
        backgroundColor: "#080b0f",
        pixelRatio: 2,
        filter: (node) => {
          // Exclude controls and minimap from export
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `${meta?.name ?? "codemap"}-graph.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Make sure html-to-image is installed:\nnpm install html-to-image");
    }
  }, [meta]);

  // ── Node click ────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type !== "codeNode") return;
      const fileData = node.data as FileNodeData;
      setSelectedNode({ id: node.id, data: fileData });
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          animated: e.source === node.id || e.target === node.id,
          style: {
            stroke: e.source === node.id ? langColor(fileData.language) : e.target === node.id ? "#39d0d8" : "#4a9eff20",
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
      eds.map((e) => ({ ...e, animated: false, style: { stroke: "#4a9eff60", strokeWidth: 1.5 } }))
    );
  }, [setEdges]);

  const panelOpen = selectedNode !== null;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar
        onAnalyze={handleAnalyze}
        onSearch={handleSearch}
        onExport={handleExport}
        loading={loading}
        error={error}
        meta={meta}
        searchQuery={searchQuery}
      />

      <div
        style={{
          flex: 1, marginTop: "56px",
          marginRight: panelOpen ? "360px" : "0",
          transition: "margin-right 0.25s ease",
          position: "relative",
        }}
      >
        {nodes.length === 0 && !loading && <EmptyState />}

        {/* Search result count */}
        {searchQuery && (
          <div
            style={{
              position: "absolute", top: "16px", right: "16px", zIndex: 10,
              background: "#161b22", border: "1px solid #4a9eff40",
              borderRadius: "8px", padding: "6px 12px",
              fontSize: "11px", fontFamily: "var(--font-mono)", color: "#4a9eff",
              pointerEvents: "none",
            }}
          >
            {nodes.filter(n => n.type === "codeNode" && (n.style?.opacity ?? 1) > 0.5).length} matches for "{searchQuery}"
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#21262d" />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(n: Node) => {
              if (n.type === "folderGroup") return folderColor(labelToIndex(n.data?.label ?? ""));
              const d = n.data as FileNodeData;
              return d ? langColor(d.language) : "#484f58";
            }}
            nodeStrokeWidth={0}
            maskColor="rgba(8,11,15,0.85)"
            style={{ width: 160, height: 100 }}
          />
        </ReactFlow>

        {nodes.length > 0 && (
          <div
            style={{
              position: "absolute", top: "16px", left: "16px",
              background: "#0d111790", backdropFilter: "blur(8px)",
              border: "1px solid #21262d", borderRadius: "8px",
              padding: "10px 14px", fontSize: "10px",
              fontFamily: "var(--font-mono)", color: "#484f58", pointerEvents: "none",
            }}
          >
            <div style={{ marginBottom: "6px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Complexity</div>
            {[{ label: "Low (≤5)", c: 3 }, { label: "Medium (≤15)", c: 10 }, { label: "High (≤30)", c: 20 }, { label: "Critical (>30)", c: 40 }].map(({ label, c }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: complexityColor(c), flexShrink: 0 }} />
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
          setEdges((eds) => eds.map((e) => ({ ...e, animated: false, style: { stroke: "#4a9eff60", strokeWidth: 1.5 } })));
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
