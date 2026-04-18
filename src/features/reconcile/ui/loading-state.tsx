export function LoadingState(): React.JSX.Element {
  return (
    <section
      aria-live="polite"
      role="status"
      style={{
        borderRadius: "16px",
        background: "var(--color-surface-container-low)",
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        border: "1px solid var(--color-outline-variant)",
      }}
    >
      <div 
        style={{ 
          position: "relative",
          width: "48px", 
          height: "48px", 
          display: "grid", 
          placeItems: "center" 
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--color-surface-container-high)",
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid var(--color-primary)",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
        }}>
          <style>{`
            @keyframes spin { 
              100% { transform: rotate(360deg); } 
            }
          `}</style>
        </div>
      </div>
      
      <div>
        <h2
          style={{
            marginTop: 0,
            marginBottom: "0.45rem",
            fontSize: "1.1rem",
            color: "var(--color-on-surface)",
            fontFamily: "var(--font-engine)",
            fontWeight: 600,
          }}
        >
          Reconciling the ledger...
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--color-on-surface-variant)",
            fontFamily: "var(--font-engine)",
          }}
        >
          Executing AI-assisted mapping and validating accounting structures.
        </p>
      </div>
    </section>
  );
}
