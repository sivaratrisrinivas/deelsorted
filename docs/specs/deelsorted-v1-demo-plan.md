# Implementation Plan: DeelSorted V1 Demo

## Overview
This plan turns the approved DeelSorted v1 spec into a small, ordered set of implementation tasks. The goal is to ship one compelling demo flow: upload a supported Deel-style payroll JSON file and a COA CSV file, run a constrained AI-assisted reconciliation, review mapped lines and anomalies, and download balanced journal and audit CSVs. The plan deliberately avoids production concerns like databases, ERP integrations, or turbopuffer as a launch dependency.

## Architecture Decisions
- Start with a local retrieval adapter and local approved-mapping persistence instead of turbopuffer so the first end-to-end loop is fast to build and easy to debug.
- Keep the reconciliation domain pure and deterministic. Parsing, normalization, journal building, and CSV generation stay outside the UI and outside the Gemini adapter.
- Use Gemini only behind a server-side mapping interface that accepts candidate accounts and returns a schema-validated decision object.
- Deduplicate repeated normalized payroll concepts before invoking Gemini, then fan decisions back out to all matching raw lines in the run.
- Use route handlers for server interactions in v1 so uploads, approvals, and future exports have explicit network boundaries and are easy to integration-test.

## Dependency Graph
```text
Project scaffold and toolchain
    |
    +-- Canonical schemas and fixtures
            |
            +-- Parsers and normalization
            |       |
            |       +-- Journal builder and CSV export
            |
            +-- Retrieval and memory contracts
                    |
                    +-- Gemini mapping adapter
                            |
                            +-- Reconcile orchestrator
                                    |
                                    +-- Upload/reconcile UI
                                    |       |
                                    |       +-- CSV download UI
                                    |
                                    +-- Approval persistence UI
```

## Task List

### Phase 1: Project Foundation
- [ ] Task 1: Bootstrap the Next.js app shell and baseline scripts
- [ ] Task 2: Add the Vitest harness and test-ready project plumbing

## Task 1: Bootstrap the Next.js app shell and baseline scripts

**Description:** Create the initial Next.js App Router shell with the minimum config needed to run, build, lint, and typecheck the project. This task establishes the repository as a working application without yet implementing reconciliation behavior.

**Acceptance criteria:**
- [ ] The repository has a bootable Next.js app with `app/layout.tsx` and `app/page.tsx`.
- [ ] `package.json` includes `dev`, `build`, `start`, `lint`, and `typecheck` scripts.
- [ ] `npm run build`, `npm run lint`, and `npm run typecheck` can run against the scaffold.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Lint succeeds: `npm run lint`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: load the placeholder app in the browser with `npm run dev`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `app/layout.tsx`
- `app/page.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 2: Add the Vitest harness and test-ready project plumbing

**Description:** Add the test runner, shared test setup, and a smoke test so the repo can verify domain logic from the start. This task makes future slices safer by ensuring tests are part of the workflow before feature code arrives.

**Acceptance criteria:**
- [ ] `npm run test` executes Vitest successfully.
- [ ] A shared test setup file exists for future fixture and mock helpers.
- [ ] At least one smoke test passes in CI-like local conditions.

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Build still succeeds: `npm run build`
- [ ] Manual check: confirm the smoke test shows up in Vitest output

**Dependencies:** Task 1

**Files likely touched:**
- `package.json`
- `vitest.config.ts`
- `tests/setup.ts`
- `tests/unit/smoke.test.ts`
- `.gitignore`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Foundation
- [ ] `npm run build`, `npm run lint`, `npm run test`, and `npm run typecheck` all pass
- [ ] The repo is now a working app and test harness, not just docs
- [ ] Review with human before starting domain implementation

### Phase 2: Core Domain and Fixtures
- [ ] Task 3: Define canonical schemas and add demo fixtures
- [ ] Task 4: Implement payroll and COA parsing plus normalization
- [ ] Task 5: Implement journal building and CSV export helpers

## Task 3: Define canonical schemas and add demo fixtures

**Description:** Encode the approved spec in Zod schemas and add one supported payroll JSON fixture plus one supported COA CSV fixture. This locks the input and output contracts before any parsing or reconciliation logic is written.

**Acceptance criteria:**
- [ ] Shared schemas exist for payroll lines, COA entries, mapping decisions, anomalies, journal rows, and approvals.
- [ ] The demo payroll fixture and COA fixture are committed in version-control-safe form.
- [ ] Schema validation tests confirm the sample fixture payloads conform to the expected shapes.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "schema|fixture"`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: inspect the fixture files and confirm they match the v1 spec assumptions

**Dependencies:** Task 2

**Files likely touched:**
- `src/types/reconcile.ts`
- `fixtures/payroll-sample.json`
- `fixtures/coa-sample.csv`
- `fixtures/README.md`
- `tests/unit/schemas-and-fixtures.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 4: Implement payroll and COA parsing plus normalization

**Description:** Build the parsing layer that converts the supported fixture formats into canonical internal shapes, then add normalization helpers for payroll code tokenization and concept grouping. This is the first real business-logic slice and a prerequisite for both retrieval and journal construction.

**Acceptance criteria:**
- [ ] The payroll parser converts the supported JSON structure into canonical payroll lines with preserved raw fields.
- [ ] The COA parser converts the CSV into canonical GL account entries.
- [ ] Normalization derives a stable `normalizedCode` and token set for repeated concept grouping.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "parser|normalize"`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: run parsers against fixtures and inspect parsed output in a test snapshot or debug output

**Dependencies:** Task 3

**Files likely touched:**
- `src/lib/parsers/payroll.ts`
- `src/lib/parsers/coa.ts`
- `src/features/reconcile/domain/normalize.ts`
- `tests/unit/parsers.test.ts`
- `tests/unit/normalize.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 5: Implement journal building and CSV export helpers

**Description:** Build deterministic post-processing that turns mapped line decisions into per-currency journal rows and downloadable CSV content. This task ensures the demo’s accounting output is testable independently from the LLM step.

**Acceptance criteria:**
- [ ] The journal builder groups rows by currency and balances each currency within `0.01`.
- [ ] Audit trail rows preserve raw source data, selected account, confidence, and anomaly state.
- [ ] Journal and audit trail CSV helpers produce stable, testable output strings or blobs.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "journal|export"`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: inspect generated CSV output from fixture-backed tests

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/reconcile/domain/journal.ts`
- `src/features/reconcile/domain/export.ts`
- `tests/unit/journal.test.ts`
- `tests/unit/export.test.ts`

**Estimated scope:** Small: 1-2 files plus tests

### Checkpoint: Domain Core
- [ ] Fixture inputs parse successfully into canonical shapes
- [ ] Normalized concept grouping works for repeated payroll codes
- [ ] Journal and audit outputs can be generated without any UI
- [ ] Review with human before introducing AI integration

### Phase 3: Retrieval and Reconciliation Orchestration
- [ ] Task 6: Define retrieval and memory adapters with local implementations
- [ ] Task 7: Implement the Gemini mapping adapter and reconcile service

## Task 6: Define retrieval and memory adapters with local implementations

**Description:** Introduce the interfaces that future retrieval systems will implement, then provide local v1 adapters for candidate lookup and approved-mapping reads. This task keeps turbopuffer out of the critical path while preserving the intended architecture.

**Acceptance criteria:**
- [ ] Retrieval and memory interfaces are defined separately from the domain layer.
- [ ] A local candidate provider can shortlist relevant COA entries from parsed fixture data.
- [ ] A local memory adapter can read approved mappings from a JSON file shaped by the shared schemas.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "retrieval|memory"`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: inspect candidate shortlists for a few fixture payroll concepts in test output

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/reconcile/server/retrieval.ts`
- `src/features/reconcile/server/memory.ts`
- `data/approved-mappings.json`
- `tests/integration/retrieval-and-memory.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 7: Implement the Gemini mapping adapter and reconcile service

**Description:** Add the schema-constrained Gemini adapter plus the orchestration service that deduplicates normalized concepts, invokes mapping, fans decisions back out to raw lines, flags anomalies, and hands the results to the journal builder. This is the highest-risk slice and should land before UI work expands.

**Acceptance criteria:**
- [ ] The Gemini adapter validates model output against the shared mapping decision schema.
- [ ] The reconcile service deduplicates normalized concepts before invoking the adapter.
- [ ] Low-confidence, invalid, or `NO_MATCH` decisions are quarantined as anomalies instead of crashing the flow.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "reconcile|gemini"`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: run fixture-backed integration tests with a mocked Gemini client and inspect the resulting mapped and anomaly lines

**Dependencies:** Tasks 5 and 6

**Files likely touched:**
- `src/features/reconcile/server/gemini.ts`
- `src/features/reconcile/server/reconcile.ts`
- `src/lib/env/server.ts`
- `tests/integration/reconcile-service.test.ts`
- `tests/integration/gemini-adapter.test.ts`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Reconcile Engine
- [ ] The full reconcile flow works headlessly against fixtures with mocked Gemini responses
- [ ] Repeated concepts only trigger one model decision per run
- [ ] Anomaly quarantine works for low-confidence and invalid model output
- [ ] Review with human before UI wiring

### Phase 4: User-Facing Demo Flow
- [ ] Task 8: Add the upload and reconcile browser flow
- [ ] Task 9: Add result rendering, anomaly detail, and CSV downloads
- [ ] Task 10: Add approval persistence and reuse in the UI flow

## Task 8: Add the upload and reconcile browser flow

**Description:** Build the minimum UI and route-handler path that lets a user upload the payroll JSON and COA CSV, submit them to the reconcile service, and receive structured results in the browser. This is the first complete vertical slice visible to a human.

**Acceptance criteria:**
- [ ] The browser UI accepts one payroll JSON file and one COA CSV file.
- [ ] Submitting the form calls a server route that runs the reconcile service.
- [ ] The browser renders a basic results view instead of only logging data.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "route|upload"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run `npm run dev`, upload the fixture files, and confirm the result page loads

**Dependencies:** Task 7

**Files likely touched:**
- `app/page.tsx`
- `app/api/reconcile/route.ts`
- `src/features/reconcile/ui/upload-form.tsx`
- `src/features/reconcile/ui/results-summary.tsx`
- `tests/integration/reconcile-route.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 9: Add result rendering, anomaly detail, and CSV downloads

**Description:** Expand the UI so a user can inspect mapped lines and anomalies, then download journal and audit outputs from the completed run. This task turns the working engine into a demo with a visible payoff.

**Acceptance criteria:**
- [ ] The results UI shows selected GL account, confidence, and short reasoning for each line.
- [ ] Anomalies are visually separated and include a human-readable reason.
- [ ] The user can download both journal CSV and audit trail CSV from the browser.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "results|download|anomaly"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run the flow in the browser and verify both CSV files download correctly

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/reconcile/ui/results-table.tsx`
- `src/features/reconcile/ui/anomaly-panel.tsx`
- `src/features/reconcile/ui/download-actions.tsx`
- `app/page.tsx`
- `tests/integration/results-and-downloads.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 10: Add approval persistence and reuse in the UI flow

**Description:** Add the approval action that lets a human confirm a mapping decision, persist it locally, and reuse it in later runs. This task completes the v1 “memory” story without requiring a database or external vector store.

**Acceptance criteria:**
- [ ] A user can approve a mapping from the results UI.
- [ ] The approval is persisted to the local memory file through a server route.
- [ ] A later reconcile run reuses the approved mapping when the normalized concept matches.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "approval|memory"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: approve a mapping, rerun reconciliation, and confirm the approved mapping is reused

**Dependencies:** Tasks 6 and 9

**Files likely touched:**
- `app/api/approvals/route.ts`
- `src/features/reconcile/ui/approval-actions.tsx`
- `src/features/reconcile/server/memory.ts`
- `data/approved-mappings.json`
- `tests/integration/approval-flow.test.ts`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Demo Flow Complete
- [ ] A human can run the full upload -> reconcile -> inspect -> download -> approve loop in the browser
- [ ] Approved mappings survive a rerun and affect candidate selection
- [ ] The demo now satisfies the core spec success criteria
- [ ] Review with human before polish and cleanup

### Phase 5: Hardening and Closeout
- [ ] Task 11: Add error states, invalid-input handling, and model-failure safeguards
- [ ] Task 12: Sync developer docs and run final verification

## Task 11: Add error states, invalid-input handling, and model-failure safeguards

**Description:** Harden the UI and server path so unsupported files, malformed payloads, or invalid model responses fail clearly and safely. This task protects the demo from collapsing in front of a user when conditions are imperfect.

**Acceptance criteria:**
- [ ] Unsupported or malformed uploads show a clear error state in the UI.
- [ ] Invalid Gemini output is quarantined as an anomaly or surfaced as a recoverable failure.
- [ ] Loading and empty states are present so the flow never looks broken or ambiguous.

**Verification:**
- [ ] Tests pass: `npm run test -- --grep "error|invalid|loading"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: simulate at least one bad input and one invalid model response and verify the UI stays usable

**Dependencies:** Tasks 8 and 9

**Files likely touched:**
- `src/features/reconcile/ui/error-state.tsx`
- `src/features/reconcile/ui/loading-state.tsx`
- `src/features/reconcile/server/reconcile.ts`
- `app/page.tsx`
- `tests/integration/error-states.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 12: Sync developer docs and run final verification

**Description:** Update the repository docs so another engineer can run the app, understand the fixture formats, and verify the main commands. This closes the loop between spec, plan, and implementation with a clean handoff.

**Acceptance criteria:**
- [ ] The README explains how to install dependencies, run the app, run tests, and use the demo fixtures.
- [ ] The implemented project structure still matches the spec closely enough that the spec remains truthful.
- [ ] Final command verification is recorded and passes locally.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Lint succeeds: `npm run lint`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] Manual check: follow the README from a clean shell and confirm the app is runnable

**Dependencies:** Tasks 1 through 11

**Files likely touched:**
- `README.md`
- `docs/specs/deelsorted-v1-demo-spec.md`
- `docs/specs/deelsorted-v1-demo-plan.md`

**Estimated scope:** Small: 1-2 files plus verification

### Checkpoint: Complete
- [ ] All spec success criteria are satisfied
- [ ] All commands in the spec pass locally
- [ ] The browser demo is ready for review
- [ ] The human approves the plan outcomes before any extra scope is added

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The chosen Deel-style fixture shape differs materially from real export payloads | High | Keep the parser isolated and fixture-backed; validate with a real sample before widening support |
| Journal balancing rules are under-specified for some payroll concepts | High | Keep `journalRole` explicit in the mapping contract and quarantine ambiguous cases instead of guessing |
| Gemini output drifts or violates schema | High | Enforce strict schema validation, add mocked tests for failure cases, and treat invalid responses as anomalies |
| Local file persistence is awkward in some Next.js runtimes | Medium | Keep persistence behind a memory adapter so the storage mechanism can change without rewriting the feature |
| UI work grows too large before the engine is proven | Medium | Hold the major UI slice until the headless reconcile engine is working against fixtures and tests |

## Parallelization Opportunities
- After Task 3, parser work and fixture/schema test expansion can happen in parallel if contracts stay fixed.
- After Task 7, UI rendering work and approval-route work can be split, but only if the reconcile result contract is frozen first.
- CSV download UI and anomaly rendering are safe to parallelize once the base results shape is stable.

## Open Questions
- None blocking for the implementation plan. The main remaining decision gates are review checkpoints, not missing requirements.
