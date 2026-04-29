# Scrum task creator

Upstream repository: [github.com/WebtrixPro/Tasks-Creator](https://github.com/WebtrixPro/Tasks-Creator).

Next.js app that parses ticket-style Markdown (see `garcia-tasks/Garcia_PA_Phase1_Tickets.md`), stores each ticket in **SQLite** via **Prisma**, and can **push cards** to a **Basecamp 3/4 Card Table** after OAuth.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `TOKEN_ENCRYPTION_KEY` to **64 hex characters** (32 bytes), for example:

   ```bash
   openssl rand -hex 32
   ```

3. Register a Basecamp integration at [launchpad.37signals.com/integrations](https://launchpad.37signals.com/integrations). Set the redirect URI to match `BASECAMP_REDIRECT_URI` (default `http://localhost:3000/api/basecamp/callback`).

4. Install dependencies and create the database:

   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

5. Run the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), connect Basecamp, pick a column, import your `.md`, then use **Push** on each row.

Optional: set `BASECAMP_DEFAULT_COLUMN_LIST_ID` so the API can sync without passing a column from the UI (list ids come from `GET /api/basecamp/columns` after connecting).

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Next.js dev server                   |
| `npm run build`    | Production build                     |
| `npm run test`     | Parser unit tests                    |
| `npm run db:migrate` | Prisma migrate (interactive)      |

## Production notes

- Switch `DATABASE_URL` to PostgreSQL and run `prisma migrate deploy`.
- Use HTTPS and set `BASECAMP_REDIRECT_URI` / `NEXT_PUBLIC_APP_URL` to your public origin.
- Basecamp tokens are encrypted at rest using `TOKEN_ENCRYPTION_KEY`.

## Git

This folder is the app root tracked against `origin`:

`https://github.com/WebtrixPro/Tasks-Creator.git`

After committing, push the default branch (for example `main`):

`git push -u origin main`
