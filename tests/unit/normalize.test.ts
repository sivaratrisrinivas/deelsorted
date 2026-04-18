import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import {
  buildPayrollLine,
  getPayrollConceptKey,
  groupPayrollLinesByConcept,
  normalizePayrollCode,
  tokenizePayrollCode,
} from "../../src/features/reconcile/domain/normalize";
import type { DeelG2nContract, DeelG2nItem } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("normalize", () => {
  it("normalizes payroll codes into stable canonical concepts", () => {
    expect(normalizePayrollCode(" DE-Sozialversicherung AG Anteil ")).toBe(
      "DE_SOZIALVERSICHERUNG_AG_ANTEIL",
    );
    expect(tokenizePayrollCode("UK_NI_Employer_Contribution_Tier_1")).toEqual([
      "UK",
      "NI",
      "EMPLOYER",
      "CONTRIBUTION",
      "TIER",
      "1",
    ]);
  });

  it("preserves raw source values alongside normalized values", () => {
    const contract: DeelG2nContract = {
      contract_oid: "contract-br-001",
      currency: "BRL",
      payment_data: {
        conversion_rate: "1.00",
        payment_currency: "BRL",
      },
      items: [],
    };
    const item: DeelG2nItem = {
      label: "INSS Employee Contribution",
      value: 540.44,
      category: "Taxes",
      sub_category: "Social Security",
      category_group: "DEDUCTIONS",
    };

    const line = buildPayrollLine(contract, item, 0);

    expect(line.lineId).toBe("contract-br-001:item-1");
    expect(line.sourceRef).toBe("contract-br-001");
    expect(line.countryCode).toBeNull();
    expect(line.rawCode).toBe("INSS Employee Contribution");
    expect(line.rawLabel).toBe("INSS Employee Contribution");
    expect(line.normalizedCode).toBe("DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION");
    expect(line.tokens).toEqual([
      "DEDUCTIONS",
      "INSS",
      "EMPLOYEE",
      "CONTRIBUTION",
      "TAXES",
      "SOCIAL",
      "SECURITY",
    ]);
    expect(line.rawCategory).toBe("Taxes");
    expect(line.rawSubCategory).toBe("Social Security");
    expect(line.rawCategoryGroup).toBe("DEDUCTIONS");
    expect(line.partySide).toBe("employee");
  });

  it("groups repeated G2N concepts into a shared concept key", () => {
    const lines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const grouped = groupPayrollLinesByConcept(lines);

    expect(
      grouped.get("NO_COUNTRY::EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1"),
    ).toHaveLength(2);
    expect(
      grouped.get("NO_COUNTRY::DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION"),
    ).toHaveLength(2);
    expect(getPayrollConceptKey(lines[1]!)).toBe(
      "NO_COUNTRY::EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1",
    );
  });
});
