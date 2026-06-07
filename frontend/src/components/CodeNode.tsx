import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileNodeData } from "../types";
import { langColor, complexityColor } from "../utils/layout";

const LANG_ICON: Record<string, string> = {
  py: "🐍", js: "𝗝𝗦", ts: "𝗧𝗦", jsx: "⚛", tsx: "⚛",
  java: "☕", cpp: "⧺", c: "©", go: "🐹", rs: "🦀",
  rb: "💎", php: "🐘", swift: "𝗦", kt: "𝗞", vue: "𝗩",
  svelte: "𝗦", cs: "♯", scala: "𝛌",
};

export const CodeNode = memo(({ data, selected }: NodeProps<FileNodeData>) => {
  const lc = langColor(data.language);
  const cc = complexityColor(data.metrics.complexity);
  const icon = LANG_ICON[data.language] ?? "📄";
  const locBar = Math.min(100, (data.metrics.loc / 500) * 100);

  return (
    <div
      style={{
        background: selected
          ? "linear-gradient(135deg, #1c2230 0%, #161b22 100%)"
          : "linear-gradient(135deg, #161b22 0%, #0d1117 100%)",
        border: selected ? `1px solid ${lc}` : "1px solid #21262d",
        borderRadius: "10px",
        padding: "12px 14px",
        width: "220px",
        minHeight: "100px",
        position: "relative",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: selected
          ? `0 0 0 1px ${lc}40, 0 4px 24px rgba(0,0,0,0.6)`
          : "0 2px 8px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Language accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "3px",
          height: "100%",
          background: lc,
          borderRadius: "10px 0 0 10px",
          opacity: 0.9,
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "14px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>{icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#e6edf3",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "0.01em",
            }}
          >
            {data.label}
          </div>
          {data.folder !== "." && (
            <div
              style={{
                fontSize: "9px",
                color: "#484f58",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: "2px",
              }}
            >
              {data.folder}
            </div>
          )}
        </div>
        {/* Language badge */}
        <span
          style={{
            fontSize: "9px",
            color: lc,
            background: `${lc}18`,
            border: `1px solid ${lc}30`,
            borderRadius: "4px",
            padding: "2px 5px",
            flexShrink: 0,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {data.language}
        </span>
      </div>

      {/* Metrics row */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          fontSize: "10px",
          color: "#8b949e",
          marginBottom: "8px",
        }}
      >
        <span title="Lines of Code">
          <span style={{ color: "#484f58" }}>LoC </span>
          <span style={{ color: "#e6edf3", fontWeight: 600 }}>{data.metrics.loc}</span>
        </span>
        <span title="Cyclomatic Complexity">
          <span style={{ color: "#484f58" }}>CC </span>
          <span style={{ color: cc, fontWeight: 600 }}>{data.metrics.complexity}</span>
        </span>
        <span title="Code lines">
          <span style={{ color: "#484f58" }}>code </span>
          <span style={{ color: "#e6edf3", fontWeight: 600 }}>{data.metrics.code_lines}</span>
        </span>
      </div>

      {/* LoC bar */}
      <div
        style={{
          height: "2px",
          background: "#21262d",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${locBar}%`,
            background: `linear-gradient(90deg, ${lc}80, ${lc})`,
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* React Flow handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: lc,
          border: "2px solid #0d1117",
          width: "8px",
          height: "8px",
          left: "-5px",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: lc,
          border: "2px solid #0d1117",
          width: "8px",
          height: "8px",
          right: "-5px",
        }}
      />
    </div>
  );
});

CodeNode.displayName = "CodeNode";
