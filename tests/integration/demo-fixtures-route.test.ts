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
      prewarmedResult: {
        reconciledLines: Array<{ status: string; rawLabel: string }>;
        anomalies: Array<{ rawLabel: string; reasonCode: string }>;
        journalRows: Array<{ accountCode: string }>;
        auditTrailRows: Array<{ rawLabel: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.payrollFileName).toBe("payroll-1000-sample.json");
    expect(body.coaFileName).toBe("coa-large-sample.csv");
    expect(parsePayrollJson(body.payrollText)).toHaveLength(1000);
    expect(parseCoaCsv(body.coaText)).toHaveLength(14);
    expect(body.prewarmedResult.reconciledLines).toHaveLength(1000);
    expect(body.prewarmedResult.auditTrailRows).toHaveLength(1000);
    expect(body.prewarmedResult.journalRows.length).toBeGreaterThan(0);
    expect(body.prewarmedResult.anomalies.length).toBeGreaterThan(0);
    expect(body.prewarmedResult.reconciledLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawLabel: "Gross Pay",
          status: "mapped",
        }),
        expect.objectContaining({
          rawLabel: "Net Salary",
          status: "mapped",
        }),
      ]),
    );
    expect(body.prewarmedResult.anomalies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCode: expect.any(String),
        }),
      ]),
    );
  });
});
