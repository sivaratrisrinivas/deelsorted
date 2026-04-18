import { loadDemoFixtures } from "../../../src/features/reconcile/server/demo-fixtures";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json(await loadDemoFixtures());
  } catch (error) {
    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error while loading sample fixtures.";
}
