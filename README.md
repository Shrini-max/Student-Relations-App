# Paradox &mdash; Team Management

Full-stack app for managing departments, teams, and members of the Paradox event.

## Stack

- Next.js 14 (App Router, TypeScript)
- Prisma ORM + PostgreSQL
- NextAuth (credentials provider, bcrypt)
- Tailwind CSS + lucide-react icons
- PapaParse (CSV import/export)

## Provision Supabase

1. Create a free project at [supabase.com](https://supabase.com). Pick a region close to you.
2. Once it's ready, go to **Project Settings → Database → Connection string** and copy two strings:
   - **Transaction pooler** (port **6543**) → this is your `DATABASE_URL`. Append `?pgbouncer=true&connection_limit=1` to the end.
   - **Session / direct** (port **5432**) → this is your `DIRECT_URL`.
3. Both URLs contain `[PASSWORD]` — replace it with the database password you set when creating the project (Settings → Database → *Reset database password* if you forgot it).

The app talks to Supabase through the pooler at runtime (serverless-friendly), and uses the direct URL only for schema migrations and seeding.

## Local setup

```bash
cp .env.example .env
# paste your Supabase DATABASE_URL + DIRECT_URL, and generate NEXTAUTH_SECRET
npm install
npm run db:push      # creates tables in your Supabase DB
npm run db:seed      # seeds admin/head/viewer users + sample data
npm run dev          # http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. In Vercel, **Add New → Project** and import the repo.
3. Under **Settings → Environment Variables** (Production + Preview + Development), add:
   - `DATABASE_URL` — your Supabase pooler URL (port 6543, `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` — your Supabase direct URL (port 5432)
   - `NEXTAUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `NEXTAUTH_URL` — your full deployed URL, e.g. `https://paradox-manage.vercel.app`
4. Deploy. The `vercel-build` script runs `prisma generate && prisma db push && next build`, which syncs the schema against Supabase on first deploy.
5. **One-time**, from your machine, seed the database:
   ```bash
   npm run db:seed
   ```
   (your local `.env` already points at the same Supabase project). Change the seeded passwords afterwards, or edit `prisma/seed.ts` before running.

### Notes

- `prisma db push` is convenient for a schema-only project. If you start tracking data changes, switch to `prisma migrate deploy` and commit migration files.
- Prisma's `binaryTargets` already includes `rhel-openssl-3.0.x` for Vercel's Node 20 runtime.
- `.env` is gitignored; never commit `NEXTAUTH_SECRET`, `DATABASE_URL`, or `DIRECT_URL`.

## Demo logins

| Role           | Email                 | Password  |
| -------------- | --------------------- | --------- |
| Admin          | admin@paradox.local   | admin123  |
| Dept Head      | head@paradox.local    | head123   |
| Viewer         | viewer@paradox.local  | viewer123 |

## Features

- Role-based access (Admin, Department Head, Viewer)
- Departments, Teams, Members CRUD
- Global and department-scoped role types
- Dashboard with stats and recent activity
- Search & filter members across scopes
- CSV export (filtered) and bulk CSV import per team
- Activity log (admin only) and in-app notifications
- Responsive sidebar layout, Notion-inspired look

## CSV import format

Columns: `name,email,phone,role` &mdash; header row required. Unknown role
names are ignored; duplicate emails within a team are skipped.
