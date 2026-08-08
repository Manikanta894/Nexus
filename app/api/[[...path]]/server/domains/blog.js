// ---------------------------------------------------------------------------
// domains/blog.js — Blog Engine module.
//   GET  /blog           queue (newest first)
//   POST /blog/generate  create an SEO blog job from a seed topic
//   POST /blog/action    approve (→ also drafts newsletter) | reject | schedule
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { makeBlogJob } from '../core/content.js'

export const routes = {
  'GET /blog': () => json({ posts: db.blog_posts.slice().reverse() }),

  'POST /blog/generate': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const seed = body.seedText || 'AI in business'
    const job = makeBlogJob(seed)
    db.blog_posts.push(job)
    audit(user.sub, 'blog.generate', { id: job.id })
    return json({ job })
  },

  'POST /blog/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const post = db.blog_posts.find(p => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    const now = new Date().toISOString()
    if (body.action === 'approve') {
      post.status = 'Published'; post.publishedAt = now
      post.publishedUrl = `https://insights.manikantar.in/blog/${post.article.slug}`
      db.newsletter_campaigns.push({ id: uuidv4(), subject: post.article.title, preview: post.article.metaDescription?.slice(0, 120), body: `<h1>${post.article.title}</h1><p>${post.article.intro}</p><p><a href="${post.publishedUrl}">Read full article</a></p>`, template: 'Blog Announcement', blogId: post.id, status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: now, updatedAt: now })
    }
    else if (body.action === 'reject') post.status = 'Rejected'
    else if (body.action === 'schedule') { post.status = 'Scheduled'; post.scheduledAt = body.scheduledAt || now }
    post.updatedAt = now
    audit(user.sub, `blog.${body.action}`, { id: post.id })
    return json({ job: post })
  },
}