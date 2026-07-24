# Architecture Note

## What I prioritized, and why

Given the 4-6 hour timebox, I picked **one full vertical slice** — create, edit, format,
persist, import, share — over breadth. The core bet: a reviewer should be able to sign
in, write a formatted document, refresh and see it survive, import a file into a new
document, and share it with a second account, all without hitting a dead end. Everything
else was cut or simplified in service of that slice working reliably.

### Full-stack framework: Next.js App Router, one deployable app

A single Next.js app (pages + API routes + Prisma) instead of a separate frontend/backend
means one Vercel deployment, one environment-variable set, and no CORS/session-sharing
work between two services. For a scoped take-home, that infrastructure simplicity buys
back hours better spent on the editor and sharing logic.

### Data model: three tables, one join table for sharing

`User` / `Document` / `DocumentShare` is the minimum shape that supports "owner vs.
shared," View/Edit permissions, and revocation, without building out a full ACL or
org/team model the assignment didn't ask for. `DocumentShare` is a plain join table with
a `(documentId, userId)` unique constraint and a `permission` enum — sharing, upgrading,
and revoking access are all single-row upserts/deletes.

### Access control: one function, not scattered ifs

`getEffectivePermission()` in `src/lib/permissions.ts` is the single source of truth for
"what can this user do with this document" (owner beats any share row). Every API route
calls it before reading or writing. This is also the highest-value place to put a unit
test — permission logic is exactly the kind of thing that's easy to get subtly wrong
under time pressure and expensive to get wrong in a real product.

### Editor content: Tiptap JSON, not HTML

Storing the ProseMirror/Tiptap JSON document (rather than rendered HTML) in Postgres
means the editor can round-trip content exactly, and the same JSON shape is the target
format for file import — `.txt`, `.md`, and `.docx` files are all converted into that
JSON server-side (`src/lib/import.ts`) using the same node/mark vocabulary the editor
produces, so an imported document is indistinguishable from a hand-typed one and can be
edited normally afterward.

### File import: turn the file into a document, not an attachment

The assignment offered a choice between "upload becomes a new document" and "upload is
an attachment on a document." I chose the former — it's the more product-relevant
interpretation for a docs tool (you paste in existing notes and start editing them), and
it avoids standing up a blob-storage dependency (S3, etc.) for something that isn't core
to the assignment.

`.docx` import is layered on top of the same target format: `mammoth` extracts the
`.docx`'s content as semantic HTML server-side, and a small HTML → Tiptap-JSON mapper
(`htmlToTiptapDoc`, kept separate from the docx-specific extraction step so it's unit
testable without a binary fixture) converts that into the identical node/mark shape the
markdown importer produces. One caveat worth flagging explicitly: Mammoth maps bold and
italic to `<strong>`/`<em>` by default but silently drops underline formatting unless you
hand it a style map — this repo passes `styleMap: ["u => u"]` to restore it. It's the
kind of default that's easy to miss without a real `.docx` round-trip test (a handwritten
HTML fixture would have hidden the bug, since I'd have written `<u>` into the fixture
myself instead of discovering mammoth doesn't emit it).

### Autosave over explicit save, last-write-wins over real-time merge

Content saves via a debounced PATCH ~1.2s after the user stops typing, with a
Saved/Saving/Save failed indicator. This is honest about what's being demonstrated: a
usable single-editor experience with reliable persistence, not concurrent multi-user
editing (that's a CRDT/OT problem that doesn't fit in this timebox — see below).

## Stretch features (all five implemented)

The assignment listed five optional stretch enhancements; all are built. Design notes and
the deliberate scoping of each:

- **Real-time collaboration indicators** — a `Presence` row per (document, user) is
  updated by a heartbeat every 10s from the open editor; the header shows avatars of
  everyone seen within the last 30s. **Polling, not WebSockets** — it works on Vercel's
  serverless model with zero extra infrastructure, and "who's here" indicators don't need
  sub-second latency. This is presence, not concurrent editing (see remaining cut below).
- **Commenting** — `Comment` rows are document-level, with an optional `quote` captured
  from the current editor text selection, plus resolve/reopen and delete. **Deliberately
  not anchored to live text ranges**: pinning a comment to character offsets means every
  edit has to re-map every anchor, which silently corrupts under concurrent edits. A
  quoted snapshot is robust and still gives the "comment on this passage" affordance.
- **Version history** — the *pre-edit* state is snapshotted into `DocumentVersion` on
  content save, **throttled to at most once per minute** (`lib/versioning.ts`) so autosave
  doesn't flood the table. Restore is transactional and itself reversible (it snapshots
  the current state first). The throttle rule is a pure function with unit tests.
- **Export** — `lib/export.ts` serializes Tiptap JSON to Markdown and to HTML directly
  (no DOM-dependent library, so it runs safely in a serverless route). PDF reuses the HTML
  path through a print-optimized standalone page that auto-opens the browser print dialog —
  dependency-free and cross-platform, versus bundling a headless-Chrome PDF renderer.
- **Role-based permissions beyond basic access** — the `SharePermission` enum gained a
  **COMMENT** tier (View < Comment < Edit), enforced everywhere through the single
  `getEffectivePermission` + `canView`/`canComment`/`canEdit`/`canManage` helpers. Sharing
  also works **by email before signup**: unknown recipients get a `DocumentInvite` that
  auto-converts to a real share on registration, with optional email notification.

## Remaining scope cut

- **True concurrent (multi-cursor) editing.** Two people editing simultaneously still use
  last-write-wins on save — presence indicators surface *that* it's happening, but a real
  CRDT/OT merge (Yjs) is a multi-day effort and out of scope. The natural next step:
  swap the autosave PATCH for a Yjs document synced over a provider, keeping the existing
  presence, comments, versions, and export layers on top.
- **`.docx` import fidelity.** Only text-level formatting carries over (headings,
  bold/italic/underline, lists); images, tables, and embedded objects flatten to text.
