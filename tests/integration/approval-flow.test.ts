import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type MappingDecisionEngine,
  reconcilePayroll,
} from "../../src/features/reconcile/server/reconcile";
import { createFileApprovalMemory } from "../../src/features/reconcile/server/memory";
import { createLocalCandidateProvider } from "../../src/features/reconcile/server/retrieval";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import type { Approval, ModelMappingDecision } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createApprovalRequest(): Request {
  return new Request("http://localhost/api/approvals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      normalizedCode: "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
      countryCode: "GB",
      selectedAccountId: "exp-payroll-tax",
      journalRole: "expense",
      confidenceScore: 0.99,
      confidenceBand: "high",
      rationale: "Finance approved employer NI to payroll tax expense.",
    }),
  });
}

function createMatchedDecision(input: {
  selectedAccountId: string;
  journalRole: "expense" | "liability";
  confidenceScore: number;
  confidenceBand: "low" | "medium" | "high";
  reasoning: string;
}): ModelMappingDecision {
  return {
    isAnomaly: false,
    selectedAccountId: input.selectedAccountId,
    journalRole: input.journalRole,
    confidenceScore: input.confidenceScore,
    confidenceBand: input.confidenceBand,
    reasoning: input.reasoning,
  };
}

describe("approval flow", () => {
  const originalApprovalsFilePath = process.env.DEELSORTED_APPROVALS_FILE_PATH;

  afterEach(() => {
    vi.resetModules();

    if (originalApprovalsFilePath === undefined) {
      delete process.env.DEELSORTED_APPROVALS_FILE_PATH;
      return;
    }

    process.env.DEELSORTED_APPROVALS_FILE_PATH = originalApprovalsFilePath;
  });

  it("persists a confirmed approval and reuses it on a later reconcile run", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "deelsorted-approval-flow-"));
    const approvalsFilePath = join(tempDirectory, "approved-mappings.json");

    process.env.DEELSORTED_APPROVALS_FILE_PATH = approvalsFilePath;

    const { POST } = await import("../../app/api/approvals/route");
    const response = await POST(createApprovalRequest());
    const savedApproval = (await response.json()) as Approval;

    expect(response.status).toBe(200);
    expect(savedApproval).toMatchObject({
      normalizedCode: "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
      countryCode: "GB",
      selectedAccountId: "exp-payroll-tax",
      journalRole: "expense",
      confidenceBand: "high",
      status: "confirmed",
    });

    const approvalMemory = createFileApprovalMemory({
      filePath: approvalsFilePath,
    });

    await expect(approvalMemory.listApprovedMappings()).resolves.toEqual([
      expect.objectContaining({
        normalizedCode: "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
        selectedAccountId: "exp-payroll-tax",
      }),
    ]);

    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const candidateProvider = createLocalCandidateProvider(accounts);
    const mappingEngine: MappingDecisionEngine = {
      mapConcept: vi.fn(async ({ concept }) => {
        switch (concept.normalizedCode) {
          case "UK_GROSS_PAY":
            return createMatchedDecision({
              selectedAccountId: "exp-payroll-salary",
              journalRole: "expense",
              confidenceScore: 0.98,
              confidenceBand: "high",
              reasoning: "Gross pay is salary expense.",
            });
          case "DE_SOZIALVERSICHERUNG_AG_ANTEIL":
            return createMatchedDecision({
              selectedAccountId: "exp-payroll-tax",
              journalRole: "expense",
              confidenceScore: 0.93,
              confidenceBand: "high",
              reasoning: "Employer payroll taxes map to payroll tax expense.",
            });
          case "BR_INSS_EMPREGADO":
          case "DE_LOHNSTEUER":
            return createMatchedDecision({
              selectedAccountId: "liab-employee-tax",
              journalRole: "liability",
              confidenceScore: 0.9,
              confidenceBand: "high",
              reasoning: "Employee withholdings map to tax liability.",
            });
          case "NET_SALARY":
            return createMatchedDecision({
              selectedAccountId: "liab-net-pay",
              journalRole: "liability",
              confidenceScore: 0.95,
              confidenceBand: "high",
              reasoning: "Net salary is payable to employees.",
            });
          default:
            throw new Error(`Unexpected concept: ${concept.normalizedCode}`);
        }
      }),
    };

    const result = await reconcilePayroll({
      payrollLines,
      accounts,
      candidateProvider,
      approvalMemory,
      mappingEngine,
    });

    expect(
      result.reconciledLines.filter(
        (line) => line.normalizedCode === "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "mapped",
          mappingSource: "memory",
          selectedAccountId: "exp-payroll-tax",
        }),
      ]),
    );

    const mappedConcepts = vi
      .mocked(mappingEngine.mapConcept)
      .mock.calls.map(([input]) => input.concept.normalizedCode);

    expect(mappedConcepts).not.toContain(
      "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
    );
  });
});
