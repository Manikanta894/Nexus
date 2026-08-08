// ---------------------------------------------------------------------------
// domains/calendar.js — cross-module Content Calendar.
//   GET  /calendar              unified items across social/blog/news/seasonal
//   POST /calendar/reschedule   move any job to a new date
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db } from '../core/store.js'

export const routes = {
  'GET /calendar': () => {
    const items = [...db.social_posts.map(p => ({ module: 'Social', id: p.id, title: p.imageName, pillar: p.analysis?.pillar, quality: p.quality?.overall, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.blog_posts.map(p => ({ module: 'Blog', id: p.id, title: p.article?.title, pillar: p.analysis?.pillar, quality: p.seo?.seoScore, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.news_opportunities.filter(i => i.status === 'Generated').map(i => ({ module: 'News', id: i.id, title: i.headline, pillar: i.pillar, quality: i.score?.overall, status: i.status, date: i.createdAt })), ...db.seasonal_campaigns.map(c => ({ module: 'Seasonal', id: c.id, title: c.eventName, pillar: c.pillar, quality: c.quality?.overall, status: c.status, date: c.eventDate }))]
    return json({ items })
  },

  'POST /calendar/reschedule': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id) || db.blog_posts.find(p => p.id === body.id) || db.seasonal_campaigns.find(p => p.id === body.id)
    if (post) { post.scheduledAt = body.date; post.updatedAt = new Date().toISOString() }
    return json({ ok: true })
  },
}