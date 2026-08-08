// ---------------------------------------------------------------------------
// domains/engage.js — LinkedIn Engagement module.
//   ANY  /engage/find     discover relevant discussions (demo candidates)
//   POST /engage/comment  draft an intelligent comment (needs approval)
//   GET  /engage          drafted comments (newest first)
//   POST /engage/action   approve | reject
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'

export const routes = {
  'ANY /engage/find': () => {
    const topics = ['AI in leadership', 'HR trends 2026', 'MBA insights', 'Productivity systems']
    return json({ candidates: topics.map((t, i) => ({ id: `cand-${i}`, author: ['Priya S.', 'Rahul V.', 'Ananya I.', 'Karthik R'][i], text: `${t} \u2014 here's what we learned.`, likes: 100 + i * 50, comments: 20 + i * 10, link: `https://linkedin.com/posts/demo-${i}`, topic: t })) })
  },

  'POST /engage/comment': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const comment = `Great insights on ${body.topic || 'this'}! I especially agree with your point about practical frameworks over theory.`
    const c = { id: uuidv4(), topic: body.topic, comment, status: 'Pending Approval', mode: 'demo', author: body.author, createdAt: new Date().toISOString() }
    db.linkedin_comments.push(c)
    audit(user.sub, 'engage.draft', { id: c.id })
    return json({ comment: c })
  },

  'GET /engage': () => json({ comments: db.linkedin_comments.slice().reverse() }),

  'POST /engage/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const c = db.linkedin_comments.find(x => x.id === body.id)
    if (c) { c.status = body.action === 'approve' ? 'Published' : 'Rejected'; c.updatedAt = new Date().toISOString(); audit(user.sub, `engage.${body.action}`, { id: c.id }) }
    return json({ job: c })
  },
}