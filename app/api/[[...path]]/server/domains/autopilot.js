// ---------------------------------------------------------------------------
// domains/autopilot.js — Auto-Pilot 24/7 config + the full pipeline orchestrator.
//   GET  /autopilot          config + status
//   PUT  /autopilot          save config
//   POST /autopilot/run      generate one social job immediately
//   POST /pipeline/run       run phased automation (social | blog | news),
//                            optionally respecting the Sheets schedule
//   POST /pipeline/publish   publish an approved post to its platforms + archive
//   GET  /pipeline/status    running/completed/failed + learning insights
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit, makeDbAdapter } from '../core/store.js'
import { makeSocialJob, DEFAULT_PLATFORMS } from '../core/content.js'
import { estimateReach } from '../../../../../lib/pipeline.js'

export const routes = {
  'GET /autopilot': () => {
    const cfg = db.config.find(c => c.key === 'autopilot')
    return json({ config: cfg?.data || null, status: { running: true } })
  },

  'PUT /autopilot': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const config = body.config || body.cfg || {}
    const existing = db.config.findIndex(c => c.key === 'autopilot')
    if (existing >= 0) db.config[existing].data = config
    else db.config.push({ key: 'autopilot', data: config })
    audit(user.sub, 'autopilot.save', {})
    return json({ ok: true })
  },

  'POST /autopilot/run': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const job = makeSocialJob(body.seedText || 'AI in business', 'Auto-generated', DEFAULT_PLATFORMS, 'autopilot')
    db.social_posts.push(job)
    audit(user.sub, 'autopilot.run', { id: job.id })
    return json({ ok: true, social: { id: job.id } })
  },

  // Runs the full phased automation. If GitHub Actions fires every 30 min but
  // we only want scheduled posts, respectSchedule:true makes the pipeline run
  // only at the configured times (default 5 posting slots per weekday).
  'POST /pipeline/run': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const module = body.module || 'social'
    const { runPipeline, blogPipeline, scanNews, loadSchedule, shouldRunAt } = await import('../../../../../lib/pipeline.js')
    if (body.respectSchedule) {
      const schedule = await loadSchedule({ collection: (name) => ({ findOne: async (q = {}) => { const items = db[name] || []; if (!q || Object.keys(q).length === 0) return items[0] || null; return items.find((i) => Object.entries(q).every(([k, v]) => i[k] === v)) || null } }) })
      if (!shouldRunAt(schedule, new Date())) {
        return json({ ok: false, reason: 'Not a scheduled posting time — checking schedule from Google Sheets', schedule })
      }
    }
    const dbAdapter = makeDbAdapter()
    let result
    if (module === 'blog') result = await blogPipeline(dbAdapter, { seedText: body.seedText || 'AI in business' }, body.source || 'manual')
    else if (module === 'news') result = await scanNews(dbAdapter)
    else result = await runPipeline(dbAdapter, { platforms: body.platforms || DEFAULT_PLATFORMS, seedText: body.seedText || 'AI in business' }, body.source || 'manual')
    audit(user.sub, `pipeline.${module}`, { ok: result.ok, reason: result.reason || null })
    return json(result)
  },

  'POST /pipeline/publish': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find((p) => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    const { publishToPlatforms, archiveImage } = await import('../../../../../lib/pipeline.js')
    const integrations = {}
    for (const it of db.integrations) integrations[it.id] = it.fields || {}
    const pub = await publishToPlatforms(post, integrations)
    if (pub.ok) {
      post.status = 'Published'
      post.publishedAt = new Date().toISOString()
      if (!post.analytics) post.analytics = estimateReach(post)
      post.publish = { at: post.publishedAt, results: pub.results, notifications: pub.notifications || [] }
      await archiveImage(db, post.imageId, {}).catch(() => {})
      audit(user.sub, 'pipeline.publish', { id: post.id, ok: true, platforms: post.selectedPlatforms })
    } else {
      post.status = 'Failed'
      post.lastError = Object.values(pub.results).find((r) => !r.ok)?.error || 'Publish failed'
      // PRD Social Step 10 — surface the retry + failure notifications so the user is informed.
      post.publish = { at: new Date().toISOString(), results: pub.results, notifications: pub.notifications || [] }
      audit(user.sub, 'pipeline.publish', { id: post.id, ok: false, error: post.lastError })
    }
    return json({ ok: pub.ok, results: pub.results, notifications: pub.notifications || [], job: post })
  },

  'GET /pipeline/status': async () => {
    const { learningInsights } = await import('../../../../../lib/pipeline.js')
    const insights = learningInsights(db.social_posts)
    return json({
      running: db.social_posts.filter((p) => p.status === 'Pending Approval' || p.status === 'Scheduled').length,
      completed: db.social_posts.filter((p) => p.status === 'Published').length,
      failed: db.social_posts.filter((p) => p.status === 'Failed' || p.status === 'Rejected').length,
      insights,
    })
  },
}