// ---------------------------------------------------------------------------
// domains/recruiter.js — Recruiter Signal configuration (the public,
// unauthenticated read lives in domains/public.js).
//   GET /recruiter   current config + suggested published posts
//   PUT /recruiter   save config (slug, passcode, enabled, items)
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'

export const routes = {
  'GET /recruiter': () => {
    const cfgDoc = db.config.find(c => c.key === 'recruiter')
    const cfg = cfgDoc?.data || { slug: '', passcode: '', enabled: true, items: [] }
    const suggested = db.social_posts.filter(p => p.status === 'Published' && (p.quality?.overall || 0) >= 75).slice(0, 10).map(p => ({ id: p.id, title: p.imageName, category: p.analysis?.pillar || 'Content', reason: `Published with quality score ${p.quality?.overall}/100`, url: p.publishedUrl || null, selected: false }))
    return json({ config: cfg, suggested })
  },

  'PUT /recruiter': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const existing = db.config.findIndex(c => c.key === 'recruiter')
    if (existing >= 0) db.config[existing].data = body.config
    else db.config.push({ key: 'recruiter', data: body.config })
    audit(user.sub, 'recruiter.save', {})
    return json({ ok: true })
  },
}