// ---------------------------------------------------------------------------
// domains/social.js — Social Automation module.
//   GET  /social           queue (newest first)
//   POST /social/generate  create a job (quick-compose / drive-image)
//   POST /social/action    approve | reject | skip | schedule | edit | regenerate
//   POST /revert           pop the last version snapshot (social + blog)
//   ANY  /versions         version history for a job
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { makeSocialJob, demoGenerate, qualityScores, DEFAULT_PLATFORMS } from '../core/content.js'
import { estimateReach } from '../../../../../lib/pipeline.js'

export const routes = {
  'GET /social': () => json({ posts: db.social_posts.slice().reverse() }),

  'POST /social/generate': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const platforms = body.platforms || DEFAULT_PLATFORMS
    const job = makeSocialJob(body.seedText || body.imageName || 'AI in business', body.imageName, platforms, body.imageUrl ? 'drive-image' : 'quick-compose')
    job.imageUrl = body.imageUrl || null
    db.social_posts.push(job)
    audit(user.sub, 'social.generate', { id: job.id, mode: 'demo' })
    return json({ job })
  },

  'POST /social/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    if (post.factcheck?.status === 'Blocked' && body.action === 'approve') return json({ error: 'Blocked by Fact-Check gate' }, 409)
    const now = new Date().toISOString()
    if (body.action === 'edit' || body.action === 'regenerate') {
      post.versions.push({ v: post.versions.length + 1, action: body.action, snapshot: JSON.parse(JSON.stringify(post.platforms)), ts: now })
    }
    if (body.action === 'approve') { post.status = 'Published'; post.publishedAt = now; if (!post.analytics) post.analytics = estimateReach(post) }
    else if (body.action === 'reject') post.status = 'Rejected'
    else if (body.action === 'skip') post.status = 'Skipped'
    else if (body.action === 'schedule') { post.status = 'Scheduled'; post.scheduledAt = body.scheduledAt || now }
    else if (body.action === 'regenerate') { const analysis = { ...post.analysis, topic: post.analysis.topic + ' ' }; post.platforms = demoGenerate(db.brand[0]?.data || {}, analysis, post.selectedPlatforms); post.quality = qualityScores(analysis.topic) }
    else if (body.action === 'edit' && body.platforms) { post.platforms = { ...post.platforms, ...body.platforms } }
    post.updatedAt = now
    audit(user.sub, `social.${body.action}`, { id: post.id })
    return json({ job: post })
  },

  'POST /revert': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    let job = db.social_posts.find(p => p.id === body.id) || db.blog_posts.find(p => p.id === body.id)
    if (job && (job.versions || []).length) {
      const last = job.versions.pop()
      if (body.module === 'blog' && last.snapshot?.article) job.article = last.snapshot.article
      else if (last.snapshot) job.platforms = last.snapshot
      job.updatedAt = new Date().toISOString()
      audit(user.sub, 'revert', { module: body.module, id: job.id })
    }
    return json({ ok: true, job: job || {} })
  },

  'ANY /versions': ({ url }) => {
    const module = url.searchParams.get('module')
    const id = url.searchParams.get('id')
    let job = null
    if (module === 'blog') job = db.blog_posts.find(p => p.id === id)
    else job = db.social_posts.find(p => p.id === id)
    return json({ versions: job?.versions || [] })
  },
}