// ---------------------------------------------------------------------------
// domains/newsletter.js — Newsletter module (Resend) + transactional email.
//   ANY  /newsletter/subscribers  counts
//   ANY  /newsletter/campaigns    campaigns (newest first)
//   POST /newsletter/campaign     create draft
//   POST /newsletter/subscribe    add subscriber
//   POST /newsletter/generate     draft from a published blog
//   POST /newsletter/action       approve | reject | edit
//   POST /newsletter/send         send (must be Approved first)
//   POST /newsletter/unsubscribe  unsubscribe by email
//   POST /email/send              one-off transactional email
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit, findIntegration } from '../core/store.js'
import { decrypt } from '../../../../../lib/social-post.js'

export const routes = {
  'ANY /newsletter/subscribers': () => json({ total: db.newsletter_subscribers.length, active: db.newsletter_subscribers.filter(s => s.status === 'Active').length, newThisWeek: 0, unsubscribed: 0 }),

  'ANY /newsletter/campaigns': () => json({ campaigns: db.newsletter_campaigns.slice().reverse() }),

  'POST /newsletter/campaign': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const campaign = { id: uuidv4(), subject: body.subject || '(no subject)', preview: body.preview || '', body: body.body || '', template: body.template || 'Custom', status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.newsletter_campaigns.push(campaign)
    audit(user.sub, 'newsletter.create', { id: campaign.id })
    return json({ campaign })
  },

  'POST /newsletter/subscribe': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    if (!body.email) return json({ error: 'Email required' }, 400)
    db.newsletter_subscribers.push({ id: uuidv4(), email: body.email, status: 'Active', ts: new Date().toISOString() })
    audit(user.sub, 'newsletter.subscribe', { email: body.email })
    return json({ ok: true })
  },

  'POST /newsletter/generate': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const blog = db.blog_posts.find(b => b.id === body.blogId)
    if (!blog) return json({ error: 'Blog not found' }, 404)
    const campaign = { id: uuidv4(), subject: blog.article.title, preview: blog.article.metaDescription?.slice(0, 100), body: `<h1>${blog.article.title}</h1><p>${blog.article.intro}</p>`, template: 'Blog Announcement', blogId: body.blogId, status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: new Date().toISOString() }
    db.newsletter_campaigns.push(campaign)
    return json({ campaign })
  },

  'POST /newsletter/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const camp = db.newsletter_campaigns.find(c => c.id === body.id)
    if (!camp) return json({ error: 'Campaign not found' }, 404)
    if (body.action === 'approve') {
      camp.status = 'Approved'; camp.approvedAt = new Date().toISOString()
      audit(user.sub, 'newsletter.approve', { id: camp.id })
      return json({ ok: true, campaign: camp })
    }
    if (body.action === 'reject') {
      camp.status = 'Rejected'; camp.rejectedAt = new Date().toISOString()
      audit(user.sub, 'newsletter.reject', { id: camp.id })
      return json({ ok: true, campaign: camp })
    }
    if (body.action === 'edit') {
      if (body.subject !== undefined) camp.subject = body.subject
      if (body.preview !== undefined) camp.preview = body.preview
      if (body.body !== undefined) camp.body = body.body
      if (body.template !== undefined) camp.template = body.template
      camp.status = 'Draft'; camp.updatedAt = new Date().toISOString()
      audit(user.sub, 'newsletter.edit', { id: camp.id })
      return json({ ok: true, campaign: camp })
    }
    return json({ error: 'Unknown action' }, 400)
  },

  'POST /newsletter/send': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const camp = db.newsletter_campaigns.find(c => c.id === body.id)
    // PRD Blog Step 11 — a newsletter must be APPROVED before it can be sent.
    if (camp && camp.status !== 'Approved') {
      return json({ error: `Campaign is ${camp.status || 'Draft'} — approve it before sending`, status: camp.status }, 409)
    }
    const resend = findIntegration('resend')
    const key = resend?.fields?.apiKey ? decrypt(resend.fields.apiKey) : ''
    const from = resend?.fields?.fromEmail
    const active = db.newsletter_subscribers.filter(s => s.status === 'Active')
    if (key && from && camp) {
      let sent = 0
      for (const s of active) {
        try {
          await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: s.email, subject: camp.subject, html: camp.body }) })
          sent++
        } catch {}
      }
      camp.stats.sent = sent
      camp.status = 'Sent'; camp.sentAt = new Date().toISOString()
      audit(user.sub, 'newsletter.send', { id: camp.id, mode: 'live', recipients: sent })
      return json({ ok: true, mode: 'live', recipients: sent })
    }
    if (camp) { camp.status = 'Sent'; camp.sentAt = new Date().toISOString(); camp.stats.sent = active.length }
    audit(user.sub, 'newsletter.send', { id: camp.id, mode: 'demo', recipients: active.length })
    return json({ ok: true, mode: 'demo', recipients: active.length })
  },

  'POST /newsletter/unsubscribe': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const s = db.newsletter_subscribers.find(x => x.email === body.email)
    if (s) s.status = 'Unsubscribed'
    return json({ ok: true })
  },

  'POST /email/send': async ({ request }) => {
    const resend = findIntegration('resend')
    const key = resend?.fields?.apiKey ? decrypt(resend.fields.apiKey) : ''
    const from = resend?.fields?.fromEmail
    if (!key || !from) return json({ error: 'Configure Resend (API key + from email) first' }, 400)
    const body = await request.json().catch(() => ({}))
    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: body.to, subject: body.subject, html: body.body || '' }) })
    return json({ ok: true, mode: 'live' })
  },
}