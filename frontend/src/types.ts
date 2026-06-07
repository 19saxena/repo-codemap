export interface FileMetrics {
  loc: number;
  code_lines: number;
  blank_lines: number;
  complexity: number;
  size_bytes: number;
}

export interface FileNodeData {
  label: string;
  path: string;
  full_path: string;
  language: string;
  metrics: FileMetrics;
  folder: string;
}

export interface GraphNode {
  id: string;
  data: FileNodeData;
  position: { x: number; y: number };
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  style: { stroke: string; strokeWidth: number };
}

export interface GraphMeta {
  root: string;
  name: string;
  total_files: number;
  total_edges: number;
  git: { branch?: string; commit?: string };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: GraphMeta;
}

export interface SummaryResult {
  summary: string;
  cached: boolean;
}
