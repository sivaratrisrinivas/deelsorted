import type {
  AnomalousPayrollLine,
  AuditTrailRow,
  JournalRow,
  MappedPayrollLine,
  ReconciledPayrollLine,
} from "../../../types/reconcile";
import { AnomalyPanel } from "./anomaly-panel";
import { DownloadActions } from "./download-actions";
import { ResultsTable } from "./results-table";

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
  const mappedLines = result.reconciledLines.filter(
    (line): line is MappedPayrollLine => line.status === "mapped",
  );
  const anomalyLines = result.reconciledLines.filter(
    (line): line is AnomalousPayrollLine => line.status === "anomaly",
  );
  const currencies = [...new Set(result.journalRows.map((row) => row.currency))];
  
  const totalLines = result.reconciledLines.length;
  const precisionScore = totalLines > 0 ? Math.round((mappedLines.length / totalLines) * 100) : 0;
  
  // LED Status color
  const statusColor = precisionScore === 100 
    ? "var(--color-success)" 
    : precisionScore >= 80 
      ? "var(--color-warning)" 
      : "var(--color-error)";

  return (
    <section style={{ marginTop: "2rem", display: "grid", gap: "2rem" }}>
      <div
        className="glass-panel"
        style={{
          padding: "2rem",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--color-outline)",
            }}
          >
            Reconciliation Engine
          </p>
          <h2
            style={{
              marginTop: "0.5rem",
              marginBottom: "1rem",
              fontSize: "1.8rem",
              color: "var(--color-on-surface)",
              fontFamily: "var(--font-engine)",
            }}
          >
            Analysis Complete
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--color-on-surface-variant)",
              lineHeight: 1.6,
              fontSize: "0.95rem"
            }}
          >
            The engine has processed all lines against the provided Chart of Accounts. 
            Review Fast Track maps, resolve any Manual Review items, and download the finalized journal.
          </p>
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1.5rem",
          background: "var(--color-surface-container-highest)",
          padding: "1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--color-outline-variant)"
        }}>
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--color-surface-container-high)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={statusColor}
                strokeWidth="3"
                strokeDasharray={`${precisionScore}, 100`}
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, 
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-on-surface)", fontFamily: "var(--font-engine)" }}>
                {precisionScore}%
              </span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-outline)" }}>Precision Score</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-on-surface-variant)" }}>
              {precisionScore === 100 ? "Perfect mapping." : `${totalLines - mappedLines.length} lines require attention.`}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "1rem",
        }}
      >
        <SummaryStat label="Total Extracted" value={String(totalLines)} />
        <SummaryStat label="Fast Track" value={String(mappedLines.length)} highlight={true} />
        <SummaryStat label="Manual Review" value={String(anomalyLines.length)} alert={anomalyLines.length > 0} />
        <SummaryStat label="Journal Rows" value={String(result.journalRows.length)} />
        <SummaryStat label="Currencies" value={currencies.length > 0 ? currencies.join(", ") : "N/A"} />
      </div>

      <DownloadActions
        auditTrailRows={result.auditTrailRows}
        journalRows={result.journalRows}
      />
      <ResultsTable lines={mappedLines} />
      <AnomalyPanel anomalies={anomalyLines} />
    </section>
  );
}

type SummaryStatProps = {
  label: string;
  value: string;
  highlight?: boolean;
  alert?: boolean;
};

function SummaryStat({ label, value, highlight, alert }: SummaryStatProps): React.JSX.Element {
  return (
    <div
      style={{
        borderRadius: "12px",
        padding: "1.25rem 1rem",
        background: "var(--color-surface-container)",
        border: `1px solid ${highlight ? "var(--color-primary)" : alert ? "var(--color-error)" : "var(--color-outline-variant)"}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {(highlight || alert) && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: highlight ? "var(--color-primary)" : alert ? "var(--color-error)" : "transparent",
          boxShadow: highlight ? "0 0 10px var(--color-primary)" : alert ? "0 0 10px var(--color-error)" : "none",
        }} />
      )}
      <p
        style={{
          marginTop: 0,
          marginBottom: "0.5rem",
          color: "var(--color-outline)",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "1.5rem",
          fontFamily: "var(--font-engine)",
          fontWeight: 600,
          color: highlight ? "var(--color-primary)" : alert ? "var(--color-error)" : "var(--color-on-surface)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
