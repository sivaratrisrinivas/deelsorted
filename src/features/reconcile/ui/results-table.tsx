import type { MappedPayrollLine } from "../../../types/reconcile";
import { ApprovalActions } from "./approval-actions";

type ResultsTableProps = {
  lines: readonly MappedPayrollLine[];
};

export function ResultsTable({
  lines,
}: ResultsTableProps): React.JSX.Element {
  
  const fastTrackLines = lines.filter(l => l.mappingSource === "memory" || l.confidenceBand === "high");
  const reviewLines = lines.filter(l => l.mappingSource !== "memory" && l.confidenceBand !== "high");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {reviewLines.length > 0 && (
        <LineStream 
          title="Manual Review" 
          description="AI mapped these lines but flagged them for human verification." 
          lines={reviewLines} 
          urgent={true} 
        />
      )}
      
      {fastTrackLines.length > 0 ? (
        <LineStream 
          title="Fast Track" 
          description="High confidence mappings and approved memory matches." 
          lines={fastTrackLines} 
        />
      ) : reviewLines.length === 0 ? (
        <section
          className="glass-panel"
          style={{ padding: "2rem", textAlign: "center" }}
        >
          <p style={{ margin: 0, color: "var(--color-on-surface-variant)" }}>
            No mapped lines were produced in this run.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function LineStream({ 
  title, 
  description, 
  lines, 
  urgent 
}: { 
  title: string, 
  description: string, 
  lines: readonly MappedPayrollLine[],
  urgent?: boolean
}) {
  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "1.2rem", 
          fontFamily: "var(--font-engine)", 
          color: urgent ? "var(--color-warning)" : "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <div style={{ 
            width: "8px", height: "8px", borderRadius: "50%", 
            background: urgent ? "var(--color-warning)" : "var(--color-primary)",
            boxShadow: `0 0 8px ${urgent ? "var(--color-warning)" : "var(--color-primary)"}`
          }} />
          {title}
          <span style={{ 
            background: "var(--color-surface-container-high)", 
            color: "var(--color-on-surface-variant)",
            padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem", marginLeft: "0.5rem"
          }}>
            {lines.length}
          </span>
        </h3>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--color-on-surface-variant)" }}>
          {description}
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {lines.map((line) => (
          <div 
            key={line.lineId}
            style={{
              background: "var(--color-surface-container-low)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "grid",
              gridTemplateColumns: "minmax(200px, 1fr) minmax(250px, 1.5fr) minmax(200px, 2fr) auto",
              gap: "1.5rem",
              alignItems: "start",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Left border indicator based on confidence */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
              background: line.mappingSource === "memory" 
                ? "var(--color-success)" 
                : line.confidenceBand === "high" ? "var(--color-primary)" : "var(--color-warning)"
            }} />

            {/* Source Line Detail */}
            <div style={{ paddingLeft: "1rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Extracted Line</div>
              <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "1rem" }}>{line.rawLabel}</strong>
              <div style={{ marginTop: "0.25rem", color: "var(--color-on-surface-variant)", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span>{formatCountryCode(line.countryCode)}</span>
                <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                <span>{formatAmount(line.currency, line.amount)}</span>
              </div>
            </div>

            {/* Mapped Account Detail */}
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Mapped Account</div>
              <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "1rem" }}>
                {line.selectedAccountCode} {line.selectedAccountName}
              </strong>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  background: line.mappingSource === "memory" ? "rgba(100, 255, 150, 0.1)" : "rgba(120, 180, 255, 0.1)",
                  color: line.mappingSource === "memory" ? "var(--color-success)" : "var(--color-primary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  {line.mappingSource === "memory" ? "Memory" : "Engine"}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>
                  {formatConfidence(line.confidenceBand, line.confidenceScore)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-outline)", borderLeft: "1px solid var(--color-outline-variant)", paddingLeft: "0.5rem", textTransform: "capitalize" }}>
                  {line.journalRole}
                </span>
              </div>
            </div>

            {/* AI Reasoning (Takes more space) */}
            <div>
               <div style={{ fontSize: "0.8rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Engine Reasoning</div>
               <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)", lineHeight: 1.5 }}>
                 {line.reasoning}
               </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
              <ApprovalActions line={line} />
            </div>

          </div>
        ))}
      </div>
    </section>
  );
}

function formatCountryCode(countryCode: string | null): string {
  return countryCode ?? "Global";
}

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatConfidence(
  confidenceBand: MappedPayrollLine["confidenceBand"],
  confidenceScore: number,
): string {
  const bandLabel =
    confidenceBand.slice(0, 1).toUpperCase() + confidenceBand.slice(1);

  return `${bandLabel} (${Math.round(confidenceScore * 100)}%)`;
}
