"use client";

import { useState } from "react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
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
          style={{ padding: "2rem", textAlign: "center", background: "var(--color-surface-container-lowest)" }}
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(lines.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleLines = lines.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: "1.2rem", 
          fontFamily: "var(--font-engine)", 
          fontWeight: 400,
          color: urgent ? "var(--color-error)" : "var(--color-tertiary)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <div style={{ 
            width: "8px", height: "8px", borderRadius: "0", 
            background: urgent ? "var(--color-error)" : "var(--color-tertiary)",
            boxShadow: `0 0 8px ${urgent ? "var(--color-error)" : "var(--color-tertiary)"}`
          }} />
          {title}
          <span style={{ 
            background: urgent ? "rgba(255, 180, 171, 0.15)" : "rgba(221, 227, 255, 0.15)", 
            color: urgent ? "var(--color-error)" : "var(--color-tertiary)",
            padding: "2px 8px", borderRadius: "0", fontSize: "0.8rem", marginLeft: "0.5rem", fontFamily: "monospace"
          }}>
            {lines.length}
          </span>
        </h3>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--color-on-surface-variant)" }}>
          {description}
        </p>
      </div>

      <div style={{ display: "grid", gap: "0" }}>
        {visibleLines.map((line, idx) => (
          <div 
            key={line.lineId}
            style={{
              background: idx % 2 === 0 ? "var(--color-surface-container-lowest)" : "var(--color-surface-container-low)",
              border: "none",
              borderBottom: "1px solid var(--color-surface-container-high)",
              padding: "1rem",
              display: "grid",
              gridTemplateColumns: "minmax(200px, 1fr) minmax(250px, 1.5fr) minmax(200px, 2fr) auto",
              gap: "1.5rem",
              alignItems: "start",
              transition: "background 0ms",
              position: "relative",
            }}
            onMouseEnter={(e) => {
               e.currentTarget.style.background = "var(--color-surface-container)";
            }}
            onMouseLeave={(e) => {
               e.currentTarget.style.background = idx % 2 === 0 ? "var(--color-surface-container-lowest)" : "var(--color-surface-container-low)";
            }}
          >
            {/* Left border indicator based on confidence */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
              background: line.mappingSource === "memory" 
                ? "var(--color-tertiary)" 
                : line.confidenceBand === "high" ? "var(--color-primary)" : "var(--color-error)"
            }} />

            {/* Source Line Detail */}
            <div style={{ paddingLeft: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>Extracted Line</div>
              <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "0.95rem", fontWeight: 600 }}>{line.rawLabel}</strong>
              <div style={{ marginTop: "0.25rem", color: "var(--color-outline)", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center", fontFamily: "monospace" }}>
                <span>{formatCountryCode(line.countryCode)}</span>
                <span style={{ color: "var(--color-outline-variant)" }}>|</span>
                <span style={{ color: "var(--color-on-surface-variant)" }}>{formatAmount(line.currency, line.amount)}</span>
              </div>
            </div>

            {/* Mapped Account Detail */}
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>Mapped Account</div>
              <strong style={{ display: "block", color: "var(--color-on-surface)", fontSize: "0.95rem", fontWeight: 600 }}>
                <span style={{ fontFamily: "monospace", marginRight: "0.5rem", color: "var(--color-primary)" }}>{line.selectedAccountCode}</span>
                {line.selectedAccountName}
              </strong>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: "0",
                  background: line.mappingSource === "memory" ? "var(--color-tertiary-container)" : "var(--color-primary-container)",
                  color: line.mappingSource === "memory" ? "var(--color-on-tertiary-container)" : "var(--color-on-primary-container)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "var(--font-engine)"
                }}>
                  {line.mappingSource === "memory" ? "Memory" : "Engine"}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-on-surface-variant)", fontFamily: "monospace" }}>
                  {formatConfidence(line.confidenceBand, line.confidenceScore)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-outline)", borderLeft: "1px solid var(--color-outline-variant)", paddingLeft: "0.5rem", textTransform: "capitalize" }}>
                  {line.journalRole}
                </span>
              </div>
            </div>

            {/* AI Reasoning (Takes more space) */}
            <div>
               <div style={{ fontSize: "0.75rem", color: "var(--color-outline)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>Engine Reasoning</div>
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

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--color-surface-container-high)", color: "var(--color-on-surface)" }}>
          <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-engine)" }}>
            SHOWING <span style={{ fontFamily: "monospace" }}>{startIndex + 1}</span> - <span style={{ fontFamily: "monospace" }}>{Math.min(startIndex + itemsPerPage, lines.length)}</span> OF <span style={{ fontFamily: "monospace" }}>{lines.length}</span>
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

