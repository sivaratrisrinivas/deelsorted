# DeelSorted

## Problem Statement
How might we turn messy, country-specific Deel payroll line items into finance-ready, balanced journal entries that an accountant can trust in one pass?

## Recommended Direction
Build a deliberately narrow, high-confidence demo around one exact Deel-style payroll JSON shape and one COA CSV shape. Keep the product promise simple: upload payroll, upload COA, click reconcile, watch the system map unfamiliar payroll codes into familiar GL accounts with clear reasoning and a balanced journal by currency.

The core design should be `retrieve -> decide -> aggregate`. Retrieval finds the best candidate GL accounts and approved precedents. Gemini does one constrained reasoning step to select from those candidates and explain why. Journal construction, balance checks, anomaly handling, and CSV exports stay fully deterministic.

The key simplification: do not make turbopuffer or multi-format ingestion a launch blocker. Design for retrieval from day one, but ship the first demo with a local candidate provider and a pluggable retrieval interface. If the demo works, we swap in turbopuffer next, not first.

## Key Assumptions to Validate
- [ ] Accountants will trust a suggested mapping if they can see candidate accounts, a short rationale, and a confidence band.
- [ ] One canonical payroll JSON importer is enough to create a compelling multi-country demo.
- [ ] Most of the 50 messy lines collapse into a smaller set of repeated payroll concepts, so deduping LLM calls keeps the flow fast.
- [ ] Explicitly approved mappings are enough to create meaningful "memory" without autonomous learning.
- [ ] A thin normalization layer plus constrained candidate selection beats both "pure reasoning" and hardcoded country rules.

## MVP Scope
- Input 1: one Deel-style G2N payroll JSON fixture covering Brazil, UK, and Germany.
- Input 2: one COA CSV fixture.
- Normalize payroll codes into canonical concepts while preserving acronyms and country markers.
- Deduplicate repeated concepts before mapping.
- Run Gemini structured-output mapping against a bounded candidate set.
- Show per-line GL mapping, confidence, anomaly flag, and short reasoning.
- Build a balanced journal entry by currency with deterministic debit/credit rules.
- Export journal CSV and audit trail CSV.
- Store only human-approved mappings as memory.

## Not Doing (and Why)
- Multi-format payroll ingestion on day one: parser breadth will dilute the demo.
- Direct NetSuite, QuickBooks, or Workday integrations: CSV exports are enough to prove value.
- Autonomous self-learning from every run: too risky and too hard to explain.
- "No rules at all" purism: deterministic journal math and a small normalization layer are good complexity.
- turbopuffer as a hard dependency for the first wow moment: unnecessary for an 80-account COA demo.

## Open Questions
- Should approvals happen per raw line or per normalized payroll concept?
- Do you want the UI to show retrieved candidate accounts, or only the final choice and reasoning?
- Is one cash or clearing account enough for the demo journal, or do you want a more realistic payable split?

## Concrete Choices
- `Architecture`: `ingest`, `normalize`, `retrieve`, `map`, `journal`, `export`, `memory`. The LLM only lives in `map`. The journal builder never calls AI.
- `Canonical payroll shape`: `rawCode`, `normalizedCode`, `tokens`, `countryCode`, `currency`, `amount`, `section`, `partySide`, `sourceRef`.
- `COA shape`: `accountId`, `accountCode`, `name`, `description`, `type`, `normalSide`, `aliases`.
- `Stored mapping memory`: `normalizedCode`, `countryCode`, `selectedAccountId`, `journalRole`, `confidence`, `rationale`, `status=confirmed`.
- `Input choice`: payroll JSON only for v1, COA CSV only for v1.
- `Learning choice`: only from explicit human approvals.
- `Prompt design`: Gemini gets payroll concept, candidate accounts, approved precedents, and must return JSON schema with `selectedCandidateId`, `journalRole`, `confidence`, `reasoning`, `isAnomaly`.
- `Confidence design`: use both a numeric score and a rubric-backed band; never treat it as raw probability.
- `turbopuffer later`: two namespaces, one for COA and one for approved mappings, with enriched retrieval text and BM25-friendly tokens. Hybrid search should use vector + BM25 and fuse client-side, which matches the docs.
- `Build order`: parser and journal math first, then constrained Gemini mapping, then UI, then approval memory, then turbopuffer adapter.

## Doc-backed Constraints
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [turbopuffer hybrid search](https://turbopuffer.com/docs/hybrid)
- [turbopuffer write/schema](https://turbopuffer.com/docs/write#schema)
- [Deel Global Payroll intro](https://developer.deel.com/api/global-payroll/introduction)
