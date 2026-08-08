// ---------------------------------------------------------------------------
// domains/news.js — News Radar module.
//   GET  /news               opportunities (newest first)
//   GET  /news/config        merged config (defaults + saved)
//   PUT  /news/config        save config
//   POST /news/scan          run the radar scan pipeline
//   POST /news/action        ignore | save | generate_social | generate_blog | generate_all
//   GET  /news/analytics     aggregate stats
//   GET  /news/learning      insights for the Learning Engine
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit, upsertConfig, makeDbAdapter } from '../core/store.js'
import { makeSocialJob, makeBlogJob, DEFAULT_PLATFORMS } from '../core/content.js'
import { newsRadarScan, newsAnalytics, newsInsights, newsConfigDefaults } from '../../../../../lib/news-radar.js'

export function newsConfig() {
  const doc = db.config.find(c => c.key === 'news')
  return { ...newsConfigDefaults(), ...(doc?.data || {}) }
}

export const routes = {
  'GET /news': () => json({ items: db.news_opportunities.slice().reverse() }),

  'GET /news/config': () => json({ config: newsConfig() }),

  'PUT /news/config': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const cfg = upsertConfig('news', { ...newsConfig(), ...(body.config || {}) })
    audit(user.sub, 'news.config', {})
    return json({ ok: true, config: cfg })
  },

  'POST /news/scan': async ({ user }) => {
    const result = await newsRadarScan(makeDbAdapter(), newsConfig())
    for (const it of result.items) db.news_opportunities.push(it)
    audit(user.sub, 'news.scan', { scanned: result.scanned, kept: result.kept })
    return json({ scanned: result.scanned, kept: result.kept, items: result.items })
  },

  'POST /news/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const now = new Date().toISOString()
    const item = db.news_opportunities.find(i => i.id === body.id)
    if (!item) return json({ error: 'Not found' }, 404)
    item.updatedAt = now
    if (body.action === 'ignore') { item.status = 'Ignored'; item.approvalStatus = 'Rejected' }
    else if (body.action === 'save') { item.status = 'Saved'; item.approvalStatus = 'SavedForLater' }
    else if (body.action === 'generate_social' || body.action === 'generate_all') {
      const job = makeSocialJob(item.headline, item.headline, DEFAULT_PLATFORMS, 'news-seed')
      db.social_posts.push(job)
      item.status = 'Generated'; item.approvalStatus = 'Approved'; item.generatedContent.socialJobId = job.id
      audit(user.sub, 'news.generate_social', { newsId: item.id, jobId: job.id })
      if (body.action === 'generate_all') {
        const bjob = makeBlogJob(item.headline)
        db.blog_posts.push(bjob); item.generatedContent.blogJobId = bjob.id
        const camp = { id: uuidv4(), subject: `News: ${item.headline}`, preview: (item.analysis?.summary || item.headline).slice(0, 100), body: `<h1>${item.headline}</h1><p>${item.analysis?.summary || item.description || ''}</p>`, template: 'News Brief', status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, sourceNewsId: item.id, createdAt: now, updatedAt: now }
        db.newsletter_campaigns.push(camp); item.generatedContent.newsletterCampaignId = camp.id
        audit(user.sub, 'news.generate_blog', { newsId: item.id, jobId: bjob.id })
        return json({ ok: true, item, socialJob: { id: job.id }, blogJob: { id: bjob.id }, newsletterCampaign: { id: camp.id } })
      }
      return json({ ok: true, item, socialJob: { id: job.id } })
    }
    else if (body.action === 'generate_blog') {
      const bjob = makeBlogJob(item.headline)
      db.blog_posts.push(bjob)
      item.status = 'Generated'; item.approvalStatus = 'Approved'; item.generatedContent.blogJobId = bjob.id
      audit(user.sub, 'news.generate_blog', { newsId: item.id, jobId: bjob.id })
      return json({ ok: true, item, blogJob: { id: bjob.id } })
    }
    return json({ ok: true, item })
  },

  'GET /news/analytics': () => json(newsAnalytics(db.news_opportunities)),
  'GET /news/learning': () => json(newsInsights(db.news_opportunities)),
}