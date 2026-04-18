type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps): React.JSX.Element {
  return (
    <section
      aria-live="polite"
      role="alert"
      style={{
        borderRadius: "16px",
        border: "1px solid var(--color-error-container)",
        background: "rgba(147, 0, 10, 0.1)",
        padding: "1.5rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      <div style={{ marginTop: "0.2rem", color: "var(--color-error)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <div>
        <p
          style={{
            marginTop: 0,
            marginBottom: "0.3rem",
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-error)",
            fontWeight: 600,
          }}
        >
          Process Interrupted
        </p>
        <p
          style={{
            margin: 0,
            lineHeight: 1.6,
            color: "var(--color-on-error-container)",
            fontSize: "0.95rem",
          }}
        >
          {message}
        </p>
      </div>
    </section>
  );
}
