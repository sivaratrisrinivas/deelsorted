# DeelSorted Source Pack

## Purpose
This document captures the official documentation and implementation notes we should rely on while maintaining the current repo. It started as a pre-implementation reference, but the repository is now scaffolded and running, so `package.json`, the checked-in source, and the docs in `README.md` and `docs/specs/` are the current source of truth.

## Stack Detection Status
- `package.json` is now present and pins the current runtime stack.
- The checked-in repo currently uses:
  - Next.js `16.2.4`
  - React `19.2.4`
  - TypeScript `^5`
  - Zod `^4.3.6`
  - Vitest `^3.2.4`
  - Papa Parse `^5.5.3`
- Important implementation note:
  - The approved spec originally named `@google/genai`, but the current repo does not install that package yet.
  - The runtime Gemini integration is a thin server-side Developer API client in `src/features/reconcile/server/runtime.ts` that feeds the schema-validated mapping adapter in `src/features/reconcile/server/gemini.ts`.

Important:
- When this document disagrees with `package.json` or checked-in source, prefer the repo.
- Keep the source links below as the maintenance reference for future framework-specific changes.

## Verified Implementation Guidance

### 1. Bootstrap the app with Next.js App Router defaults
Current official Next.js installation docs say `create-next-app` can set up TypeScript, ESLint, App Router, and an import alias by default.

Why this matters for DeelSorted:
- It matches the approved spec.
- It gives us the standard project baseline instead of hand-rolling config from memory.

Source:
- https://nextjs.org/docs/app/getting-started/installation

### 2. Use App Router file conventions from day one
Current official Next.js docs say:
- `app/` is the App Router entry point.
- `page.tsx` creates a route.
- `layout.tsx` creates shared UI.
- `route.ts` creates an API endpoint.
- `src/` is optional and supported.

Why this matters for DeelSorted:
- It matches the planned structure in the spec and `AGENTS.md`.
- It supports the split we want between pages, route handlers, and feature modules.

Sources:
- https://nextjs.org/docs/app/getting-started/project-structure
- https://nextjs.org/docs/app/getting-started/layouts-and-pages

### 3. Keep the upload UI client-side and the reconcile logic server-side
Current official Next.js docs say pages and layouts are Server Components by default, and Client Components should be used only when you need state, event handlers, or browser APIs.

Why this matters for DeelSorted:
- File upload controls and interactive review UI belong in Client Components.
- Reconciliation orchestration, Gemini calls, and file processing routes belong on the server side.

Sources:
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app

### 4. Use Route Handlers for server endpoints
Current official Next.js docs say Route Handlers:
- live in `route.ts` files inside `app/`
- use the Web `Request` and `Response` APIs
- support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`
- can read form submissions with `request.formData()`

Why this matters for DeelSorted:
- `app/api/reconcile/route.ts` fits the planned browser-to-server flow.
- `request.formData()` is the documented path for handling uploaded form data in a route handler.
- `app/api/approvals/route.ts` also fits the planned approval flow.

Sources:
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/docs/app/building-your-application/routing/route-handlers

### 5. Treat React form action hooks as version-sensitive
Current React docs describe `useActionState` as a hook for updating state with Actions, including use with `<form>` actions. Current React docs also note that higher-level abstractions like `useActionState` and form actions handle ordering concerns better than raw async transitions for common cases.

Why this matters for DeelSorted:
- This may become a good fit for action-based submission flows later.
- But we should not standardize on it until the actual React version is pinned in `package.json`.

Working rule for now:
- Verified as a current React capability.
- Not yet mandatory for DeelSorted until the scaffold locks the version and we decide whether the upload flow should use route-handler form posts or a fetch-based client submission.

Sources:
- https://react.dev/reference/react/useActionState
- https://react.dev/reference/react/useTransition

### 6. Use Gemini structured outputs for mapping decisions
Current Gemini docs say structured outputs can be constrained with JSON Schema. The docs also say the JavaScript SDK works well with Zod-defined schemas and that `responseMimeType: "application/json"` plus a JSON schema produces predictable, parsable output.

Why this matters for DeelSorted:
- This directly matches the spec requirement that mapping decisions come back as structured data.
- It is the right documented way to enforce fields like selected account, confidence, reasoning, and anomaly status.

Sources:
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/quickstart

### 7. Preferred future direction: adopt the Gemini JavaScript SDK instead of the current thin HTTP client
Current Gemini quickstart docs show JavaScript usage through `@google/genai`.

Why this matters for DeelSorted:
- It still matches the approved stack direction in the spec.
- It would reduce the chance of request-shape drift versus the current handwritten runtime client.
- This is a follow-up alignment task, not a hidden requirement for the current demo loop, because the checked-in fetch-based client is already covered by tests and schema validation.

Source:
- https://ai.google.dev/gemini-api/docs/quickstart

### 8. Use Gemini embeddings only after the first loop works
Current Gemini embeddings docs say:
- `embedContent` is the JavaScript SDK entry point
- `gemini-embedding-001` is the documented embedding model
- `taskType` is supported for specific embedding use cases
- `outputDimensionality` can be specified

Why this matters for DeelSorted:
- This supports the planned later move toward retrieval-backed mapping.
- It confirms that the embedding strategy in the idea doc is technically aligned with the official API.
- It also reinforces that embeddings are a later step, not required to prove the first demo loop.

Source:
- https://ai.google.dev/gemini-api/docs/embeddings

### 9. Use Zod for validation at boundaries
Current Zod docs say:
- `.parse()` validates input and throws on failure
- `.safeParse()` returns a success-or-error result object without throwing

Why this matters for DeelSorted:
- Use Zod schemas for uploaded payroll payloads, COA rows, mapping decisions, approvals, and route inputs.
- Prefer `safeParse()` at UI and route boundaries where we want recoverable errors.
- Prefer `parse()` when failure should stop execution immediately inside trusted internal code paths.

Source:
- https://zod.dev/basics

### 10. Use Papa Parse for CSV input in documented ways
Current Papa Parse docs say:
- `Papa.parse(csvString, config)` parses a CSV string
- `Papa.parse(file, config)` parses a local `File` object

Why this matters for DeelSorted:
- It gives us a documented path for reading the uploaded COA CSV in the browser or from text content.
- It aligns with the planned simple v1 importer instead of writing custom CSV parsing logic.

Source:
- https://www.papaparse.com/docs

### 11. Use Vitest module mocks at external boundaries
Current Vitest docs say:
- `vi.mock()` is the supported way to replace a module
- using `import('./module')` helps keep typing and refactoring safer
- mocks should be cleared or restored between tests

Why this matters for DeelSorted:
- The Gemini client should be mocked in automated tests.
- Local memory and retrieval adapters can often be tested with real in-memory implementations instead of full mocks.
- This lines up with the spec rule to never call the live Gemini API in tests.

Sources:
- https://vitest.dev/guide/mocking
- https://vitest.dev/guide/mocking/modules.html

## Recommended Early Decisions
These are the implementation choices currently best supported by official docs and the approved spec:

1. Scaffold with Next.js App Router using the standard CLI flow.
2. Keep `app/page.tsx` as the entry point for the upload flow.
3. Use `app/api/reconcile/route.ts` and `app/api/approvals/route.ts` for server endpoints.
4. Keep upload inputs and interactive result review in Client Components.
5. Keep Gemini calls and mapping orchestration server-side.
6. Use Zod schemas at all input and output boundaries.
7. Use mocked Gemini responses in Vitest from the start.

## Things We Should Not Pretend Are Settled Yet
- Whether `useActionState` should become the standard form pattern in this repo, even though React is now pinned.
- Whether future Next.js upgrades should change any of the current route-handler or upload-flow patterns.
- Whether the upload flow should use direct form submission with `FormData` or client-side parsing plus fetch.
- Any turbopuffer-specific implementation details, because turbopuffer is intentionally not on the critical path for the first demo loop.

## Re-Check Triggers
Run another source-driven pass when any of these become true:
- we adopt `@google/genai` or another Gemini client library
- we upgrade Next.js, React, Vitest, Zod, or Papa Parse materially
- retrieval moves beyond the local adapter
- we introduce any new framework-specific dependency

## Source Index
- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Next.js project structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js layouts and pages: https://nextjs.org/docs/app/getting-started/layouts-and-pages
- Next.js server and client components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js route handler reference: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- React `useActionState`: https://react.dev/reference/react/useActionState
- React `useTransition`: https://react.dev/reference/react/useTransition
- Gemini quickstart: https://ai.google.dev/gemini-api/docs/quickstart
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini embeddings: https://ai.google.dev/gemini-api/docs/embeddings
- Zod basics: https://zod.dev/basics
- Vitest mocking: https://vitest.dev/guide/mocking
- Vitest module mocking: https://vitest.dev/guide/mocking/modules.html
- Papa Parse docs: https://www.papaparse.com/docs
