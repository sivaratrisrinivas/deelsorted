import { UploadForm } from "@/src/features/reconcile/ui/upload-form";

export default function Home(): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          borderRadius: "28px",
          padding: "2.5rem",
          background: "rgba(255, 255, 255, 0.88)",
          boxShadow: "0 24px 60px rgba(31, 41, 55, 0.12)",
          backdropFilter: "blur(18px)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#7c5c3b",
          }}
        >
          DeelSorted
        </p>
        <h1
          style={{
            marginTop: "0.75rem",
            marginBottom: "1rem",
            fontSize: "clamp(2.5rem, 7vw, 4.25rem)",
            lineHeight: 0.95,
            color: "#1f2937",
          }}
        >
          Payroll reconciliation, built for clarity.
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: "46ch",
            fontSize: "1.125rem",
            lineHeight: 1.7,
            color: "#4b5563",
          }}
        >
          This slice opens the first browser-visible flow. Upload the supported
          payroll JSON and COA CSV, submit them to the reconcile route, and get
          a basic summary back from the headless engine.
        </p>
        <UploadForm />
      </section>
    </main>
  );
}
