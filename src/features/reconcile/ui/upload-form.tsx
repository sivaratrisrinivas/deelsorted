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
  prewarmedResult: ReconcileResultPayload;
};

export function UploadForm(): React.JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ReconcileResultPayload | null>(null);
  const [filesReady, setFilesReady] = useState({ payroll: false, coa: false });
  const [formResetKey, setFormResetKey] = useState(0);

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
      setResult(sampleFiles.prewarmedResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load sample files.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetToInitialState(): void {
    setErrorMessage(null);
    setResult(null);
    setIsSubmitting(false);
    setFilesReady({ payroll: false, coa: false });
    setFormResetKey((current) => current + 1);
  }

  function handleFileReadyChange(
    field: "payroll" | "coa",
    hasFile: boolean,
  ): void {
    setErrorMessage(null);
    setResult(null);
    setFilesReady((current) => ({
      ...current,
      [field]: hasFile,
    }));
  }

  const allFilesReady = filesReady.payroll && filesReady.coa;
  const canReset =
    result !== null ||
    errorMessage !== null ||
    filesReady.payroll ||
    filesReady.coa;

  return (
    <div style={{ marginTop: "1rem" }}>
      <form
        key={formResetKey}
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "1rem" }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 calc(50% - 0.5rem)" }}>
            <UploadField
              accept=".json,application/json"
              helperText="Deel G2N JSON"
              label="Payroll Data"
              name="payrollFile"
              onChange={(e) =>
                handleFileReadyChange("payroll", !!e.target.files?.length)
              }
              isReady={filesReady.payroll}
            />
          </div>
          <div style={{ flex: "1 1 calc(50% - 0.5rem)" }}>
            <UploadField
              accept=".csv,text/csv"
              helperText="Chart of Accounts"
              label="Ledger Map"
              name="coaFile"
              onChange={(e) =>
                handleFileReadyChange("coa", !!e.target.files?.length)
              }
              isReady={filesReady.coa}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", padding: "1rem", background: "var(--color-surface-container-lowest)" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>
              Live uploads require <code style={{ color: "var(--color-on-surface)", fontFamily: "monospace", opacity: 0.9 }}>GEMINI_API_KEY</code>
            </p>
            <p style={{ margin: "0.45rem 0 0", fontSize: "0.85rem", color: "var(--color-outline)" }}>
              Or use the built-in prewarmed demo run for an instant sample result.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {canReset ? (
              <button
                disabled={isSubmitting}
                onClick={resetToInitialState}
                style={{
                  border: "1px solid rgba(67, 70, 85, 0.4)",
                  borderRadius: "0",
                  padding: "0.85rem 1.5rem",
                  fontSize: "0.95rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "var(--font-engine)",
                  fontWeight: 600,
                  background: "transparent",
                  color: isSubmitting
                    ? "var(--color-outline-variant)"
                    : "var(--color-on-surface)",
                  cursor: isSubmitting ? "progress" : "pointer",
                  transition: "background 0ms",
                }}
                type="button"
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "var(--color-surface-container-high)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                onMouseDown={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "var(--color-surface-container-highest)";
                  }
                }}
                onMouseUp={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "var(--color-surface-container-high)";
                  }
                }}
              >
                Start Over
              </button>
            ) : null}
            <button
              disabled={isSubmitting}
              onClick={() => {
                void handleUseSampleFiles();
              }}
              style={{
                border: "1px solid rgba(67, 70, 85, 0.4)", // outline-variant ghost border
                borderRadius: "0",
                padding: "0.85rem 1.5rem",
                fontSize: "0.95rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "var(--font-engine)",
                fontWeight: 600,
                background: "transparent",
                color: isSubmitting ? "var(--color-outline-variant)" : "var(--color-on-surface)",
                cursor: isSubmitting ? "progress" : "pointer",
                transition: "background 0ms",
              }}
              type="button"
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "var(--color-surface-container-high)";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "transparent";
              }}
              onMouseDown={(e) => {
                 if (!isSubmitting) e.currentTarget.style.background = "var(--color-surface-container-highest)";
              }}
              onMouseUp={(e) => {
                 if (!isSubmitting) e.currentTarget.style.background = "var(--color-surface-container-high)";
              }}
            >
              Use Samples
            </button>
            <button
              disabled={isSubmitting || !allFilesReady}
              style={{
                border: "none",
                borderRadius: "0",
                padding: "0.85rem 2.5rem",
                fontSize: "0.95rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "var(--font-engine)",
                fontWeight: 700,
                background: isSubmitting || !allFilesReady ? "var(--color-surface-container-highest)" : "var(--color-primary-container)",
                color: isSubmitting || !allFilesReady ? "var(--color-outline-variant)" : "var(--color-on-primary-container)",
                cursor: isSubmitting ? "progress" : (!allFilesReady ? "not-allowed" : "pointer"),
                transition: "background 0ms",
              }}
              type="submit"
              onMouseEnter={(e) => {
                if (!isSubmitting && allFilesReady) e.currentTarget.style.background = "var(--color-primary-fixed)";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && allFilesReady) e.currentTarget.style.background = "var(--color-primary-container)";
              }}
              onMouseDown={(e) => {
                 if (!isSubmitting && allFilesReady) e.currentTarget.style.background = "var(--color-primary-fixed-variant)";
              }}
              onMouseUp={(e) => {
                 if (!isSubmitting && allFilesReady) e.currentTarget.style.background = "var(--color-primary-fixed)";
              }}
            >
              {isSubmitting ? "Reconciling..." : "Run Reconciliation"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ marginTop: "2rem" }}>
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
        border: "none",
        borderBottom: `2px solid ${isReady ? "var(--color-tertiary)" : "transparent"}`,
        borderRadius: "0",
        padding: "2rem",
        cursor: "pointer",
        transition: "background 0ms",
      }}
      onMouseEnter={(e) => {
        if (!isReady) e.currentTarget.style.background = "var(--color-surface-container)";
      }}
      onMouseLeave={(e) => {
        if (!isReady) e.currentTarget.style.background = "var(--color-surface-container-low)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ 
          width: "40px", height: "40px", 
          borderRadius: "0", 
          background: "var(--color-surface-container-highest)",
          display: "grid", placeItems: "center",
          color: isReady ? "var(--color-tertiary)" : "var(--color-on-surface-variant)"
        }}>
          {isReady ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21"/><path d="M16 16l-4-4-4 4"/></svg>
          )}
        </div>
        <div>
          <span style={{ display: "block", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-outline)", marginBottom: "0.25rem", fontFamily: "var(--font-engine)" }}>
            {label}
          </span>
          <span style={{ display: "block", fontSize: "1.2rem", fontWeight: 600, color: isReady ? "var(--color-on-surface)" : "var(--color-on-surface-variant)", fontFamily: "monospace" }}>
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
