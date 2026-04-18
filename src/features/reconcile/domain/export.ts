import Papa from "papaparse";
import {
  AuditTrailRowSchema,
  type AuditTrailRow,
  type JournalRow,
  type ReconciledPayrollLine,
} from "../../../types/reconcile";

const JOURNAL_COLUMNS = [
  "currency",
  "accountCode",
  "accountName",
  "side",
  "amount",
  "memo",
] as const;

const AUDIT_COLUMNS = [
  "lineId",
  "sourceRef",
  "countryCode",
  "currency",
  "rawCode",
  "rawLabel",
  "normalizedCode",
  "amount",
  "status",
  "selectedAccountCode",
  "selectedAccountName",
  "journalRole",
  "confidenceScore",
  "confidenceBand",
  "reasoning",
  "anomalyReasonCode",
] as const;

export function buildAuditTrailRows(
  reconciledLines: readonly ReconciledPayrollLine[],
): AuditTrailRow[] {
  return reconciledLines.map((line) => {
    if (line.status === "mapped") {
      return AuditTrailRowSchema.parse({
        lineId: line.lineId,
        sourceRef: line.sourceRef,
        countryCode: line.countryCode,
        currency: line.currency,
        rawCode: line.rawCode,
        rawLabel: line.rawLabel,
        normalizedCode: line.normalizedCode,
        amount: line.amount,
        status: line.status,
        selectedAccountCode: line.selectedAccountCode,
        selectedAccountName: line.selectedAccountName,
        journalRole: line.journalRole,
        confidenceScore: line.confidenceScore,
        confidenceBand: line.confidenceBand,
        reasoning: line.reasoning,
        anomalyReasonCode: "",
      });
    }

    return AuditTrailRowSchema.parse({
      lineId: line.lineId,
      sourceRef: line.sourceRef,
      countryCode: line.countryCode,
      currency: line.currency,
      rawCode: line.rawCode,
      rawLabel: line.rawLabel,
      normalizedCode: line.normalizedCode,
      amount: line.amount,
      status: line.status,
      selectedAccountCode: "",
      selectedAccountName: "",
      journalRole: "",
      confidenceScore: line.confidenceScore,
      confidenceBand: line.confidenceBand,
      reasoning: line.reasoning,
      anomalyReasonCode: line.reasonCode,
    });
  });
}

export function exportJournalCsv(rows: readonly JournalRow[]): string {
  return Papa.unparse(
    rows.map((row) => ({
      currency: row.currency,
      accountCode: row.accountCode,
      accountName: row.accountName,
      side: row.side,
      amount: row.amount,
      memo: row.memo,
    })),
    {
      columns: [...JOURNAL_COLUMNS],
      newline: "\r\n",
    },
  );
}

export function exportAuditTrailCsv(rows: readonly AuditTrailRow[]): string {
  return Papa.unparse(
    rows.map((row) => ({
      lineId: row.lineId,
      sourceRef: row.sourceRef,
      countryCode: row.countryCode ?? "",
      currency: row.currency,
      rawCode: row.rawCode,
      rawLabel: row.rawLabel,
      normalizedCode: row.normalizedCode,
      amount: row.amount,
      status: row.status,
      selectedAccountCode: row.selectedAccountCode,
      selectedAccountName: row.selectedAccountName,
      journalRole: row.journalRole,
      confidenceScore: row.confidenceScore ?? "",
      confidenceBand: row.confidenceBand ?? "",
      reasoning: row.reasoning,
      anomalyReasonCode: row.anomalyReasonCode,
    })),
    {
      columns: [...AUDIT_COLUMNS],
      newline: "\r\n",
    },
  );
}
