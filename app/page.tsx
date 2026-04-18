import { UploadForm } from "@/src/features/reconcile/ui/upload-form";

export default function Home(): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "3rem",
        paddingTop: "6rem",
        alignItems: "start",
      }}
    >
      <section
        style={{
          width: "min(840px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", background: "var(--color-tertiary)", borderRadius: "50%", boxShadow: "0 0 10px var(--color-tertiary-container)" }} />
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-engine)",
                color: "var(--color-on-surface-variant)",
                fontWeight: 600,
              }}
            >
              DeelSorted
            </p>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 1.05,
              fontWeight: 800,
              color: "var(--color-on-surface)",
            }}
          >
            Payroll Reconciliation
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "50ch",
              fontSize: "1.1rem",
              lineHeight: 1.6,
              color: "var(--color-on-surface-variant)",
              fontFamily: "var(--font-engine)",
            }}
          >
            Drop your Deel G2N and Chart of Accounts to begin.
          </p>
        </header>

        <UploadForm />
      </section>
    </main>
  );
}
