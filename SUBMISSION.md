# Submission

## What's included

- [x] Source code (this repository)
- [x] `README.md` — local setup and run instructions
- [x] `ARCHITECTURE.md` — architecture note (what was prioritized and why)
- [x] `AI_WORKFLOW.md` — AI workflow note
- [x] `SUBMISSION.md` — this file
- [ ] Live product URL — **TODO: fill in after deploying to Vercel**
- [ ] Walkthrough video URL — **TODO: fill in after recording (see below)**
- [ ] Google Drive folder link — **TODO: fill in after uploading everything**

## Live deployment

- URL: `TODO`
- Demo accounts (also documented in README.md):
  - `alice@ajaia.dev` / `demo1234`
  - `bob@ajaia.dev` / `demo1234`
  - (or sign up your own account via "Sign up" on the login page)

## Walkthrough video

- URL: `TODO` (unlisted YouTube or Loom link)

## Feature checklist (per assignment spec)

- [x] Create, rename, edit, save/reopen documents
- [x] Rich text: bold, italic, underline, headings (H1/H2), bulleted/numbered lists
- [x] File upload: `.txt` / `.md` → new editable document (documented limitation: no `.docx`)
- [x] Sharing: owner + grant access to another user + View/Edit permission + visible
      owned-vs-shared distinction on the dashboard + revoke
- [x] Persistence: Postgres via Prisma; verified via a live end-to-end smoke test (see
      `AI_WORKFLOW.md`) against a real database, not just local dev
- [x] Basic validation and error handling (Zod schemas on every API route, consistent
      error responses, 401/403/404/409/415 used correctly)
- [x] Automated tests: `npm run test` (Vitest) — 17 tests covering the permission matrix
      and file-import conversion
- [x] Architecture note and AI workflow note (this folder)

## What's working / incomplete / next steps

**Working end-to-end** (see `AI_WORKFLOW.md` for the exact verification steps run
against a live database): signup/login, document CRUD, rich-text formatting, autosave,
rename, `.txt`/`.md` import with rejection of unsupported types, sharing with View/Edit
permissions, permission enforcement (view-only can't edit or rename; non-owners can't
manage sharing), revoke access, delete.

**Incomplete / not attempted** (see `ARCHITECTURE.md` "Scope cuts" for reasoning):
real-time multi-user collaboration (autosave/last-write-wins instead), `.docx` import,
version history, comments/suggestions, granular (beyond View/Edit) permissions.

**What I'd build next with 2-4 more hours:** see the "What I'd build next" section of
`ARCHITECTURE.md` — version history, lightweight presence indicators, Markdown/PDF
export, and conflict warnings on stale-content autosave, in that priority order.
