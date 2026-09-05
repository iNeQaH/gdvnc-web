# GDVN

Community site for **Geometry Dash Vietnam**: ranked lists, player and creator leaderboards, record and work submissions, profiles, timeline, and an admin review panel.

- Live site: [https://gdvnc-web.vercel.app](https://gdvnc-web.vercel.app)
- Stack: Next.js 16 (App Router), React 19, Prisma, PostgreSQL
- Dev server: `http://localhost:8088` (not port 3000)

This README covers installing and running the app on your machine.

---

## 1. Prerequisites

Install these before anything else.

| Tool | Version | Notes |
|------|---------|--------|
| [Node.js](https://nodejs.org) | **20 LTS or newer** | Includes `npm`. Confirm with `node -v` and `npm -v`. |
| [Git](https://git-scm.com) | any recent | Needed to clone the repository. |
| PostgreSQL | 14+ | A hosted database (recommended: [Neon](https://neon.tech)) **or** Postgres on your machine / Docker. |

Optional but useful later:

- A [UploadThing](https://uploadthing.com) token if you want avatar, cover, work, and timeline image uploads
- SMTP credentials (Gmail App Password or another SMTP host) if you want registration OTP email
- Docker Desktop if you prefer a local Postgres container instead of Neon

---

## 2. Clone the repository

```bash
git clone https://github.com/iNeQaH/gdvnc-web.git
cd gdvnc-web
```

All following commands run from this folder (the one that contains `package.json`).

---

## 3. Create the environment file

Copy the example file, then edit the copy. Do not commit `.env.local`.

**Windows (Command Prompt or PowerShell):**

```bash
copy .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor. Next.js loads this file automatically in development.

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string. The app will not start without it. |
| `DIRECT_URL` | Direct Postgres URL used by Prisma for schema sync. For a normal database, set this to the **same value** as `DATABASE_URL`. |

### Recommended

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs login cookies. Use a long random string (at least 8 characters). Local development can leave it empty and a built-in fallback is used. **Production must set this.** |

### Optional

Leave these commented or empty until you need the matching feature.

| Variable | Purpose |
|----------|---------|
| `UPLOADTHING_TOKEN` | Image uploads (avatars, covers, works, timeline). Paste the raw base64 token only — no quotes around the value. |
| `SMTP_USER` / `SMTP_PASS` | Required together to send OTP email. For Gmail, `SMTP_USER` is the full Gmail address and `SMTP_PASS` is an [App Password](https://myaccount.google.com/apppasswords). |
| `SMTP_HOST` / `SMTP_PORT` | Defaults to `smtp.gmail.com` and `587` if omitted. |
| `SMTP_FROM` | From header, e.g. `"GDVN" <you@gmail.com>`. Defaults to `SMTP_USER`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile. If unset, the built-in captcha is used. |
| `CAPTCHA_SECRET` | Secret for the built-in captcha. Falls back to `JWT_SECRET`. |
| `CRON_SECRET` | Protects `/api/cron/*`. Needed only if you call those routes yourself. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for embeds and Open Graph (production: `https://gdvnc-web.vercel.app`). |
| `ALLOWED_DEV_ORIGINS` | Extra origins (comma-separated) allowed to load the Next.js dev client over LAN or a tunnel. |
| `GDVN_SHEET_ID` / `GDVN_SHEET_GID` | Override the default Vietnamese rated-levels Google Sheet. |

Example `.env.local` for a local Docker database:

```
DATABASE_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
DIRECT_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
JWT_SECRET="replace-with-a-long-random-string"
```

For Neon, use the connection strings from the Neon dashboard. If Neon shows a pooled URL and a direct URL, put the pooled URL in `DATABASE_URL` and the direct URL in `DIRECT_URL`. Add `sslmode=require` when the host requires TLS (Neon does).

---

## 4. Set up PostgreSQL

Pick **one** of the options below, then continue to step 5.

### Option A — Neon (same style as production)

1. Create a project at [https://console.neon.tech](https://console.neon.tech).
2. Copy the connection string.
3. Paste it into both `DATABASE_URL` and `DIRECT_URL` in `.env.local` (or use pooled + direct as described above).

You can also point `.env.local` at the **production** Neon database if you already have one. That shows real data locally. Do not do this on a shared machine.

### Option B — Docker

With Docker running:

```bash
docker run --name gdvn-pg -e POSTGRES_PASSWORD=gdvn -e POSTGRES_DB=gdvn -p 5432:5432 -d postgres:16
```

Then in `.env.local`:

```
DATABASE_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
DIRECT_URL="postgresql://postgres:gdvn@localhost:5432/gdvn"
```

Stop / start later with `docker stop gdvn-pg` and `docker start gdvn-pg`.

### Option C — Postgres installed on the machine

Create a database and user, then set `DATABASE_URL` / `DIRECT_URL` to match. Example:

```
postgresql://USER:PASSWORD@localhost:5432/gdvn
```

---

## 5. Install packages and apply the schema

From the project root:

```bash
npm install
npx prisma generate
npx prisma db push
```

What these do:

1. `npm install` — installs dependencies. `postinstall` already runs `prisma generate`.
2. `npx prisma generate` — regenerates the Prisma Client after schema changes. Run this again whenever `prisma/schema.prisma` changes.
3. `npx prisma db push` — creates or updates tables on the database in `.env.local`. This is the local workflow. Vercel production does not run migrate on build; extra columns are also applied at runtime when needed.

A brand-new empty database will have **no users**. You will need to register, or point `DATABASE_URL` at a database that already has accounts (for example Neon production).

If you change the Prisma schema later, run `npx prisma generate` and `npx prisma db push` again.

---

## 6. Start the app

### Windows

Double-click `start.bat`, or in PowerShell:

```powershell
.\start.ps1
```

`start.bat` / `start.ps1` will:

1. Check that Node.js is installed
2. Run `npm install` if `node_modules` is missing
3. Copy `.env.example` to `.env.local` if the env file is missing, then stop and ask you to fill `DATABASE_URL`
4. Start the dev server

### macOS / Linux / any terminal

```bash
npm run dev
```

The app listens on **all interfaces**, port **8088**:

- This computer: [http://localhost:8088](http://localhost:8088)
- Other devices on the same network: `http://YOUR_LAN_IP:8088`

Stop the server with **Ctrl+C** in that terminal.

### Useful npm scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Development server on `0.0.0.0:8088` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on `0.0.0.0:8088` (run `npm run build` first) |
| `npm run lint` | ESLint |

---

## 7. Check that it works

1. Open [http://localhost:8088](http://localhost:8088). The home leaderboard should load (empty if the database is new).
2. Open [http://localhost:8088/helps](http://localhost:8088/helps) — FAQ is public.
3. If APIs return 500, `DATABASE_URL` is missing or Postgres is not reachable.

Registration OTP needs `SMTP_USER` and `SMTP_PASS`. Image upload on profiles and timeline needs `UPLOADTHING_TOKEN`.

To use the site from a phone on your LAN or through a tunnel (ngrok, Cloudflare), set `ALLOWED_DEV_ORIGINS` to that origin if the UI loads but clicks do nothing.

---

## 8. Deploy (Vercel)

Production is already on Vercel: [https://gdvnc-web.vercel.app](https://gdvnc-web.vercel.app).

To deploy your own instance:

1. Import [https://github.com/iNeQaH/gdvnc-web](https://github.com/iNeQaH/gdvnc-web) into Vercel.
2. Set the same environment variables in the Vercel project (at least `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`).
3. Add `UPLOADTHING_TOKEN`, SMTP, and Turnstile there as well if you need those features in production.
4. Deploy. Framework preset: Next.js. Cron jobs in `vercel.json` call `/api/cron/purge-notifications` (03:00 UTC) and `/api/cron/sync-gdvn-sheet` (04:00 UTC).

Do not commit `.env`, `.env.local`, or secrets.

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| `DATABASE_URL is not set` | Create `.env.local` and set both URL variables. Restart `npm run dev`. |
| `npm install` / Prisma errors | Use Node 20+. Delete `node_modules` and run `npm install` again. |
| Blank pages, APIs 500 | Postgres is down, the URL is wrong, or the schema was never pushed (`npx prisma db push`). |
| Login / register OTP fails | Set `SMTP_USER` and `SMTP_PASS`. For Gmail, use an App Password, not the normal account password. |
| Images do not upload | Set `UPLOADTHING_TOKEN` (raw token, no surrounding quotes) and restart. |
| UI loads on another device but clicks do nothing | Set `ALLOWED_DEV_ORIGINS` and restart. The dev server already binds to `0.0.0.0`. |
| Port already in use | Another process is using 8088. Close it, or stop the previous `npm run dev`. |
| Schema / Prisma Client out of date | `npx prisma generate` then `npx prisma db push`. |

---

## License / contact

Community project for Geometry Dash Vietnam. Issues and pull requests: [iNeQaH/gdvnc-web](https://github.com/iNeQaH/gdvnc-web).
