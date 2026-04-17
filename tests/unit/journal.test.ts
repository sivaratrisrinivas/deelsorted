import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJournalResult } from "../../src/features/reconcile/domain/journal";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import type {
  AnomalousPayrollLine,
  CoaEntry,
  MappedPayrollLine,
  ReconciledPayrollLine,
} from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createMappedLine(
  line: ReturnType<typeof parsePayrollJson>[number],
  account: CoaEntry,
  overrides: Partial<MappedPayrollLine> = {},
): MappedPayrollLine {
  return {
    ...line,
    status: "mapped",
    selectedAccountId: account.accountId,
    selectedAccountCode: account.accountCode,
    selectedAccountName: account.name,
    confidenceScore: 0.92,
    confidenceBand: "high",
    reasoning: `Mapped ${line.rawCode} to ${account.name}.`,
    journalRole: account.type === "liability" ? "liability" : "expense",
    mappingSource: "model",
    ...overrides,
  };
}

function createAnomalyLine(
  line: ReturnType<typeof parsePayrollJson>[number],
  overrides: Partial<AnomalousPayrollLine> = {},
): AnomalousPayrollLine {
  return {
    ...line,
    status: "anomaly",
    reasonCode: "low_confidence",
    reasoning: `Unable to confidently map ${line.rawCode}.`,
    confidenceScore: 0.41,
    confidenceBand: "low",
    ...overrides,
  };
}

function getCurrencyBalance(
  rows: ReturnType<typeof buildJournalResult>["journalRows"],
  currency: string,
): number {
  const currencyRows = rows.filter((row) => row.currency === currency);

  return currencyRows.reduce((total, row) => {
    if (row.side === "debit") {
      return total + row.amount;
    }

    return total - row.amount;
  }, 0);
}

describe("journal", () => {
  it("groups journal rows by currency and balances each currency", () => {
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const byId = new Map(accounts.map((account) => [account.accountId, account]));
    const reconciledLines: ReconciledPayrollLine[] = [
      createMappedLine(payrollLines[0]!, byId.get("exp-payroll-salary")!),
      createMappedLine(payrollLines[1]!, byId.get("exp-payroll-tax")!),
      createMappedLine(payrollLines[2]!, byId.get("exp-payroll-tax")!),
      createMappedLine(payrollLines[3]!, byId.get("liab-employee-tax")!),
      createMappedLine(payrollLines[4]!, byId.get("liab-employee-tax")!),
      createMappedLine(payrollLines[5]!, byId.get("exp-payroll-tax")!),
      createMappedLine(payrollLines[6]!, byId.get("liab-employee-tax")!),
      createMappedLine(payrollLines[7]!, byId.get("liab-net-pay")!),
    ];

    const result = buildJournalResult({
      reconciledLines,
      clearingAccount: byId.get("liab-payroll-clearing")!,
    });

    expect(result.anomalies).toHaveLength(0);
    expect(result.journalRows.some((row) => row.accountCode === "2200")).toBe(
      true,
    );
    expect(Math.abs(getCurrencyBalance(result.journalRows, "GBP"))).toBeLessThan(
      0.01,
    );
    expect(Math.abs(getCurrencyBalance(result.journalRows, "BRL"))).toBeLessThan(
      0.01,
    );
    expect(Math.abs(getCurrencyBalance(result.journalRows, "EUR"))).toBeLessThan(
      0.01,
    );
  });

  it("separates anomalies from mapped lines instead of forcing them into the journal", () => {
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const byId = new Map(accounts.map((account) => [account.accountId, account]));
    const anomaly = createAnomalyLine(payrollLines[6]!);

    const result = buildJournalResult({
      reconciledLines: [
        createMappedLine(payrollLines[0]!, byId.get("exp-payroll-salary")!),
        anomaly,
      ],
      clearingAccount: byId.get("liab-payroll-clearing")!,
    });

    expect(result.anomalies).toEqual([anomaly]);
    expect(result.journalRows.some((row) => row.memo.includes("DE_Lohnsteuer"))).toBe(
      false,
    );
    expect(result.journalRows).toHaveLength(2);
  });
});
