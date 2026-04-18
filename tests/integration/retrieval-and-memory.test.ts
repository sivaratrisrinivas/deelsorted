import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileApprovalMemory } from "../../src/features/reconcile/server/memory";
import { createLocalCandidateProvider } from "../../src/features/reconcile/server/retrieval";
import { parseCoaCsv } from "../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../src/lib/parsers/payroll";
import type { Approval } from "../../src/types/reconcile";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

describe("retrieval and memory", () => {
  it("shortlists the most relevant COA accounts for a payroll concept", async () => {
    const accounts = parseCoaCsv(loadFixture("coa-sample.csv"));
    const payrollLines = parsePayrollJson(loadFixture("payroll-sample.json"));
    const candidateProvider = createLocalCandidateProvider(accounts);

    const employerTaxCandidates = await candidateProvider.shortlistCandidates({
      concept: payrollLines[1]!,
      limit: 3,
    });
    const netPayCandidates = await candidateProvider.shortlistCandidates({
      concept: payrollLines[2]!,
      limit: 3,
    });

    expect(employerTaxCandidates[0]).toMatchObject({
      accountId: "exp-payroll-tax",
    });
    expect(employerTaxCandidates[0]?.matchedAliases).toEqual(
      expect.arrayContaining(["national insurance"]),
    );
    expect(employerTaxCandidates[0]?.matchedTokens).toEqual(
      expect.arrayContaining(["EMPLOYER", "NATIONAL", "INSURANCE"]),
    );
    expect(netPayCandidates[0]).toMatchObject({
      accountId: "liab-net-pay",
    });
    expect(netPayCandidates[0]?.matchedAliases).toEqual(
      expect.arrayContaining(["net pay"]),
    );
    expect(netPayCandidates).toHaveLength(3);
  });

  it("reads confirmed approvals from the local memory file by concept key", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "deelsorted-memory-"));
    const memoryFilePath = join(tempDirectory, "approved-mappings.json");
    const approvals: Approval[] = [
      {
        normalizedCode: "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1",
        countryCode: null,
        selectedAccountId: "exp-payroll-tax",
        journalRole: "expense",
        confidenceScore: 0.98,
        confidenceBand: "high",
        rationale: "Reviewed and approved by finance.",
        status: "confirmed",
        approvedAt: "2026-04-17T05:00:00Z",
      },
    ];

    writeFileSync(memoryFilePath, JSON.stringify(approvals, null, 2));

    const memory = createFileApprovalMemory({ filePath: memoryFilePath });

    await expect(
      memory.getApprovedMapping({
        countryCode: null,
        normalizedCode: "EMPLOYER_COSTS_EMPLOYER_NATIONAL_INSURANCE_TIER_1",
      }),
    ).resolves.toMatchObject({
      selectedAccountId: "exp-payroll-tax",
      journalRole: "expense",
    });
    await expect(
      memory.getApprovedMapping({
        countryCode: null,
        normalizedCode: "DEDUCTIONS_INSS_EMPLOYEE_CONTRIBUTION",
      }),
    ).resolves.toBeNull();
  });

  it("uses the repository memory file as an empty safe default", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "deelsorted-memory-2-"));
    const memoryFilePath = join(tempDirectory, "approved-mappings.json");
    process.env.DEELSORTED_APPROVALS_FILE_PATH = memoryFilePath;

    const memory = createFileApprovalMemory();

    await expect(memory.listApprovedMappings()).resolves.toEqual([]);
  });
});
