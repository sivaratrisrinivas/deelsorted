import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CoaCsvRowSchema,
  SupportedPayrollFileSchema,
} from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);

  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim());

  return lines.map((line) => {
    const values = line.split(",").map((value) => value.trim());

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

describe("schemas and fixtures", () => {
  it("accepts the supported payroll sample fixture", () => {
    const payrollFixture = JSON.parse(loadFixture("payroll-sample.json"));
    const result = SupportedPayrollFileSchema.safeParse(payrollFixture);

    expect(result.success).toBe(true);
  });

  it("accepts the supported COA sample fixture", () => {
    const rows = parseCsvRows(loadFixture("coa-sample.csv"));
    const results = rows.map((row) => CoaCsvRowSchema.safeParse(row));

    expect(results).toHaveLength(6);
    expect(results.every((result) => result.success)).toBe(true);
  });

  it("rejects malformed payroll input", () => {
    const result = SupportedPayrollFileSchema.safeParse({
      payrollRunId: "run-april-2026",
      period: {
        startDate: "2026-04-01",
      },
      items: [],
    });

    expect(result.success).toBe(false);
  });
});
