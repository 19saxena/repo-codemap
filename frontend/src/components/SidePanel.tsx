import { useState, useEffect } from "react";
import { X, Zap, Clock, Hash, FileCode, ChevronDown, ChevronRight, Loader } from "lucide-react";
import { FileNodeData, SummaryResult } from "../types";
import { langColor, complexityColor, formatBytes } from "../utils/layout";

interface SidePanelProps {
  node: { id: string; data: FileNodeData } | null;
  repoRoot: string;
  onClose: () => void;
}

export function SidePanel({ node, repoRoot, onClose }: SidePanelProps) {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  // Reset on new node
  useEffect(() => {
    if (!node) return;
    setSummary(null);
    setSummaryError(null);
    setShowSource(false);
    setSourceCode(null);
  }, [node?.id]);

  const fetchSummary = async () => {
    if (!node || loadingSummary) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: node.data.full_path, repo_root: repoRoot }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "API error");
      }
      const data: SummaryResult = await res.json();
      setSummary(data);
    } catch (e: unknown) {
      setSummaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSource = async () => {
    if (!node || loadingSource || sourceCode !== null) {
      setShowSource((v) => !v);
      return;
    }
    setLoadingSource(true);
    setShowSource(true);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(node.data.full_path)}`);
      const data = await res.json();
      setSourceCode(data.content);
    } catch {
      setSourceCode("// Could not load file.");
    } finally {
      setLoadingSource(false);
    }
  };

  if (!node) return null;

  const { data } = node;
  const lc = langColor(data.language);
  const cc = complexityColor(data.metrics.complexity);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "360px",
        background: "#0d1117",
        borderLeft: "1px solid #21262d",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        animation: "fadeIn 0.2s ease",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#161b22",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "3px",
            height: "32px",
            background: lc,
            borderRadius: "2px",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#e6edf3",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: "var(--font-mono)",
            }}
          >
            {data.label}
          </div>
          <div style={{ fontSize: "10px", color: "#484f58", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
            {data.path}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid #21262d",
            color: "#8b949e",
            cursor: "pointer",
            borderRadius: "6px",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Metrics */}
        <Section title="Metrics" icon={<Hash size={12} />}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Metric label="Lines of Code" value={data.metrics.loc.toString()} color="#e6edf3" />
            <Metric label="Code Lines" value={data.metrics.code_lines.toString()} color="#e6edf3" />
            <Metric label="Blank Lines" value={data.metrics.blank_lines.toString()} color="#8b949e" />
            <Metric label="File Size" value={formatBytes(data.metrics.size_bytes)} color="#8b949e" />
            <Metric
              label="Complexity"
              value={data.metrics.complexity.toString()}
              color={cc}
              hint={data.metrics.complexity > 30 ? "High risk" : data.metrics.complexity > 15 ? "Moderate" : "Good"}
            />
            <Metric label="Language" value={data.language.toUpperCase()} color={lc} />
          </div>
        </Section>

        {/* AI Summary */}
        <Section title="AI Analysis" icon={<Zap size={12} />}>
          {!summary && !loadingSummary && !summaryError && (
            <button
              onClick={fetchSummary}
              style={{
                width: "100%",
                padding: "10px",
                background: `${lc}15`,
                border: `1px solid ${lc}40`,
                borderRadius: "8px",
                color: lc,
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "background 0.2s",
              }}
            >
              <Zap size={13} />
              Generate AI Summary
            </button>
          )}

          {loadingSummary && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b949e",
                fontSize: "12px",
                padding: "10px",
              }}
            >
              <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
              <span>Analyzing with Claude…</span>
            </div>
          )}

          {summaryError && (
            <div
              style={{
                background: "#f8514918",
                border: "1px solid #f8514930",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "11px",
                color: "#f85149",
                fontFamily: "var(--font-mono)",
              }}
            >
              <strong>Error:</strong> {summaryError}
              <br />
              <span style={{ color: "#8b949e" }}>Is ANTHROPIC_API_KEY set?</span>
            </div>
          )}

          {summary && (
            <div>
              <div
                style={{
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "12px",
                  color: "#c9d1d9",
                  lineHeight: "1.7",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {summary.summary}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "6px",
                  fontSize: "10px",
                  color: "#484f58",
                }}
              >
                <Clock size={9} />
                {summary.cached ? "Loaded from cache" : "Just generated"}
                <span style={{ color: lc, marginLeft: "auto", cursor: "pointer" }} onClick={fetchSummary}>
                  ↺ Refresh
                </span>
              </div>
            </div>
          )}
        </Section>

        {/* Source viewer */}
        <Section title="Source Code" icon={<FileCode size={12} />}>
          <button
            onClick={fetchSource}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: "#8b949e",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              padding: "4px 0",
              marginBottom: showSource ? "8px" : "0",
            }}
          >
            {showSource ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {showSource ? "Hide" : "Show"} source
          </button>

          {showSource && (
            <div
              style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: "8px",
                padding: "12px",
                maxHeight: "300px",
                overflowY: "auto",
                position: "relative",
              }}
            >
              {loadingSource ? (
                <div style={{ color: "#484f58", fontSize: "11px", fontFamily: "var(--font-mono)" }}>Loading…</div>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    lineHeight: "1.6",
                    color: "#8b949e",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {sourceCode}
                </pre>
              )}
            </div>
          )}
        </Section>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "10px",
          fontWeight: 700,
          color: "#484f58",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "10px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #21262d",
        borderRadius: "6px",
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: "9px", color: "#484f58", marginBottom: "3px", fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: "9px", color, opacity: 0.7, marginTop: "2px", fontFamily: "var(--font-mono)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
