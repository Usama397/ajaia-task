# Ajaia Docs

A lightweight, Google-Docs-inspired collaborative document editor: create and format
documents, import `.txt`/`.md` files as new documents, share documents with other users
with View/Edit permissions, and persist everything in Postgres.

## Stack

- **Next.js 16** (App Router, TypeScript) — single full-stack app, deployed to Vercel
- **Prisma 6 + PostgreSQL** — persistence (tested against [Neon](https://neon.tech)'s free tier)
- **NextAuth v4** (Credentials provider, JWT sessions) + `bcryptjs` — real email/password auth
- **Tiptap** — rich-text editor (bold, italic, underline, H1/H2, bullet/numbered lists)
- **Zod** — request validation on every API route
- **Vitest** — unit tests

## Supported file imports

Only **`.txt`** and **`.md`/`.markdown`** files can be imported (2MB max). Uploading a file
converts it into a brand-new document owned by the uploader — `.txt` becomes paragraphs,
`.md` is parsed (headings, bold/italic, bullet/numbered lists) into the same rich-text
format used by the editor. Other file types (e.g. `.docx`) are rejected with a clear error.

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

Covers the permission matrix (`src/lib/permissions.ts`) and the file-import conversion
(`src/lib/import.ts`) — both txt/md → rich-text conversion and rejection of unsupported
file types.

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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full reasoning. In short: no real-time
multi-cursor collaboration (autosave/last-write-wins instead), no `.docx` import, and
sharing has two permission levels (View/Edit) rather than granular ACLs.
