// ---------------------------------------------------------------------------
// domains/misc.js — cross-cutting endpoints that belong to no single module.
//   POST /factcheck/run   quality gate: originality/cliché check on a job
//   POST /cron            scheduled publisher (x-cron-token gated; note the
//                         global auth gate in route.js applies first)
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { runFactCheck } from '../core/content.js'
import { SECRET } from '../core/auth.js'

export const routes = {
  'POST /factcheck/run': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    let content = null, target = null
    if (body.type === 'blog') { target = db.blog_posts.find(b => b.id === body.id); content = target?.article || target }
    else { target = db.social_posts.find(p => p.id === body.id); content = target?.platforms || target }
    const fc = runFactCheck(content || 'No content found')
    if (target) target.factcheck = fc
    audit(user.sub, 'factcheck.run', { type: body.type, id: body.id })
    return json({ factcheck: fc })
  },

  'POST /cron': async ({ request }) => {
    const cronToken = request.headers.get('x-cron-token')
    if (cronToken !== SECRET) return json({ error: 'Unauthorized' }, 401)
    const now = new Date()
    const due = db.social_posts.filter(p => p.status === 'Scheduled' && (!p.scheduledAt || new Date(p.scheduledAt) <= now))
    for (const p of due) { p.status = 'Published'; p.publishedAt = now.toISOString() }
    audit('cron', 'cron.run', { published: due.length })
    return json({ ok: true, processed: due.length, summary: { published: due.length, news: null } })
  },
}