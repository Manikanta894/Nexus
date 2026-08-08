// ---------------------------------------------------------------------------
// domains/public.js — unauthenticated routes.
//   ANY  /                  API liveness
//   ANY  /root              ping target for the frontend connection nudge
//   POST /auth/login        password login → HMAC token
//   POST /auth/unlock       emergency recovery (x-recovery-token == APP_SECRET)
//   ANY  /recruiter/public  shareable proof-of-skill page (slug + passcode)
//   ANY  /oauth/callback    LinkedIn / Meta OAuth redirect target
// Everything else in the API sits behind the auth gate in route.js.
//
// /auth/unlock lives in the UNAUTHENTICATED table on purpose: emergency
// lockdown revokes every session, so the recovery path cannot require a valid
// user session. It is instead authenticated by its own header token.
// ---------------------------------------------------------------------------
import { json, html } from '../core/http.js'
import { signToken, verifyToken, SECRET } from '../core/auth.js'
import { db, audit, findIntegration, upsertIntegration, registerSession } from '../core/store.js'
import { encrypt, decrypt } from '../../../../../lib/social-post.js'

// Brute-force protection on login (per-IP sliding window).
const loginLimiter = (() => {
  const hits = new Map()
  const MAX = 10 // 10 attempts
  const WINDOW = 15 * 60 * 1000 // per 15 minutes
  const tick = setInterval(() => { if (hits.size > 1000) hits.clear() }, WINDOW)
  tick.unref?.()
  return {
    allowed(ip) {
      const now = Date.now()
      const rec = hits.get(ip) || { count: 0, start: now }
      if (now - rec.start > WINDOW) { rec.count = 0; rec.start = now }
      rec.count++
      hits.set(ip, rec)
      return rec.count <= MAX
    },
  }
})()

export const routes = {
  'ANY /': () => json({ message: 'NEXUS API online', time: new Date().toISOString() }),
  'ANY /root': () => json({ message: 'NEXUS API online', time: new Date().toISOString() }),

  'POST /auth/login': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!loginLimiter.allowed(ip)) return json({ error: 'Too many login attempts — try again later' }, 429)
    const U = process.env.ADMIN_USERNAME || 'admin'
    const P = process.env.ADMIN_PASSWORD || 'admin123'
    if (body.username === U && body.password === P) {
      const token = signToken({ sub: 'admin', name: 'Manikanta', role: 'owner', exp: Date.now() + 7 * 86400000 })
      const payload = verifyToken(token)
      if (payload?.jti) registerSession(payload.jti, 'admin', { method: 'password', ip })
      audit('admin', 'auth.login', { method: 'password' })
      return json({ token, user: { name: 'Manikanta', role: 'owner', username: U } })
    }
    return json({ error: 'Invalid credentials' }, 401)
  },

  // Emergency recovery: allowed WITHOUT a user session because lockdown revokes
  // every session. Authenticated by the x-recovery-token header (== APP_SECRET).
  'POST /auth/unlock': ({ request }) => {
    const token = request.headers.get('x-recovery-token') || ''
    if (token !== SECRET) return json({ error: 'Invalid recovery token' }, 403)
    db.security.locked = false
    db.security.revoked = []
    audit('system', 'auth.unlock', {})
    return json({ ok: true, locked: false })
  },

  // Public recruiter page (no auth — shareable link)
  'ANY /recruiter/public': ({ url }) => {
    const slug = url.searchParams.get('slug') || ''
    const pass = url.searchParams.get('passcode') || ''
    const cfgDoc = db.config.find(c => c.key === 'recruiter' && c.data?.slug === slug)
    if (!cfgDoc || cfgDoc.data.enabled === false) return json({ error: 'Not found' }, 404)
    const cfg = cfgDoc.data
    if (cfg.passcode && cfg.passcode !== pass) return json({ error: 'Passcode required' }, 401)
    const published = db.social_posts.filter(p => p.status === 'Published')
    const items = (cfg.items || []).filter(i => i.selected).map(s => {
      const src = published.find(x => x.id === s.id)
      return { id: s.id, title: src?.imageName || s.title || '', category: src?.analysis?.pillar || s.category || '', reason: (src?.quality?.overall ? `Published with quality score ${src.quality.overall}/100` : '') || s.reason || '', url: src?.publishedUrl || null }
    })
    return json({ slug, enabled: true, name: db.brand[0]?.data?.name || 'Manikanta R', headline: db.brand[0]?.data?.tagline || '', items })
  },

  // OAuth callback (browser redirect, no auth)
  'ANY /oauth/callback': async ({ url }) => {
    const provider = url.searchParams.get('provider')
    const code = url.searchParams.get('code')
    const err = url.searchParams.get('error')
    if (err) return html(`OAuth error: ${err}`, false)
    if (!provider || !code) return html('Missing OAuth parameters', false)
    const redirect = `${url.origin}/api/oauth/callback?provider=${provider}`
    try {
      if (provider === 'linkedin') {
        const it = findIntegration('linkedin')
        const f = it?.fields || {}
        if (!f.clientId || !f.clientSecret) return html('LinkedIn OAuth is not configured', false)
        const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: f.clientId, client_secret: decrypt(f.clientSecret) }),
        })
        const b = await r.json()
        if (!r.ok || b.error) throw new Error(b.error_description || b.error || `LinkedIn ${r.status}`)
        upsertIntegration('linkedin', { fields: { ...f, accessToken: encrypt(b.access_token), refreshToken: b.refresh_token ? encrypt(b.refresh_token) : (f.refreshToken || '') }, configured: true })
        audit('admin', 'oauth.complete', { provider: 'linkedin' })
        return html('NEXUS · LinkedIn connected ✓')
      }
      if (provider === 'meta') {
        const fb = findIntegration('facebook')
        const f = fb?.fields || {}
        if (!f.clientId || !f.clientSecret) return html('Meta OAuth is not configured', false)
        const r = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${encodeURIComponent(f.clientId)}&client_secret=${encodeURIComponent(decrypt(f.clientSecret))}&redirect_uri=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}`)
        const b = await r.json()
        if (!r.ok || b.error) throw new Error(b.error?.message || 'Meta token exchange failed')
        let token = b.access_token
        const ll = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(f.clientId)}&client_secret=${encodeURIComponent(decrypt(f.clientSecret))}&fb_exchange_token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => ({}))
        if (ll.access_token) token = ll.access_token
        upsertIntegration('facebook', { fields: { ...f, accessToken: encrypt(token) }, configured: true })
        audit('admin', 'oauth.complete', { provider: 'meta' })
        return html('NEXUS · Meta connected ✓')
      }
      return html('Unknown OAuth provider', false)
    } catch (e) {
      return html(`OAuth failed: ${e.message}`, false)
    }
  },
}

