import { normalizePayrollCode } from "../domain/normalize";
import type { CoaEntry, PayrollLine } from "../../../types/reconcile";

const DEFAULT_CANDIDATE_LIMIT = 5;

export type CandidateLookupConcept = Pick<
  PayrollLine,
  "countryCode" | "normalizedCode" | "rawLabel" | "tokens" | "section" | "partySide"
>;

export type RetrievalCandidate = Pick<
  CoaEntry,
  "accountId" | "accountCode" | "name" | "description" | "type" | "normalSide"
> & {
  score: number;
  matchedTokens: string[];
  matchedAliases: string[];
};

export type ShortlistCandidatesInput = {
  concept: CandidateLookupConcept;
  limit?: number;
};

export interface CandidateProvider {
  shortlistCandidates(
    input: ShortlistCandidatesInput,
  ): Promise<RetrievalCandidate[]>;
}

type SearchableAccount = {
  account: CoaEntry;
  searchableTokens: Set<string>;
  normalizedAliases: Array<{
    original: string;
    normalized: string;
  }>;
};

export function createLocalCandidateProvider(
  accounts: readonly CoaEntry[],
): CandidateProvider {
  const indexedAccounts = accounts.map(indexAccount);

  return {
    async shortlistCandidates(
      input: ShortlistCandidatesInput,
    ): Promise<RetrievalCandidate[]> {
      return shortlistLocalCandidates(indexedAccounts, input);
    },
  };
}

function shortlistLocalCandidates(
  accounts: readonly SearchableAccount[],
  input: ShortlistCandidatesInput,
): RetrievalCandidate[] {
  const limit = input.limit ?? DEFAULT_CANDIDATE_LIMIT;
  const conceptTokens = buildConceptTokens(input.concept);
  const searchCorpus = buildSearchCorpus(input.concept);

  return accounts
    .map((account) => scoreCandidate(account, conceptTokens, searchCorpus, input))
    .filter((candidate): candidate is RetrievalCandidate => candidate !== null)
    .sort(compareCandidates)
    .slice(0, limit);
}

function scoreCandidate(
  account: SearchableAccount,
  conceptTokens: Set<string>,
  searchCorpus: string,
  input: ShortlistCandidatesInput,
): RetrievalCandidate | null {
  const matchedTokens = [...conceptTokens].filter((token) =>
    account.searchableTokens.has(token),
  );
  const matchedAliases = account.normalizedAliases
    .filter((alias) => searchCorpus.includes(alias.normalized))
    .map((alias) => alias.original);
  const score =
    matchedTokens.length +
    matchedAliases.length * 2 +
    getAccountTypeBias(input.concept, account.account);

  if (score <= 0) {
    return null;
  }

  return {
    accountId: account.account.accountId,
    accountCode: account.account.accountCode,
    name: account.account.name,
    description: account.account.description,
    type: account.account.type,
    normalSide: account.account.normalSide,
    score: Number(score.toFixed(2)),
    matchedTokens,
    matchedAliases,
  };
}

function getAccountTypeBias(
  concept: CandidateLookupConcept,
  account: CoaEntry,
): number {
  if (concept.section === "net_pay") {
    return account.type === "liability" ? 0.75 : 0;
  }

  if (concept.section === "employee_taxes") {
    return account.type === "liability" ? 0.5 : 0;
  }

  if (
    concept.section === "earnings" ||
    concept.section === "employer_taxes" ||
    concept.section === "benefits"
  ) {
    return account.type === "expense" ? 0.5 : 0;
  }

  return 0;
}

function compareCandidates(
  left: RetrievalCandidate,
  right: RetrievalCandidate,
): number {
  return (
    right.score - left.score ||
    right.matchedAliases.length - left.matchedAliases.length ||
    right.matchedTokens.length - left.matchedTokens.length ||
    left.accountCode.localeCompare(right.accountCode)
  );
}

function indexAccount(account: CoaEntry): SearchableAccount {
  const searchableTokens = new Set<string>(
    [
      ...tokenizeText(account.name),
      ...tokenizeText(account.description),
      ...account.aliases.flatMap((alias) => tokenizeText(alias)),
    ].filter(Boolean),
  );
  const normalizedAliases = account.aliases.map((alias) => ({
    original: alias,
    normalized: normalizePayrollCode(alias),
  }));

  return {
    account,
    searchableTokens,
    normalizedAliases,
  };
}

function buildConceptTokens(concept: CandidateLookupConcept): Set<string> {
  return new Set<string>(
    [
      ...concept.tokens,
      ...tokenizeText(concept.rawLabel),
      ...tokenizeText(concept.section),
      ...tokenizeText(concept.partySide),
    ].filter(Boolean),
  );
}

function buildSearchCorpus(concept: CandidateLookupConcept): string {
  return [
    concept.normalizedCode,
    normalizePayrollCode(concept.rawLabel),
    normalizePayrollCode(concept.section),
    normalizePayrollCode(concept.partySide),
  ].join("_");
}

function tokenizeText(value: string): string[] {
  return normalizePayrollCode(value).split("_").filter(Boolean);
}
