// ---------------------------------------------------------------------------
// core/auth.js — HMAC session tokens + security guardrails (NEXUS v2 Security
// layer, Phase 0).
//
//  • Fail-closed: in production an unset APP_SECRET aborts startup. A dev-only
//    fallback keeps local/dev ergonomics (and the E2E suite) working.
//  • Every token carries a jti + iat so sessions can be revoked individually.
//  • getAuth rejects revoked sessions, locked-out sessions, and sessions idle
//    beyond the inactivity timeout.
// ---------------------------------------------------------------------------
import crypto from 'crypto'
import { db } from './store.js'

export const SECRET = process.env.APP_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-fallback')

// Fail-closed secret handling: no hardcoded token should ever protect
// a production deployment.
if (process.env.NODE_ENV === 'production' && !process.env.APP_SECRET) {
  throw new Error('APP_SECRET is required in production (NEXUS Security layer: fail-closed). Set it in the environment.')
}

// Inactivity timeout: a session auto-expires after this much quiet time.
export const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000 // 12 hours

function makeJti() { return crypto.randomBytes(12).toString('hex') }

export function signToken(payload) {
  const full = { ...payload, iat: Date.now(), jti: payload.jti || makeJti() }
  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(t) {
  try {
    if (!t) return null
    const [body, sig] = t.split('.')
    const exp = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
    if (exp !== sig) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (p.exp && Date.now() > p.exp) return null
    return p
  } catch { return null }
}

export function getAuth(request) {
  const h = request.headers.get('authorization') || ''
  const user = verifyToken(h.startsWith('Bearer ') ? h.slice(7) : null)
  if (!user) return null
  // Emergency lockout (auth/lockdown) revokes everything immediately.
  if (db.security?.locked) return null
  const j = user.jti
  if (j) {
    if (db.security?.revoked?.includes(j)) return null
    const s = db.sessions?.find((x) => x.jti === j)
    if (s) {
      if (s.revoked) return null
      if (Date.now() - s.lastSeen > IDLE_TIMEOUT_MS) { s.revoked = true; return null }
      s.lastSeen = Date.now()
    }
  }
  return user
}