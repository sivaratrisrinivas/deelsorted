import { ZodError } from "zod";
import { reconcilePayroll } from "../../../src/features/reconcile/server/reconcile";
import { createLocalCandidateProvider } from "../../../src/features/reconcile/server/retrieval";
import { createRuntimeReconcileDependencies } from "../../../src/features/reconcile/server/runtime";
import { parseCoaCsv } from "../../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../../src/lib/parsers/payroll";

export const runtime = "nodejs";

class InvalidUploadError extends Error {}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const payrollText = await readUploadedFile(formData, "payrollFile");
    const coaText = await readUploadedFile(formData, "coaFile");
    const payrollLines = parsePayrollJson(payrollText);
    const accounts = parseCoaCsv(coaText);
    const candidateProvider = createLocalCandidateProvider(accounts);
    const runtimeDependencies = createRuntimeReconcileDependencies();
    const result = await reconcilePayroll({
      payrollLines,
      accounts,
      candidateProvider,
      approvalMemory: runtimeDependencies.approvalMemory,
      mappingEngine: runtimeDependencies.mappingEngine,
      minimumConfidenceScore: runtimeDependencies.minimumConfidenceScore,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: getStatusCode(error),
      },
    );
  }
}

async function readUploadedFile(
  formData: FormData,
  fieldName: string,
): Promise<string> {
  const entry = formData.get(fieldName);

  if (!(entry instanceof File)) {
    throw new InvalidUploadError(`Upload a ${fieldName} file to continue.`);
  }

  return entry.text();
}

function getStatusCode(error: unknown): number {
  if (
    error instanceof InvalidUploadError ||
    error instanceof SyntaxError ||
    error instanceof ZodError ||
    isCsvInputError(error)
  ) {
    return 400;
  }

  return 500;
}

function isCsvInputError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.startsWith("COA CSV parsing failed:") ||
      error.message === "COA CSV contained no account rows.")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error while reconciling uploaded files.";
}
