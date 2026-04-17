export function LoadingState(): React.JSX.Element {
  return (
    <section
      aria-live="polite"
      role="status"
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(124, 92, 59, 0.16)",
        background: "rgba(255, 255, 255, 0.78)",
        padding: "1.25rem",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: "0.45rem",
          fontSize: "0.85rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#8b6a45",
        }}
      >
        Reconcile in progress
      </p>
      <h2
        style={{
          marginTop: 0,
          marginBottom: "0.55rem",
          fontSize: "1.25rem",
          color: "#1f2937",
        }}
      >
        Reconciling uploads...
      </h2>
      <p
        style={{
          margin: 0,
          lineHeight: 1.7,
          color: "#4b5563",
        }}
      >
        Parsing files, shortlisting accounts, and validating mapping decisions.
      </p>
    </section>
  );
}
