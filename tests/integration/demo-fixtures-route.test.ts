import { describe, expect, it } from "vitest";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";

describe("GET /api/demo-fixtures", () => {
  it("returns the checked-in demo payroll JSON and COA CSV", async () => {
    const { GET } = await import("../../app/api/demo-fixtures/route");

    const response = await GET();
    const body = (await response.json()) as {
      payrollFileName: string;
      payrollText: string;
      coaFileName: string;
      coaText: string;
    };

    expect(response.status).toBe(200);
    expect(body.payrollFileName).toBe("payroll-sample.json");
    expect(body.coaFileName).toBe("coa-sample.csv");
    expect(parsePayrollJson(body.payrollText)).toHaveLength(8);
    expect(parseCoaCsv(body.coaText)).toHaveLength(6);
  });
});
