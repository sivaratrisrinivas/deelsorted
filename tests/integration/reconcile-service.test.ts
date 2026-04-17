import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type MappingDecisionEngine,
  reconcilePayroll,
} from "../../src/features/reconcile/server/reconcile";
import type { ApprovalMemory } from "../../src/features/reconcile/server/memory";
import { createLocalCandidateProvider } from "../../src/features/reconcile/server/retrieval";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import type { ModelMappingDecision } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createEmptyApprovalMemory(): ApprovalMemory {
  return {
    async listApprovedMappings() {
      return [];
    },
    async getApprovedMapping() {
      return null;
    },
  };
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

function createNoMatchDecision(input: {
  confidenceScore: number;
  confidenceBand: "low" | "medium" | "high";
  reasoning: string;
}): ModelMappingDecision {
  return {
    isAnomaly: true,
    selectedAccountId: null,
    journalRole: null,
    confidenceScore: input.confidenceScore,
    confidenceBand: input.confidenceBand,
    reasoning: input.reasoning,
  };
}

describe("reconcile service", () => {
  it("maps repeated normalized concepts with a single model decision per concept", async () => {
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
          case "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1":
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
      approvalMemory: createEmptyApprovalMemory(),
      mappingEngine,
    });

    const mappedEmployerTaxLines = result.reconciledLines.filter(
      (line) =>
        line.normalizedCode === "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1" &&
        line.status === "mapped",
    );
    const calledConcepts = vi
      .mocked(mappingEngine.mapConcept)
      .mock.calls.map(([input]) => input.concept.normalizedCode);

    expect(calledConcepts.filter((code) => code === "BR_INSS_EMPREGADO")).toHaveLength(1);
    expect(
      calledConcepts.filter(
        (code) => code === "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1",
      ),
    ).toHaveLength(1);
    expect(vi.mocked(mappingEngine.mapConcept)).toHaveBeenCalledTimes(6);
    expect(mappedEmployerTaxLines).toHaveLength(2);
    expect(mappedEmployerTaxLines[0]).toMatchObject({
      selectedAccountId: "exp-payroll-tax",
      mappingSource: "model",
    });
    expect(mappedEmployerTaxLines[1]).toMatchObject({
      selectedAccountId: "exp-payroll-tax",
      mappingSource: "model",
    });
    expect(result.auditTrailRows).toHaveLength(8);
    expect(result.anomalies).toHaveLength(0);
  });

  it("quarantines invalid, NO_MATCH, and low-confidence decisions as anomalies", async () => {
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const candidateProvider = createLocalCandidateProvider(accounts);
    const mappingEngine: MappingDecisionEngine = {
      mapConcept: vi.fn(async ({ concept }) => {
        switch (concept.normalizedCode) {
          case "UK_GROSS_PAY":
            throw new Error("Model selected an account outside the candidate shortlist.");
          case "DE_LOHNSTEUER":
            return createNoMatchDecision({
              confidenceScore: 0.24,
              confidenceBand: "low",
              reasoning: "No confident account match found for wage tax.",
            });
          case "NET_SALARY":
            return createMatchedDecision({
              selectedAccountId: "liab-net-pay",
              journalRole: "liability",
              confidenceScore: 0.42,
              confidenceBand: "low",
              reasoning: "Net salary looks payable, but confidence is too low.",
            });
          case "UK_NI_EMPLOYER_CONTRIBUTION_TIER_1":
          case "DE_SOZIALVERSICHERUNG_AG_ANTEIL":
            return createMatchedDecision({
              selectedAccountId: "exp-payroll-tax",
              journalRole: "expense",
              confidenceScore: 0.93,
              confidenceBand: "high",
              reasoning: "Employer payroll taxes map to payroll tax expense.",
            });
          case "BR_INSS_EMPREGADO":
            return createMatchedDecision({
              selectedAccountId: "liab-employee-tax",
              journalRole: "liability",
              confidenceScore: 0.9,
              confidenceBand: "high",
              reasoning: "Employee withholdings map to tax liability.",
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
      approvalMemory: createEmptyApprovalMemory(),
      mappingEngine,
    });

    expect(result.reconciledLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineId: "uk-001",
          status: "anomaly",
          reasonCode: "invalid_decision",
        }),
        expect.objectContaining({
          lineId: "de-002",
          status: "anomaly",
          reasonCode: "no_match",
        }),
        expect.objectContaining({
          lineId: "gb-004",
          status: "anomaly",
          reasonCode: "low_confidence",
        }),
      ]),
    );
    expect(result.anomalies).toHaveLength(3);
  });
});
