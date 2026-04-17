import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("parsers", () => {
  it("parses the supported Deel payroll fixture into canonical payroll lines", () => {
    const lines = parsePayrollJson(loadFixture("payroll-sample.json"));

    expect(lines).toHaveLength(8);
    expect(lines[0]).toEqual({
      lineId: "uk-001",
      sourceRef: "demo-april-2026:uk-001",
      countryCode: "GB",
      currency: "GBP",
      rawCode: "UK_Gross_Pay",
      rawLabel: "Gross Pay",
      normalizedCode: "UK_GROSS_PAY",
      tokens: ["UK", "GROSS", "PAY"],
      amount: 4200,
      section: "earnings",
      partySide: "employee",
    });
    expect(lines[1]?.sourceRef).toBe("demo-april-2026:uk-002");
    expect(lines[1]?.rawCode).toBe("UK_NI_Employer_Contribution_Tier_1");
    expect(lines[1]?.normalizedCode).toBe(
      "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
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
});
