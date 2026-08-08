// ---------------------------------------------------------------------------
// domains/portfolio.js — Portfolio Sync module.
//   GET  /portfolio           suggested posts + case studies
//   POST /portfolio/draft     draft a case study from a published post
//   POST /portfolio/action    approve → synced
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'

export const routes = {
  'GET /portfolio': () => json({ suggested: db.social_posts.filter(p => p.status === 'Published' && (p.quality?.overall || 0) >= 85).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, quality: p.quality.overall })), studies: db.portfolio_case_studies }),

  'POST /portfolio/draft': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Not found' }, 404)
    const study = { id: uuidv4(), title: `Case Study: ${post.imageName}`, category: post.analysis?.pillar, what: `Published about ${post.analysis?.topic}`, why: 'Tested a hypothesis about engagement', result: `Quality score: ${post.quality.overall}/100`, strategy: 'Platform-native content with strong hook', status: 'Pending Approval', syncStatus: 'Draft', createdAt: new Date().toISOString() }
    db.portfolio_case_studies.push(study)
    audit(user.sub, 'portfolio.draft', { id: study.id })
    return json({ study })
  },

  'POST /portfolio/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const s = db.portfolio_case_studies.find(x => x.id === body.id)
    if (s && body.action === 'approve') { s.syncStatus = 'Synced'; s.status = 'Published'; s.updatedAt = new Date().toISOString(); audit(user.sub, 'portfolio.approve', { id: s.id }) }
    return json({ job: s })
  },
}