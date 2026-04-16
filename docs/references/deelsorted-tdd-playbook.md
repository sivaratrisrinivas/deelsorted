# DeelSorted TDD Playbook

## Purpose
This document explains how to apply test-driven development to DeelSorted from the first line of implementation. It is not a generic testing note. It is the project-specific rulebook for how we prove the demo works.

The goal is simple:
- write a failing test first
- make it pass with the smallest useful implementation
- refactor only after the behavior is protected

## What TDD Means In This Project
DeelSorted is a good fit for TDD because the core value is behavior, not styling:

- parsing payroll input correctly
- normalizing messy payroll codes consistently
- choosing safe mapping states
- balancing journals correctly
- exporting trustworthy CSV output
- reusing only approved mapping memory

Those behaviors are all testable before the UI looks polished.

## Ground Rules
- Every new behavior gets a test before the implementation.
- No live Gemini API calls in automated tests.
- No real payroll data in fixtures.
- Prefer real implementations and in-memory fakes over heavy mocking.
- Route handlers and orchestration code get integration tests.
- Pure domain logic gets unit tests.
- Browser-only behavior can wait until the route and domain behavior are already protected.

## Test Pyramid For DeelSorted

### Unit tests: the majority
These should cover:
- payroll JSON parsing
- COA CSV parsing
- payroll code normalization
- concept grouping and deduplication
- journal building
- CSV export formatting
- schema validation behavior

Why:
- These are deterministic and fast.
- These are the places where financial trust is earned or lost.

### Integration tests: the next layer
These should cover:
- local retrieval adapter behavior
- local approved-mapping memory behavior
- reconcile service orchestration
- Gemini adapter behavior with mocked SDK responses
- route handlers for `/api/reconcile` and `/api/approvals`

Why:
- This is where boundaries meet.
- This is where schema validation, orchestration, and error handling can break even if unit tests are green.

### End-to-end tests: keep them few
These should cover only the critical demo path later:
- upload supported payroll JSON
- upload COA CSV
- run reconcile
- see mapped lines and anomalies
- download journal and audit CSV
- approve a mapping and confirm reuse on rerun

Why:
- The demo flow matters.
- But most correctness should already be proven before we get here.

## Mocking Rules

### Mock these
- Gemini SDK calls
- any future external retrieval service
- any future browser-only APIs that are slow or flaky in tests

### Prefer real or fake implementations for these
- parser functions
- normalization functions
- journal builder
- CSV export logic
- local memory storage behind a temporary file or in-memory fake
- local candidate retrieval logic

### Never test by asserting internal call sequences unless there is no better option
Bad:
- "it calls function X with argument Y"

Good:
- "it returns the expected mapped/anomaly state"
- "it balances journal rows by currency"
- "it persists only approved mappings"

## Fixture Rules
- Use one supported Deel-style payroll JSON fixture for the happy path.
- Use one supported COA CSV fixture for the happy path.
- Add small focused edge-case fixtures instead of one giant kitchen-sink fixture.
- Preserve raw source strings in fixtures so audit behavior is testable.
- Keep fixture names obvious.

Recommended fixture set:
- `fixtures/payroll-sample.json`
- `fixtures/coa-sample.csv`
- `fixtures/payroll-invalid-missing-field.json`
- `fixtures/coa-invalid-header.csv`
- `fixtures/approved-mappings-sample.json`

## First Failing Tests By Planned Task

### Task 1: Bootstrap the app shell
This task is mostly project setup, so TDD is light here.

Write first:
- a smoke test that proves the test runner executes at all

Expected first failing test:
- `tests/unit/smoke.test.ts`
  - `it("runs the test harness", () => { expect(true).toBe(true) })`

Why:
- It proves the testing loop exists before deeper behavior is added.

### Task 2: Add Vitest plumbing
Write first:
- a failing test that imports a tiny local helper that does not exist yet, then add the minimum project plumbing to run it

Expected first meaningful failing test:
- `tests/unit/project-boot.test.ts`
  - `it("can import local TypeScript modules under the test runner", ...)`

Why:
- It proves the repo is ready for actual TDD work.

### Task 3: Define schemas and fixtures
Write first:
- a schema test that fails because the shared schemas do not exist yet
- a fixture validation test that fails because the fixture files do not exist yet

First failing tests:
- `tests/unit/schemas-and-fixtures.test.ts`
  - `it("accepts the supported payroll sample fixture", ...)`
  - `it("accepts the supported COA sample fixture", ...)`
  - `it("rejects malformed payroll input", ...)`

Why:
- The shape of data is the foundation for every later behavior.

### Task 4: Implement parsers and normalization
Write first:
- a parser test for the supported payroll JSON fixture
- a parser test for the supported COA CSV fixture
- a normalization test for repeated country-specific codes

First failing tests:
- `tests/unit/parsers.test.ts`
  - `it("parses the supported Deel payroll fixture into canonical payroll lines", ...)`
  - `it("parses the supported COA CSV into canonical accounts", ...)`
- `tests/unit/normalize.test.ts`
  - `it("normalizes payroll codes into stable canonical concepts", ...)`
  - `it("preserves raw source values alongside normalized values", ...)`

Why:
- If we get parsing wrong, every later result is wrong in a believable but dangerous way.

### Task 5: Implement journal building and CSV export
Write first:
- a journal test that fails because the builder does not exist
- an export test that fails because the CSV formatter does not exist

First failing tests:
- `tests/unit/journal.test.ts`
  - `it("groups journal rows by currency and balances each currency", ...)`
  - `it("separates anomalies from mapped lines instead of forcing them into the journal", ...)`
- `tests/unit/export.test.ts`
  - `it("exports journal rows as stable CSV output", ...)`
  - `it("exports audit rows with raw code, selected account, confidence, and anomaly state", ...)`

Why:
- This is the accounting proof layer.

### Task 6: Implement retrieval and memory adapters
Write first:
- a retrieval test for shortlist behavior
- a memory test that proves only approved mappings are reused

First failing tests:
- `tests/integration/retrieval-and-memory.test.ts`
  - `it("returns candidate GL accounts for a normalized payroll concept", ...)`
  - `it("reads previously approved mappings from local storage", ...)`
  - `it("ignores unapproved or rejected mapping memory", ...)`

Why:
- This protects the trust boundary around reuse.

### Task 7: Implement Gemini adapter and reconcile service
Write first:
- a mocked Gemini adapter test that fails because the adapter does not exist
- a reconcile service test that proves repeated concepts are deduplicated before mapping

First failing tests:
- `tests/integration/gemini-adapter.test.ts`
  - `it("parses valid structured Gemini output into a mapping decision", ...)`
  - `it("rejects invalid model output", ...)`
- `tests/integration/reconcile-service.test.ts`
  - `it("maps repeated normalized concepts with a single model decision per concept", ...)`
  - `it("quarantines NO_MATCH or low-confidence decisions as anomalies", ...)`

Why:
- This is the highest-risk behavior in the app.

### Task 8: Add the upload and reconcile flow
Write first:
- a route test for `/api/reconcile`
- a minimal UI test for the upload form rendering

First failing tests:
- `tests/integration/reconcile-route.test.ts`
  - `it("accepts payroll and COA uploads and returns reconcile results", ...)`
  - `it("returns a clear validation error for unsupported input", ...)`

Why:
- The route should be proven before browser behavior is layered on top.

### Task 9: Add results rendering and downloads
Write first:
- a result rendering test
- a CSV download action test

First failing tests:
- `tests/integration/results-and-downloads.test.ts`
  - `it("renders mapped lines with account, confidence, and reasoning", ...)`
  - `it("renders anomalies separately from mapped lines", ...)`
  - `it("provides journal and audit CSV downloads", ...)`

Why:
- This is the visible demo payoff and should be behavior-proven, not eyeballed only.

### Task 10: Add approval persistence and reuse
Write first:
- an approval route test
- a rerun test showing approved memory reuse

First failing tests:
- `tests/integration/approval-flow.test.ts`
  - `it("persists an approved mapping decision", ...)`
  - `it("reuses an approved mapping on a later reconcile run", ...)`

Why:
- Memory is valuable only if it is safe and predictable.

### Task 11: Harden errors and loading states
Write first:
- an error-state test for invalid uploads
- an error-state test for invalid Gemini output

First failing tests:
- `tests/integration/error-states.test.ts`
  - `it("shows a clear error for malformed payroll input", ...)`
  - `it("shows a recoverable failure when model output is invalid", ...)`
  - `it("shows loading feedback while reconciliation is in progress", ...)`

Why:
- The demo should fail cleanly, not mysteriously.

### Task 12: Docs and verification
This task is mostly documentation, so TDD is not the main tool here.

Still verify:
- commands in the README match reality
- the documented fixture flow actually works

## Naming Rules For Tests
- Name tests by behavior, not by file or method alone.
- Prefer full sentence names.
- Keep one concept per test.

Good:
- `it("normalizes UK employer contribution codes into a stable concept key", ...)`
- `it("balances the journal independently for each currency", ...)`
- `it("does not reuse unapproved mapping memory", ...)`

Bad:
- `it("works", ...)`
- `it("handles parser", ...)`
- `it("test case 3", ...)`

## What Counts As RED In This Repo
A test counts as meaningfully red only if it fails for the behavior we actually need.

Good red:
- module does not exist yet
- expected journal rows are wrong
- invalid schema output is accepted when it should be rejected
- unapproved memory is reused when it should not be

Weak red:
- typo failure
- missing import unrelated to the behavior
- test is failing because the runner is not configured yet, long after setup tasks are complete

## Refactor Rules
Only refactor after:
- the new behavior is protected by tests
- the targeted tests are green

Safe refactors here:
- extracting shared normalization helpers
- reducing duplication in journal row builders
- extracting test fixture builders

Avoid:
- rewriting behavior while “cleaning up”
- broad folder churn unrelated to the current task
- changing parser rules and export rules in the same refactor

## Verification Loop
After each slice:
- run the narrowest useful test first
- then run the broader related test group
- then run typecheck or build once those commands exist

Suggested loop:
1. run the single test file for the behavior under change
2. run the relevant unit or integration test subset
3. run full `npm run test`
4. run `npm run typecheck`
5. run `npm run build`

Important:
- Until the app scaffold exists, these are target commands, not guaranteed commands.

## DeelSorted-Specific Anti-Patterns
- Writing the parser before writing the sample-fixture test
- Letting the model output shape drive the schema instead of the schema driving the model contract
- Using snapshots for financial output instead of asserting exact journal behavior
- Mocking the journal builder instead of testing the real journal math
- Treating anomaly handling as UI-only instead of behavior that needs tests
- Reusing approved-mapping memory without a test proving the approval gate

## Minimum Test Inventory For A Credible Demo
Before calling the demo trustworthy, we should have at least:
- 1 smoke test
- 3 schema and fixture tests
- 4 parser and normalization tests
- 4 journal and export tests
- 3 retrieval and memory tests
- 4 Gemini and reconcile integration tests
- 3 route and upload tests
- 3 results and downloads tests
- 2 approval persistence tests
- 3 error-state tests

That is not busywork. That is the proof layer behind the demo.

## Recommended Next Use
When implementation begins, combine this playbook with:
- `AGENTS.md`
- `docs/specs/deelsorted-v1-demo-spec.md`
- `docs/specs/deelsorted-v1-demo-plan.md`
- `docs/references/deelsorted-source-pack.md`

Suggested execution order after this:
1. use `incremental-implementation`
2. follow one planned task at a time
3. apply this TDD playbook inside each task
