// ---------------------------------------------------------------------------
// domains/dashboard.js — Command Center + system-level reads/writes.
//   ANY  /dashboard   stats, trend, system health for the Command Center
//   ANY  /auth/me     current session user
//   GET  /brand       brand intelligence config
//   PUT  /brand       save brand intelligence config
//   GET  /assistant   Jarvis settings
//   PUT  /assistant   save Jarvis settings
//   ANY  /audit       last 50 audit entries (newest first)
//   GET  /cron        scheduled jobs + recent cron runs
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit, findIntegration } from '../core/store.js'

export const routes = {
  'ANY /dashboard': () => {
    const posts = db.social_posts
    const pending = posts.filter(p => p.status === 'Pending Approval').length
    const published = posts.filter(p => p.status === 'Published').length
    const integs = db.integrations
    return json({
      greetingName: 'Manikanta',
      stats: { followersToday: 12 * published, websiteVisits: 45 + published * 10, pending, connected: integs.filter(i => i.enabled).length, integrations: 20, brandHealth: Math.min(99, 70 + published * 2) },
      trend: Array.from({ length: 14 }, (_, i) => ({ day: `08-${String(i + 1).padStart(2, '0')}`, reach: 100 + i * 15 + Math.random() * 50, engagement: 5 + Math.random() * 10 })),
      systemHealth: [{ name: 'Google', status: 'connected' }, { name: 'Discord', status: findIntegration('discord')?.enabled ? 'connected' : 'disabled' }, { name: 'GitHub', status: 'connected' }, { name: 'Vercel', status: 'connected' }, { name: 'LinkedIn', status: findIntegration('linkedin')?.enabled ? 'connected' : 'disabled' }, { name: 'Meta', status: findIntegration('facebook')?.enabled ? 'connected' : 'disabled' }],
      aiCoach: 'Your content engine is ready. Generate your first post to start learning what resonates.',
      aiStatus: 97,
    })
  },

  'ANY /auth/me': ({ user }) => json({ user }),

  'GET /brand': () => json({ brand: db.brand[0]?.data || {} }),
  'PUT /brand': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    if (db.brand[0]) db.brand[0].data = body.brand
    else db.brand.push({ id: 'brand', data: body.brand })
    audit(user.sub, 'brand.update', {})
    return json({ ok: true })
  },

  'GET /assistant': () => {
    const a = db.assistant[0]?.data || { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }
    return json({ assistant: a })
  },
  'PUT /assistant': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    if (db.assistant[0]) db.assistant[0].data = body.assistant
    else db.assistant.push({ id: 'assistant', data: body.assistant })
    audit(user.sub, 'assistant.update', {})
    return json({ ok: true })
  },

  'ANY /audit': () => json({ logs: db.audit.slice(-50).reverse() }),

  'GET /cron': () => json({ jobs: db.social_posts.filter(p => p.status === 'Scheduled').map(p => ({ id: p.id, module: 'social', label: p.imageName, status: 'Scheduled', nextRun: p.scheduledAt })), logs: db.audit.filter(a => a.action === 'cron.run').slice(-10) }),
}