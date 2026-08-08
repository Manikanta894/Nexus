// Security-layer E2E test (NEXUS v2 Phase 0 increment B).
// Verifies: session registry, logout, per-session revocation, emergency
// lockdown + recovery, and the immutable audit hash-chain verifier.
// Sequential + stateful like api-test.mjs. Run against a live server:
//   npx next dev -p 3100   then   node scripts/security-test.mjs
const BASE = process.env.BASE || 'http://127.0.0.1:3100'
let failures = 0, passes = 0
const RECOVERY = process.env.APP_SECRET_FALLBACK || 'dev-fallback' // dev secret, matches core/auth.js

async function req(token, path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}
async function login() {
  const r = await req(null, '/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } })
  return r.data.token || null
}
async function test(name, fn) {
  try {
    const out = await fn()
    if (out === true || out?.ok === true) { passes++; console.log(`PASS  ${name}`) }
    else { failures++; console.log(`FAIL  ${name}  -> ${JSON.stringify(out).slice(0, 300)}`) }
  } catch (e) { failures++; console.log(`FAIL  ${name}  -> threw ${e.message}`) }
}

;(async () => {
  await test('login issues a session-registered token', async () => {
    const t = await login()
    const me = await req(t, '/auth/me')
    return me.status === 200
  })

  await test('sessions listing shows the active session', async () => {
    const t = await login()
    const r = await req(t, '/auth/sessions')
    return r.status === 200 && Array.isArray(r.data.sessions) && r.data.sessions.some((s) => s.active === true)
  })

  await test('audit/verify confirms hash chain intact', async () => {
    const t = await login()
    const r = await req(t, '/audit/verify')
    return r.status === 200 && r.data.ok === true
  })

  await test('logout revokes the token immediately', async () => {
    const t = await login()
    const before = await req(t, '/auth/me')
    if (before.status !== 200) return false
    const out = await req(t, '/auth/logout', { method: 'POST' })
    if (out.status !== 200) return false
    const after = await req(t, '/auth/me')
    return after.status === 401
  })

  await test('per-session revoke blocks only that token', async () => {
    const keeper = await login()          // stays valid
    const victim = await login()          // we'll revoke this one
    const list = await req(keeper, '/auth/sessions')
    const victimSess = list.data.sessions.find((s) => !s.revoked && s.active !== false)
    // revoke by jti from the registry
    const r = await req(keeper, '/auth/sessions/revoke', { method: 'POST', body: { jti: victimSess.jti } })
    if (r.status !== 200) return false
    const keeperAfter = await req(keeper, '/auth/me')
    const victimAfter = await req(victim, '/auth/me')
    return keeperAfter.status === 200 && victimAfter.status === 401
  })

  await test('emergency lockdown blocks all sessions + automation', async () => {
    const t = await login()
    const r = await req(t, '/auth/lockdown', { method: 'POST' })
    if (r.status !== 200 || r.data.locked !== true) return false
    const meOld = await req(t, '/auth/me')
    const fresh = await login()           // new session while locked
    const meNew = await req(fresh, '/auth/me')
    return meOld.status === 401 && meNew.status === 401
  })

  await test('unlock (recovery token) restores access', async () => {
    const bad = await req(null, '/auth/unlock', { method: 'POST', headers: { 'x-recovery-token': 'wrong' } })
    if (bad.status !== 403) return false
    const good = await req(null, '/auth/unlock', { method: 'POST', headers: { 'x-recovery-token': RECOVERY } })
    if (good.status !== 200) return false
    const t = await login()
    return (await req(t, '/auth/me')).status === 200
  })

  console.log(`\n==== ${passes} passed, ${failures} failed ====`)
  process.exit(failures ? 1 : 0)
})()