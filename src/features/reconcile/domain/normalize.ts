import {
  PayrollLineSchema,
  type PayrollLine,
  type SupportedPayrollItem,
} from "../../../types/reconcile";

const EDGE_UNDERSCORE_PATTERN = /^_+|_+$/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Za-z0-9]+/g;

export function normalizePayrollCode(rawCode: string): string {
  return rawCode
    .trim()
    .replace(NON_ALPHANUMERIC_PATTERN, "_")
    .replace(EDGE_UNDERSCORE_PATTERN, "")
    .toUpperCase();
}

export function tokenizePayrollCode(rawCode: string): string[] {
  return normalizePayrollCode(rawCode).split("_").filter(Boolean);
}

export function buildPayrollLine(
  payrollRunId: string,
  item: SupportedPayrollItem,
): PayrollLine {
  const normalizedCode = normalizePayrollCode(item.code);

  return PayrollLineSchema.parse({
    lineId: item.itemId,
    sourceRef: `${payrollRunId}:${item.itemId}`,
    countryCode: item.countryCode,
    currency: item.currency,
    rawCode: item.code,
    rawLabel: item.label,
    normalizedCode,
    tokens: tokenizePayrollCode(item.code),
    amount: item.amount,
    section: item.category,
    partySide: inferPayrollPartySide(item.category),
  });
}

export function getPayrollConceptKey(
  line: Pick<PayrollLine, "countryCode" | "normalizedCode">,
): string {
  return `${line.countryCode}::${line.normalizedCode}`;
}

export function groupPayrollLinesByConcept(
  lines: readonly PayrollLine[],
): Map<string, PayrollLine[]> {
  const grouped = new Map<string, PayrollLine[]>();

  for (const line of lines) {
    const key = getPayrollConceptKey(line);
    const existing = grouped.get(key);

    if (existing) {
      existing.push(line);
      continue;
    }

    grouped.set(key, [line]);
  }

  return grouped;
}

function inferPayrollPartySide(
  category: SupportedPayrollItem["category"],
): "employee" | "employer" {
  if (category === "employer_taxes") {
    return "employer";
  }

  return "employee";
}
