import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ResultsSummary,
  type ReconcileResultPayload,
} from "../../src/features/reconcile/ui/results-summary";
import {
  type MappingDecisionEngine,
  reconcilePayroll,
} from "../../src/features/reconcile/server/reconcile";
import { createLocalCandidateProvider } from "../../src/features/reconcile/server/retrieval";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import type {
  Approval,
  CoaEntry,
  ModelMappingDecision,
  PayrollLine,
} from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("ResultsSummary", () => {
  it("renders G2N-derived mapped details, anomaly detail, and CSV download links", async () => {
    const result = await createReconcileResult();
    const html = renderToStaticMarkup(
      createElement(ResultsSummary, {
        result,
      }),
    );

    expect(html).toContain("Analysis Complete");
    expect(html).toContain("Gross Pay");
    expect(html).toContain("5000 Payroll Salaries");
    expect(html).toContain("High (98%)");
    expect(html).toContain("Gross pay is salary expense.");
    expect(html).toContain("Hard Failures");
    expect(html).toContain("Wage Tax");
    expect(html).toContain("Low confidence mapping");
    expect(html).toContain("Wage tax looks payable, but confidence stayed low.");
    expect(html).toContain("Export Journal CSV");
    expect(html).toContain("Export Audit Trail");
    expect(html).toContain("Approve Mapping");

    const journalHref = extractDownloadHref(html, "deelsorted-journal.csv");
    const auditHref = extractDownloadHref(html, "deelsorted-audit-trail.csv");

    expect(decodeCsvDataUri(journalHref)).toContain(
      "currency,accountCode,accountName,side,amount,memo",
    );
    expect(decodeCsvDataUri(journalHref)).toContain("5000,Payroll Salaries");
    expect(decodeCsvDataUri(journalHref)).toContain("2200,Payroll Clearing");
    expect(decodeCsvDataUri(auditHref)).toContain(
      "lineId,sourceRef,countryCode,currency,rawCode",
    );
    expect(decodeCsvDataUri(auditHref)).toContain("contract-de-001");
    expect(decodeCsvDataUri(auditHref)).toContain("DEDUCTIONS_WAGE_TAX");
    expect(decodeCsvDataUri(auditHref)).toContain("low_confidence");
  });
});

async function createReconcileResult(): Promise<ReconcileResultPayload> {
  const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
  const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
  const candidateProvider = createLocalCandidateProvider(accounts);
  const mappingEngine: MappingDecisionEngine = {
    async mapConcept({ concept }) {
      switch (concept.normalizedCode) {
        case "EARNINGS_GROSS_PAY":
          return createMatchedDecision({
            selectedAccountId: "exp-payroll-salary",
            journalRole: "expense",
            confidenceScore: 0.98,
            confidenceBand: "high",
            reasoning: "Gross pay is salary expense.",
          });
        case "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1":
        case "EMPLOYER_COSTS_EMPLOYER_SOCIAL_INSURANCE":
          return createMatchedDecision({
            selectedAccountId: "exp-payroll-tax",
            journalRole: "expense",
            confidenceScore: 0.93,
            confidenceBand: "high",
            reasoning: "Employer payroll taxes map to payroll tax expense.",
          });
        case "DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION":
          return createMatchedDecision({
            selectedAccountId: "liab-employee-tax",
            journalRole: "liability",
            confidenceScore: 0.9,
            confidenceBand: "high",
            reasoning: "Employee withholdings map to tax liability.",
          });
        case "DEDUCTIONS_WAGE_TAX":
          return createMatchedDecision({
            selectedAccountId: "liab-employee-tax",
            journalRole: "liability",
            confidenceScore: 0.41,
            confidenceBand: "low",
            reasoning: "Wage tax looks payable, but confidence stayed low.",
          });
        case "NET_PAY_NET_SALARY":
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
    },
  };

  return reconcilePayroll({
    payrollLines,
    accounts,
    candidateProvider,
    approvalMemory: createEmptyApprovalMemory(),
    mappingEngine,
  });
}

function createEmptyApprovalMemory(): {
  listApprovedMappings: () => Promise<Approval[]>;
  getApprovedMapping: (input: {
    countryCode: PayrollLine["countryCode"];
    normalizedCode: PayrollLine["normalizedCode"];
  }) => Promise<Approval | null>;
  saveApprovedMapping: (input: Approval) => Promise<Approval>;
} {
  return {
    async listApprovedMappings() {
      return [];
    },
    async getApprovedMapping() {
      return null;
    },
    async saveApprovedMapping(input) {
      return input;
    },
  };
}

function createMatchedDecision(input: {
  selectedAccountId: CoaEntry["accountId"];
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

function extractDownloadHref(html: string, filename: string): string {
  const pattern = new RegExp(`download="${filename}"[^>]*href="([^"]+)"`);
  const match = html.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Missing download link for ${filename}.`);
  }

  return match[1];
}

function decodeCsvDataUri(uri: string): string {
  const prefix = "data:text/csv;charset=utf-8,";

  if (!uri.startsWith(prefix)) {
    throw new Error(`Unexpected CSV data URI: ${uri}`);
  }

  return decodeURIComponent(uri.slice(prefix.length));
}
