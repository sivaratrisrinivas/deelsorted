# Spec: DeelSorted V1 Demo

## Assumptions I'm Making
1. This is a web application built with Next.js and TypeScript, not a native desktop app.
2. V1 is a compelling local demo, not a production-grade accounting system or ERP integration.
3. The first supported inputs are exactly one Deel-style payroll JSON format and one COA CSV format.
4. The AI-assisted reconciliation runs server-side against Gemini; the UI remains local-facing but not fully offline.
5. Memory is persisted only from explicit human approvals and stored locally in a file for the demo.
6. Journal math, debit/credit balancing, and CSV export generation are deterministic and never delegated to AI.
7. Approval is recorded per normalized payroll concept, not per raw line occurrence.
8. A single clearing or payroll liability account is acceptable for the demo unless later requirements demand a more realistic payable split.

## Objective
Build a high-confidence demo that turns messy, multi-country Deel payroll line items into clean, balanced journal entries an accountant can understand and export.

Primary user:
- A finance or accounting operator responsible for monthly payroll reconciliation who understands GL accounts but not country-specific payroll tax code jargon.

Core user flow:
1. Upload a supported payroll JSON fixture.
2. Upload a supported COA CSV.
3. Click `Reconcile`.
4. Review mapped lines, confidence, and anomalies.
5. Download journal CSV and audit trail CSV.
6. Optionally approve anomaly resolutions so future runs reuse them.

Success for the demo means the product visibly transforms unfamiliar payroll codes into familiar accounting output with enough clarity that the user feels, "this saves real month-end work."

## Tech Stack
- Framework: Next.js App Router, TypeScript
- UI: React
- Schema validation: Zod
- LLM integration: Gemini behind a server-side client abstraction; `@google/genai` remains the planned SDK target, but the current repo uses a thin Developer API client in `src/features/reconcile/server/runtime.ts`
- Testing: Vitest
- CSV parsing: Papa Parse
- Storage for v1 memory: local JSON file in the repository or app data directory
- Retrieval architecture: pluggable interface with a local in-memory adapter first; turbopuffer adapter planned after the first demo loop proves out

## Commands
These are the current project commands:

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Test: `npm run test`
- Test coverage: `npm run test -- --coverage`
- Typecheck: `npm run typecheck`

## Project Structure
```text
app/                         -> Next.js App Router pages and route handlers
src/features/reconcile/ui/   -> Upload flow, results tables, anomaly review UI
src/features/reconcile/domain/ -> Pure domain logic: normalize, map contracts, journal build
src/features/reconcile/server/ -> Reconcile orchestration, Gemini client, memory adapter
src/lib/parsers/             -> Deel payroll JSON parser and COA CSV parser
src/lib/env/                 -> Environment variable validation
src/types/                   -> Shared TypeScript types and Zod schemas
data/                        -> Local persisted approved mappings for demo use
fixtures/                    -> Demo payroll JSON and COA CSV fixtures used by the supported v1 flow
tests/unit/                  -> Pure function tests for parsers, normalization, journal logic
tests/integration/           -> Reconcile pipeline tests with mocked Gemini responses
docs/ideas/                  -> Idea refinement artifacts
docs/specs/                  -> Specs, plans, and task breakdown documents
```

## Code Style
Use small, explicit, testable TypeScript modules. Prefer pure functions in `domain`, thin orchestration in `server`, and UI components that only render state instead of owning business logic.

```ts
import { z } from "zod";

export const PayrollLineSchema = z.object({
  lineId: z.string(),
  countryCode: z.string(),
  currency: z.string(),
  rawCode: z.string(),
  normalizedCode: z.string(),
  amount: z.number(),
});

export type PayrollLine = z.infer<typeof PayrollLineSchema>;

export function normalizePayrollCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}
```

Conventions:
- `PascalCase` for React components and schema objects.
- `camelCase` for functions, variables, and helpers.
- Keep domain modules framework-agnostic and free of file-system or network calls.
- Preserve the original source value alongside any normalized derivative.
- Prefer explicit return types for exported functions.
- Use ASCII unless the source data requires otherwise.

## Testing Strategy
- Framework: Vitest
- Unit tests live in `tests/unit/`
- Integration tests live in `tests/integration/`
- Core coverage target: at least 80% statement coverage for domain modules involved in parsing, normalization, mapping orchestration, and journal generation

Test levels:
- Unit tests:
  - payroll JSON parsing
  - COA CSV parsing
  - payroll code normalization
  - candidate selection contract shaping
  - journal aggregation and balance checks
  - CSV export formatting
- Integration tests:
  - end-to-end reconcile pipeline using fixture files and mocked Gemini responses
  - anomaly quarantine behavior when confidence is below threshold or no candidate is selected
  - approval persistence and reuse on subsequent runs

Rules:
- Never call the live Gemini API in automated tests.
- Use fixed fixture inputs and deterministic mocked model outputs.
- Journal balancing tests must assert per-currency totals balance within an absolute tolerance of `0.01`.

## Boundaries
- Always:
  - Validate uploaded files and parsed shapes before processing.
  - Keep AI output schema-constrained and validate it before use.
  - Preserve raw source fields in the audit trail.
  - Keep journal math deterministic and independently tested.
  - Quarantine uncertain mappings instead of forcing them through silently.
- Ask first:
  - Adding a database, auth, or multi-tenant support.
  - Adding turbopuffer as a runtime dependency for the first demo loop.
  - Expanding input support beyond the single JSON + single CSV shapes defined in this spec.
  - Adding hardcoded country-specific mapping rules or ERP-specific exports.
  - Changing the persistence model for approved mappings.
- Never:
  - Commit secrets, API keys, or real customer payroll data.
  - Let AI invent debit/credit math or balance the journal by itself.
  - Learn from unapproved mappings.
  - Suppress anomalies just to make the demo look cleaner.
  - Hide unsupported input cases behind silent fallback behavior.

## Success Criteria
- A user can upload one supported Deel-style payroll JSON file and one supported COA CSV file in the browser.
- Clicking `Reconcile` produces a result set where every payroll line ends in exactly one of two states: `mapped` or `anomaly`.
- The result view shows, for every line, the selected GL account, confidence score or band, and short reasoning.
- The system produces a journal grouped by currency that balances to zero per currency within `0.01`.
- The system produces two downloadable CSVs:
  - journal export
  - audit trail export
- Repeated instances of the same normalized payroll concept reuse a single mapping decision within a run.
- At least one human-approved mapping can be persisted locally and reused on a subsequent run.
- Unit and integration tests pass using mocked Gemini outputs.
- `npm run build`, `npm run lint`, `npm run test`, and `npm run typecheck` all pass before implementation is considered complete.

## Open Questions
- None blocking for the v1 spec. The current assumption is that the UI shows the final chosen account, confidence, and reasoning by default, with retrieved candidates available in a secondary detail view if needed.
