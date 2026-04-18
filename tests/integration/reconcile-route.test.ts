import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createSuccessResponse(prompt: string): string {
  if (prompt.includes('"normalizedCode": "UK_GROSS_PAY"')) {
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
    prompt.includes('"normalizedCode": "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1"') ||
    prompt.includes('"normalizedCode": "DE_SOZIALVERSICHERUNG_AG_ANTEIL"')
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
    prompt.includes('"normalizedCode": "BR_INSS_EMPREGADO"') ||
    prompt.includes('"normalizedCode": "DE_LOHNSTEUER"')
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

  if (prompt.includes('"normalizedCode": "NET_SALARY"')) {
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
      [loadFixture("payroll-legacy-sample.json")],
      "payroll-legacy-sample.json",
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
  const originalFetch = global.fetch;

  beforeEach(() => {
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
      return;
    }

    process.env.GEMINI_API_KEY = originalGeminiApiKey;
  });

  it("accepts payroll and COA uploads and returns basic reconcile results", async () => {
    const { POST } = await import("../../app/api/reconcile/route");

    const response = await POST(createRouteRequest());
    const body = (await response.json()) as {
      reconciledLines: Array<{ status: string }>;
      anomalies: Array<{ lineId: string }>;
      journalRows: Array<{ currency: string }>;
      auditTrailRows: Array<{ lineId: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.reconciledLines).toHaveLength(8);
    expect(body.reconciledLines.every((line) => line.status === "mapped")).toBe(
      true,
    );
    expect(body.anomalies).toHaveLength(0);
    expect(body.auditTrailRows).toHaveLength(8);
    expect(body.journalRows.length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
