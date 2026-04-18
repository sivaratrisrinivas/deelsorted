import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAuditTrailRows, exportAuditTrailCsv, exportJournalCsv } from "../../src/features/reconcile/domain/export";
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
    reasonCode: "no_match",
    reasoning: `No account match found for ${line.rawCode}.`,
    confidenceScore: 0.24,
    confidenceBand: "low",
    ...overrides,
  };
}

describe("export", () => {
  it("exports journal rows as stable CSV output", () => {
    const payrollLines = parsePayrollJson(loadFixture("payroll-legacy-sample.json"));
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const byId = new Map(accounts.map((account) => [account.accountId, account]));

    const result = buildJournalResult({
      reconciledLines: [
        createMappedLine(payrollLines[0]!, byId.get("exp-payroll-salary")!),
        createMappedLine(payrollLines[7]!, byId.get("liab-net-pay")!),
      ],
      clearingAccount: byId.get("liab-payroll-clearing")!,
    });

    expect(exportJournalCsv(result.journalRows)).toBe(
      [
        "currency,accountCode,accountName,side,amount,memo",
        "GBP,5000,Payroll Salaries,debit,4200,Gross Pay [uk-001]",
        "GBP,2220,Net Pay Liability,credit,2985.67,Net Salary [gb-004]",
        "GBP,2200,Payroll Clearing,credit,1214.33,Payroll clearing [GBP]",
      ].join("\r\n"),
    );
  });

  it("exports audit rows with raw code, selected account, confidence, and anomaly state", () => {
    const payrollLines = parsePayrollJson(loadFixture("payroll-legacy-sample.json"));
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const byId = new Map(accounts.map((account) => [account.accountId, account]));
    const reconciledLines: ReconciledPayrollLine[] = [
      createMappedLine(payrollLines[0]!, byId.get("exp-payroll-salary")!),
      createAnomalyLine(payrollLines[6]!),
    ];

    const auditRows = buildAuditTrailRows(reconciledLines);

    expect(auditRows[0]).toMatchObject({
      rawCode: "UK_Gross_Pay",
      selectedAccountCode: "5000",
      confidenceBand: "high",
      status: "mapped",
    });
    expect(auditRows[1]).toMatchObject({
      rawCode: "DE_Lohnsteuer",
      selectedAccountCode: "",
      anomalyReasonCode: "no_match",
      status: "anomaly",
    });
    expect(exportAuditTrailCsv(auditRows)).toBe(
      [
        "lineId,sourceRef,countryCode,currency,rawCode,rawLabel,normalizedCode,amount,status,selectedAccountCode,selectedAccountName,journalRole,confidenceScore,confidenceBand,reasoning,anomalyReasonCode",
        "uk-001,demo-april-2026:uk-001,GB,GBP,UK_Gross_Pay,Gross Pay,UK_GROSS_PAY,4200,mapped,5000,Payroll Salaries,expense,0.92,high,Mapped UK_Gross_Pay to Payroll Salaries.,",
        "de-002,demo-april-2026:de-002,DE,EUR,DE_Lohnsteuer,Wage Tax,DE_LOHNSTEUER,700.5,anomaly,,, ,0.24,low,No account match found for DE_Lohnsteuer.,no_match",
      ]
        .join("\r\n")
        .replace(",,, ,", ",,,,"),
    );
  });
});
