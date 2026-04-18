# Implementation Plan: DeelSorted G2N Ingestion and Flexible COA CSV Inputs

## Overview
This plan upgrades DeelSorted’s ingestion layer so the demo can truthfully center on Deel Global Payroll Gross-to-Net (G2N) inputs and more realistic COA uploads. The goal is to replace the repo’s current invented payroll upload shape with schema-faithful G2N JSON, keep reconciliation deterministic after normalization, and broaden COA CSV support through explicit header aliases rather than arbitrary file inference.

## Architecture Decisions
- Cut over fully to Deel G2N-style payroll JSON and remove the current legacy payroll upload path from supported inputs.
- Preserve the existing internal reconciliation pipeline, but normalize G2N items into `PayrollLine` records before retrieval and mapping.
- Use `contract_oid` as the primary source reference because the official G2N response does not document richer worker or cycle identifiers in the body.
- Interpret G2N `category_group` as the main stable grouping signal and treat other free-form item fields as raw source metadata.
- Support flexible COA CSV through explicit header aliases and sensible defaults; do not add “any CSV” or COA JSON support in this phase.
- Reject unsupported payroll JSON clearly and early, rather than transforming unknown schemas or involving AI in input structure inference.
- Rename the upload affordance to `Deel G2N JSON` so the supported payroll format is honest in the UI.

## Dependency Graph
```text
G2N schemas and fixtures
    |
    +-- Payroll normalization from G2N -> internal PayrollLine
            |
            +-- Route validation and upload UX copy
            |
            +-- Reconcile integration tests
    |
    +-- COA CSV alias parsing
            |
            +-- Route success/error coverage
                    |
                    +-- Docs sync and final verification
```

## Task List

### Phase 1: Payroll Input Foundation
- [ ] Task 1: Define Deel G2N upload schemas and replace payroll fixtures
- [ ] Task 2: Normalize G2N JSON into the internal payroll-line model

## Task 1: Define Deel G2N upload schemas and replace payroll fixtures

**Description:** Replace the repo’s current synthetic payroll upload contract with explicit Zod schemas for the documented Deel G2N response shape, and swap the fixture set to a schema-faithful mock G2N payload. This locks the new payroll truth before parser behavior changes.

**Acceptance criteria:**
- [ ] `src/types/reconcile.ts` defines G2N report, contract, and item schemas aligned to the documented response shape.
- [ ] `fixtures/payroll-sample.json` is replaced with a schema-faithful mock G2N payload.
- [ ] Parser/schema tests validate the new G2N fixture successfully.

**Verification:**
- [ ] Tests pass: `npm run test -- tests/unit/schemas-and-fixtures.test.ts tests/unit/parsers.test.ts`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: inspect the fixture and confirm its top-level keys match the documented G2N response envelope

**Dependencies:** None

**Files likely touched:**
- `src/types/reconcile.ts`
- `fixtures/payroll-sample.json`
- `fixtures/README.md`
- `tests/unit/schemas-and-fixtures.test.ts`
- `tests/unit/parsers.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 2: Normalize G2N JSON into the internal payroll-line model

**Description:** Implement a G2N payroll parser that converts `data[].items[]` into the internal `PayrollLine` records used by the reconcile engine. This task defines how `contract_oid`, `category_group`, raw labels, and raw categories flow into deterministic normalization.

**Acceptance criteria:**
- [ ] `parsePayrollJson` accepts schema-faithful G2N JSON and emits canonical `PayrollLine` records.
- [ ] Each normalized line uses `contract_oid` as the primary source reference and a deterministic derived line id.
- [ ] G2N grouping fields are preserved or translated consistently enough for retrieval and journal logic to continue working without invented source facts.

**Verification:**
- [ ] Tests pass: `npm run test -- tests/unit/parsers.test.ts tests/unit/normalize.test.ts`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: inspect a parsed G2N item and confirm source reference, currency, label, and normalized code look correct

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/parsers/payroll.ts`
- `src/features/reconcile/domain/normalize.ts`
- `src/types/reconcile.ts`
- `tests/unit/parsers.test.ts`
- `tests/unit/normalize.test.ts`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Payroll Foundation
- [ ] G2N JSON is now the only supported payroll input shape
- [ ] Parsed payroll lines still feed the existing reconcile engine
- [ ] Unit tests pass before touching the route or COA flexibility

### Phase 2: Route and COA Compatibility
- [ ] Task 3: Update reconcile route and upload UX for G2N-only payroll input
- [ ] Task 4: Add supported COA CSV header aliases

## Task 3: Update reconcile route and upload UX for G2N-only payroll input

**Description:** Update the upload route and UI copy so the app clearly communicates that payroll uploads must be Deel G2N JSON, and so unsupported JSON fails with precise messages. This makes the demo honest and keeps parser failures user-readable.

**Acceptance criteria:**
- [ ] The route returns a G2N-specific unsupported-shape error for valid JSON that is not supported payroll input.
- [ ] The upload UI labels the payroll input as `Deel G2N JSON`.
- [ ] Integration coverage exists for malformed JSON vs unsupported payroll schema.

**Verification:**
- [ ] Tests pass: `npm run test -- tests/integration/error-states.test.ts tests/integration/reconcile-route.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: upload unsupported JSON and confirm the UI error distinguishes syntax errors from unsupported schema errors

**Dependencies:** Task 2

**Files likely touched:**
- `app/api/reconcile/route.ts`
- `src/features/reconcile/ui/upload-form.tsx`
- `tests/integration/error-states.test.ts`
- `tests/integration/reconcile-route.test.ts`

**Estimated scope:** Medium: 3-4 files

## Task 4: Add supported COA CSV header aliases

**Description:** Expand the COA CSV parser so it accepts a curated set of header aliases and optional columns commonly found in ERP exports, while still validating into the same canonical account model. This broadens demo usability without pretending to accept arbitrary CSV files.

**Acceptance criteria:**
- [ ] The parser accepts canonical headers plus a documented alias set for core account columns.
- [ ] Optional fields such as `description` and `aliases` have safe defaults when omitted.
- [ ] Invalid or ambiguous CSVs still fail with clear parser errors.

**Verification:**
- [ ] Tests pass: `npm run test -- tests/unit/parsers.test.ts`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Manual check: parse one canonical fixture and one alias-header fixture successfully

**Dependencies:** None

**Files likely touched:**
- `src/lib/parsers/coa.ts`
- `src/types/reconcile.ts`
- `tests/unit/parsers.test.ts`
- `fixtures/coa-sample.csv`

**Estimated scope:** Medium: 3-4 files

### Checkpoint: Input Compatibility
- [ ] The app clearly supports G2N JSON and flexible COA CSV inputs
- [ ] Unsupported payroll JSON is rejected safely
- [ ] COA alias support works without weakening validation

### Phase 3: End-to-End Confidence and Docs
- [ ] Task 5: Reconcile G2N payroll through the full mocked integration flow
- [ ] Task 6: Sync docs and close out verification for the new ingestion story

## Task 5: Reconcile G2N payroll through the full mocked integration flow

**Description:** Update integration tests and any dependent result assumptions so the full upload -> reconcile -> inspect flow runs on G2N-derived payroll lines. This task proves the new ingestion path still ends in mapped/anomaly outcomes and balanced journal output.

**Acceptance criteria:**
- [ ] Route integration tests pass using the new G2N fixture.
- [ ] Results/downloads coverage still passes against G2N-derived reconciled lines.
- [ ] Approval-memory reuse still works with the new source reference strategy.

**Verification:**
- [ ] Tests pass: `npm run test -- tests/integration/reconcile-route.test.ts tests/integration/results-and-downloads.test.ts tests/integration/approval-flow.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run the fixture flow in the browser and confirm results render without schema errors

**Dependencies:** Tasks 3 and 4

**Files likely touched:**
- `tests/integration/reconcile-route.test.ts`
- `tests/integration/results-and-downloads.test.ts`
- `tests/integration/approval-flow.test.ts`
- `tests/integration/error-states.test.ts`

**Estimated scope:** Small: 3-4 files

## Task 6: Sync docs and close out verification for the new ingestion story

**Description:** Update repo docs so they truthfully describe G2N-only payroll input, flexible COA CSV support, and the new upload terminology. This keeps README/specs aligned with the implemented parser behavior.

**Acceptance criteria:**
- [ ] README explains that payroll uploads must be Deel G2N-style JSON.
- [ ] The spec/docs no longer describe the old legacy payroll upload shape as the supported path.
- [ ] Final command verification is recorded after the ingestion changes land.

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Lint succeeds: `npm run lint`
- [ ] Typecheck succeeds: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] Manual check: follow the README wording and confirm it matches the browser upload flow

**Dependencies:** Task 5

**Files likely touched:**
- `README.md`
- `docs/specs/deelsorted-v1-demo-spec.md`
- `docs/specs/deelsorted-g2n-ingestion-spec.md`
- `fixtures/README.md`

**Estimated scope:** Small: 3-4 files

### Checkpoint: Complete
- [ ] G2N JSON is the truthful supported payroll input
- [ ] Flexible COA CSV alias support is available
- [ ] Reconcile, results, approvals, and exports still work end-to-end
- [ ] Docs and verification reflect the new ingestion reality

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| G2N documented fields are missing data the internal pipeline currently assumes | High | Normalize missing source facts explicitly and avoid inventing them; use `contract_oid` as the stable reference |
| `category`, `sub_category`, and labels vary across countries | High | Bias normalization around `category_group` and preserve raw source strings for retrieval and audit |
| COA alias support becomes too permissive | Medium | Restrict aliases to a documented curated set and fail ambiguous inputs clearly |
| Removing the legacy payroll fixture breaks many existing tests at once | Medium | Replace fixture and parser behavior early, then update route/integration tests in a separate phase |
| UI wording still implies generic payroll JSON support | Medium | Rename the upload field and error copy before final docs sync |

## Parallelization Opportunities
- After Task 2, Task 3 and Task 4 can proceed in parallel because payroll route copy and COA alias parsing are mostly independent.
- Task 6 should wait for Task 5 because docs need the final implemented behavior.

## Open Questions
- None for this phase. Later follow-ups may cover live Deel API ingestion, worker enrichment endpoints, or JSON-based COA imports.
