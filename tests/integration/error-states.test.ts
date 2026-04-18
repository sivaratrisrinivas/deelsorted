import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "../../app/api/reconcile/route";
import { ErrorState } from "../../src/features/reconcile/ui/error-state";
import { LoadingState } from "../../src/features/reconcile/ui/loading-state";
import { UploadForm } from "../../src/features/reconcile/ui/upload-form";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

function createRequest(input: {
  payrollFile?: File;
  coaFile?: File;
}): Request {
  const formData = new FormData();

  if (input.payrollFile) {
    formData.set("payrollFile", input.payrollFile);
  }

  if (input.coaFile) {
    formData.set("coaFile", input.coaFile);
  }

  return new Request("http://localhost/api/reconcile", {
    method: "POST",
    body: formData,
  });
}

describe("Task 11 error states", () => {
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
      return;
    }

    process.env.GEMINI_API_KEY = originalGeminiApiKey;
  });

  it("returns a clear 400 when an expected upload is missing", async () => {
    const response = await POST(
      createRequest({
        coaFile: new File([loadFixture("coa-sample.csv")], "coa-sample.csv", {
          type: "text/csv",
        }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Upload a Deel G2N JSON file to continue.");
  });

  it("returns a clear 400 when payroll JSON is malformed", async () => {
    const response = await POST(
      createRequest({
        payrollFile: new File(["{not-valid-json"], "payroll-sample.json", {
          type: "application/json",
        }),
        coaFile: new File([loadFixture("coa-sample.csv")], "coa-sample.csv", {
          type: "text/csv",
        }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Deel G2N JSON must be valid JSON.");
  });

  it("returns a clear 400 when payroll JSON is valid but unsupported", async () => {
    const response = await POST(
      createRequest({
        payrollFile: new File(
          [JSON.stringify({ data: [], has_more: false })],
          "payroll-sample.json",
          {
            type: "application/json",
          },
        ),
        coaFile: new File([loadFixture("coa-sample.csv")], "coa-sample.csv", {
          type: "text/csv",
        }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Deel G2N JSON must match the supported Deel G2N payroll export shape.",
    );
  });

  it("returns a clear 400 when the COA CSV shape is unsupported", async () => {
    const response = await POST(
      createRequest({
        payrollFile: new File(
          [loadFixture("payroll-sample.json")],
          "payroll-sample.json",
          {
            type: "application/json",
          },
        ),
        coaFile: new File(
          ["wrong,columns\nvalue,here"],
          "coa-sample.csv",
          {
            type: "text/csv",
          },
        ),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "COA CSV could not be parsed. Upload the supported chart-of-accounts CSV.",
    );
  });

  it("renders explicit empty, loading, and error states", () => {
    const emptyStateHtml = renderToStaticMarkup(createElement(UploadForm));
    const loadingStateHtml = renderToStaticMarkup(createElement(LoadingState));
    const errorStateHtml = renderToStaticMarkup(
      createElement(ErrorState, {
        message: "Deel G2N JSON must be valid JSON.",
      }),
    );

    expect(emptyStateHtml).toContain("Chart of Accounts");
    expect(emptyStateHtml).toContain("Deel G2N JSON");
    expect(loadingStateHtml).toContain("Reconciling the ledger...");
    expect(loadingStateHtml).toContain(
      "Executing AI-assisted mapping and validating accounting structures.",
    );
    expect(errorStateHtml).toContain("Process Interrupted");
    expect(errorStateHtml).toContain("Deel G2N JSON must be valid JSON.");
  });
});
