import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createGeminiMappingEngine,
  type GeminiModelClient,
} from "../../src/features/reconcile/server/gemini";
import { createLocalCandidateProvider } from "../../src/features/reconcile/server/retrieval";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("gemini adapter", () => {
  it("parses valid structured Gemini output into a mapping decision", async () => {
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const candidateProvider = createLocalCandidateProvider(accounts);
    const concept = payrollLines[1]!;
    const candidates = await candidateProvider.shortlistCandidates({
      concept,
      limit: 3,
    });
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        isAnomaly: false,
        selectedAccountId: "exp-payroll-tax",
        journalRole: "expense",
        confidenceScore: 0.94,
        confidenceBand: "high",
        reasoning:
          "Employer National Insurance is an employer payroll tax expense.",
      }),
    });
    const client: GeminiModelClient = {
      models: {
        generateContent,
      },
    };
    const engine = createGeminiMappingEngine({
      client,
      model: "gemini-2.5-flash",
    });

    const decision = await engine.mapConcept({
      concept,
      candidates,
    });

    expect(decision).toEqual({
      isAnomaly: false,
      selectedAccountId: "exp-payroll-tax",
      journalRole: "expense",
      confidenceScore: 0.94,
      confidenceBand: "high",
      reasoning:
        "Employer National Insurance is an employer payroll tax expense.",
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
        }),
      }),
    );
  });

  it("rejects invalid model output", async () => {
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const candidateProvider = createLocalCandidateProvider(accounts);
    const concept = payrollLines[1]!;
    const candidates = await candidateProvider.shortlistCandidates({
      concept,
      limit: 3,
    });
    const client: GeminiModelClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            isAnomaly: false,
            selectedAccountId: "invented-account",
            journalRole: "expense",
            confidenceScore: 0.88,
            confidenceBand: "high",
            reasoning: "This looks closest to payroll tax expense.",
          }),
        }),
      },
    };
    const engine = createGeminiMappingEngine({
      client,
      model: "gemini-2.5-flash",
    });

    await expect(
      engine.mapConcept({
        concept,
        candidates,
      }),
    ).rejects.toThrow(/candidate shortlist/i);
  });
});
