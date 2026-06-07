import { GraphNode, GraphEdge } from "../types";

/**
 * Automatic layout: groups nodes by folder, arranges in a grid.
 * Each folder is a column, files are rows within that column.
 */
export function computeLayout(
  nodes: GraphNode[],
  _edges: GraphEdge[]
): GraphNode[] {
  const NODE_W = 220;
  const NODE_H = 110;
  const COL_GAP = 80;
  const ROW_GAP = 24;
  const PADDING = 60;

  // Group nodes by folder
  const folders = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const folder = node.data.folder || ".";
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder)!.push(node);
  }

  // Sort folders alphabetically, root first
  const sortedFolders = Array.from(folders.keys()).sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });

  const positioned: GraphNode[] = [];
  let colX = PADDING;

  for (const folder of sortedFolders) {
    const folderNodes = folders.get(folder)!;
    // Sort by complexity desc within folder
    folderNodes.sort((a, b) => b.data.metrics.complexity - a.data.metrics.complexity);

    folderNodes.forEach((node, rowIdx) => {
      positioned.push({
        ...node,
        position: {
          x: colX,
          y: PADDING + rowIdx * (NODE_H + ROW_GAP),
        },
      });
    });

    colX += NODE_W + COL_GAP;
  }

  return positioned;
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
