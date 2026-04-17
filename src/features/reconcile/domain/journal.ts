import {
  JournalRowSchema,
  type AnomalousPayrollLine,
  type CoaEntry,
  type JournalRow,
  type MappedPayrollLine,
  type ReconciledPayrollLine,
} from "../../../types/reconcile";

type BuildJournalResultInput = {
  reconciledLines: readonly ReconciledPayrollLine[];
  clearingAccount: Pick<CoaEntry, "accountId" | "accountCode" | "name">;
};

export type JournalBuildResult = {
  journalRows: JournalRow[];
  anomalies: AnomalousPayrollLine[];
};

const BALANCE_TOLERANCE = 0.005;

export function buildJournalResult(
  input: BuildJournalResultInput,
): JournalBuildResult {
  const journalRows: JournalRow[] = [];
  const anomalies: AnomalousPayrollLine[] = [];
  const mappedByCurrency = new Map<string, MappedPayrollLine[]>();

  for (const line of input.reconciledLines) {
    if (line.status === "anomaly") {
      anomalies.push(line);
      continue;
    }

    const existing = mappedByCurrency.get(line.currency);

    if (existing) {
      existing.push(line);
      continue;
    }

    mappedByCurrency.set(line.currency, [line]);
  }

  for (const [currency, mappedLines] of mappedByCurrency) {
    let debitTotal = 0;
    let creditTotal = 0;

    for (const line of mappedLines) {
      const row = createJournalRow(line);

      journalRows.push(row);

      if (row.side === "debit") {
        debitTotal += row.amount;
      } else {
        creditTotal += row.amount;
      }
    }

    const roundedDifference = roundCurrency(debitTotal - creditTotal);

    if (Math.abs(roundedDifference) > BALANCE_TOLERANCE) {
      journalRows.push(
        createClearingRow({
          currency,
          difference: roundedDifference,
          clearingAccount: input.clearingAccount,
        }),
      );
    }
  }

  return {
    journalRows,
    anomalies,
  };
}

function createJournalRow(line: MappedPayrollLine): JournalRow {
  return JournalRowSchema.parse({
    currency: line.currency,
    accountId: line.selectedAccountId,
    accountCode: line.selectedAccountCode,
    accountName: line.selectedAccountName,
    side: line.journalRole === "liability" ? "credit" : "debit",
    amount: roundCurrency(line.amount),
    memo: `${line.rawLabel} [${line.lineId}]`,
  });
}

function createClearingRow(input: {
  currency: string;
  difference: number;
  clearingAccount: Pick<CoaEntry, "accountId" | "accountCode" | "name">;
}): JournalRow {
  const side = input.difference > 0 ? "credit" : "debit";

  return JournalRowSchema.parse({
    currency: input.currency,
    accountId: input.clearingAccount.accountId,
    accountCode: input.clearingAccount.accountCode,
    accountName: input.clearingAccount.name,
    side,
    amount: roundCurrency(Math.abs(input.difference)),
    memo: `Payroll clearing [${input.currency}]`,
  });
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
