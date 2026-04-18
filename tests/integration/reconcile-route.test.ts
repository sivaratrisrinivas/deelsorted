import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalRow } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createSuccessResponse(prompt: string): string {
  if (prompt.includes('"normalizedCode": "EARNINGS_GROSS_PAY"')) {
    return JSON.stringify({
      isAnomaly: false,
      selectedAccountId: "exp-payroll-salary",
      journalRole: "expense",
      confidenceScore: 0.98,
      confidenceBand: "high",
      reasoning: "Gross pay is salary expense.",
    });
  }

  if (
    prompt.includes(
      '"normalizedCode": "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1"',
    ) ||
    prompt.includes(
      '"normalizedCode": "EMPLOYER_COSTS_EMPLOYER_SOCIAL_INSURANCE"',
    )
  ) {
    return JSON.stringify({
      isAnomaly: false,
      selectedAccountId: "exp-payroll-tax",
      journalRole: "expense",
      confidenceScore: 0.93,
      confidenceBand: "high",
      reasoning: "Employer payroll taxes map to payroll tax expense.",
    });
  }

  if (
    prompt.includes(
      '"normalizedCode": "DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION"',
    ) ||
    prompt.includes('"normalizedCode": "DEDUCTIONS_WAGE_TAX"')
  ) {
    return JSON.stringify({
      isAnomaly: false,
      selectedAccountId: "liab-employee-tax",
      journalRole: "liability",
      confidenceScore: 0.9,
      confidenceBand: "high",
      reasoning: "Employee withholdings map to tax liability.",
    });
  }

  if (prompt.includes('"normalizedCode": "NET_PAY_NET_SALARY"')) {
    return JSON.stringify({
      isAnomaly: false,
      selectedAccountId: "liab-net-pay",
      journalRole: "liability",
      confidenceScore: 0.95,
      confidenceBand: "high",
      reasoning: "Net salary is payable to employees.",
    });
  }

  throw new Error(`Unexpected prompt: ${prompt}`);
}

function createRouteRequest(): Request {
  const formData = new FormData();

  formData.set(
    "payrollFile",
    new File(
      [loadFixture("payroll-sample.json")],
      "payroll-sample.json",
      {
        type: "application/json",
      },
    ),
  );
  formData.set(
    "coaFile",
    new File([loadFixture("coa-sample.csv")], "coa-sample.csv", {
      type: "text/csv",
    }),
  );

  return new Request("http://localhost/api/reconcile", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/reconcile", () => {
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;
  const originalApprovalsFilePath = process.env.DEELSORTED_APPROVALS_FILE_PATH;
  const originalFetch = global.fetch;

  beforeEach(() => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "deelsorted-reconcile-flow-"));
    const approvalsFilePath = join(tempDirectory, "approved-mappings.json");
    writeFileSync(approvalsFilePath, "[]");
    
    process.env.DEELSORTED_APPROVALS_FILE_PATH = approvalsFilePath;
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        contents: Array<{
          parts: Array<{
            text: string;
          }>;
        }>;
      };

      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: createSuccessResponse(body.contents[0]!.parts[0]!.text),
                },
              ],
            },
          },
        ],
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }
    
    if (originalApprovalsFilePath === undefined) {
      delete process.env.DEELSORTED_APPROVALS_FILE_PATH;
    } else {
      process.env.DEELSORTED_APPROVALS_FILE_PATH = originalApprovalsFilePath;
    }
  });

  it("accepts payroll and COA uploads and returns basic reconcile results", async () => {
    const { POST } = await import("../../app/api/reconcile/route");

    const response = await POST(createRouteRequest());
    const body = (await response.json()) as {
      reconciledLines: Array<{
        lineId: string;
        sourceRef: string;
        normalizedCode: string;
        currency: string;
        status: string;
      }>;
      anomalies: Array<{ lineId: string }>;
      journalRows: JournalRow[];
      auditTrailRows: Array<{
        lineId: string;
        sourceRef: string;
        normalizedCode: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.reconciledLines).toHaveLength(8);
    expect(body.reconciledLines.every((line) => line.status === "mapped")).toBe(
      true,
    );
    expect(body.anomalies).toHaveLength(0);
    expect(body.auditTrailRows).toHaveLength(8);
    expect(body.journalRows.length).toBeGreaterThan(0);
    expect(body.reconciledLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineId: "contract-gb-001:item-1",
          sourceRef: "contract-gb-001",
          normalizedCode: "EARNINGS_GROSS_PAY",
          currency: "GBP",
        }),
        expect.objectContaining({
          lineId: "contract-gb-002:item-1",
          sourceRef: "contract-gb-002",
          normalizedCode:
            "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1",
          currency: "GBP",
        }),
        expect.objectContaining({
          lineId: "contract-de-001:item-2",
          sourceRef: "contract-de-001",
          normalizedCode: "DEDUCTIONS_WAGE_TAX",
          currency: "EUR",
        }),
      ]),
    );
    expect(body.auditTrailRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineId: "contract-br-001:item-1",
          sourceRef: "contract-br-001",
          normalizedCode: "DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION",
        }),
      ]),
    );
    expect(new Set(body.journalRows.map((row) => row.currency))).toEqual(
      new Set(["GBP", "BRL", "EUR"]),
    );
    expectBalancedJournalByCurrency(body.journalRows);
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});

function expectBalancedJournalByCurrency(rows: readonly JournalRow[]): void {
  const totalsByCurrency = new Map<
    string,
    {
      debit: number;
      credit: number;
    }
  >();

  for (const row of rows) {
    const totals = totalsByCurrency.get(row.currency) ?? {
      debit: 0,
      credit: 0,
    };

    if (row.side === "debit") {
      totals.debit += row.amount;
    } else {
      totals.credit += row.amount;
    }

    totalsByCurrency.set(row.currency, totals);
  }

  for (const totals of totalsByCurrency.values()) {
    expect(Math.abs(totals.debit - totals.credit)).toBeLessThanOrEqual(0.01);
  }
}
