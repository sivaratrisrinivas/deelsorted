# Spec: DeelSorted G2N Ingestion and Flexible COA Inputs

## Assumptions I'm Making
1. This extends the current DeelSorted demo rather than replacing the whole architecture.
2. The primary payroll input for the next phase should be the official Deel Global Payroll Gross-to-Net (G2N) API response shape, uploaded as JSON rather than fetched live.
3. For demo purposes, schema-faithful mock G2N JSON is acceptable and preferred over live payroll data.
4. The product should remain trustworthy: unsupported payroll JSON should be rejected clearly, not silently reshaped by heuristics or an LLM.
5. The current internal mapping, journal building, anomaly handling, and export flow should remain deterministic.
6. COA ingestion should become more flexible, but not to the point of claiming support for arbitrary accounting exports without explicit field mapping rules.
7. Live Deel API integration, worker enrichment calls, and ERP writeback are out of scope for this spec unless explicitly added later.
8. The preserved legacy payroll fixture may stay in the repo as reference data, but it should not remain a supported upload path.

## Objective
Build a more credible and demo-ready ingestion layer for DeelSorted that:

- accepts uploaded JSON shaped like Deel Global Payroll G2N results
- accepts more flexible client COA inputs
- normalizes those inputs into the existing deterministic reconciliation pipeline
- rejects unsupported payroll JSON with actionable guidance instead of trying to infer arbitrary schemas

Primary user:
- A finance operator, implementation specialist, or solutions engineer evaluating whether Deel payroll outputs can be reconciled into a client ERP’s Chart of Accounts with minimal manual rule-writing

Core user flow:
1. Upload a supported Deel G2N-style JSON file.
2. Upload a supported COA CSV file.
3. Click `Reconcile`.
4. The app normalizes payroll lines and account records into its internal models.
5. Gemini performs semantic account mapping only after structural normalization succeeds.
6. The app shows mapped lines, anomalies, confidence, and exportable balanced journal output.

Success for this phase means the demo can honestly say:

> “We ingest schema-faithful Deel G2N payroll results and reconcile them into a client ledger using AI for semantic mapping and deterministic accounting logic for everything else.”

## Official Input References
- Deel API introduction: [https://developer.deel.com/api/introduction](https://developer.deel.com/api/introduction)
- Deel Global Payroll introduction: [https://developer.deel.com/api/global-payroll/introduction](https://developer.deel.com/api/global-payroll/introduction)
- Deel G2N endpoint reference: [https://developer.deel.com/api/reference/endpoints/reports/gets-g-2-n-report-data-for-a-given-payroll-cycle-by-its-id-v-2026-01-01](https://developer.deel.com/api/reference/endpoints/reports/gets-g-2-n-report-data-for-a-given-payroll-cycle-by-its-id-v-2026-01-01)

Documented G2N response fields we should support directly:
- `data`
- `data[].contract_oid`
- `data[].currency`
- `data[].payment_data`
- `data[].items`
- `data[].items[].label`
- `data[].items[].value`
- `data[].items[].category`
- `data[].items[].sub_category`
- `data[].items[].category_group`
- `has_more`
- `created_at`
- `updated_at`
- `next_cursor`
- `items_per_page`

Important documented gaps:
- no explicit worker id in the response body
- no explicit worker name in the response body
- no explicit country code in the response body
- no explicit payroll period start/end in the response body
- no line item id/code fields in the response body

These gaps must be handled as missing source information, not invented facts.

## Non-Goals
- Supporting arbitrary uploaded JSON payroll files
- Using an LLM to transform unknown JSON into G2N
- Claiming every ERP COA export will work without supported aliases or validation
- Live API fetches from Deel
- Direct ERP posting
- Country-specific hardcoded accounting rules

## Resolved Decisions
- Payroll input will cut over fully to Deel G2N-style JSON. The current legacy demo payroll schema will not remain as a supported fallback.
- COA flexibility in this phase will target CSV header aliases first. COA JSON support is deferred.
- `contract_oid` will be used as the primary source reference exposed in normalized outputs and audit data until richer enrichment exists.
- The upload UI label should change from `Payroll JSON` to `Deel G2N JSON` so the supported input is explicit.

## Supported Inputs

### Payroll JSON
Supported:
1. Official-shape Deel G2N JSON response bodies
2. Schema-faithful mock G2N JSON files for demo use

Rejected:
- arbitrary payroll JSON arrays
- unknown contract wrappers
- generic HR datasets
- legacy demo payroll JSON uploads
- payroll JSON that does not match the supported Deel G2N schema

### COA Inputs
Supported:
1. CSV files with canonical headers
2. CSV files with supported header aliases

Rejected:
- arbitrary CSVs with no recognizable account fields
- malformed CSV
- JSON account arrays
- account datasets missing the minimum fields required to build journal candidates

## Tech Stack
- Framework: Next.js App Router, TypeScript
- UI: React
- Schema validation: Zod
- CSV parsing: Papa Parse
- AI mapping: Gemini via the existing server-side client abstraction
- Tests: Vitest
- Persistence: local JSON for approved mappings in local/dev runs, with private Vercel Blob storage for deployed Vercel runs

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Test: `npm run test`
- Typecheck: `npm run typecheck`

## Project Structure
```text
app/api/reconcile/route.ts              -> upload validation and parser dispatch
src/lib/parsers/payroll.ts              -> Deel G2N payroll parsing and normalization entrypoint
src/lib/parsers/coa.ts                  -> flexible COA CSV parsing
src/types/reconcile.ts                  -> supported upload schemas and normalized internal types
src/features/reconcile/domain/normalize.ts -> canonical payroll-line construction
src/features/reconcile/server/retrieval.ts -> candidate scoring against normalized inputs
src/features/reconcile/server/reconcile.ts -> orchestration and anomaly handling
src/features/reconcile/ui/upload-form.tsx  -> upload guidance and user-facing error copy
fixtures/                               -> schema-faithful mock G2N and COA fixtures
tests/unit/                             -> parser, schema, and normalization tests
tests/integration/                      -> route and end-to-end reconcile tests
docs/specs/                             -> this spec and later implementation plan/tasks
```

## Code Style
Prefer explicit schema validation over clever inference. Unsupported shapes should return structured failures quickly.

```ts
export function parseUploadedPayrollJson(jsonText: string): PayrollLine[] {
  const parsed = JSON.parse(jsonText);

  return parseDeelG2nReport(parsed);
}
```

Conventions:
- Preserve raw Deel source fields alongside normalized fields.
- Prefer exact schema names over vague parser names.
- Make missing source fields explicit with `null`/`undefined` or a dedicated metadata field, not guessed defaults.
- Keep AI out of parser detection and structural transformation.
- Keep user-facing upload errors specific and actionable.

## Testing Strategy
- Framework: Vitest
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`

Required test layers:

### Unit
- G2N schema validation
- G2N-to-internal normalization
- COA CSV alias parsing
- upload-shape rejection for unsupported payroll JSON
- preservation of raw source metadata

### Integration
- `/api/reconcile` accepts schema-faithful G2N JSON + supported COA CSV
- `/api/reconcile` rejects unsupported payroll JSON with a clear 400
- end-to-end reconcile flow still produces mapped lines, anomalies, journal rows, and audit rows
- approved-memory reuse still works after the new normalization path

Rules:
- Never call live Deel APIs in automated tests.
- Never call the live Gemini API in automated tests.
- Use synthetic fixtures only.
- Journal balance assertions stay within absolute tolerance `0.01`.
- Add regression coverage for every newly supported input path.

## Boundaries
- Always:
  - Support official-shape G2N JSON directly.
  - Preserve documented Deel source fields without inventing missing ones.
  - Reject unsupported payroll JSON clearly before reconciliation starts.
  - Keep semantic mapping AI-only after structural parsing succeeds.
  - Keep journal building and exports deterministic.
- Ask first:
  - Deleting the preserved legacy payroll reference fixture from the repo.
  - Adding live Deel API fetching.
  - Adding an interactive import-mapping wizard for arbitrary JSON/CSV.
  - Enriching G2N uploads with additional Deel worker or cycle endpoints.
  - Adding country-specific inference rules for categories or sides.
- Never:
  - Claim the app supports arbitrary payroll JSON when it does not.
  - Use an LLM to transform unknown upload schemas into accounting inputs.
  - Invent worker, period, country, or line-item identifiers missing from the source.
  - Accept malformed COA inputs and quietly guess account semantics.
  - Use real payroll data or secrets in fixtures.

## Success Criteria
- A user can upload a schema-faithful Deel G2N JSON file and reconcile it successfully.
- A user can upload a schema-faithful mock G2N JSON file and reconcile it successfully.
- A user can upload a supported COA CSV with canonical headers or supported header aliases.
- Unsupported payroll JSON returns a clear upload error that distinguishes “valid JSON” from “unsupported schema.”
- The normalized reconcile pipeline still produces only `mapped` or `anomaly` line states.
- The journal still balances by currency within `0.01`.
- The audit trail still preserves raw source values and chosen mapping output.
- `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test` all pass after the ingestion changes.

## Open Questions
- None for this phase. Future questions belong to later scopes such as live Deel API ingestion, worker enrichment, or JSON-based COA imports.
