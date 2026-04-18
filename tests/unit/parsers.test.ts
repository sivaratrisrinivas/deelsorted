import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import { DeelG2nReportSchema } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("parsers", () => {
  it("accepts the schema-faithful Deel G2N payroll fixture", () => {
    const report = JSON.parse(loadFixture("payroll-sample.json"));

    expect(DeelG2nReportSchema.safeParse(report).success).toBe(true);
  });

  it("parses the Deel G2N payroll fixture into canonical payroll lines", () => {
    const lines = parsePayrollJson(loadFixture("payroll-sample.json"));

    expect(lines).toHaveLength(8);
    expect(lines[0]).toEqual({
      lineId: "contract-gb-001:item-1",
      sourceRef: "contract-gb-001",
      countryCode: null,
      currency: "GBP",
      rawCode: "Gross Pay",
      rawLabel: "Gross Pay",
      normalizedCode: "EARNINGS_GROSS_PAY",
      tokens: ["EARNINGS", "GROSS", "PAY", "TAXABLE", "SALARY"],
      amount: 4200,
      section: "earnings",
      partySide: "employee",
      rawCategory: "Gross (Taxable)",
      rawSubCategory: "Salary",
      rawCategoryGroup: "EARNINGS",
    });
    expect(lines[1]?.sourceRef).toBe("contract-gb-001");
    expect(lines[1]?.rawCode).toBe("Employer National Insurance Tier 1");
    expect(lines[1]?.normalizedCode).toBe(
      "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1",
    );
  });

  it("parses the supported COA CSV into canonical accounts", () => {
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));

    expect(accounts).toHaveLength(6);
    expect(accounts[0]).toEqual({
      accountId: "exp-payroll-salary",
      accountCode: "5000",
      name: "Payroll Salaries",
      description: "Gross salary expense",
      type: "expense",
      normalSide: "debit",
      aliases: ["gross pay", "salary", "earnings"],
    });
    expect(accounts[3]?.aliases).toContain("inss");
    expect(accounts[4]?.normalSide).toBe("credit");
  });

  it("parses a supported COA CSV that uses header aliases", () => {
    const accounts = parseCoaCsv(loadFixture("coa-alias-sample.csv"));

    expect(accounts).toEqual([
      {
        accountId: "exp-payroll-salary",
        accountCode: "5000",
        name: "Payroll Salaries",
        description: "Gross salary expense",
        type: "expense",
        normalSide: "debit",
        aliases: ["gross pay", "salary", "earnings"],
      },
      {
        accountId: "liab-net-pay",
        accountCode: "2220",
        name: "Net Pay Liability",
        description: "Net salary payable",
        type: "liability",
        normalSide: "credit",
        aliases: ["net pay", "salary payable", "wages payable"],
      },
    ]);
  });

  it("defaults optional COA fields when alias-header CSV omits them", () => {
    const csvText = [
      "id,account number,account name,account type,normal balance",
      "exp-payroll-salary,5000,Payroll Salaries,expense,debit",
    ].join("\n");

    expect(parseCoaCsv(csvText)).toEqual([
      {
        accountId: "exp-payroll-salary",
        accountCode: "5000",
        name: "Payroll Salaries",
        description: "",
        type: "expense",
        normalSide: "debit",
        aliases: [],
      },
    ]);
  });

  it("rejects ambiguous COA header aliases", () => {
    const csvText = [
      "accountCode,code,name,type,normalSide,accountId",
      "5000,5000,Payroll Salaries,expense,debit,exp-payroll-salary",
    ].join("\n");

    expect(() => parseCoaCsv(csvText)).toThrow(
      "COA CSV parsing failed: multiple columns map to accountCode: accountCode, code.",
    );
  });
});
