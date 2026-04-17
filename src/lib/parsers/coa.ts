import Papa from "papaparse";
import {
  CoaCsvRowSchema,
  CoaEntrySchema,
  type CoaEntry,
  type CoaCsvRow,
} from "../../types/reconcile";

export function parseCoaCsv(csvText: string): CoaEntry[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });

  if (result.errors.length > 0) {
    throw new Error(formatCsvErrors(result.errors));
  }

  const accounts = result.data.map((row) => parseCoaRow(row));

  if (accounts.length === 0) {
    throw new Error("COA CSV contained no account rows.");
  }

  return accounts;
}

function parseCoaRow(row: Record<string, string>): CoaEntry {
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

function formatCsvErrors(errors: Papa.ParseError[]): string {
  return `COA CSV parsing failed: ${errors
    .map((error) => `${error.code} on row ${error.row ?? "unknown"}`)
    .join("; ")}`;
}
