"use client";

import { useState } from "react";
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
          {errorMessage ? (
            <p
              role="alert"
              style={{
                margin: 0,
                borderRadius: "16px",
                padding: "0.9rem 1rem",
                background: "rgba(185, 28, 28, 0.08)",
                color: "#991b1b",
              }}
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </form>

      {result ? <ResultsSummary result={result} /> : null}
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
