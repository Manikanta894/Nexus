// ---------------------------------------------------------------------------
// domains/vault.js — Idea Vault module.
//   GET  /vault           ideas (newest first)
//   POST /vault           capture an idea (auto-clustered by pillar)
//   POST /vault/cluster   cluster all uncategorized ideas
//   POST /vault/promote   promote an idea into the social or blog pipeline
//   POST /vault/archive   archive an idea
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { pickPillar, makeSocialJob, makeBlogJob, DEFAULT_PLATFORMS } from '../core/content.js'

export const routes = {
  'GET /vault': () => json({ ideas: db.idea_vault.slice().reverse() }),

  'POST /vault': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    db.idea_vault.push({ id: uuidv4(), text: body.text, cluster: pickPillar(body.text), status: 'New', createdAt: new Date().toISOString() })
    audit(user.sub, 'vault.capture', {})
    return json({ idea: db.idea_vault[db.idea_vault.length - 1] })
  },

  'POST /vault/cluster': async ({ user }) => {
    for (const idea of db.idea_vault) if (idea.status === 'New') { idea.status = 'Clustered'; idea.cluster = pickPillar(idea.text) }
    audit(user.sub, 'vault.cluster', { processed: db.idea_vault.length })
    return json({ processed: db.idea_vault.length })
  },

  'POST /vault/promote': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const idea = db.idea_vault.find(i => i.id === body.id)
    if (!idea) return json({ error: 'Idea not found' }, 404)
    const pipeline = body.pipeline === 'blog' ? 'blog' : 'social'
    let job
    if (pipeline === 'social') {
      job = makeSocialJob(idea.text, idea.text, DEFAULT_PLATFORMS, 'idea-vault')
      db.social_posts.push(job)
    } else {
      job = makeBlogJob(idea.text)
      db.blog_posts.push(job)
    }
    idea.status = 'Promoted'; idea.promotedJobId = job.id; idea.promotedPipeline = pipeline
    audit(user.sub, 'vault.promote', { ideaId: idea.id, pipeline, jobId: job.id })
    return json({ ok: true, job: { id: job.id } })
  },

  'POST /vault/archive': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const idea = db.idea_vault.find(i => i.id === body.id)
    if (idea) idea.status = 'Archived'
    return json({ ok: true })
  },
}