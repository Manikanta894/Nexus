const BASE = 'http://127.0.0.1:3100'
const H = { 'Content-Type': 'application/json' }
const WH = 'https://discord.com/api/webhooks/1535617900046458940/TVUlJNgCnfQUcFjVPN06j8Zl9V4DYSn-Aj263xTlU1u0iwh7g1jRVOFppg19QOgvwNXx'
async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { ...H, ...(opts.headers || {}) }, signal: AbortSignal.timeout(20000) })
  let b; try { b = await r.json() } catch { b = {} }
  return { status: r.status, body: b }
}
// login
const l = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }) })
const AH = { ...H, Authorization: 'Bearer ' + l.body.token }
console.log('login', l.status, !!l.body.token)

// save discord integration (webhookUrl encrypted)
const sv = await req('/api/integrations/save', { method: 'POST', headers: AH, body: JSON.stringify({ id: 'discord', fields: { webhookUrl: WH } }) })
console.log('save discord integration', sv.status, JSON.stringify(sv.body))

// test via integrations/test -> sends an approval card
const t = await req('/api/integrations/test', { method: 'POST', headers: AH, body: JSON.stringify({ id: 'discord' }) })
console.log('integrations/test', t.status, JSON.stringify(t.body))

// test via /discord/test -> sends a test card
const dt = await req('/api/discord/test', { method: 'POST', headers: AH, body: JSON.stringify({ message: 'Discord Hub is connected ✓' }) })
console.log('discord/test', dt.status, JSON.stringify(dt.body))

// get status
const g = await req('/api/discord', { headers: AH })
console.log('discord status', g.status, JSON.stringify(g.body))
