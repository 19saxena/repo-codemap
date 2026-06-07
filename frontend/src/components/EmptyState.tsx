export function EmptyState() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Grid background hint */}
      <div
        style={{
          fontSize: "72px",
          opacity: 0.06,
          lineHeight: 1,
          filter: "blur(1px)",
        }}
      >
        ⬡⬡⬡
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#30363d",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
            marginBottom: "8px",
          }}
        >
          NO REPOSITORY LOADED
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#21262d",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.8,
          }}
        >
          Enter an absolute path above and click Analyze
          <br />
          Supported: Python · JS/TS · Java · C/C++ · Go · Rust · Ruby
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          opacity: 0.3,
        }}
      >
        {["import", "#include", "require", "use"].map((kw) => (
          <span
            key={kw}
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "#4a9eff",
              background: "#4a9eff10",
              border: "1px solid #4a9eff20",
              borderRadius: "4px",
              padding: "3px 8px",
            }}
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}
