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
format for file import — `.txt` and `.md` files are converted into that JSON server-side
(`src/lib/import.ts`) using the same node/mark vocabulary the editor produces, so an
imported document is indistinguishable from a hand-typed one and can be edited normally
afterward.

### File import: turn the file into a document, not an attachment

The assignment offered a choice between "upload becomes a new document" and "upload is
an attachment on a document." I chose the former — it's the more product-relevant
interpretation for a docs tool (you paste in existing notes and start editing them), and
it avoids standing up a blob-storage dependency (S3, etc.) for something that isn't core
to the assignment. `.docx` was cut for the same reason: binary parsing is a real time
sink for low marginal grading value versus `.txt`/`.md`.

### Autosave over explicit save, last-write-wins over real-time merge

Content saves via a debounced PATCH ~1.2s after the user stops typing, with a
Saved/Saving/Save failed indicator. This is honest about what's being demonstrated: a
usable single-editor experience with reliable persistence, not concurrent multi-user
editing (that's a CRDT/OT problem that doesn't fit in this timebox — see below).

## Scope cuts (explicit)

- **No real-time collaboration.** Two people editing the same document simultaneously
  will silently overwrite each other on save (last write wins). Building real
  conflict-free concurrent editing (Yjs/CRDT) is a multi-day problem on its own; doing it
  badly would be worse than not doing it.
- **File import is `.txt`/`.md` only**, not `.docx`. Stated in the UI (file picker
  `accept` attribute) and in the README.
- **Sharing has two levels — View and Edit — not granular ACLs.** No org/team concept,
  no link-sharing, no expiring invites.
- **No version history / comments / suggestion mode.** Listed as stretch goals in the
  assignment; skipped in favor of hardening the core slice given the time available.

## What I'd build next with 2-4 more hours

1. **Version history** — cheapest high-value addition: snapshot `contentJson` on each
   save (or every N saves) into a `DocumentVersion` table, with a simple "restore this
   version" action.
2. **Real-time presence** (not full collaborative editing) — show "Bob is viewing this
   document" via a lightweight polling or WebSocket presence channel; sets up the UI
   groundwork for real CRDT-based editing later without committing to it now.
3. **Export to Markdown/PDF** — the Tiptap JSON → Markdown direction is a natural inverse
   of the import path already built.
4. **Better conflict handling** — even short of full real-time editing, detecting
   "this document changed since you loaded it" and warning before an autosave overwrites
   newer content would meaningfully reduce the last-write-wins risk.
