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
- [x] File upload: `.txt` / `.md` / `.docx` → new editable document (docx: text-level
      formatting only, no images/tables)
- [x] Sharing: owner + grant View / Comment / Edit access + share-by-email (invites
      auto-convert on signup) + visible owned-vs-shared distinction + revoke
- [x] Persistence: Postgres via Prisma; verified via a live end-to-end smoke test (see
      `AI_WORKFLOW.md`) against a real database, not just local dev
- [x] Basic validation and error handling (Zod schemas on every API route, consistent
      error responses, 401/403/404/409/415 used correctly)
- [x] Automated tests: `npm run test` (Vitest) — permission matrix (incl. Comment role),
      file-import conversion, Markdown/HTML export, and version-snapshot throttle
- [x] Architecture note and AI workflow note (this folder)

## Stretch features (all five implemented)

- [x] **Real-time collaboration indicators** — presence avatars via polling heartbeat
- [x] **Commenting** — document-level comments with optional quoted selection, resolve/delete
- [x] **Document version history** — auto-snapshot (throttled) + reversible restore
- [x] **Export** — Markdown, HTML, and Save-as-PDF (print)
- [x] **Role-based permissions beyond basic access** — View / Comment / Edit + email invites

## What's working / incomplete / next steps

**Working end-to-end**: signup/login, document CRUD, rich-text formatting, autosave,
rename, `.txt`/`.md`/`.docx` import, role-based sharing (View/Comment/Edit) with email
invites, comments, version history with restore, presence indicators, and export — all
enforced through the central permission helpers.

**Remaining cut** (see `ARCHITECTURE.md`): true concurrent multi-cursor editing still
uses last-write-wins on save (presence surfaces when it's happening); comments are
document-level rather than pinned to live text ranges; PDF export uses the browser print
dialog rather than server-side rendering.

**What I'd build next:** swap the autosave PATCH for a Yjs/CRDT synced document to get
real concurrent editing, keeping the existing presence, comments, versions, and export
layers on top.
