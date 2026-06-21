import { GraphNode, GraphEdge } from "../types";

const NODE_W = 220;
const NODE_H = 110;
const COL_GAP = 100;
const ROW_GAP = 24;
const GROUP_PADDING_X = 24;
const GROUP_PADDING_TOP = 44; // space for folder label
const GROUP_PADDING_BOTTOM = 24;
const CANVAS_PADDING = 60;

export interface LayoutResult {
  fileNodes: GraphNode[];
  groupNodes: GroupNode[];
}

export interface GroupNode {
  id: string;
  type: "folderGroup";
  position: { x: number; y: number };
  style: { width: number; height: number };
  data: { label: string; fileCount: number };
  draggable: boolean;
}

/**
 * Layout: one column per folder, files stacked vertically inside a group box.
 */
export function computeLayout(
  nodes: GraphNode[],
  _edges: GraphEdge[]
): LayoutResult {
  // Group nodes by folder
  const folders = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const folder = node.data.folder || ".";
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder)!.push(node);
  }

  // Sort folders: root first, then alphabetically
  const sortedFolders = Array.from(folders.keys()).sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });

  const fileNodes: GraphNode[] = [];
  const groupNodes: GroupNode[] = [];
  let colX = CANVAS_PADDING;

  for (const folder of sortedFolders) {
    const folderNodes = folders.get(folder)!;
    folderNodes.sort((a, b) => b.data.metrics.complexity - a.data.metrics.complexity);

    const groupId = `__group__${folder}`;
    const groupW = NODE_W + GROUP_PADDING_X * 2;
    const groupH = GROUP_PADDING_TOP + folderNodes.length * (NODE_H + ROW_GAP) - ROW_GAP + GROUP_PADDING_BOTTOM;

    groupNodes.push({
      id: groupId,
      type: "folderGroup",
      position: { x: colX, y: CANVAS_PADDING },
      style: { width: groupW, height: groupH },
      data: { label: folder === "." ? "(root)" : folder, fileCount: folderNodes.length },
      draggable: true,
    });

    folderNodes.forEach((node, rowIdx) => {
      fileNodes.push({
        ...node,
        // Position is relative to parent group
        position: {
          x: GROUP_PADDING_X,
          y: GROUP_PADDING_TOP + rowIdx * (NODE_H + ROW_GAP),
        },
        // @ts-ignore - parentNode is valid React Flow prop
        parentNode: groupId,
        extent: "parent" as const,
      });
    });

    colX += groupW + COL_GAP;
  }

  return { fileNodes, groupNodes };
}

/** Color per language */
export const LANG_COLOR: Record<string, string> = {
  py: "#4a9eff",
  js: "#f0d060",
  ts: "#4a9eff",
  jsx: "#61dafb",
  tsx: "#61dafb",
  java: "#f85149",
  cpp: "#bc8cff",
  c: "#bc8cff",
  h: "#8b949e",
  hpp: "#bc8cff",
  cs: "#bc8cff",
  go: "#39d0d8",
  rs: "#f0883e",
  rb: "#f85149",
  php: "#bc8cff",
  swift: "#f0883e",
  kt: "#f0883e",
  vue: "#3fb950",
  svelte: "#f0883e",
  scala: "#f85149",
};

export function langColor(ext: string): string {
  return LANG_COLOR[ext.toLowerCase()] ?? "#8b949e";
}

/** Complexity → color */
export function complexityColor(c: number): string {
  if (c <= 5) return "#3fb950";
  if (c <= 15) return "#d29922";
  if (c <= 30) return "#f0883e";
  return "#f85149";
}

/** Human-readable file size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Folder group accent colors - cycles through these */
const FOLDER_COLORS = [
  "#4a9eff", "#39d0d8", "#3fb950", "#bc8cff",
  "#f0883e", "#f0d060", "#f85149", "#d29922",
];
export function folderColor(index: number): string {
  return FOLDER_COLORS[index % FOLDER_COLORS.length];
}
