import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  ApprovalSchema,
  ApprovalStoreSchema,
  type Approval,
  type PayrollLine,
} from "../../../types/reconcile";

const DEFAULT_APPROVALS_FILE_PATH = join(
  process.cwd(),
  "data",
  "approved-mappings.json",
);
const APPROVALS_FILE_PATH_ENV = "DEELSORTED_APPROVALS_FILE_PATH";

export type ApprovedMappingLookup = Pick<
  PayrollLine,
  "countryCode" | "normalizedCode"
>;

export interface ApprovalMemory {
  listApprovedMappings(): Promise<Approval[]>;
  getApprovedMapping(input: ApprovedMappingLookup): Promise<Approval | null>;
  saveApprovedMapping(input: Approval): Promise<Approval>;
}

export type FileApprovalMemoryOptions = {
  filePath?: string;
};

export function createFileApprovalMemory(
  options: FileApprovalMemoryOptions = {},
): ApprovalMemory {
  const filePath = options.filePath ?? getDefaultApprovalsFilePath();

  return {
    async listApprovedMappings(): Promise<Approval[]> {
      return readApprovalsFromFile(filePath);
    },

    async getApprovedMapping(
      input: ApprovedMappingLookup,
    ): Promise<Approval | null> {
      const approvals = await readApprovalsFromFile(filePath);

      return (
        approvals.find(
          (approval) =>
            approval.countryCode === input.countryCode &&
            approval.normalizedCode === input.normalizedCode,
        ) ?? null
      );
    },

    async saveApprovedMapping(input: Approval): Promise<Approval> {
      const approval = ApprovalSchema.parse(input);
      const approvals = await readApprovalsFromFile(filePath);
      const nextApprovals = upsertApproval(approvals, approval);

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(nextApprovals, null, 2)}\n`, "utf8");

      return approval;
    },
  };
}

function getDefaultApprovalsFilePath(): string {
  const override = process.env[APPROVALS_FILE_PATH_ENV];

  if (typeof override === "string" && override.trim().length > 0) {
    return override;
  }

  return DEFAULT_APPROVALS_FILE_PATH;
}

async function readApprovalsFromFile(filePath: string): Promise<Approval[]> {
  try {
    const fileContents = await readFile(filePath, "utf8");

    if (fileContents.trim() === "") {
      return [];
    }

    return ApprovalStoreSchema.parse(JSON.parse(fileContents));
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    throw error;
  }
}

function upsertApproval(
  approvals: readonly Approval[],
  approval: Approval,
): Approval[] {
  const nextApprovals = approvals.filter(
    (existingApproval) =>
      getApprovalKey(existingApproval) !== getApprovalKey(approval),
  );

  nextApprovals.push(approval);
  nextApprovals.sort((left, right) =>
    getApprovalKey(left).localeCompare(getApprovalKey(right)),
  );

  return nextApprovals;
}

function getApprovalKey(
  approval: Pick<Approval, "countryCode" | "normalizedCode">,
): string {
  return `${approval.countryCode}:${approval.normalizedCode}`;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
