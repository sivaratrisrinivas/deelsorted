import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type DemoFixturePayload = {
  payrollFileName: string;
  payrollText: string;
  coaFileName: string;
  coaText: string;
};

const DEMO_PAYROLL_FILE_NAME = "payroll-sample.json";
const DEMO_COA_FILE_NAME = "coa-sample.csv";

export async function loadDemoFixtures(): Promise<DemoFixturePayload> {
  const fixturesDir = join(process.cwd(), "fixtures");
  const [payrollText, coaText] = await Promise.all([
    readFile(join(fixturesDir, DEMO_PAYROLL_FILE_NAME), "utf8"),
    readFile(join(fixturesDir, DEMO_COA_FILE_NAME), "utf8"),
  ]);

  return {
    payrollFileName: DEMO_PAYROLL_FILE_NAME,
    payrollText,
    coaFileName: DEMO_COA_FILE_NAME,
    coaText,
  };
}
