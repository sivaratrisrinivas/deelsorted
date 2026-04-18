import {
  type DeelG2nContract,
  type DeelG2nItem,
  PayrollLineSchema,
  type PayrollLine,
} from "../../../types/reconcile";

const EDGE_UNDERSCORE_PATTERN = /^_+|_+$/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Za-z0-9]+/g;
const NO_COUNTRY_KEY = "NO_COUNTRY";

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
  contract: DeelG2nContract,
  item: DeelG2nItem,
  itemIndex: number,
): PayrollLine {
  const section = mapDeelG2nCategoryGroup(item.category_group);

  return PayrollLineSchema.parse({
    lineId: `${contract.contract_oid}:item-${itemIndex + 1}`,
    sourceRef: contract.contract_oid,
    countryCode: null,
    currency: contract.currency,
    rawCode: item.label,
    rawLabel: item.label,
    normalizedCode: normalizePayrollCode(
      `${item.category_group} ${item.label}`,
    ),
    tokens: buildPayrollTokens(item),
    amount: item.value,
    section,
    partySide: inferPayrollPartySide(section),
    rawCategory: item.category,
    rawSubCategory: item.sub_category,
    rawCategoryGroup: item.category_group,
  });
}

export function getPayrollConceptKey(
  line: Pick<PayrollLine, "countryCode" | "normalizedCode">,
): string {
  return `${line.countryCode ?? NO_COUNTRY_KEY}::${line.normalizedCode}`;
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

function buildPayrollTokens(item: DeelG2nItem): string[] {
  return dedupeTokens([
    ...tokenizePayrollCode(item.category_group),
    ...tokenizePayrollCode(item.label),
    ...tokenizePayrollCode(item.category),
    ...tokenizePayrollCode(item.sub_category),
  ]);
}

function dedupeTokens(tokens: readonly string[]): string[] {
  const seen = new Set<string>();

  return tokens.filter((token) => {
    if (seen.has(token)) {
      return false;
    }

    seen.add(token);
    return true;
  });
}

function inferPayrollPartySide(
  category: PayrollLine["section"],
): "employee" | "employer" {
  if (category === "employer_taxes") {
    return "employer";
  }

  return "employee";
}

function mapDeelG2nCategoryGroup(
  categoryGroup: DeelG2nItem["category_group"],
): PayrollLine["section"] {
  switch (normalizePayrollCode(categoryGroup)) {
    case "EARNINGS":
      return "earnings";
    case "DEDUCTIONS":
      return "employee_taxes";
    case "EMPLOYER_COSTS":
      return "employer_taxes";
    case "BENEFITS":
      return "benefits";
    case "NET_PAY":
      return "net_pay";
    default:
      throw new Error(
        `Unsupported Deel G2N category group: ${categoryGroup}.`,
      );
  }
}
