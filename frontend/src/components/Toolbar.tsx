import { useState } from "react";
import { Search, GitBranch, Loader, AlertCircle, FolderOpen, RefreshCw } from "lucide-react";
import { GraphMeta } from "../types";

interface ToolbarProps {
  onAnalyze: (path: string) => void;
  loading: boolean;
  error: string | null;
  meta: GraphMeta | null;
}

export function Toolbar({ onAnalyze, loading, error, meta }: ToolbarProps) {
  const [path, setPath] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) onAnalyze(path.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "56px",
        background: "#0d1117",
        borderBottom: "1px solid #21262d",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: "16px",
        zIndex: 50,
        boxShadow: "0 1px 12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            background: "linear-gradient(135deg, #4a9eff, #39d0d8)",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
        >
          ⬡
        </div>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 800,
            color: "#e6edf3",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
          }}
        >
          CODEMAP
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "28px", background: "#21262d", flexShrink: 0 }} />

      {/* Path form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "520px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#161b22",
            border: `1px solid ${error ? "#f8514950" : "#30363d"}`,
            borderRadius: "8px",
            padding: "0 12px",
            flex: 1,
            height: "36px",
            transition: "border-color 0.2s",
          }}
        >
          <FolderOpen size={14} color="#484f58" style={{ flexShrink: 0 }} />
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/absolute/path/to/your/repo"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "#e6edf3",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              flex: 1,
              minWidth: 0,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !path.trim()}
          style={{
            height: "36px",
            padding: "0 16px",
            background: loading ? "#161b22" : "linear-gradient(135deg, #4a9eff20, #4a9eff10)",
            border: "1px solid #4a9eff50",
            borderRadius: "8px",
            color: loading ? "#484f58" : "#4a9eff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <>
              <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
              Scanning…
            </>
          ) : (
            <>
              <Search size={13} />
              Analyze
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#f85149",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Stats (when loaded) */}
      {meta && !error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          {meta.git.branch && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                color: "#8b949e",
                fontFamily: "var(--font-mono)",
              }}
            >
              <GitBranch size={11} color="#3fb950" />
              <span style={{ color: "#3fb950" }}>{meta.git.branch}</span>
              {meta.git.commit && (
                <span style={{ color: "#484f58" }}>@{meta.git.commit}</span>
              )}
            </div>
          )}
          <Stat label="files" value={meta.total_files} color="#4a9eff" />
          <Stat label="deps" value={meta.total_edges} color="#39d0d8" />
          <div
            style={{ fontSize: "11px", color: "#484f58", fontFamily: "var(--font-mono)" }}
          >
            {meta.name}
          </div>
          <button
            onClick={() => onAnalyze(meta.root)}
            style={{
              background: "none",
              border: "1px solid #21262d",
              borderRadius: "6px",
              color: "#484f58",
              cursor: "pointer",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Re-analyze"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "3px", fontFamily: "var(--font-mono)" }}>
      <span style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: "10px", color: "#484f58" }}>{label}</span>
    </div>
  );
}
