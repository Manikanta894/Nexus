// ---------------------------------------------------------------------------
// domains/repurpose.js — Repurposing Engine module.
//   GET  /repurpose            fan-out items (newest first)
//   POST /repurpose/generate   derive thread/carousel/reel variants from a post
//   POST /repurpose/action     approve | reject | skip
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'

export const routes = {
  'GET /repurpose': () => json({ items: db.repurposed_content.slice().reverse() }),

  'POST /repurpose/generate': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Post not found' }, 404)
    const item = { id: uuidv4(), sourcePostId: body.postId, sourceTitle: post.imageName, sourcePillar: post.analysis?.pillar, variants: { xThread: ['Thread point 1', 'Thread point 2', 'Thread point 3'], carousel: [{ slide: 1, text: 'Slide 1' }, { slide: 2, text: 'Slide 2' }], reelScript: { scene: 'Opening hook', voiceover: 'Key message', text: 'Caption overlay', cta: 'Follow for more' }, threadsSeries: ['Part 1', 'Part 2'] }, status: 'Pending Approval', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.repurposed_content.push(item)
    audit(user.sub, 'repurpose.generate', { id: item.id })
    return json({ item })
  },

  'POST /repurpose/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const item = db.repurposed_content.find(x => x.id === body.id)
    if (item) {
      if (body.action === 'approve') { item.status = 'Published'; item.publishedAt = new Date().toISOString() }
      else if (body.action === 'reject') item.status = 'Rejected'
      else if (body.action === 'skip') item.status = 'Skipped'
      item.updatedAt = new Date().toISOString()
      audit(user.sub, `repurpose.${body.action}`, { id: item.id })
    }
    return json({ ok: true, job: item || {} })
  },
}