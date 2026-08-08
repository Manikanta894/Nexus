# AGENTS.md

NEXUS — Next.js 15 (App Router) AI content-automation dashboard. Plain JavaScript (no TypeScript, no lint/typecheck/test scripts).

## Commands

- Package manager: **yarn 1** (`packageManager` field; CI runs `yarn install --frozen-lockfile` and `yarn build` on Node 20). `package-lock.json` also exists but CI trusts `yarn.lock`.
- Dev server: `yarn dev` fails on Windows — the script's `NODE_OPTIONS='...'` prefix is POSIX-only. Use `yarn dev:no-reload` or `npx next dev -p 3000`.
- `yarn build` is the only CI gate; run it after changes.
- Verification (the only test suite): E2E API script against a live server.
  1. `npx next dev -p 3100` (script defaults to `BASE=http://127.0.0.1:3100`, not 3000)
  2. `node scripts/api-test.mjs`
  The suite is sequential and stateful (login token reused; jobs created, approved, and reverted across tests). Do not parallelize or reorder.

## Architecture (not obvious from filenames)

- **All** API endpoints live in one optional catch-all: `app/api/[[...path]]/route.js` (~1000 lines, a single `handle()` with an if-chain on pathname; GET/POST/PUT/DELETE/PATCH all map to it). Add routes inside that file, not as new route files.
- Primary data store is **in-memory** (the `db` object in route.js; `lib/memdb.js` is a parallel copy). State resets on server restart. GitHub Actions workflows only `curl` the deployed app's `/api/*` endpoints; they don't execute repo code.
- MongoDB (`mongodb` dep, `MONGO_URL`) is used only by `lib/autopilot.js`; the app runs without it. `scripts/start-mongo.cjs` needs `mongodb-memory-server`, which is **not** in package.json — install it before running.
- Frontend is essentially one file: `app/page.js` (~3000 lines, all dashboard modules) plus `app/recruiter/page.js`. shadcn/ui components live in `components/ui/` (config in `components.json`, `tsx: false`).
- Auth is hand-rolled HMAC tokens (`signToken`/`verifyToken` in route.js) keyed on `APP_SECRET`; `/api/cron` is gated by the `x-cron-token` header. Login falls back to `admin`/`admin123` when `ADMIN_USERNAME`/`ADMIN_PASSWORD` are unset.

## Environment & config quirks

- `.env` is gitignored but present locally. Expected vars: `MONGO_URL`, `DB_NAME`, `APP_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CORS_ORIGINS`, `NEXT_PUBLIC_BASE_URL`.
- `next.config.js`: `compress: false` is deliberate (avoids stalled deliveries through preview proxies) — don't re-enable it. `allowedDevOrigins` covers `*.emergentagent.com` / `*.emergentcf.cloud` preview domains.

## Misc

- `memory/test_credentials.md` is a cross-agent handoff file for auth credentials (gitignored): read before auth tests, write when creating/modifying credentials.
- Leftover artifacts, not part of the system: `tests/__init__.py`, `test-drivemove.mjs`, `test_result.md`, `body.json`, `_build.log`, `DEPLOYMENT.html`.
