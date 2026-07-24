# Ajaia Docs

A lightweight, Google-Docs-inspired collaborative document editor: create and format
documents, import `.txt`/`.md`/`.docx` files, share with role-based permissions, comment,
track version history, see who else is editing in real time, and export — all persisted
in Postgres.

## Stack

- **Next.js 16** (App Router, TypeScript) — single full-stack app, deployed to Vercel
- **Prisma 6 + PostgreSQL** — persistence (tested against [Neon](https://neon.tech)'s free tier)
- **NextAuth v4** (Credentials provider, JWT sessions) + `bcryptjs` — real email/password auth
- **Tiptap** — rich-text editor (bold, italic, underline, H1/H2, bullet/numbered lists)
- **Mammoth** — converts uploaded `.docx` files to HTML server-side for import
- **Zod** — request validation on every API route
- **Vitest** — unit tests

## Features

- **Rich-text editing** — bold, italic, underline, H1/H2, bullet/numbered lists; debounced
  autosave with a live save-status indicator; empty-document placeholder.
- **File import** — `.txt`, `.md`, and `.docx` become new editable documents (see below).
- **Role-based sharing** — grant another user **View**, **Comment**, or **Edit** access;
  share by email even before they've signed up (a pending invite auto-converts to a share
  on registration); optional email notifications; revoke anytime. Owned vs. shared
  documents are visually separated on the dashboard.
- **Comments** — document-level comments with an optional quoted text selection, resolve/
  reopen, and delete (by author or owner). Commenters (View+Comment role) can comment but
  not edit content.
- **Version history** — the pre-edit state is snapshotted automatically as the document is
  edited (throttled to at most once per minute to avoid row bloat); restore any prior
  version (the restore is itself reversible, since the current state is snapshotted first).
- **Real-time presence indicators** — avatars of everyone currently viewing/editing a
  document, via a lightweight polling heartbeat (no WebSocket infrastructure required).
- **Export** — download as **Markdown** or **HTML**, or **Save as PDF** via a clean
  print-optimized page.

## Supported file imports

## Supported file imports

**`.txt`**, **`.md`/`.markdown`**, and **`.docx`** files can be imported (5MB max).
Uploading a file converts it into a brand-new document owned by the uploader:
- `.txt` becomes paragraphs (blank lines split paragraphs, single newlines become line breaks)
- `.md` is parsed (headings, bold/italic, bullet/numbered lists) via `marked`
- `.docx` is converted via `mammoth` (headings, bold/italic/underline, bullet/numbered
  lists carry over; images, tables, and other formatting are flattened to plain text)

All three land in the same rich-text format the editor uses, so an imported document is
editable immediately. Other file types are rejected with a clear error.

## Local setup

### 1. Prerequisites

- Node.js **20.9+** (this repo was built and tested on Node 22)
- A Postgres database — the fastest option is a free [Neon](https://neon.tech) project
  (no credit card, no Docker needed). A local Postgres instance works too.

### 2. Install and configure

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npm run seed
```

The seed script creates two demo accounts (used to test sharing without signing up twice):

| Email             | Password  |
| ----------------- | --------- |
| alice@ajaia.dev   | demo1234  |
| bob@ajaia.dev     | demo1234  |

It also creates a "Welcome to Ajaia Docs" document owned by Alice and shared with Bob
(View access) so the sharing UI has something to show immediately.

### 4. Run it

```bash
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`. Sign in with a seeded
account or use "Sign up" to create your own.

### 5. Tests

```bash
npm run test
```

Covers the permission matrix incl. the Comment role (`src/lib/permissions.ts`), the
file-import conversion (`src/lib/import.ts`), the Markdown/HTML export serializers
(`src/lib/export.ts`), and the version-snapshot throttle (`src/lib/versioning.ts`).

## Deploying (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Set environment variables in the Vercel project: `DATABASE_URL` (same Neon connection
   string, or a separate prod database), `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (your
   deployed URL, e.g. `https://your-app.vercel.app`).
4. Deploy. The build script (`prisma generate && prisma migrate deploy && next build`)
   applies migrations automatically on every deploy.
5. Run the seed script once against the production database if you want the demo
   accounts there too: `DATABASE_URL="<prod url>" npm run seed`.

## What's not included (scope cuts)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full reasoning. The main remaining cut is
**true concurrent (multi-cursor) editing** — two people editing simultaneously still use
last-write-wins on save, though presence indicators show when that's happening. Comments
are document-level (with an optional quoted selection) rather than pinned to live text
ranges, and PDF export goes through the browser's print dialog rather than server-side
rendering.
