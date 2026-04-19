import { ZodError } from "zod";
import { createApprovalMemoryFromEnv } from "../../../src/features/reconcile/server/memory";
import {
  ApprovalInputSchema,
  ApprovalSchema,
} from "../../../src/types/reconcile";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = ApprovalInputSchema.parse(await request.json());
    const approval = ApprovalSchema.parse({
      ...payload,
      status: "confirmed",
      approvedAt: createApprovalTimestamp(),
    });
    const savedApproval = await createApprovalMemoryFromEnv().saveApprovedMapping(
      approval,
    );

    return Response.json(savedApproval);
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

function createApprovalTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function getStatusCode(error: unknown): number {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return 400;
  }

  return 500;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error while saving the approved mapping.";
}
