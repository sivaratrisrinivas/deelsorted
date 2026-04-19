import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReconcilePayrollResult } from "./reconcile";

export type DemoFixturePayload = {
  payrollFileName: string;
  payrollText: string;
  coaFileName: string;
  coaText: string;
  prewarmedResult: ReconcilePayrollResult;
};

const DEMO_PAYROLL_FILE_NAME = "payroll-1000-sample.json";
const DEMO_COA_FILE_NAME = "coa-large-sample.csv";
const DEMO_PREWARMED_RESULT_FILE_NAME = "payroll-1000-sample-prewarmed-result.json";

export async function loadDemoFixtures(): Promise<DemoFixturePayload> {
  const fixturesDir = join(process.cwd(), "fixtures");
  const [payrollText, coaText, prewarmedResultText] = await Promise.all([
    readFile(join(fixturesDir, DEMO_PAYROLL_FILE_NAME), "utf8"),
    readFile(join(fixturesDir, DEMO_COA_FILE_NAME), "utf8"),
    readFile(join(fixturesDir, DEMO_PREWARMED_RESULT_FILE_NAME), "utf8"),
  ]);

  return {
    payrollFileName: DEMO_PAYROLL_FILE_NAME,
    payrollText,
    coaFileName: DEMO_COA_FILE_NAME,
    coaText,
    prewarmedResult: JSON.parse(prewarmedResultText) as ReconcilePayrollResult,
  };
}
