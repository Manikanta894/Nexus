// ===========================================================================
// NEXUS v2 — unified API router (context: phased refactor, Phase 0).
//
// Previous version: one 1,000+ line if-chain. Now a THIN router that keeps the
// single catch-all (URL surface is unchanged — no new route files) while the
// actual handlers live in `server/domains/*.js`, one file per module
// (see NEXUS v2 "Code Architecture Standards": max ~300–400 lines per file).
//
// Structure:
//   server/core/http.js     json/html helpers
//   server/core/auth.js     HMAC token sign/verify, getAuth
//   server/core/store.js    in-memory store, audit, integration/config helpers
//   server/core/content.js  pillars, demo generators, job builders, seed
//   server/domains/*.js     route tables keyed by "METHOD /path" (or "ANY /path")
// ===========================================================================
import { json } from './server/core/http.js'
import { getAuth } from './server/core/auth.js'
import { ensureDemoSeed } from './server/core/content.js'

import { routes as publicRoutes } from './server/domains/public.js'
import { routes as integrationsRoutes } from './server/domains/integrations.js'
import { routes as socialRoutes } from './server/domains/social.js'
import { routes as blogRoutes } from './server/domains/blog.js'
import { routes as newsRoutes } from './server/domains/news.js'
import { routes as calendarRoutes } from './server/domains/calendar.js'
import { routes as analyticsRoutes } from './server/domains/analytics.js'
import { routes as seasonalRoutes } from './server/domains/seasonal.js'
import { routes as autopilotRoutes } from './server/domains/autopilot.js'
import { routes as discordRoutes } from './server/domains/discord.js'
import { routes as newsletterRoutes } from './server/domains/newsletter.js'
import { routes as dashboardRoutes } from './server/domains/dashboard.js'
import { routes as engageRoutes } from './server/domains/engage.js'
import { routes as vaultRoutes } from './server/domains/vault.js'
import { routes as repurposeRoutes } from './server/domains/repurpose.js'
import { routes as portfolioRoutes } from './server/domains/portfolio.js'
import { routes as recruiterRoutes } from './server/domains/recruiter.js'
import { routes as securityRoutes } from './server/domains/security.js'
import { routes as miscRoutes } from './server/domains/misc.js'

// Seed baseline content on cold start (kept from the original monolith).
ensureDemoSeed()

// Merge all authenticated routes. Method-specific keys ("GET /x") take
// precedence where present; "ANY /x" covers the rest. No collisions exist.
const authed = Object.assign({},
  integrationsRoutes, socialRoutes, blogRoutes, newsRoutes, calendarRoutes,
  analyticsRoutes, seasonalRoutes, autopilotRoutes, discordRoutes, newsletterRoutes,
  dashboardRoutes, engageRoutes, vaultRoutes, repurposeRoutes, portfolioRoutes,
  recruiterRoutes, securityRoutes, miscRoutes,
)

// A tiny window-based API rate limiter (Phase 0 security guardrail). Keeps a
// per-IP request count in a Map; the map is pruned on each reset tick.
const rateLimit = (() => {
  const buckets = new Map()
  const PER_IP = 600      // generous cap for normal dashboard use
  const WINDOW = 60_000
  const tick = setInterval(() => { if (buckets.size > 1000) buckets.clear() }, WINDOW)
  tick.unref?.()
  return {
    check(ip) {
      const now = Date.now()
      const b = buckets.get(ip) || { count: 0, start: now }
      if (now - b.start > WINDOW) { b.count = 0; b.start = now }
      b.count++
      buckets.set(ip, b)
      return b.count <= PER_IP
    },
  }
})()

async function handle(request) {
  const url = new URL(request.url)
  const route = url.pathname.replace('/api', '') || '/'
  const method = request.method

  // Public (unauthenticated) routes first — preserves the original order.
  const pub = publicRoutes[`${method} ${route}`] || publicRoutes[`ANY ${route}`]
  if (pub) return pub({ request, url, route, method })

  // Per-IP rate limit on every authenticated endpoint.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit.check(ip)) return json({ error: 'Too many requests' }, 429)

  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const handler = authed[`${method} ${route}`] || authed[`ANY ${route}`]
  if (handler) return handler({ request, url, route, method, user })

  return json({ error: `Route ${route} not found` }, 404)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle