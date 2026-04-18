import { ZodError } from "zod";
import { reconcilePayroll } from "../../../src/features/reconcile/server/reconcile";
import { createLocalCandidateProvider } from "../../../src/features/reconcile/server/retrieval";
import { createRuntimeReconcileDependencies } from "../../../src/features/reconcile/server/runtime";
import { parseCoaCsv } from "../../../src/lib/parsers/coa";
import { parsePayrollJson } from "../../../src/lib/parsers/payroll";

export const runtime = "nodejs";

class InvalidUploadError extends Error {}

const uploadLabels = {
  payrollFile: "Deel G2N JSON",
  coaFile: "COA CSV",
} as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const payrollText = await readUploadedFile(formData, "payrollFile");
    const coaText = await readUploadedFile(formData, "coaFile");
    const payrollLines = parseUploadedPayroll(payrollText);
    const accounts = parseUploadedCoa(coaText);
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
  fieldName: keyof typeof uploadLabels,
): Promise<string> {
  const entry = formData.get(fieldName);

  if (!(entry instanceof File)) {
    throw new InvalidUploadError(
      `Upload a ${uploadLabels[fieldName]} file to continue.`,
    );
  }

  const text = await entry.text();

  if (text.trim() === "") {
    throw new InvalidUploadError(
      `Upload a non-empty ${uploadLabels[fieldName]} file to continue.`,
    );
  }

  return text;
}

function parseUploadedPayroll(payrollText: string) {
  try {
    return parsePayrollJson(payrollText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidUploadError("Deel G2N JSON must be valid JSON.");
    }

    if (error instanceof ZodError) {
      throw new InvalidUploadError(
        "Deel G2N JSON must match the supported Deel G2N payroll export shape.",
      );
    }

    throw error;
  }
}

function parseUploadedCoa(coaText: string) {
  try {
    return parseCoaCsv(coaText);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new InvalidUploadError(
        "COA CSV must match the supported chart-of-accounts format.",
      );
    }

    if (error instanceof Error) {
      if (error.message.startsWith("COA CSV parsing failed:")) {
        throw new InvalidUploadError(
          "COA CSV could not be parsed. Upload the supported chart-of-accounts CSV.",
        );
      }

      if (error.message === "COA CSV contained no account rows.") {
        throw new InvalidUploadError(
          "COA CSV must contain at least one account row.",
        );
      }
    }

    throw error;
  }
}

function getStatusCode(error: unknown): number {
  if (error instanceof InvalidUploadError) {
    return 400;
  }

  return 500;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error while reconciling uploaded files.";
}
