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
        display: "grid",
        gap: "0.45rem",
      }}
    >
      <button
        disabled={isSubmitting || isApproved}
        onClick={handleApprove}
        style={{
          border: "none",
          borderRadius: "999px",
          padding: "0.7rem 0.9rem",
          fontSize: "0.88rem",
          fontWeight: 600,
          background: isApproved
            ? "rgba(5, 150, 105, 0.14)"
            : isSubmitting
              ? "#d1d5db"
              : "#111827",
          color: isApproved ? "#047857" : "#f9fafb",
          cursor: isApproved ? "default" : isSubmitting ? "progress" : "pointer",
          whiteSpace: "nowrap",
        }}
        type="button"
      >
        {isApproved
          ? "Approved for reruns"
          : isSubmitting
            ? "Saving approval..."
            : "Approve mapping"}
      </button>
      <span
        style={{
          color: isApproved ? "#047857" : "#6b7280",
          fontSize: "0.8rem",
          lineHeight: 1.5,
        }}
      >
        {isApproved
          ? "Stored in local approved memory for future matching."
          : "Save this confirmed mapping for future runs."}
      </span>
      {errorMessage ? (
        <span
          role="alert"
          style={{
            color: "#991b1b",
            fontSize: "0.8rem",
            lineHeight: 1.5,
          }}
        >
          {errorMessage}
        </span>
      ) : null}
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
