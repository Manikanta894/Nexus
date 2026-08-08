// ---------------------------------------------------------------------------
// core/store.js — the in-memory operational store.
// Phase 1 of the NEXUS v2 roadmap replaces this with Google Sheets (the
// operational layer). Until then every domain module reads/writes here.
// Keep this file data-access only — no business logic.
// ---------------------------------------------------------------------------
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export const db = {
  social_posts: [], blog_posts: [], news_opportunities: [], linkedin_comments: [],
  newsletter_campaigns: [], newsletter_subscribers: [], integrations: [], config: [],
  audit: [], ai_cost: [], news_seen: [], drive_locks: [], seasonal_events: [],
  seasonal_campaigns: [], repurposed_content: [], idea_vault: [], portfolio_case_studies: [],
  discord_interactions: [],
  sessions: [],
  security: { locked: false, revoked: [] },
  brand: [{ id: 'brand', data: { name: 'Manikanta R', tagline: 'AI MBA HR Business Analytics Leadership', voice: 'Insightful, warm, story-driven', tone: ['insightful', 'warm', 'confident'], sentenceStyle: 'Short punchy opener', favoriteWords: ['clarity', 'leverage', 'compounding'], avoidWords: ['guys', 'synergy', 'disrupt'], audience: ['MBA students', 'HR professionals', 'analysts', 'founders'], pillars: ['AI', 'Business Analytics', 'HR', 'Leadership', 'Career', 'Productivity', 'MBA'], ctaStyle: 'Ask a genuine question', colors: { primary: '#3B82F6', secondary: '#8B5CF6' }, hashtags: ['#AI', '#Leadership', '#CareerGrowth', '#BusinessStrategy'] }, updatedAt: new Date().toISOString() }],
  assistant: [{ id: 'assistant', data: { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }, updatedAt: new Date().toISOString() }],
}

// ---------------------------------------------------------------------------
// Immutable, append-only audit log with an SHA-256 hash chain.
//   entry.hash  = sha256(canonical(entry without hash))
//   entry.prev  = hash of the previous entry (first entry uses GENESIS).
// A single tampered byte anywhere breaks every subsequent link, so
// GET /audit/verify can prove integrity (NEXUS v2 Security layer).
// ---------------------------------------------------------------------------
const AUDIT_GENESIS = 'GENESIS'
let auditPrevHash = AUDIT_GENESIS

export function canonicalJson(o) {
  return JSON.stringify(o, Object.keys(o).sort())
}
export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export function audit(actor, action, meta = {}) {
  const entry = { id: uuidv4(), actor, action, meta, ts: new Date().toISOString(), prevHash: auditPrevHash }
  const { prevHash, ...rest } = entry
  entry.hash = sha256(canonicalJson(rest))
  auditPrevHash = entry.hash
  db.audit.push(entry)
  // Bounded until Sheet persistence lands in Phase 1; the hash chain keeps
  // entries tamper-evident without needing unlimited memory.
  if (db.audit.length > 20000) db.audit.splice(0, db.audit.length - 20000)
}

export function verifyAudit() {
  let prev = AUDIT_GENESIS
  for (let i = 0; i < db.audit.length; i++) {
    const e = db.audit[i]
    if (e.prevHash !== prev) return { ok: false, index: i, reason: `chain break at ${i}` }
    const { prevHash, hash, ...rest } = e
    if (e.hash !== sha256(canonicalJson(rest))) return { ok: false, index: i, reason: `tampered entry at ${i}` }
    prev = e.hash
  }
  return { ok: true, entries: db.audit.length }
}

// ---- Session registry (login/revoke/list/lockdown) ----
export function registerSession(jti, sub, meta = {}) {
  const existing = db.sessions.findIndex((s) => s.jti === jti)
  const record = { jti, sub, createdAt: new Date().toISOString(), lastSeen: Date.now(), revoked: false, ...meta }
  if (existing >= 0) db.sessions[existing] = record
  else db.sessions.push(record)
  return record
}
export function revokeSession(jti) { const s = db.sessions.find((x) => x.jti === jti); if (s) s.revoked = true; return !!s }
export function listSessions() { return db.sessions.slice().reverse().map(({ revoked, ...s }) => ({ ...s, active: !revoked })) }
// Emergency lockout: revoke every session and stop automation. Because getAuth
// also rejects when security.locked, automation endpoints (cron, pipeline,
// autopilot) are all blocked until the flag is cleared.
export function lockdown() {
  db.security.locked = true
  db.security.revoked = [...new Set([...db.security.revoked, ...db.sessions.map((s) => s.jti)])]
  db.sessions.forEach((s) => { s.revoked = true })
  return { locked: true, revoked: db.sessions.length }
}

// ---- Integration storage helpers (used across many domains) ----
export function findIntegration(id) { return db.integrations.find(i => i.id === id) }
export function upsertIntegration(id, patch) {
  let it = findIntegration(id)
  if (!it) { it = { id, fields: {}, enabled: true, configured: false, role: '', priority: 0 }; db.integrations.push(it) }
  Object.assign(it, patch)
  return it
}

// ---- Key/value config store (Configuration layer lives in-app) ----
export function upsertConfig(key, data) {
  const idx = db.config.findIndex(c => c.key === key)
  if (idx >= 0) db.config[idx].data = data
  else db.config.push({ key, data })
  return data
}

// Minimal db adapter over the in-memory store so collection-based libs
// (pipeline, news-radar) work unchanged.
export function makeDbAdapter() {
  return {
    collection: (name) => ({
      findOne: async (q = {}) => {
        const items = db[name] || []
        if (!q || Object.keys(q).length === 0) return items[0] || null
        return items.find((i) => Object.entries(q).every(([k, v]) => i[k] === v)) || null
      },
      find: async (q = {}) => {
        let items = db[name] || []
        if (q.status) items = items.filter((i) => i.status === q.status)
        return { toArray: async () => items, sort: () => ({ toArray: async () => items }), limit: (n) => ({ toArray: async () => items.slice(0, n) }) }
      },
      findOneAndUpdate: async () => null,
      insertOne: async (doc) => { (db[name] = db[name] || []).push(doc); return { insertedId: doc.id } },
      updateOne: async (q, u) => { const i = (db[name] || []).findIndex((x) => Object.entries(q).every(([k, v]) => x[k] === v)); if (i >= 0 && u.$set) Object.assign(db[name][i], u.$set); return { modifiedCount: i >= 0 ? 1 : 0 } },
      countDocuments: async () => (db[name] || []).length,
      deleteMany: async () => ({ deletedCount: 0 }),
    }),
  }
}