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
      className="glass-panel"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "2rem",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.5rem 2rem",
        borderRadius: "16px",
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
            fontWeight: 600,
          }}
        >
          Finalization
        </p>
        <h2
          style={{
            marginTop: "0.5rem",
            marginBottom: "0.25rem",
            color: "var(--color-on-surface)",
            fontSize: "1.35rem",
            fontFamily: "var(--font-engine)",
          }}
        >
          Download standard outputs
        </h2>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-on-surface-variant)"}}>
          Export the finalized balanced journal and complete audit trail for compliance.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <a
          download="deelsorted-journal.csv"
          href={journalHref}
          style={primaryDownloadStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export Journal CSV
        </a>
        <a
          download="deelsorted-audit-trail.csv"
          href={auditTrailHref}
          style={secondaryDownloadStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Export Audit Trail
        </a>
      </div>
    </section>
  );
}

const primaryDownloadStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.75rem",
  textDecoration: "none",
  borderRadius: "8px",
  padding: "0.85rem 1.25rem",
  background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
  color: "#0b1326",
  fontWeight: 600,
  fontFamily: "var(--font-engine)",
  transition: "all 0.2s",
  boxShadow: "0 4px 15px rgba(46, 107, 255, 0.3)",
};

const secondaryDownloadStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.75rem",
  textDecoration: "none",
  borderRadius: "8px",
  padding: "0.85rem 1.25rem",
  background: "var(--color-surface-container-high)",
  color: "var(--color-on-surface)",
  fontWeight: 600,
  fontFamily: "var(--font-engine)",
  border: "1px solid var(--color-outline-variant)",
  transition: "all 0.2s",
};

function createCsvDownloadHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}
