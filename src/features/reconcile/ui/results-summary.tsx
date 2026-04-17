import type {
  AnomalousPayrollLine,
  AuditTrailRow,
  JournalRow,
  ReconciledPayrollLine,
} from "../../../types/reconcile";

export type ReconcileResultPayload = {
  reconciledLines: ReconciledPayrollLine[];
  anomalies: AnomalousPayrollLine[];
  journalRows: JournalRow[];
  auditTrailRows: AuditTrailRow[];
};

type ResultsSummaryProps = {
  result: ReconcileResultPayload;
};

export function ResultsSummary({
  result,
}: ResultsSummaryProps): React.JSX.Element {
  const mappedCount = result.reconciledLines.length - result.anomalies.length;
  const currencies = [...new Set(result.journalRows.map((row) => row.currency))];

  return (
    <section
      style={{
        marginTop: "2rem",
        display: "grid",
        gap: "1rem",
      }}
    >
      <div
        style={{
          borderRadius: "22px",
          border: "1px solid rgba(124, 92, 59, 0.16)",
          background: "rgba(255, 255, 255, 0.78)",
          padding: "1.5rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#8b6a45",
          }}
        >
          Reconcile Summary
        </p>
        <h2
          style={{
            marginTop: "0.75rem",
            marginBottom: "0.5rem",
            fontSize: "1.6rem",
            color: "#1f2937",
          }}
        >
          Uploads processed successfully.
        </h2>
        <p
          style={{
            margin: 0,
            color: "#4b5563",
            lineHeight: 1.7,
          }}
        >
          This slice keeps the browser flow intentionally lean: you can upload
          the supported files, run reconciliation, and confirm the engine
          produced mapped lines, anomaly counts, and journal output.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <SummaryStat label="Lines processed" value={String(result.reconciledLines.length)} />
        <SummaryStat label="Mapped lines" value={String(mappedCount)} />
        <SummaryStat label="Anomalies" value={String(result.anomalies.length)} />
        <SummaryStat label="Journal rows" value={String(result.journalRows.length)} />
        <SummaryStat label="Audit rows" value={String(result.auditTrailRows.length)} />
        <SummaryStat
          label="Currencies"
          value={currencies.length > 0 ? currencies.join(", ") : "None"}
        />
      </div>
    </section>
  );
}

type SummaryStatProps = {
  label: string;
  value: string;
};

function SummaryStat({ label, value }: SummaryStatProps): React.JSX.Element {
  return (
    <div
      style={{
        borderRadius: "18px",
        padding: "1rem",
        background: "rgba(255, 255, 255, 0.7)",
        border: "1px solid rgba(31, 41, 55, 0.08)",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: "0.45rem",
          color: "#6b7280",
          fontSize: "0.9rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </p>
    </div>
  );
}
