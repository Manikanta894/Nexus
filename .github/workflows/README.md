# GitHub Actions — 24/7 Automation Setup

These workflows run the Nexus automation pipeline on GitHub's infrastructure — no n8n, no VPS needed for scheduling.

## Workflows

| Workflow | File | Schedule | What it does |
|----------|------|----------|-------------|
| Social Automation | `social-automation.yml` | 9 AM + 5 PM daily | Generates multi-platform social post from Drive FIFO |
| Blog Automation | `blog-automation.yml` | Mon/Wed/Fri 10 AM | Auto-generates SEO blog + newsletter |
| Scheduler | `scheduler.yml` | Every 30 min | Publishes scheduled posts + scans news |
| Daily Pipeline | `daily-automation.yml` | 8 AM daily | Full run: publish + social + news + seasonal |

## Required Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value | How to get it |
|--------|-------|---------------|
| `APP_URL` | `https://your-app.vercel.app` | Your deployed Vercel URL |
| `NEXUS_API_TOKEN` | JWT token | Generate from `/api/auth/login` |
| `NEXUS_CRON_TOKEN` | Your APP_SECRET value | Same as your env `APP_SECRET` |
| `DISCORD_WEBHOOK` | Webhook URL | Discord channel settings → Integrations |

## Generate API Token

```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
# Use the `token` field as NEXUS_API_TOKEN
```

## Manual Trigger

Each workflow has a **"Run workflow"** button in the Actions tab — click to run on demand.

## How the Automation Chain Works

```
GitHub Actions (cron) → calls /api/social/generate
  ↓
Drive FIFO picks oldest image → locks it
  ↓
AI vision + research → LinkedIn/IG/FB/Threads drafts
  ↓
Quality check → saves to Google Sheets
  ↓
Discord approval card sent (buttons: Approve/Reject/Edit/Schedule)
  ↓
YOU tap Approve → status = Published
  ↓
Image MOVED to Archive → Sheets mirrored → Audit logged
```

**You stay in control** — nothing publishes without your Discord/PWA approval click.
