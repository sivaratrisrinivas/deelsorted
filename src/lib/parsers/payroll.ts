import { buildPayrollLine } from "../../features/reconcile/domain/normalize";
import {
  DeelG2nReportSchema,
  type PayrollLine,
  type DeelG2nReport,
} from "../../types/reconcile";

export function parsePayrollJson(jsonText: string): PayrollLine[] {
  return parseDeelG2nReport(JSON.parse(jsonText));
}

export function parseDeelG2nReport(input: unknown): PayrollLine[] {
  const payrollReport = DeelG2nReportSchema.parse(input);

  return payrollReport.data.flatMap((contract) =>
    contract.items.map((item, itemIndex) =>
      buildPayrollLine(contract, item, itemIndex),
    ),
  );
}

export function parseDeelG2nReportObject(
  payrollReport: DeelG2nReport,
): PayrollLine[] {
  return parseDeelG2nReport(payrollReport);
}
