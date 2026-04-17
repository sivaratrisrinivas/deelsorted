import {
  exportAuditTrailCsv,
  exportJournalCsv,
} from "../domain/export";
import type { AuditTrailRow, JournalRow } from "../../../types/reconcile";

type DownloadActionsProps = {
  auditTrailRows: readonly AuditTrailRow[];
  journalRows: readonly JournalRow[];
};

export function DownloadActions({
  auditTrailRows,
  journalRows,
}: DownloadActionsProps): React.JSX.Element {
  const journalHref = createCsvDownloadHref(exportJournalCsv(journalRows));
  const auditTrailHref = createCsvDownloadHref(
    exportAuditTrailCsv(auditTrailRows),
  );

  return (
    <section
      style={{
        display: "grid",
        gap: "0.8rem",
        borderRadius: "22px",
        border: "1px solid rgba(31, 41, 55, 0.08)",
        background: "rgba(243, 244, 246, 0.72)",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6b7280",
          }}
        >
          Exports
        </p>
        <h2
          style={{
            marginTop: "0.35rem",
            marginBottom: 0,
            color: "#111827",
            fontSize: "1.35rem",
          }}
        >
          Download the journal and audit trail from this run.
        </h2>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <a
          download="deelsorted-journal.csv"
          href={journalHref}
          style={downloadButtonStyle}
        >
          Download journal CSV
        </a>
        <a
          download="deelsorted-audit-trail.csv"
          href={auditTrailHref}
          style={{
            ...downloadButtonStyle,
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid rgba(31, 41, 55, 0.12)",
          }}
        >
          Download audit trail CSV
        </a>
      </div>
    </section>
  );
}

const downloadButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  borderRadius: "999px",
  padding: "0.85rem 1.1rem",
  background: "#1f2937",
  color: "#f9fafb",
  fontWeight: 700,
};

function createCsvDownloadHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}
