import { get as getBlob, put as putBlob } from "@vercel/blob";
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
const DEFAULT_APPROVALS_BLOB_PATH = "deelsorted/approved-mappings.json";
const APPROVALS_FILE_PATH_ENV = "DEELSORTED_APPROVALS_FILE_PATH";
const APPROVALS_BLOB_PATH_ENV = "DEELSORTED_APPROVALS_BLOB_PATH";
const APPROVAL_STORAGE_ENV = "DEELSORTED_APPROVAL_STORAGE";
const BLOB_READ_WRITE_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";
const VERCEL_ENV = "VERCEL";
const MAX_BLOB_WRITE_ATTEMPTS = 3;

type ApprovalMemoryEnv = Readonly<Record<string, string | undefined>>;

export type ApprovedMappingLookup = Pick<
  PayrollLine,
  "countryCode" | "normalizedCode"
>;

export type ApprovalStorageMode = "file" | "blob";

export interface ApprovalMemory {
  listApprovedMappings(): Promise<Approval[]>;
  getApprovedMapping(input: ApprovedMappingLookup): Promise<Approval | null>;
  saveApprovedMapping(input: Approval): Promise<Approval>;
}

export type FileApprovalMemoryOptions = {
  filePath?: string;
};

type BlobReadResult = Awaited<ReturnType<typeof getBlob>>;

export type BlobApprovalMemoryClient = {
  get(pathname: string): Promise<BlobReadResult>;
  put(
    pathname: string,
    body: string,
    options?: {
      ifMatch?: string;
    },
  ): Promise<void>;
};

export type BlobApprovalMemoryOptions = {
  pathname?: string;
  client?: BlobApprovalMemoryClient;
  maxWriteAttempts?: number;
};

export type CreateApprovalMemoryFromEnvOptions = {
  env?: ApprovalMemoryEnv;
  blobClient?: BlobApprovalMemoryClient;
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

export function createBlobApprovalMemory(
  options: BlobApprovalMemoryOptions = {},
): ApprovalMemory {
  const pathname = options.pathname ?? getDefaultApprovalsBlobPath();
  const client = options.client ?? createDefaultBlobApprovalMemoryClient();
  const maxWriteAttempts = options.maxWriteAttempts ?? MAX_BLOB_WRITE_ATTEMPTS;

  return {
    async listApprovedMappings(): Promise<Approval[]> {
      const snapshot = await readApprovalsFromBlob(pathname, client);

      return snapshot.approvals;
    },

    async getApprovedMapping(
      input: ApprovedMappingLookup,
    ): Promise<Approval | null> {
      const snapshot = await readApprovalsFromBlob(pathname, client);

      return (
        snapshot.approvals.find(
          (approval) =>
            approval.countryCode === input.countryCode &&
            approval.normalizedCode === input.normalizedCode,
        ) ?? null
      );
    },

    async saveApprovedMapping(input: Approval): Promise<Approval> {
      const approval = ApprovalSchema.parse(input);

      for (let attempt = 1; attempt <= maxWriteAttempts; attempt += 1) {
        const snapshot = await readApprovalsFromBlob(pathname, client);
        const nextApprovals = upsertApproval(snapshot.approvals, approval);

        try {
          await client.put(
            pathname,
            `${JSON.stringify(nextApprovals, null, 2)}\n`,
            {
              ifMatch: snapshot.etag,
            },
          );

          return approval;
        } catch (error) {
          if (
            attempt < maxWriteAttempts &&
            isBlobPreconditionFailedError(error)
          ) {
            continue;
          }

          throw error;
        }
      }

      throw new Error("Could not save the approved mapping after repeated retries.");
    },
  };
}

export function createApprovalMemoryFromEnv(
  options: CreateApprovalMemoryFromEnvOptions = {},
): ApprovalMemory {
  const env = options.env ?? process.env;
  const mode = resolveApprovalStorageMode(env);

  if (mode === "blob") {
    validateBlobApprovalEnv(env);

    return createBlobApprovalMemory({
      pathname: getDefaultApprovalsBlobPath(env),
      client: options.blobClient,
    });
  }

  return createFileApprovalMemory({
    filePath: getDefaultApprovalsFilePath(env),
  });
}

export function resolveApprovalStorageMode(
  env: ApprovalMemoryEnv = process.env,
): ApprovalStorageMode {
  const configuredMode = env[APPROVAL_STORAGE_ENV]?.trim().toLowerCase();

  if (configuredMode === undefined || configuredMode.length === 0) {
    return env[VERCEL_ENV] === "1" ? "blob" : "file";
  }

  if (configuredMode === "file" || configuredMode === "blob") {
    return configuredMode;
  }

  throw new Error(
    `Set ${APPROVAL_STORAGE_ENV} to either "file" or "blob".`,
  );
}

function getDefaultApprovalsFilePath(
  env: ApprovalMemoryEnv = process.env,
): string {
  const override = env[APPROVALS_FILE_PATH_ENV];

  if (typeof override === "string" && override.trim().length > 0) {
    return override;
  }

  return DEFAULT_APPROVALS_FILE_PATH;
}

function getDefaultApprovalsBlobPath(
  env: ApprovalMemoryEnv = process.env,
): string {
  const override = env[APPROVALS_BLOB_PATH_ENV];

  if (typeof override === "string" && override.trim().length > 0) {
    return override;
  }

  return DEFAULT_APPROVALS_BLOB_PATH;
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

async function readApprovalsFromBlob(
  pathname: string,
  client: BlobApprovalMemoryClient,
): Promise<{
  approvals: Approval[];
  etag: string | undefined;
}> {
  const result = await client.get(pathname);

  if (!result) {
    return {
      approvals: [],
      etag: undefined,
    };
  }

  if (result.statusCode === 304) {
    throw new Error("Unexpected 304 response while reading approval memory.");
  }

  const fileContents = await readBlobStreamAsText(result.stream);

  if (fileContents.trim() === "") {
    return {
      approvals: [],
      etag: result.blob.etag,
    };
  }

  return {
    approvals: ApprovalStoreSchema.parse(JSON.parse(fileContents)),
    etag: result.blob.etag,
  };
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
  return `${approval.countryCode ?? "NO_COUNTRY"}:${approval.normalizedCode}`;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function createDefaultBlobApprovalMemoryClient(): BlobApprovalMemoryClient {
  return {
    async get(pathname: string): Promise<BlobReadResult> {
      return getBlob(pathname, {
        access: "private",
      });
    },

    async put(
      pathname: string,
      body: string,
      options?: {
        ifMatch?: string;
      },
    ): Promise<void> {
      await putBlob(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        ifMatch: options?.ifMatch,
      });
    },
  };
}

async function readBlobStreamAsText(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) {
    return "";
  }

  return new Response(stream).text();
}

function validateBlobApprovalEnv(env: ApprovalMemoryEnv): void {
  const blobToken = env[BLOB_READ_WRITE_TOKEN_ENV];

  if (typeof blobToken === "string" && blobToken.trim().length > 0) {
    return;
  }

  throw new Error(
    `Set ${BLOB_READ_WRITE_TOKEN_ENV} and connect a private Vercel Blob store before using blob-backed approval memory.`,
  );
}

function isBlobPreconditionFailedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "BlobPreconditionFailedError"
  );
}
