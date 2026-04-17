import type { MappedPayrollLine } from "../../../types/reconcile";
import { ApprovalActions } from "./approval-actions";

type ResultsTableProps = {
  lines: readonly MappedPayrollLine[];
};

export function ResultsTable({
  lines,
}: ResultsTableProps): React.JSX.Element {
  return (
    <section
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(31, 41, 55, 0.08)",
        background: "rgba(255, 255, 255, 0.82)",
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
            color: "#8b6a45",
          }}
        >
          Mapped Lines
        </p>
        <h2
          style={{
            margin: 0,
            color: "#111827",
            fontSize: "1.5rem",
          }}
        >
          Review the selected account for each mapped payroll line.
        </h2>
      </div>

      {lines.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          No mapped lines were produced in this run.
        </p>
      ) : (
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  "Line",
                  "Amount",
                  "Selected Account",
                  "Confidence",
                  "Journal Role",
                  "Reasoning",
                  "Approval",
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      padding: "0.85rem 0.75rem",
                      textAlign: "left",
                      fontSize: "0.82rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#6b7280",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.lineId}>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                    }}
                  >
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
                        display: "block",
                        marginTop: "0.3rem",
                        color: "#6b7280",
                        fontSize: "0.9rem",
                      }}
                    >
                      {line.countryCode} · {line.normalizedCode}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                      color: "#111827",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatAmount(line.currency, line.amount)}
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "#111827",
                      }}
                    >
                      {line.selectedAccountCode} {line.selectedAccountName}
                    </strong>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "0.45rem",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "999px",
                        background:
                          line.mappingSource === "memory"
                            ? "rgba(5, 150, 105, 0.1)"
                            : "rgba(59, 130, 246, 0.1)",
                        color:
                          line.mappingSource === "memory" ? "#047857" : "#1d4ed8",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {line.mappingSource === "memory"
                        ? "Approved memory"
                        : "Gemini choice"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                      color: "#111827",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatConfidence(line.confidenceBand, line.confidenceScore)}
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                      color: "#111827",
                      textTransform: "capitalize",
                    }}
                  >
                    {line.journalRole}
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                      color: "#4b5563",
                      lineHeight: 1.6,
                      minWidth: "16rem",
                    }}
                  >
                    {line.reasoning}
                  </td>
                  <td
                    style={{
                      padding: "0.9rem 0.75rem",
                      borderBottom: "1px solid rgba(31, 41, 55, 0.08)",
                      verticalAlign: "top",
                    }}
                  >
                    <ApprovalActions line={line} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
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
