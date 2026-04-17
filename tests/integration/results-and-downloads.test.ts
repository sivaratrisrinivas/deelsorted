import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ResultsSummary,
  type ReconcileResultPayload,
} from "../../src/features/reconcile/ui/results-summary";
import {
  AnomalousPayrollLineSchema,
  AuditTrailRowSchema,
  JournalRowSchema,
  MappedPayrollLineSchema,
} from "../../src/types/reconcile";

const mappedLine = MappedPayrollLineSchema.parse({
  lineId: "line-001",
  sourceRef: "worker-uk-001:uk-001",
  countryCode: "GB",
  currency: "GBP",
  rawCode: "UK_Gross_Pay",
  rawLabel: "Gross Pay",
  normalizedCode: "UK_GROSS_PAY",
  tokens: ["UK", "GROSS", "PAY"],
  amount: 4200,
  section: "earnings",
  partySide: "employee",
  status: "mapped",
  selectedAccountId: "exp-payroll-salary",
  selectedAccountCode: "5000",
  selectedAccountName: "Payroll Salaries",
  confidenceScore: 0.98,
  confidenceBand: "high",
  reasoning: "Gross pay is salary expense.",
  journalRole: "expense",
  mappingSource: "model",
});

const anomalyLine = AnomalousPayrollLineSchema.parse({
  lineId: "line-002",
  sourceRef: "worker-de-001:de-999",
  countryCode: "DE",
  currency: "EUR",
  rawCode: "DE_Unknown_Code",
  rawLabel: "Unknown Tax",
  normalizedCode: "DE_UNKNOWN_CODE",
  tokens: ["DE", "UNKNOWN", "CODE"],
  amount: 120.5,
  section: "employee_taxes",
  partySide: "employee",
  status: "anomaly",
  reasonCode: "low_confidence",
  reasoning: "Model response was below the confidence threshold.",
  confidenceScore: 0.41,
  confidenceBand: "low",
});

const result: ReconcileResultPayload = {
  reconciledLines: [mappedLine, anomalyLine],
  anomalies: [anomalyLine],
  journalRows: [
    JournalRowSchema.parse({
      currency: "GBP",
      accountId: "exp-payroll-salary",
      accountCode: "5000",
      accountName: "Payroll Salaries",
      side: "debit",
      amount: 4200,
      memo: "Gross Pay [line-001]",
    }),
  ],
  auditTrailRows: [
    AuditTrailRowSchema.parse({
      lineId: "line-001",
      sourceRef: "worker-uk-001:uk-001",
      countryCode: "GB",
      currency: "GBP",
      rawCode: "UK_Gross_Pay",
      rawLabel: "Gross Pay",
      normalizedCode: "UK_GROSS_PAY",
      amount: 4200,
      status: "mapped",
      selectedAccountCode: "5000",
      selectedAccountName: "Payroll Salaries",
      journalRole: "expense",
      confidenceScore: 0.98,
      confidenceBand: "high",
      reasoning: "Gross pay is salary expense.",
      anomalyReasonCode: "",
    }),
    AuditTrailRowSchema.parse({
      lineId: "line-002",
      sourceRef: "worker-de-001:de-999",
      countryCode: "DE",
      currency: "EUR",
      rawCode: "DE_Unknown_Code",
      rawLabel: "Unknown Tax",
      normalizedCode: "DE_UNKNOWN_CODE",
      amount: 120.5,
      status: "anomaly",
      selectedAccountCode: "",
      selectedAccountName: "",
      journalRole: "",
      confidenceScore: 0.41,
      confidenceBand: "low",
      reasoning: "Model response was below the confidence threshold.",
      anomalyReasonCode: "low_confidence",
    }),
  ],
};

describe("ResultsSummary", () => {
  it("renders mapped details, anomaly detail, and CSV download links", () => {
    const html = renderToStaticMarkup(
      createElement(ResultsSummary, {
        result,
      }),
    );

    expect(html).toContain("5000 Payroll Salaries");
    expect(html).toContain("High (98%)");
    expect(html).toContain("Gross pay is salary expense.");
    expect(html).toContain("Anomalies");
    expect(html).toContain("Low confidence mapping");
    expect(html).toContain("Model response was below the confidence threshold.");
    expect(html).toContain("Download journal CSV");
    expect(html).toContain("Download audit trail CSV");

    const journalHref = extractDownloadHref(html, "deelsorted-journal.csv");
    const auditHref = extractDownloadHref(html, "deelsorted-audit-trail.csv");

    expect(decodeCsvDataUri(journalHref)).toContain(
      "currency,accountCode,accountName,side,amount,memo",
    );
    expect(decodeCsvDataUri(journalHref)).toContain("5000,Payroll Salaries");
    expect(decodeCsvDataUri(auditHref)).toContain(
      "lineId,sourceRef,countryCode,currency,rawCode",
    );
    expect(decodeCsvDataUri(auditHref)).toContain(
      "low_confidence",
    );
  });
});

function extractDownloadHref(html: string, filename: string): string {
  const pattern = new RegExp(`download="${filename}"[^>]*href="([^"]+)"`);
  const match = html.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Missing download link for ${filename}.`);
  }

  return match[1];
}

function decodeCsvDataUri(uri: string): string {
  const prefix = "data:text/csv;charset=utf-8,";

  if (!uri.startsWith(prefix)) {
    throw new Error(`Unexpected CSV data URI: ${uri}`);
  }

  return decodeURIComponent(uri.slice(prefix.length));
}
