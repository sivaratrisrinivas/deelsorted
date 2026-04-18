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
}: AnomalyPanelProps): React.JSX.Element {
  return (
    <section
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(180, 83, 9, 0.18)",
        background: "rgba(255, 251, 235, 0.88)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "0.4rem",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#b45309",
          }}
        >
          Anomalies
        </p>
        <h2
          style={{
            margin: 0,
            color: "#111827",
            fontSize: "1.5rem",
          }}
        >
          Keep uncertain lines visible for review.
        </h2>
      </div>

      {anomalies.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          No anomalies were detected in this run.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
          }}
        >
          {anomalies.map((line) => (
            <article
              key={line.lineId}
              style={{
                borderRadius: "18px",
                border: "1px solid rgba(180, 83, 9, 0.16)",
                background: "rgba(255, 255, 255, 0.72)",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#111827",
                    }}
                  >
                    {line.rawLabel}
                  </strong>
                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: "0.9rem",
                    }}
                  >
                    {formatCountryCode(line.countryCode)} · {line.normalizedCode} ·{" "}
                    {formatAmount(line.currency, line.amount)}
                  </span>
                </div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "999px",
                    background: "rgba(180, 83, 9, 0.12)",
                    color: "#92400e",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                  }}
                >
                  {REASON_LABELS[line.reasonCode]}
                </span>
              </div>

              <p
                style={{
                  marginTop: "0.85rem",
                  marginBottom: 0,
                  color: "#4b5563",
                  lineHeight: 1.6,
                }}
              >
                {line.reasoning}
              </p>

              {line.confidenceScore !== undefined ? (
                <p
                  style={{
                    marginTop: "0.75rem",
                    marginBottom: 0,
                    color: "#92400e",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Confidence: {formatConfidence(line.confidenceScore)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatCountryCode(countryCode: string | null): string {
  return countryCode ?? "Country unavailable";
}

function formatConfidence(confidenceScore: number): string {
  return `${Math.round(confidenceScore * 100)}%`;
}
