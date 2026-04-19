# Spec: DeelSorted Founder Demo MVP

## Assumptions I'm Making
1. This spec narrows the existing v1 demo into a founder-facing proof point; it does not replace the broader v1 product spec.
2. The audience is a Deel founder or executive evaluator, not a hands-on accountant running a full production rollout.
3. The immediate goal is to prove that DeelSorted saves finance review time and creates a credible product wedge, not to prove production scalability.
4. We should not claim measured CAC reduction from this demo. The honest claim is that a workflow like this could improve conversion, differentiation, and expansion if it proves useful.
5. The checked-in application flow remains the product backbone: supported Deel G2N JSON input, supported COA CSV input, AI-assisted mapping, deterministic journal building, anomalies, exports, and approval reuse.
6. Any founder-demo additions should be lightweight and presentation-oriented, not new platform infrastructure.

## Objective
Show, in one tight demo, that DeelSorted turns payroll reconciliation from row-by-row manual review into concept-level review with deterministic accounting output.

Primary audience:
- Deel founder, product leader, or operator evaluating whether this workflow is valuable enough to explore further.

Primary promise:
- "This agent reduces manual payroll-to-GL review work, keeps the accounting trustworthy, and gets better when humans approve mappings."

Success looks like the viewer concluding:
- this removes meaningful finance busywork
- this is understandable and trustworthy
- this could help Deel win, expand, or differentiate in payroll-adjacent workflows

## Commands
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
app/                           -> Next.js routes and page entry points
src/features/reconcile/ui/     -> Upload flow, results views, anomaly review, approvals UI
src/features/reconcile/domain/ -> Deterministic reconciliation, normalization, journal, export logic
src/features/reconcile/server/ -> Reconcile orchestration, Gemini adapter, retrieval, memory
src/lib/parsers/               -> Supported payroll JSON and COA CSV parsing
src/types/                     -> Shared Zod schemas and TypeScript contracts
fixtures/                      -> Demo payroll and COA fixtures
tests/unit/                    -> Pure logic tests
tests/integration/             -> Reconcile pipeline and route tests
docs/specs/                    -> Product and implementation specs
```

## Code Style
Follow the existing repo shape: keep domain logic explicit, deterministic, and framework-agnostic. Founder-demo work should prefer small presentation helpers over architectural expansion.

```ts
export type FounderDemoSummary = {
  totalRows: number;
  uniqueConcepts: number;
  autoMappedConcepts: number;
  anomalyConcepts: number;
};

export function calculateReviewCompression(
  totalRows: number,
  uniqueConcepts: number,
): number {
  if (totalRows <= 0) {
    return 0;
  }

  return Number((1 - uniqueConcepts / totalRows).toFixed(2));
}
```

Conventions:
- `camelCase` for helpers and derived metrics
- exported functions have explicit return types
- UI components render existing state; they should not absorb business logic
- no hidden AI accounting logic
- preserve raw values and deterministic outputs

## Testing Strategy
- Framework: Vitest
- Unit tests for any founder-demo metric helpers or summary shaping
- Integration tests for any founder-demo UI summary that depends on reconcile results
- Never call the live Gemini API in tests
- Reuse checked-in fixtures and mocked model outputs

Verification levels:
- Unit:
  - review-compression metric shaping
  - unique-concept counting if new helpers are introduced
- Integration:
  - founder-demo summary renders expected counts from fixture-backed results
  - existing reconcile flow still produces mapped lines, anomalies, journal rows, and audit rows

## Boundaries
- Always:
  - keep the story focused on time saved, review reduced, and deterministic trust
  - reuse the existing supported upload flow and checked-in fixtures where possible
  - keep AI limited to semantic mapping only
  - keep journal math, balancing, anomaly handling, and exports deterministic
- Ask first:
  - adding turbopuffer or embeddings as a demo dependency
  - expanding supported file formats for the founder demo
  - changing approval persistence behavior
  - introducing new external integrations, dashboards, or auth just for the demo
- Never:
  - claim production-grade scalability from this founder demo
  - claim proven CAC reduction from this founder demo
  - hide anomalies to make the output look cleaner
  - let the model invent accounting math
  - add infrastructure complexity that the founder does not need to see to believe the value

## Founder Demo Narrative
Problem statement:
- Finance teams do not think in country-specific payroll labels; they think in GL accounts, liabilities, and month-end close pressure.

Recommended direction:
- Demo the existing app as an "AI-assisted concept mapper with deterministic accounting," not as a generic AI agent and not as retrieval infrastructure.

Core story beats:
1. Upload a supported Deel G2N payroll JSON and COA CSV.
2. Show that many raw payroll rows collapse into a much smaller set of repeated concepts.
3. Show mapped results with confidence and clear anomalies.
4. Show a balanced journal and downloadable audit trail.
5. Show that approved mappings are reused on the next run.

Demo punchline:
- "The human stops reviewing every row and starts reviewing only the unique concepts and exceptions."

## Demo Script
1. Start with the pain:
   "Today this is row-by-row manual reconciliation across country-specific payroll terms."
2. Upload the sample payroll and COA files.
3. Run reconciliation.
4. Point to the compression:
   "We started with raw payroll rows, but the system grouped repeats into a smaller set of unique concepts before asking AI for help."
5. Point to trust:
   "AI suggests mappings, but deterministic code builds the journal, handles anomalies, and keeps the output auditable."
6. Point to reuse:
   "Once a finance user approves a mapping, the next run reuses it."
7. Close on value:
   "This turns payroll reconciliation into concept review plus exception handling."

## Success Criteria
- The founder demo can be delivered in under 5 minutes without explaining internal architecture.
- The viewer can clearly see the difference between raw payroll rows and unique review concepts.
- The UI visibly communicates:
  - mapped results
  - anomalies
  - balanced journal output
  - approval reuse
- The demo supports a credible value statement:
  - less manual review
  - faster month-end reconciliation
  - trustworthy accounting outputs
- If founder-demo-specific UI is added, it must show at least these metrics:
  - total payroll rows
  - unique concepts reviewed
  - mapped concepts
  - anomalies requiring human review
- Existing checks remain green:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run typecheck`

## Not Doing
- No vector database as part of the founder demo
- No embedding-first architecture as part of the founder demo
- No broad claims about logarithmic runtime
- No ERP integrations
- No multi-format ingestion expansion
- No CAC math presented as proven outcome

## Open Questions
- Should the founder demo add a lightweight "review compression" summary bar to the existing results view, or is the spoken narrative enough?
- Should the founder demo use the larger fixture by default to make the concept-deduping value more visually obvious?
