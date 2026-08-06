# NEXUS — AI Content Command Center

Private, production-grade AI social media & content automation platform. Automates the full content lifecycle — image-to-post, blog publishing, news discovery, seasonal campaigns, LinkedIn engagement, analytics, and brand consistency — with a human-in-the-loop Discord approval gate before anything goes live.

## Tech Stack

- **Frontend:** Next.js 15, React, Tailwind CSS, Recharts, Framer Motion
- **Backend:** Next.js API routes, MongoDB
- **Automation:** GitHub Actions (cron schedules)
- **Storage:** Google Sheets (source of truth), Google Drive (media FIFO)
- **Approval:** Discord (embeds with action buttons)
- **Email:** Resend
- **AI:** Multi-provider fallback chain (NVIDIA → OpenRouter → Groq → OpenAI)

## 23 Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | Command Center | Dashboard with stats, trends, system health |
| 2 | Social Automation | Drive FIFO → AI vision → multi-platform posts |
| 3 | Blog Engine | SEO article + 6-asset content ecosystem |
| 4 | News Radar | Google News + RSS → AI scoring → pipeline |
| 5 | Seasonal Campaigns | Event calendar → campaigns |
| 6 | Repurposing Engine | Best posts → X thread/carousel/reel |
| 7 | Idea Vault | Capture → cluster → promote |
| 8 | Content Calendar | Cross-module Kanban view |
| 9 | Mission Control | Unified analytics dashboard |
| 10 | Analytics | AI Coach + growth insights |
| 11 | LinkedIn Engagement | Find posts → draft comments |
| 12 | Brand Intelligence | Voice/tone/pillars engine |
| 13 | Fact-Check Pass | Originality + claim verification |
| 14 | AI Cost Dashboard | Spend tracking + budget caps |
| 15 | Newsletter | Resend-powered campaigns |
| 16 | Recruiter Signal | Shareable proof-of-skill page |
| 17 | Portfolio Sync | Auto case studies → manikantar.in |
| 18 | Integrations | API credential management |
| 19 | Jarvis / PWA | Voice mode + mobile companion |
| 20 | Audit Log | Full who/what/when trail |
| 21 | Scheduler | Cron jobs + publish queue |
| 22 | Discord Hub | Bot status + interactions |
| 23 | Email Studio | Transactional email composer |

## 24/7 Automation

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Schedule |
|----------|----------|
| `social-automation.yml` | 9 AM + 5 PM daily |
| `blog-automation.yml` | Mon/Wed/Fri 10 AM |
| `scheduler.yml` | Every 30 min |
| `daily-automation.yml` | 8 AM daily |
| `ci-cd.yml` | Every push |

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=nexus
APP_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
```

## Core Principle

**Nothing publishes without explicit human approval via Discord or the Mobile PWA.**

Google Sheets is the single source of truth — every module writes its state to Sheets.
