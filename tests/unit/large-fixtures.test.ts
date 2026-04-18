import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import { DeelG2nReportSchema } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("large fixtures", () => {
  it("accepts and parses the large Deel G2N payroll sample", () => {
    const report = JSON.parse(loadFixture("payroll-large-sample.json"));
    const parsedReport = DeelG2nReportSchema.parse(report);
    const payrollLines = parsePayrollJson(JSON.stringify(parsedReport));
    const currencies = new Set(payrollLines.map((line) => line.currency));
    const sourceRefs = new Set(payrollLines.map((line) => line.sourceRef));

    expect(parsedReport.data).toHaveLength(150);
    expect(payrollLines).toHaveLength(1200);
    expect(currencies.size).toBeGreaterThan(4);
    expect(sourceRefs.size).toBe(150);
  });

  it("accepts and parses the large canonical COA CSV sample", () => {
    const accounts = parseCoaCsv(loadFixture("coa-large-sample.csv"));

    expect(accounts).toHaveLength(14);
    expect(accounts[0]).toMatchObject({
      accountId: "exp-payroll-salary",
      accountCode: "5000",
      name: "Payroll Salaries",
      type: "expense",
      normalSide: "debit",
    });
    expect(accounts.some((account) => account.type === "liability")).toBe(true);
  });
});
