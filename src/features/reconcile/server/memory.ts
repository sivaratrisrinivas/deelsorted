import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ApprovalStoreSchema,
  type Approval,
  type PayrollLine,
} from "../../../types/reconcile";

const DEFAULT_APPROVALS_FILE_PATH = join(
  process.cwd(),
  "data",
  "approved-mappings.json",
);

export type ApprovedMappingLookup = Pick<
  PayrollLine,
  "countryCode" | "normalizedCode"
>;

export interface ApprovalMemory {
  listApprovedMappings(): Promise<Approval[]>;
  getApprovedMapping(input: ApprovedMappingLookup): Promise<Approval | null>;
}

export type FileApprovalMemoryOptions = {
  filePath?: string;
};

export function createFileApprovalMemory(
  options: FileApprovalMemoryOptions = {},
): ApprovalMemory {
  const filePath = options.filePath ?? DEFAULT_APPROVALS_FILE_PATH;

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
  };
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

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
