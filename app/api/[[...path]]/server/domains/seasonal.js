// ---------------------------------------------------------------------------
// domains/seasonal.js — Seasonal Campaigns module.
//   GET  /seasonal/calendar  upcoming events from the seed calendar
//   POST /seasonal/scan      create campaigns for events ≤ 14 days away
//   GET  /seasonal           campaigns
//   POST /seasonal/action    approve | reject | schedule | skip
//   POST /seasonal/event     add a custom event (name + MM-DD)
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { makeAnalysis, demoGenerate, qualityScores, runFactCheck, DEFAULT_PLATFORMS } from '../core/content.js'
import { SEED_EVENTS } from '../../../../../lib/events.js'

function seasonalCalendar() {
  const now = new Date()
  const ym = now.getFullYear()
  return SEED_EVENTS.map(e => {
    const [m, d] = e.d.split('-').map(Number)
    let nextDate = new Date(ym, m - 1, d)
    if (nextDate < now) nextDate = new Date(ym + 1, m - 1, d)
    const daysAway = Math.max(0, Math.round((nextDate - now) / 86400000))
    return { ...e, nextDate: nextDate.toISOString().slice(0, 10), daysAway }
  })
}

export const routes = {
  'GET /seasonal/calendar': () => json({ events: seasonalCalendar() }),

  'POST /seasonal/scan': async ({ user }) => {
    const events = seasonalCalendar()
    const soon = events.filter(e => e.daysAway <= 14)
    let made = 0
    for (const ev of soon) {
      const exists = db.seasonal_campaigns.some(c => c.eventName === ev.name && c.eventDate === ev.nextDate)
      if (exists) continue
      const analysis = makeAnalysis(ev.name, ev.name)
      const content = demoGenerate(db.brand[0]?.data || {}, analysis, DEFAULT_PLATFORMS)
      const camp = { id: uuidv4(), eventName: ev.name, eventDate: ev.nextDate, daysAway: ev.daysAway, nextDate: ev.nextDate, note: ev.note || '', objective: `${ev.name} campaign`, audience: 'MBA students, HR professionals, analysts, founders', pillar: analysis.pillar, platforms: DEFAULT_PLATFORMS, content, factcheck: runFactCheck(content), quality: qualityScores(ev.name), status: 'Pending Approval', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      db.seasonal_campaigns.push(camp); made++
    }
    audit(user.sub, 'seasonal.scan', { made })
    return json({ made, campaigns: db.seasonal_campaigns })
  },

  'GET /seasonal': () => json({ campaigns: db.seasonal_campaigns }),

  'POST /seasonal/action': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const c = db.seasonal_campaigns.find(x => x.id === body.id)
    if (c) {
      if (body.action === 'approve') { c.status = 'Published'; c.publishedAt = new Date().toISOString() }
      else if (body.action === 'reject') c.status = 'Rejected'
      else if (body.action === 'schedule') { c.status = 'Scheduled'; c.scheduledAt = body.scheduledAt || new Date().toISOString() }
      else if (body.action === 'skip') c.status = 'Skipped'
      c.updatedAt = new Date().toISOString()
      audit(user.sub, `seasonal.${body.action}`, { id: c.id })
    }
    return json({ ok: true, job: c || {} })
  },

  'POST /seasonal/event': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    if (body.name && body.d) {
      db.seasonal_events.push({ ...body, id: uuidv4(), createdAt: new Date().toISOString() })
      return json({ ok: true })
    }
    return json({ error: 'Name + MM-DD date required' }, 400)
  },
}