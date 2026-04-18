import type { AnomalousPayrollLine } from "../../../types/reconcile";

type AnomalyPanelProps = {
  anomalies: readonly AnomalousPayrollLine[];
};

const REASON_LABELS: Record<AnomalousPayrollLine["reasonCode"], string> = {
  invalid_decision: "Invalid model or memory decision",
  low_confidence: "Low confidence mapping",
  no_candidate: "No candidate account found",
  no_match: "No matching account selected",
  unsupported_input: "Unsupported input",
};

export function AnomalyPanel({
  anomalies,
}: AnomalyPanelProps): React.JSX.Element | null {
  if (anomalies.length === 0) return null;

  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "1.2rem", 
          fontFamily: "var(--font-engine)", 
          color: "var(--color-error)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <div style={{ 
            width: "8px", height: "8px", borderRadius: "50%", 
            background: "var(--color-error)",
            boxShadow: "0 0 8px var(--color-error)"
          }} />
          Hard Failures
          <span style={{ 
            background: "var(--color-error-container)", 
            color: "var(--color-on-error-container)",
            padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem", marginLeft: "0.5rem"
          }}>
            {anomalies.length}
          </span>
        </h3>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--color-on-surface-variant)" }}>
          The engine could not safely map these lines. Manual intervention required.
        </p>
      </div>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {anomalies.map((line) => (
          <article
            key={line.lineId}
            style={{
              background: "rgba(147, 0, 10, 0.05)",
              border: "1px solid var(--color-error-container)",
              borderRadius: "12px",
              padding: "1.25rem",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
              background: "var(--color-error)"
            }} />
            
            <div style={{ paddingLeft: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Unmapped Source Line</div>
                  <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "1rem" }}>{line.rawLabel}</strong>
                  <div style={{ marginTop: "0.25rem", color: "var(--color-on-surface-variant)", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span>{formatCountryCode(line.countryCode)}</span>
                    <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                    <span>{line.normalizedCode}</span>
                    <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                    <span>{formatAmount(line.currency, line.amount)}</span>
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "4px",
                    background: "var(--color-error-container)",
                    color: "var(--color-on-error-container)",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    {REASON_LABELS[line.reasonCode]}
                  </span>
                  {line.confidenceScore !== undefined && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-error)" }}>
                      AI Confidence: {formatConfidence(line.confidenceScore)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-error-container)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Diagnostic Output</div>
                <p style={{ margin: 0, color: "var(--color-on-surface-variant)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {line.reasoning}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatCountryCode(countryCode: string | null): string {
  return countryCode ?? "Global";
}

function formatConfidence(confidenceScore: number): string {
  return `${Math.round(confidenceScore * 100)}%`;
}
