import { buildPayrollLine } from "../../features/reconcile/domain/normalize";
import {
  SupportedPayrollFileSchema,
  type PayrollLine,
  type SupportedPayrollFile,
} from "../../types/reconcile";

export function parsePayrollJson(jsonText: string): PayrollLine[] {
  return parseSupportedPayrollFile(JSON.parse(jsonText));
}

export function parseSupportedPayrollFile(input: unknown): PayrollLine[] {
  const payrollFile = SupportedPayrollFileSchema.parse(input);

  return payrollFile.items.map((item) =>
    buildPayrollLine(payrollFile.payrollRunId, item),
  );
}

export function parseSupportedPayrollObject(
  payrollFile: SupportedPayrollFile,
): PayrollLine[] {
  return parseSupportedPayrollFile(payrollFile);
}
