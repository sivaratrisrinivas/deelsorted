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
import type { SupportedPayrollItem } from "../../src/types/reconcile";

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
    const item: SupportedPayrollItem = {
      itemId: "br-001",
      workerId: "worker-br-001",
      workerName: "Carla Souza",
      countryCode: "BR",
      currency: "BRL",
      category: "employee_taxes",
      code: "BR_INSS_Empregado",
      label: "INSS Employee Contribution",
      amount: 540.44,
    };

    const line = buildPayrollLine("demo-april-2026", item);

    expect(line.rawCode).toBe("BR_INSS_Empregado");
    expect(line.rawLabel).toBe("INSS Employee Contribution");
    expect(line.normalizedCode).toBe("BR_INSS_EMPREGADO");
    expect(line.tokens).toEqual(["BR", "INSS", "EMPREGADO"]);
    expect(line.partySide).toBe("employee");
  });

  it("groups repeated country-specific codes into a shared concept key", () => {
    const lines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const grouped = groupPayrollLinesByConcept(lines);

    expect(grouped.get("GB::UK_NI_EMPLOYER_CONTRIBUTION_TIER_1")).toHaveLength(
      2,
    );
    expect(grouped.get("BR::BR_INSS_EMPREGADO")).toHaveLength(2);
    expect(getPayrollConceptKey(lines[1]!)).toBe(
      "GB::UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
    );
  });
});
