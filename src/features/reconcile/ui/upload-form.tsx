"use client";

import { useState } from "react";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import {
  ResultsSummary,
  type ReconcileResultPayload,
} from "./results-summary";

type ErrorResponse = {
  error?: string;
};

export function UploadForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ReconcileResultPayload | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reconcile", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json()) as
        | ErrorResponse
        | ReconcileResultPayload;

      if (!response.ok) {
        throw new Error(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Reconciliation failed.",
        );
      }

      setResult(payload as ReconcileResultPayload);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Reconciliation failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "2rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "1rem",
        }}
      >
        <UploadField
          accept=".json,application/json"
          helperText="Upload the supported Deel-style payroll JSON file."
          label="Payroll JSON"
          name="payrollFile"
        />
        <UploadField
          accept=".csv,text/csv"
          helperText="Upload the supported chart-of-accounts CSV file."
          label="COA CSV"
          name="coaFile"
        />

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <button
            disabled={isSubmitting}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "0.95rem 1.25rem",
              fontSize: "1rem",
              fontWeight: 600,
              background: isSubmitting ? "#d1d5db" : "#1f2937",
              color: "#f9fafb",
              cursor: isSubmitting ? "progress" : "pointer",
            }}
            type="submit"
          >
            {isSubmitting ? "Reconciling..." : "Reconcile"}
          </button>
          <p
            style={{
              margin: 0,
              fontSize: "0.92rem",
              color: "#6b7280",
            }}
          >
            Server-side reconciliation requires <code>GEMINI_API_KEY</code> or{" "}
            <code>GOOGLE_API_KEY</code> in the environment.
          </p>
        </div>
      </form>

      <div
        style={{
          marginTop: "1.5rem",
        }}
      >
        {isSubmitting ? <LoadingState /> : null}
        {!isSubmitting && errorMessage ? <ErrorState message={errorMessage} /> : null}
        {!isSubmitting && !errorMessage && result ? (
          <ResultsSummary result={result} />
        ) : null}
        {!isSubmitting && !errorMessage && !result ? (
          <section
            style={{
              borderRadius: "22px",
              border: "1px solid rgba(124, 92, 59, 0.16)",
              background: "rgba(255, 255, 255, 0.68)",
              padding: "1.25rem",
            }}
          >
            <p
              style={{
                marginTop: 0,
                marginBottom: "0.45rem",
                fontSize: "0.85rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8b6a45",
              }}
            >
              Ready for the demo flow
            </p>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "0.55rem",
                fontSize: "1.25rem",
                color: "#1f2937",
              }}
            >
              Upload the supported files to begin.
            </h2>
            <p
              style={{
                margin: 0,
                lineHeight: 1.7,
                color: "#4b5563",
              }}
            >
              Choose one Deel-style payroll JSON file and one chart-of-accounts
              CSV file, then run reconciliation to populate mapped lines,
              anomalies, and both export downloads.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

type UploadFieldProps = {
  accept: string;
  helperText: string;
  label: string;
  name: string;
};

function UploadField({
  accept,
  helperText,
  label,
  name,
}: UploadFieldProps): React.JSX.Element {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: "#1f2937",
        }}
      >
        {label}
      </span>
      <input
        accept={accept}
        name={name}
        required
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(31, 41, 55, 0.14)",
          background: "rgba(255, 255, 255, 0.78)",
          padding: "0.8rem 1rem",
          color: "#1f2937",
        }}
        type="file"
      />
      <span
        style={{
          color: "#6b7280",
          fontSize: "0.92rem",
        }}
      >
        {helperText}
      </span>
    </label>
  );
}
