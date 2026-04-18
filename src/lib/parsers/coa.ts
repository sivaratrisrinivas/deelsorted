import Papa from "papaparse";
import {
  CoaCsvRowSchema,
  CoaEntrySchema,
  type CoaEntry,
  type CoaCsvRow,
} from "../../types/reconcile";

const COA_HEADER_ALIASES = {
  accountId: ["accountId", "account_id", "id"],
  accountCode: [
    "accountCode",
    "account_code",
    "code",
    "account_number",
    "account number",
    "gl_code",
    "gl code",
  ],
  name: ["name", "account_name", "account name"],
  description: [
    "description",
    "account_description",
    "account description",
  ],
  type: ["type", "account_type", "account type"],
  normalSide: [
    "normalSide",
    "normal_side",
    "normal_balance",
    "normal balance",
  ],
  aliases: ["aliases", "alias", "search_terms", "search terms", "keywords"],
} satisfies Record<keyof CoaCsvRow, string[]>;

const REQUIRED_COA_COLUMNS = [
  "accountId",
  "accountCode",
  "name",
  "type",
  "normalSide",
] as const satisfies ReadonlyArray<keyof CoaCsvRow>;

const HEADER_ALIAS_LOOKUP = buildHeaderAliasLookup();

export function parseCoaCsv(csvText: string): CoaEntry[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });

  if (result.errors.length > 0) {
    throw new Error(formatCsvErrors(result.errors));
  }

  const columnMapping = resolveColumnMapping(result.meta.fields ?? []);
  const accounts = result.data.map((row) =>
    parseCoaRow(normalizeCoaRow(row, columnMapping)),
  );

  if (accounts.length === 0) {
    throw new Error("COA CSV contained no account rows.");
  }

  return accounts;
}

function parseCoaRow(row: Partial<Record<keyof CoaCsvRow, string>>): CoaEntry {
  const parsedRow: CoaCsvRow = CoaCsvRowSchema.parse(row);

  return CoaEntrySchema.parse({
    ...parsedRow,
    aliases: splitAliases(parsedRow.aliases),
  });
}

function splitAliases(aliases: string): string[] {
  return aliases
    .split("|")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function normalizeCoaRow(
  row: Record<string, string>,
  columnMapping: ReadonlyMap<keyof CoaCsvRow, string>,
): Partial<Record<keyof CoaCsvRow, string>> {
  const normalizedRow: Partial<Record<keyof CoaCsvRow, string>> = {};

  for (const [canonicalColumn, sourceColumn] of columnMapping) {
    normalizedRow[canonicalColumn] = row[sourceColumn] ?? "";
  }

  return normalizedRow;
}

function resolveColumnMapping(
  headers: readonly string[],
): ReadonlyMap<keyof CoaCsvRow, string> {
  const mapping = new Map<keyof CoaCsvRow, string>();

  for (const header of headers) {
    const canonicalColumn = HEADER_ALIAS_LOOKUP.get(normalizeHeader(header));

    if (!canonicalColumn) {
      continue;
    }

    const existingHeader = mapping.get(canonicalColumn);

    if (existingHeader && existingHeader !== header) {
      throw new Error(
        `COA CSV parsing failed: multiple columns map to ${canonicalColumn}: ${existingHeader}, ${header}.`,
      );
    }

    mapping.set(canonicalColumn, header);
  }

  const missingColumns = REQUIRED_COA_COLUMNS.filter(
    (column) => !mapping.has(column),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `COA CSV parsing failed: missing required columns: ${missingColumns.join(", ")}.`,
    );
  }

  return mapping;
}

function buildHeaderAliasLookup(): Map<string, keyof CoaCsvRow> {
  const lookup = new Map<string, keyof CoaCsvRow>();

  for (const [canonicalColumn, aliases] of Object.entries(COA_HEADER_ALIASES) as [
    keyof CoaCsvRow,
    string[],
  ][]) {
    for (const alias of aliases) {
      lookup.set(normalizeHeader(alias), canonicalColumn);
    }
  }

  return lookup;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatCsvErrors(errors: Papa.ParseError[]): string {
  return `COA CSV parsing failed: ${errors
    .map((error) => `${error.code} on row ${error.row ?? "unknown"}`)
    .join("; ")}`;
}
