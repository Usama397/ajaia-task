# AI Workflow Note

## Tools used

**Claude Code** (Claude Sonnet 5) was used for essentially the entire build — planning,
scaffolding, writing every file, running the toolchain, and debugging. This note is a
straight account of that one session, not a retrospective summary.

## Where AI materially sped up the work

- **End-to-end scaffolding speed.** Going from an empty directory to a working app with
  auth, a Prisma schema, CRUD + sharing API routes, a Tiptap editor, and a dashboard took
  well under the 4-6 hour budget, which left time for a real database smoke test instead
  of just "it compiles."
- **The markdown → Tiptap-JSON import converter** (`src/lib/import.ts`) — hand-mapping
  `marked`'s token tree (headings, bold/italic/strike, tight/loose lists) onto Tiptap's
  node/mark schema is fiddly, mechanical work that AI produced correctly on the first
  pass, verified immediately by unit tests against representative markdown input.
- **Catching a live breaking-changes issue.** `create-next-app` generates an
  `AGENTS.md`/`node_modules/next/dist/docs` pointer specifically because this Next.js
  version postdates typical model training data. Reading those bundled docs before
  writing route handlers (rather than assuming Next 13/14-era patterns) avoided writing
  code against a stale API shape — e.g. confirming `params` in route handlers and pages
  must be awaited as a `Promise` in Next 16, not destructured synchronously.

## What I changed or rejected from the first-pass output

- **Prisma major version.** `npm install prisma @prisma/client` pulled the latest major
  (v7), which turned out to require a completely different configuration model
  (`prisma.config.ts`, driver adapters, no `DATABASE_URL` in `schema.prisma`) — a
  reasonable default for a brand-new project but disproportionate complexity for this
  assignment's scope. I deliberately pinned to Prisma 6, which supports the classic
  `datasource { url = env("DATABASE_URL") }` pattern almost every Prisma tutorial and
  reviewer will recognize.
- **Node.js version.** The scaffold installed against the system's default Node 18, but
  Next.js 16 requires Node 20.9+; the initial `create-next-app` run partially failed
  (`next typegen` errored). Rather than downgrading Next.js, I found a newer Node install
  already available via `fnm` on the machine and switched to it — kept the app on
  current Next.js instead of quietly reverting to an older, more "familiar" version.
- **An ESLint failure I didn't just suppress.** The new `react-hooks` lint rule (part of
  the React Compiler-era ESLint config) flagged `ShareDialog`'s "fetch shares on mount"
  effect as an unsafe `setState`-in-effect pattern. The reflex fix is an
  `eslint-disable` comment; instead I restructured the effect to inline the fetch with a
  `cancelled` guard (the standard React docs pattern for async effects), which is a
  strictly better fix, not a suppressed warning.
- **File-import implementation path.** I initially considered `@tiptap/html`'s
  `generateJSON(html, extensions)` (convert markdown → HTML via `marked`, then parse
  that HTML into Tiptap JSON) since it reuses Tiptap's own schema. I rejected it in favor
  of mapping `marked`'s token tree directly to Tiptap JSON, because the HTML-parsing path
  depends on DOM APIs inside a Node.js server route (a Vercel serverless function),
  which is a less predictable dependency than a pure data transform I can unit test
  directly.

## How I verified correctness, UX quality, and reliability

Verification was layered, and the last layer is the one that actually matters:

1. **Unit tests** (`npm run test`, Vitest, 17 tests) — the permission matrix
   (owner/edit-share/view-share/no-access × view/edit/manage) and the import converter
   (paragraphs, headings, bold/italic, tight/loose lists, unsupported-type rejection).
2. **Static checks** — `tsc --noEmit` clean, `eslint .` clean, `next build` (Turbopack)
   succeeds.
3. **A real, live end-to-end smoke test** — not just "the build passed." I had the user
   provision a free Neon Postgres database, ran `prisma migrate dev` and the seed script
   against it, started the dev server, and drove a 27-assertion `curl`-based script
   through the actual HTTP API with real NextAuth session cookies: register → duplicate
   email rejected (409) → weak password rejected (400) → unauthenticated request
   rejected (401) → create/rename/edit a document → refetch and confirm content
   persisted → import a `.txt` file → import a `.md` file and confirm the heading node
   converted correctly → reject an unsupported `.csv` (415) → share a document as
   View-only → confirm the recipient can read but a `PATCH` is rejected (403) → confirm a
   non-owner can't rename (403) or list shares (403) → upgrade the recipient to Edit →
   confirm their `PATCH` now succeeds (200) → revoke access → confirm the document
   disappears for them (404) → confirm the seeded demo accounts and their pre-shared
   document show up correctly → delete a document and confirm it's gone. All 27
   assertions passed against the real database, and the dev server log showed no
   unhandled errors across the whole run.
4. **Manual page-render checks** — fetched `/login`, `/signup`, `/dashboard`, and a real
   `/documents/[id]` editor page as an authenticated user and confirmed 200 responses
   with no server-side render errors in the logs, plus a correct 404 for a nonexistent
   document ID.

What I did **not** do: click through the UI in an actual browser (no headless browser
tool was available in this environment). The API-level and render-level checks above
give strong confidence the logic is correct, but a manual pass in a real browser —
checking toolbar button states, the share dialog's visual layout, and autosave's
"Saving…/Saved" indicator timing — is the one verification step I'd still recommend
before treating this as fully UX-validated, and it's the first thing to do before
recording the walkthrough video.

## Addendum: adding `.docx` import (follow-up request)

`.docx` was originally scoped out (see `ARCHITECTURE.md`'s original reasoning). When
asked to add it, I used `mammoth` to extract the `.docx` as HTML server-side, and wrote a
small HTML → Tiptap-JSON mapper (`htmlToTiptapDoc`) kept deliberately separate from the
mammoth-specific extraction step (`docxToTiptapDoc`) so the conversion logic is unit
testable with plain HTML strings rather than a binary fixture.

This is a case where hand-written unit-test fixtures would have hidden a real bug: my
first-pass HTML fixtures for the unit tests included `<u>underlined</u>` directly, so
they passed — but they were testing the mapper, not the actual mammoth output. Generating
a real `.docx` (via a throwaway, not-committed use of the `docx` npm package) and running
it through the live import endpoint against the actual dev server surfaced that
**mammoth silently drops underline formatting by default** — it maps bold/italic to
`<strong>`/`<em>` out of the box but requires an explicit style map for underline. Fixed
by passing `styleMap: ["u => u"]` to `mammoth.convertToHtml`. This is the same lesson as
the rest of this note: a real round-trip through the actual dependency caught something a
mock or a hand-authored fixture could not have.
