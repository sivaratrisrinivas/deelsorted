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

type DemoFixturesResponse = {
  payrollFileName: string;
  payrollText: string;
  coaFileName: string;
  coaText: string;
};

export function UploadForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ReconcileResultPayload | null>(null);
  const [filesReady, setFilesReady] = useState({ payroll: false, coa: false });

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await submitReconciliation(new FormData(event.currentTarget));
  }

  async function handleUseSampleFiles(): Promise<void> {
    setErrorMessage(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-fixtures");
      const payload = (await response.json()) as ErrorResponse | DemoFixturesResponse;

      if (!response.ok) {
        throw new Error(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Unable to load sample files.",
        );
      }

      const sampleFiles = payload as DemoFixturesResponse;
      const formData = new FormData();

      formData.set(
        "payrollFile",
        new File([sampleFiles.payrollText], sampleFiles.payrollFileName, {
          type: "application/json",
        }),
      );
      formData.set(
        "coaFile",
        new File([sampleFiles.coaText], sampleFiles.coaFileName, {
          type: "text/csv",
        }),
      );

      await submitReconciliation(formData);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load sample files.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilesReady = filesReady.payroll && filesReady.coa;

  return (
    <div style={{ marginTop: "1rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 calc(50% - 0.5rem)" }}>
            <UploadField
              accept=".json,application/json"
              helperText="Deel G2N JSON"
              label="Payroll Data"
              name="payrollFile"
              onChange={(e) => setFilesReady(s => ({ ...s, payroll: !!e.target.files?.length }))}
              isReady={filesReady.payroll}
            />
          </div>
          <div style={{ flex: "1 1 calc(50% - 0.5rem)" }}>
            <UploadField
              accept=".csv,text/csv"
              helperText="Chart of Accounts"
              label="Ledger Map"
              name="coaFile"
              onChange={(e) => setFilesReady(s => ({ ...s, coa: !!e.target.files?.length }))}
              isReady={filesReady.coa}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-outline)" }}>
              Requires <code style={{ color: "var(--color-on-surface-variant)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px" }}>GEMINI_API_KEY</code>
            </p>
            <p style={{ margin: "0.45rem 0 0", fontSize: "0.85rem", color: "var(--color-outline)" }}>
              Or use the built-in demo fixtures for a one-click sample run.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              disabled={isSubmitting}
              onClick={() => {
                void handleUseSampleFiles();
              }}
              style={{
                border: "1px solid var(--color-outline-variant)",
                borderRadius: "8px",
                padding: "1rem 1.5rem",
                fontSize: "0.95rem",
                fontFamily: "var(--font-engine)",
                fontWeight: 600,
                background: "var(--color-surface-container-low)",
                color: isSubmitting ? "var(--color-outline-variant)" : "var(--color-on-surface)",
                cursor: isSubmitting ? "progress" : "pointer",
                transition: "all 0.2s ease-in-out",
              }}
              type="button"
            >
              Use sample files
            </button>
            <button
              disabled={isSubmitting || !allFilesReady}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "1rem 2rem",
                fontSize: "1rem",
                fontFamily: "var(--font-engine)",
                fontWeight: 600,
                background: isSubmitting || !allFilesReady ? "var(--color-surface-container-high)" : "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
                color: isSubmitting || !allFilesReady ? "var(--color-outline-variant)" : "#0b1326",
                cursor: isSubmitting ? "progress" : (!allFilesReady ? "not-allowed" : "pointer"),
                boxShadow: allFilesReady && !isSubmitting ? "0 4px 15px rgba(46, 107, 255, 0.4)" : "none",
                transition: "all 0.2s ease-in-out",
              }}
              type="submit"
            >
              {isSubmitting ? "Reconciling..." : "Run Reconciliation"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ marginTop: "3rem" }}>
        {isSubmitting ? <LoadingState /> : null}
        {!isSubmitting && errorMessage ? <ErrorState message={errorMessage} /> : null}
        {!isSubmitting && !errorMessage && result ? (
          <ResultsSummary result={result} />
        ) : null}
      </div>
    </div>
  );

  async function submitReconciliation(formData: FormData): Promise<void> {
    setErrorMessage(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reconcile", {
        method: "POST",
        body: formData,
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
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }
}

type UploadFieldProps = {
  accept: string;
  helperText: string;
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReady: boolean;
};

function UploadField({
  accept,
  helperText,
  label,
  name,
  onChange,
  isReady,
}: UploadFieldProps): React.JSX.Element {
  return (
    <label
      style={{
        display: "block",
        position: "relative",
        background: "var(--color-surface-container-low)",
        border: `1px solid ${isReady ? "var(--color-primary)" : "var(--color-outline-variant)"}`,
        borderRadius: "12px",
        padding: "2rem",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: isReady ? "inset 0 0 0 1px rgba(181, 196, 255, 0.1)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isReady) e.currentTarget.style.borderColor = "var(--color-outline)";
      }}
      onMouseLeave={(e) => {
        if (!isReady) e.currentTarget.style.borderColor = "var(--color-outline-variant)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ 
          width: "40px", height: "40px", 
          borderRadius: "8px", 
          background: "var(--color-surface-container-highest)",
          display: "grid", placeItems: "center",
          color: isReady ? "var(--color-primary)" : "var(--color-on-surface-variant)"
        }}>
          {isReady ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"/><path d="M16 16l-4-4-4 4"/></svg>
          )}
        </div>
        <div>
          <span style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-outline)", marginBottom: "0.25rem" }}>
            {label}
          </span>
          <span style={{ display: "block", fontSize: "1.2rem", fontWeight: 600, color: isReady ? "var(--color-on-surface)" : "var(--color-on-surface-variant)" }}>
            {isReady ? "Ready to map" : helperText}
          </span>
        </div>
      </div>
      
      <input
        accept={accept}
        name={name}
        required
        onChange={onChange}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0, cursor: "pointer"
        }}
        type="file"
      />
    </label>
  );
}
