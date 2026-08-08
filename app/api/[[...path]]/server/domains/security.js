// ---------------------------------------------------------------------------
// domains/security.js — session & lockdown management (NEXUS v2 Security layer,
// Phase 0). Note these routes sit BEHIND the auth gate in route.js, so they
// already require a valid session. Exception: POST /auth/unlock lives in the
// public table (domains/public.js) because lockdown revokes every session — it
// authenticates via the x-recovery-token header instead.
//   POST /auth/logout            revoke this session
//   GET  /auth/sessions          list active/revoked sessions
//   POST /auth/sessions/revoke   revoke a specific session by jti
//   POST /auth/lockdown          emergency: revoke all + block automation
//   GET  /audit/verify           prove the immutable audit chain intact
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit, revokeSession, listSessions, lockdown, verifyAudit } from '../core/store.js'

export const routes = {
  'POST /auth/logout': ({ user }) => {
    if (user.jti) revokeSession(user.jti)
    audit(user.sub, 'auth.logout', {})
    return json({ ok: true })
  },

  'GET /auth/sessions': ({ user }) => {
    audit(user.sub, 'auth.sessions.list', {})
    return json({ sessions: listSessions() })
  },

  'POST /auth/sessions/revoke': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    revokeSession(body.jti)
    audit(user.sub, 'auth.sessions.revoke', { jti: body.jti || null })
    return json({ ok: true })
  },

  'POST /auth/lockdown': ({ user }) => {
    const res = lockdown()
    audit(user.sub, 'auth.lockdown', { revoked: res.revoked })
    return json({ ok: true, locked: true })
  },

  'GET /audit/verify': ({ user }) => {
    const result = verifyAudit()
    audit(user.sub, 'audit.verify', { ok: result.ok })
    return json(result)
  },
}