# DeelSorted

DeelSorted is a demo-first payroll reconciliation app. It takes a messy payroll export from Deel, matches each line to the right general ledger account from a company's chart of accounts, and turns the result into a clean journal entry that finance can review and export.

## What it does

Deel payroll exports use payroll and tax labels that accountants usually do not work with directly. A few examples:

- `UK_NI_Employer_Contribution_Tier_1`
- `BR_INSS_Empregado`
- `DE_Sozialversicherung_AG_Anteil`

Accounting teams need those lines translated into the company's own chart of accounts, for example:

- `GL 5400: Payroll Taxes`
- `GL 6100: Employee Benefits`
- `GL 2200: Payroll Liabilities`

DeelSorted is being built to do that translation faster, with clear reasoning and a clean review flow.

## Why this exists

Today this work is often manual:

- someone downloads payroll data
- someone reads unfamiliar country-specific codes
- someone maps each line to a GL account
- someone builds the journal entry
- someone checks whether it balances

That is slow, repetitive, and easy to get wrong, especially when payroll spans several countries and currencies.

The goal of DeelSorted is to make the hard part easier without hiding uncertainty. When the app is confident, it should move quickly. When it is not, it should surface the line clearly and explain why it needs review.

## How the demo is meant to work

The first demo is intentionally narrow.

1. Upload one supported Deel-style payroll JSON file.
2. Upload one supported chart of accounts CSV file.
3. Click `Reconcile`.
4. The app cleans up the payroll labels into a simpler internal form.
5. The app finds the best account candidates.
6. Gemini chooses the best match from those candidates and returns structured output.
7. The app shows mapped lines, confidence, anomaly lines, and a balanced journal by currency.
8. The user downloads a journal CSV and an audit trail CSV.
9. Approved mapping decisions can be reused later.

## Why the design is trustworthy

AI is only used for the mapping decision.

The rest stays deterministic:

- file parsing
- payroll label cleanup
- journal building
- debit and credit balancing
- CSV generation
- anomaly handling

That split matters. The language problem is where AI helps. The accounting math stays under application control.

## What is in the repo today

This repo is no longer docs-only. It now contains:

- the idea write-up
- the v1 spec
- the implementation plan
- project rules in `AGENTS.md`
- source-backed implementation notes
- a project-specific TDD playbook
- a minimal Next.js App Router scaffold
- a working Vitest test harness
- fixture-backed reconciliation domain logic
- a server route for running reconciliation
- a server route for saving approved mappings
- a browser upload flow with mapped-line review, anomaly detail, CSV downloads, and approval actions

The core demo loop is now in place through Task 12 closeout, with the final verification snapshot recorded below.

## Current status

Status today: planning is complete, Tasks 1 through 12 are implemented, and the upload -> reconcile -> inspect -> download -> approve browser flow is wired up with explicit ready, loading, and error states.

What is already done:

- Next.js with TypeScript is set up
- ESLint is set up
- Vitest is set up
- the supported payroll JSON and COA CSV fixtures are in the repo
- parsing, normalization, retrieval, Gemini orchestration, journal building, and audit export helpers are implemented
- `/api/reconcile` accepts uploaded files and returns structured reconcile results
- `/api/approvals` persists confirmed mappings to local JSON storage
- the home page lets you upload the supported files, review mapped lines, inspect anomalies, download journal and audit trail CSVs, and approve confirmed mappings
- malformed or unsupported uploads fail with clear recoverable error messages instead of leaving the UI in an ambiguous state
- the reconcile form now shows explicit ready, loading, and stopped-safe error states during submission
- the results UI shows selected GL account, confidence, reasoning, and whether a mapping came from the model or approved memory
- approving a mapped line stores it for future reruns of the same normalized concept
- integration tests cover the results rendering, local approval persistence, approved-memory reuse flow, and invalid upload error states
- the app builds and serves locally in WSL
- the workspace-root warning from the unrelated WSL `pnpm-lock.yaml` is handled in `next.config.ts`

## How to run the project

Run every command from a WSL shell rooted at this repository:

```bash
npm install
npm run dev
```

Before running the Gemini-backed flow locally, create `.env.local` in the repo root with either:

```bash
GEMINI_API_KEY=your_key_here
```

or:

```bash
GOOGLE_API_KEY=your_key_here
```

Demo fixtures for the supported v1 upload flow live at:

- `fixtures/payroll-sample.json`
- `fixtures/coa-sample.csv`

Fixture field details are documented in `fixtures/README.md`.

Useful commands:

- `npm run dev` starts the app
- `npm run build` creates a production build
- `npm run lint` checks the code style rules through the WSL-safe runner in `scripts/run-eslint.mjs`
- `npm run typecheck` checks TypeScript
- `npm run test` runs the Vitest suite

## Current demo flow

Today the local demo supports this browser-visible slice:

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000`.
3. Upload `fixtures/payroll-sample.json`.
4. Upload `fixtures/coa-sample.csv`.
5. Click `Reconcile`.
6. Review the selected GL account, confidence, journal role, and reasoning for each mapped line.
7. Review anomalies in a separate panel with a human-readable reason.
8. Download the journal CSV and audit trail CSV for the completed run.
9. Approve any mapped line you want to reuse later.
10. Rerun reconciliation and see reused decisions marked as `Approved memory`.

The route currently depends on a server-side Gemini API key and returns structured JSON that the browser renders into the review and export UI. If an upload is missing, malformed, or unsupported, the app now keeps the page usable and shows a clear error state instead of stale results.

## Current implementation note

The checked-in Gemini runtime uses a small server-side Developer API client in `src/features/reconcile/server/runtime.ts` and passes its responses through the schema-validated mapping adapter in `src/features/reconcile/server/gemini.ts`. The approved spec still tracks `@google/genai` as the preferred SDK direction, but that package is not a current repository dependency.

## Next planned ingestion slice

The checked-in app still supports the current v1 demo upload contract today. The next planned ingestion phase will cut payroll uploads over to schema-faithful Deel G2N JSON and broaden COA support through explicit CSV header aliases instead of claiming support for arbitrary input files.

Those changes are planned in dedicated docs and are not yet implemented in the current browser flow:

- `docs/specs/deelsorted-g2n-ingestion-spec.md`
- `docs/specs/deelsorted-g2n-ingestion-plan.md`

## Verification snapshot

Final closeout verification is recorded from a WSL bash shell in this repository.

- Date: `2026-04-18`
- `npm run build` passed
- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed with `13` test files and `27` tests green
- Manual run check: `npm run dev -- --hostname 127.0.0.1 --port 3001` reached a ready Next.js server at `http://127.0.0.1:3001` in `2.7s`

## Planned v1 scope

The first version is meant to be a compelling demo, not a production accounting system.

In scope:

- one supported payroll JSON format
- one supported COA CSV format
- sample payroll data for multiple countries
- AI-assisted GL mapping
- confidence scores and anomaly handling
- balanced journal output by currency
- downloadable CSV outputs
- local reuse of approved mappings

Out of scope for v1:

- direct NetSuite, QuickBooks, or Workday integrations
- a multi-tenant database
- broad support for every Deel export shape
- automatic learning from unapproved decisions

## Planned stack

- Next.js with TypeScript for the app
- Gemini for mapping decisions
- Zod for shared schemas
- Vitest for tests
- local file-based memory first
- turbopuffer later, only after the core demo loop works well

## Project rules

These rules are guiding the build:

- keep the demo simple
- prefer one strong flow over broad feature coverage
- let AI choose mappings, but not accounting math
- keep uncertain lines visible instead of hiding them
- only reuse decisions a human has approved
- build the engine first, then the UI, then polish

## Key project documents

- Idea: [docs/ideas/deelsorted.md](docs/ideas/deelsorted.md)
- Spec: [docs/specs/deelsorted-v1-demo-spec.md](docs/specs/deelsorted-v1-demo-spec.md)
- Plan: [docs/specs/deelsorted-v1-demo-plan.md](docs/specs/deelsorted-v1-demo-plan.md)
- Next-phase G2N spec: [docs/specs/deelsorted-g2n-ingestion-spec.md](docs/specs/deelsorted-g2n-ingestion-spec.md)
- Next-phase G2N plan: [docs/specs/deelsorted-g2n-ingestion-plan.md](docs/specs/deelsorted-g2n-ingestion-plan.md)
- Project rules: [AGENTS.md](AGENTS.md)
- Source pack: [docs/references/deelsorted-source-pack.md](docs/references/deelsorted-source-pack.md)
- TDD playbook: [docs/references/deelsorted-tdd-playbook.md](docs/references/deelsorted-tdd-playbook.md)

## Important notes

- Do not use real payroll data in this repo.
- Do not commit secrets or API keys.
- This project is being built in small tested slices.
- Keep the README in sync with the code, spec, and plan as the project moves forward.
