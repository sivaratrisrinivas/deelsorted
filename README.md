# DeelSorted

DeelSorted is a planned AI-assisted payroll reconciliation tool for finance teams. The idea is simple: take a messy payroll export from Deel, match each line to the right general ledger account from a company's chart of accounts, and produce a clean journal entry that accounting can actually use.

## What DeelSorted is

Deel payroll exports contain country-specific payroll codes that are hard for accounting teams to read. Examples:

- `UK_NI_Employer_Contribution_Tier_1`
- `BR_INSS_Empregado`
- `DE_Sozialversicherung_AG_Anteil`

Finance teams usually need those lines translated into their own chart of accounts, such as:

- `GL 5400: Payroll Taxes`
- `GL 6100: Employee Benefits`
- `GL 2200: Payroll Liabilities`

DeelSorted is meant to bridge that gap.

## Why this exists

Today this work is often done by hand:

- Someone downloads payroll results from Deel
- Someone reads through unfamiliar country-specific codes
- Someone decides which GL account each line belongs to
- Someone builds a journal entry manually
- Someone checks whether it balances

That process is slow, repetitive, and easy to get wrong, especially when payroll runs cover multiple countries and currencies.

DeelSorted is being designed to make that process much faster while still keeping a human in the loop for anything uncertain.

## How the demo is planned to work

The first demo is intentionally narrow and easy to understand.

1. Upload one supported Deel-style payroll JSON file.
2. Upload one supported chart of accounts CSV file.
3. Click `Reconcile`.
4. The system normalizes payroll codes into a cleaner internal form.
5. The system finds the most likely GL account candidates.
6. Gemini chooses the best match from those candidates and explains why.
7. The app shows:
   - mapped payroll lines
   - confidence for each mapping
   - anomaly lines that need review
   - a balanced journal entry by currency
8. The user downloads:
   - a journal CSV
   - an audit trail CSV
9. Approved decisions can be reused in later runs.

## What makes the product trustworthy

The important design choice is that AI is only used for the semantic matching step.

The rest stays deterministic:

- file parsing
- payroll code normalization
- journal building
- debit and credit balancing
- CSV generation
- anomaly handling

That means the AI helps with the hard language problem, while the accounting math stays fully controlled by the application.

## What is in this repository today

This repository is currently in the planning stage. It does not contain the working app yet.

What it does contain:

- an idea write-up
- a detailed v1 spec
- an implementation plan and task breakdown
- a persistent project rules file for future coding sessions
- source-backed implementation notes
- a project-specific TDD playbook
- this README

## Current project documents

- Idea: [docs/ideas/deelsorted.md](docs/ideas/deelsorted.md)
- Spec: [docs/specs/deelsorted-v1-demo-spec.md](docs/specs/deelsorted-v1-demo-spec.md)
- Plan: [docs/specs/deelsorted-v1-demo-plan.md](docs/specs/deelsorted-v1-demo-plan.md)
- Project rules: [AGENTS.md](AGENTS.md)
- Source pack: [docs/references/deelsorted-source-pack.md](docs/references/deelsorted-source-pack.md)
- TDD playbook: [docs/references/deelsorted-tdd-playbook.md](docs/references/deelsorted-tdd-playbook.md)

## Planned v1 scope

The first version is meant to be a compelling demo, not a production accounting system.

Planned scope:

- one supported payroll JSON format
- one supported COA CSV format
- multi-country sample payroll data
- AI-assisted GL mapping
- confidence scores and anomaly handling
- balanced journal output by currency
- downloadable CSV outputs
- local reuse of approved mappings

Not in v1:

- direct NetSuite, QuickBooks, or Workday integrations
- database-backed multi-tenant storage
- broad support for every Deel export shape
- automatic learning from unapproved decisions

## Planned tech choices

The current plan is:

- Next.js with TypeScript for the app
- Gemini for mapping decisions
- Zod for shared schemas
- Vitest for tests
- local file-based memory first
- turbopuffer later, only after the core demo loop works well

## Project principles

These are the rules guiding the build:

- Keep the user experience simple.
- Prefer one clean demo flow over broad feature coverage.
- Let AI choose mappings, but not accounting math.
- Keep uncertain lines visible instead of hiding them.
- Reuse only decisions a human has approved.
- Build the core engine first, then the UI, then polish.

## Repo status

Status right now: planning complete, implementation not started.

The next major step after this documentation phase is to scaffold the app, add fixtures and schemas, and build the reconciliation engine in small tested slices.

## How we plan to build it

The current implementation approach is intentionally disciplined:

- use the spec and plan as the source of truth
- keep a project rules file so future coding sessions start with the right constraints
- check official docs before making framework-specific implementation choices
- write tests for new behavior before writing the implementation
- build in small slices instead of trying to land the whole app in one pass

## Important notes

- Do not use real payroll data in this repository.
- Do not commit secrets or API keys.
- This project is currently documentation-first and demo-first.
- The README should stay truthful as the project evolves. If the implementation changes direction, update the README along with the spec and plan.
