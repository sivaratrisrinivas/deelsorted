type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps): React.JSX.Element {
  return (
    <section
      aria-live="polite"
      role="alert"
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(153, 27, 27, 0.18)",
        background: "rgba(254, 242, 242, 0.92)",
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
          color: "#991b1b",
        }}
      >
        Reconcile stopped safely
      </p>
      <h2
        style={{
          marginTop: 0,
          marginBottom: "0.55rem",
          fontSize: "1.25rem",
          color: "#7f1d1d",
        }}
      >
        Fix the upload and try again.
      </h2>
      <p
        style={{
          margin: 0,
          lineHeight: 1.7,
          color: "#991b1b",
        }}
      >
        {message}
      </p>
    </section>
  );
}
