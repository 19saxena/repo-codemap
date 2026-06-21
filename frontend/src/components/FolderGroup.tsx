import { memo } from "react";
import { NodeProps, NodeResizer } from "reactflow";
import { folderColor } from "../utils/layout";

interface FolderGroupData {
  label: string;
  fileCount: number;
  colorIndex?: number;
}

// We'll derive color from label hash for consistency
function labelToIndex(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return hash % 8;
}

export const FolderGroup = memo(({ data, style }: NodeProps<FolderGroupData>) => {
  const idx = labelToIndex(data.label);
  const color = folderColor(idx);

  return (
    <div
      style={{
        width: style?.width ?? 268,
        height: style?.height ?? 200,
        background: `${color}06`,
        border: `1px solid ${color}30`,
        borderRadius: "14px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Top label bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "36px",
          background: `${color}12`,
          borderBottom: `1px solid ${color}25`,
          borderRadius: "14px 14px 0 0",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: "8px",
        }}
      >
        {/* Folder icon */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill={color} opacity={0.8}>
          <path d="M1 3.5A1.5 1.5 0 012.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0115 5.5v7A1.5 1.5 0 0113.5 14h-11A1.5 1.5 0 011 12.5v-9z"/>
        </svg>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {data.label}
        </span>
        <span
          style={{
            fontSize: "9px",
            color: `${color}90`,
            background: `${color}15`,
            border: `1px solid ${color}25`,
            borderRadius: "4px",
            padding: "1px 6px",
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {data.fileCount} {data.fileCount === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Corner accent */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "12px",
          fontSize: "9px",
          color: `${color}30`,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.06em",
          pointerEvents: "none",
        }}
      >
        {data.label}
      </div>
    </div>
  );
});

FolderGroup.displayName = "FolderGroup";
