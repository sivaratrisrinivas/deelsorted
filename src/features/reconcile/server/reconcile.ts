import { buildAuditTrailRows } from "../domain/export";
import { buildJournalResult, type JournalBuildResult } from "../domain/journal";
import { groupPayrollLinesByConcept } from "../domain/normalize";
import { DEFAULT_MIN_CONFIDENCE_SCORE } from "../../../lib/env/server";
import {
  AnomalousPayrollLineSchema,
  MappedPayrollLineSchema,
  type Approval,
  type AuditTrailRow,
  type CoaEntry,
  type PayrollLine,
  type ReconciledPayrollLine,
} from "../../../types/reconcile";
import type { GeminiMappingEngine } from "./gemini";
import type { ApprovalMemory } from "./memory";
import type { CandidateProvider } from "./retrieval";

export type MappingDecisionEngine = GeminiMappingEngine;

export type ReconcilePayrollInput = {
  payrollLines: readonly PayrollLine[];
  accounts: readonly CoaEntry[];
  candidateProvider: CandidateProvider;
  approvalMemory: ApprovalMemory;
  mappingEngine: MappingDecisionEngine;
  minimumConfidenceScore?: number;
  clearingAccountId?: string;
};

export type ReconcilePayrollResult = JournalBuildResult & {
  reconciledLines: ReconciledPayrollLine[];
  auditTrailRows: AuditTrailRow[];
};

export async function reconcilePayroll(
  input: ReconcilePayrollInput,
): Promise<ReconcilePayrollResult> {
  const minimumConfidenceScore =
    input.minimumConfidenceScore ?? DEFAULT_MIN_CONFIDENCE_SCORE;
  const accountsById = new Map(
    input.accounts.map((account) => [account.accountId, account]),
  );
  const reconciledByLineId = new Map<string, ReconciledPayrollLine>();

  for (const lines of groupPayrollLinesByConcept(input.payrollLines).values()) {
    const concept = lines[0]!;
    const approvedMapping = await input.approvalMemory.getApprovedMapping({
      countryCode: concept.countryCode,
      normalizedCode: concept.normalizedCode,
    });
    const resolvedLines = approvedMapping
      ? resolveApprovedConcept(lines, approvedMapping, accountsById)
      : await resolveUnapprovedConcept({
          lines,
          concept,
          accountsById,
          candidateProvider: input.candidateProvider,
          mappingEngine: input.mappingEngine,
          minimumConfidenceScore,
        });

    for (const line of resolvedLines) {
      reconciledByLineId.set(line.lineId, line);
    }
  }

  const reconciledLines = input.payrollLines.map((line) => {
    const reconciledLine = reconciledByLineId.get(line.lineId);

    if (!reconciledLine) {
      throw new Error(`Payroll line ${line.lineId} was not reconciled.`);
    }

    return reconciledLine;
  });
  const journalResult = buildJournalResult({
    reconciledLines,
    clearingAccount: findClearingAccount(input.accounts, input.clearingAccountId),
  });

  return {
    ...journalResult,
    reconciledLines,
    auditTrailRows: buildAuditTrailRows(reconciledLines),
  };
}

type ResolveUnapprovedConceptInput = {
  lines: readonly PayrollLine[];
  concept: PayrollLine;
  accountsById: ReadonlyMap<string, CoaEntry>;
  candidateProvider: CandidateProvider;
  mappingEngine: MappingDecisionEngine;
  minimumConfidenceScore: number;
};

async function resolveUnapprovedConcept(
  input: ResolveUnapprovedConceptInput,
): Promise<ReconciledPayrollLine[]> {
  const candidates = await input.candidateProvider.shortlistCandidates({
    concept: input.concept,
  });

  if (candidates.length === 0) {
    return input.lines.map((line) =>
      createAnomalyLine(line, {
        reasonCode: "no_candidate",
        reasoning: `No candidate GL accounts were found for ${line.rawCode}.`,
      }),
    );
  }

  try {
    const decision = await input.mappingEngine.mapConcept({
      concept: input.concept,
      candidates,
    });

    if (decision.isAnomaly) {
      return input.lines.map((line) =>
        createAnomalyLine(line, {
          reasonCode: "no_match",
          reasoning: decision.reasoning,
          confidenceScore: decision.confidenceScore,
          confidenceBand: decision.confidenceBand,
        }),
      );
    }

    if (
      decision.confidenceBand === "low" ||
      decision.confidenceScore < input.minimumConfidenceScore
    ) {
      return input.lines.map((line) =>
        createAnomalyLine(line, {
          reasonCode: "low_confidence",
          reasoning: decision.reasoning,
          confidenceScore: decision.confidenceScore,
          confidenceBand: decision.confidenceBand,
        }),
      );
    }

    const selectedAccount = input.accountsById.get(decision.selectedAccountId);

    if (!selectedAccount) {
      return input.lines.map((line) =>
        createAnomalyLine(line, {
          reasonCode: "invalid_decision",
          reasoning: `Selected account ${decision.selectedAccountId} is missing from the chart of accounts.`,
          confidenceScore: decision.confidenceScore,
          confidenceBand: decision.confidenceBand,
        }),
      );
    }

    return input.lines.map((line) =>
      createMappedLine(line, {
        selectedAccount,
        journalRole: decision.journalRole,
        confidenceScore: decision.confidenceScore,
        confidenceBand: decision.confidenceBand,
        reasoning: decision.reasoning,
        mappingSource: "model",
      }),
    );
  } catch (error) {
    return input.lines.map((line) =>
      createAnomalyLine(line, {
        reasonCode: "invalid_decision",
        reasoning: getErrorMessage(error),
      }),
    );
  }
}

function resolveApprovedConcept(
  lines: readonly PayrollLine[],
  approval: Approval,
  accountsById: ReadonlyMap<string, CoaEntry>,
): ReconciledPayrollLine[] {
  const selectedAccount = accountsById.get(approval.selectedAccountId);

  if (!selectedAccount) {
    return lines.map((line) =>
      createAnomalyLine(line, {
        reasonCode: "invalid_decision",
        reasoning: `Approved mapping references missing account ${approval.selectedAccountId}.`,
        confidenceScore: approval.confidenceScore,
        confidenceBand: approval.confidenceBand,
      }),
    );
  }

  return lines.map((line) =>
    createMappedLine(line, {
      selectedAccount,
      journalRole: approval.journalRole,
      confidenceScore: approval.confidenceScore,
      confidenceBand: approval.confidenceBand,
      reasoning: approval.rationale,
      mappingSource: "memory",
    }),
  );
}

function createMappedLine(
  line: PayrollLine,
  input: {
    selectedAccount: CoaEntry;
    journalRole: "expense" | "liability";
    confidenceScore: number;
    confidenceBand: "low" | "medium" | "high";
    reasoning: string;
    mappingSource: "model" | "memory";
  },
): ReconciledPayrollLine {
  return MappedPayrollLineSchema.parse({
    ...line,
    status: "mapped",
    selectedAccountId: input.selectedAccount.accountId,
    selectedAccountCode: input.selectedAccount.accountCode,
    selectedAccountName: input.selectedAccount.name,
    confidenceScore: input.confidenceScore,
    confidenceBand: input.confidenceBand,
    reasoning: input.reasoning,
    journalRole: input.journalRole,
    mappingSource: input.mappingSource,
  });
}

function createAnomalyLine(
  line: PayrollLine,
  input: {
    reasonCode:
      | "no_candidate"
      | "no_match"
      | "low_confidence"
      | "invalid_decision"
      | "unsupported_input";
    reasoning: string;
    confidenceScore?: number;
    confidenceBand?: "low" | "medium" | "high";
  },
): ReconciledPayrollLine {
  return AnomalousPayrollLineSchema.parse({
    ...line,
    status: "anomaly",
    reasonCode: input.reasonCode,
    reasoning: input.reasoning,
    confidenceScore: input.confidenceScore,
    confidenceBand: input.confidenceBand,
  });
}

function findClearingAccount(
  accounts: readonly CoaEntry[],
  clearingAccountId?: string,
): Pick<CoaEntry, "accountId" | "accountCode" | "name"> {
  if (clearingAccountId) {
    const explicitAccount = accounts.find(
      (account) => account.accountId === clearingAccountId,
    );

    if (!explicitAccount) {
      throw new Error(`Clearing account ${clearingAccountId} was not found.`);
    }

    return explicitAccount;
  }

  const defaultAccount =
    accounts.find((account) => account.accountId === "liab-payroll-clearing") ??
    accounts.find((account) =>
      account.aliases.some((alias) => alias.toLowerCase().includes("clearing")),
    ) ??
    accounts.find((account) => account.name.toLowerCase().includes("clearing"));

  if (!defaultAccount) {
    throw new Error("No payroll clearing account was found in the chart of accounts.");
  }

  return defaultAccount;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Gemini mapping failed with an unknown error.";
}
