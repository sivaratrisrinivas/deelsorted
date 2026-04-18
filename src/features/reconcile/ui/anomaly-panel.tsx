"use client";

import { useState } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  if (anomalies.length === 0) return null;

  const itemsPerPage = 50;
  const totalPages = Math.ceil(anomalies.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleAnomalies = anomalies.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "1.2rem", 
          fontFamily: "var(--font-engine)", 
          fontWeight: 400,
          color: "var(--color-error)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <div style={{ 
            width: "8px", height: "8px", borderRadius: "0", 
            background: "var(--color-error)",
            boxShadow: "0 0 8px var(--color-error)"
          }} />
          Hard Failures
          <span style={{ 
            background: "rgba(255, 180, 171, 0.15)", // error container with opacity
            color: "var(--color-error)",
            padding: "2px 8px", borderRadius: "0", fontSize: "0.8rem", marginLeft: "0.5rem", fontFamily: "monospace"
          }}>
            {anomalies.length}
          </span>
        </h3>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--color-on-surface-variant)" }}>
          The engine could not safely map these lines. Manual intervention required.
        </p>
      </div>

      <div style={{ display: "grid", gap: "0" }}>
        {visibleAnomalies.map((line, idx) => (
          <article
            key={line.lineId}
            style={{
              background: idx % 2 === 0 ? "var(--color-surface-container-lowest)" : "var(--color-surface-container-low)",
              border: "none",
              borderBottom: "1px solid var(--color-surface-container-high)",
              padding: "1rem",
              position: "relative",
            }}
          >
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
              background: "var(--color-error)"
            }} />
            
            <div style={{ paddingLeft: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>Unmapped Source Line</div>
                  <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "0.95rem", fontWeight: 600 }}>{line.rawLabel}</strong>
                  <div style={{ marginTop: "0.25rem", color: "var(--color-outline)", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center", fontFamily: "monospace" }}>
                    <span>{formatCountryCode(line.countryCode)}</span>
                    <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                    <span style={{ color: "var(--color-on-surface-variant)" }}>{line.normalizedCode}</span>
                    <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                    <span style={{ color: "var(--color-on-surface-variant)" }}>{formatAmount(line.currency, line.amount)}</span>
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "0",
                    background: "var(--color-error-container)",
                    color: "var(--color-on-error-container)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: "var(--font-engine)"
                  }}>
                    {REASON_LABELS[line.reasonCode]}
                  </span>
                  {line.confidenceScore !== undefined && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-error)", fontFamily: "monospace" }}>
                      Engine Confidence: {formatConfidence(line.confidenceScore)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--color-error-container)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>Diagnostic Output</div>
                <p style={{ margin: 0, color: "var(--color-on-surface-variant)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {line.reasoning}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--color-surface-container-high)", color: "var(--color-on-surface)" }}>
          <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-engine)" }}>
            SHOWING <span style={{ fontFamily: "monospace" }}>{startIndex + 1}</span> - <span style={{ fontFamily: "monospace" }}>{Math.min(startIndex + itemsPerPage, anomalies.length)}</span> OF <span style={{ fontFamily: "monospace" }}>{anomalies.length}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                border: "none",
                borderRadius: "0",
                background: currentPage === 1 ? "transparent" : "var(--color-surface-container-highest)",
                color: currentPage === 1 ? "var(--color-outline-variant)" : "var(--color-on-surface)",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                fontFamily: "var(--font-engine)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              Previous
            </button>
            <div style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", fontFamily: "monospace", display: "flex", alignItems: "center" }}>
              PAGE {currentPage}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                border: "none",
                borderRadius: "0",
                background: currentPage === totalPages ? "transparent" : "var(--color-surface-container-highest)",
                color: currentPage === totalPages ? "var(--color-outline-variant)" : "var(--color-on-surface)",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                fontFamily: "var(--font-engine)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
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

