"use client";

import { useState } from "react";
import type { ApprovalInput, MappedPayrollLine } from "../../../types/reconcile";

type ApprovalActionsProps = {
  line: MappedPayrollLine;
};

type ErrorResponse = {
  error?: string;
};

export function ApprovalActions({
  line,
}: ApprovalActionsProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(line.mappingSource === "memory");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleApprove(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createApprovalInput(line)),
      });
      const payload = (await response.json()) as ErrorResponse;

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Approval could not be saved.",
        );
      }

      setIsApproved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Approval could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "flex-end",
      }}
    >
      <button
        disabled={isSubmitting || isApproved}
        onClick={handleApprove}
        style={{
          border: "none",
          borderRadius: "0",
          padding: "0.75rem 1.25rem",
          fontSize: "0.75rem",
          fontFamily: "var(--font-engine)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          background: isApproved
            ? "var(--color-tertiary-container)"
            : isSubmitting
              ? "var(--color-surface-container-high)"
              : "var(--color-surface-container-highest)",
          color: isApproved ? "var(--color-on-tertiary-container)" : isSubmitting ? "var(--color-outline-variant)" : "var(--color-on-surface)",
          cursor: isApproved ? "default" : isSubmitting ? "progress" : "pointer",
          whiteSpace: "nowrap",
          transition: "background 0ms",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}
        type="button"
        onMouseEnter={(e) => {
          if (!isSubmitting && !isApproved) e.currentTarget.style.background = "var(--color-outline-variant)";
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting && !isApproved) e.currentTarget.style.background = "var(--color-surface-container-highest)";
        }}
      >
        {isApproved ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Stored in Memory</span>
          </>
        ) : isSubmitting ? (
          "Saving..."
        ) : (
          "Approve Mapping"
        )}
      </button>

      {errorMessage && (
        <span
          role="alert"
          style={{
            color: "var(--color-error)",
            fontSize: "0.8rem",
            lineHeight: 1.5,
          }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}

function createApprovalInput(line: MappedPayrollLine): ApprovalInput {
  return {
    normalizedCode: line.normalizedCode,
    countryCode: line.countryCode,
    selectedAccountId: line.selectedAccountId,
    journalRole: line.journalRole,
    confidenceScore: line.confidenceScore,
    confidenceBand: line.confidenceBand,
    rationale: line.reasoning,
  };
}
