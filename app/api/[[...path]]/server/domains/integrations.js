// ---------------------------------------------------------------------------
// domains/integrations.js — the credentials vault UI surface (Configuration
// layer). Secrets are stored encrypted (AES-256-GCM via APP_SECRET) — never
// in Sheets, Drive, or source code (NEXUS v2 Security layer).
//   ANY  /integrations             catalog + saved state + dependency map
//   POST /integrations/save        save/encrypt fields
//   POST /integrations/test        live connection test (rss/resend/discord/google)
//   POST /integrations/disconnect  remove stored credentials
//   POST /integrations/role        assign provider role/priority (AI chain)
//   ANY  /oauth/start              build LinkedIn/Meta consent URL
//   ANY  /connections              quick connected flags
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit, findIntegration, upsertIntegration } from '../core/store.js'
import { signToken } from '../core/auth.js'
import { encrypt, decrypt } from '../../../../../lib/social-post.js'
import { sendApprovalCard, COLOR } from '../../../../../lib/discord.js'

export const CATALOG = [
  { id: 'nvidia', name: 'NVIDIA NIM', category: 'ai', chain: true, docs: 'build.nvidia.com', desc: 'Vision + text. Primary in the AI fallback chain.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'visionModel', label: 'Vision Model', default: 'meta/llama-3.2-11b-vision-instruct' }, { key: 'textModel', label: 'Text Model', default: 'meta/llama-3.2-11b-instruct' }] },
  { id: 'openrouter', name: 'OpenRouter', category: 'ai', chain: true, docs: 'openrouter.ai', desc: 'Gemini / multi-model gateway with vision.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'visionModel', label: 'Vision Model', default: 'google/gemini-2.5-flash' }, { key: 'textModel', label: 'Text Model', default: 'google/gemini-2.5-flash' }] },
  { id: 'groq', name: 'Groq', category: 'ai', chain: true, docs: 'console.groq.com', desc: 'Ultra-fast inference for text + vision.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'visionModel', label: 'Vision Model', default: 'qwen/qwen3.6-27b' }, { key: 'textModel', label: 'Text Model', default: 'llama-3.3-70b-versatile' }] },
  { id: 'openai', name: 'OpenAI', category: 'ai', chain: true, docs: 'platform.openai.com', desc: 'Optional last-resort provider.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'visionModel', label: 'Vision Model', default: 'gpt-4o' }, { key: 'textModel', label: 'Text Model', default: 'gpt-4o' }] },
  { id: 'perplexity', name: 'Perplexity', category: 'research', chain: true, docs: 'perplexity.ai', desc: 'Primary research + live web answers.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { id: 'google_search', name: 'Google Search', category: 'research', chain: true, docs: 'developers.google.com', desc: 'Programmable Search fallback.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'cx', label: 'Search Engine ID' }] },
  { id: 'newsapi', name: 'News API', category: 'research', chain: true, docs: 'newsapi.org', desc: 'News discovery for the News Radar module.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { id: 'rss', name: 'RSS / Google News', category: 'research', chain: true, docs: 'rss', desc: 'Free RSS feed fallback.', fields: [{ key: 'feeds', label: 'Feed URLs (comma separated)' }] },
  { id: 'linkedin', name: 'LinkedIn', category: 'publishing', docs: 'linkedin.com/developers', desc: 'Publish posts + engagement. OAuth connect works once you add a LinkedIn app.', fields: [{ key: 'clientId', label: 'OAuth Client ID' }, { key: 'clientSecret', label: 'OAuth Client Secret', secret: true }, { key: 'accessToken', label: 'Access Token', secret: true }, { key: 'refreshToken', label: 'Refresh Token', secret: true }] },
  { id: 'facebook', name: 'Facebook', category: 'publishing', docs: 'developers.facebook.com', desc: 'Publish to Facebook pages (Meta app powers IG + Threads too).', fields: [{ key: 'clientId', label: 'Meta App ID' }, { key: 'clientSecret', label: 'Meta App Secret', secret: true }, { key: 'accessToken', label: 'Page Access Token', secret: true }, { key: 'pageId', label: 'Page ID' }] },
  { id: 'instagram', name: 'Instagram', category: 'publishing', docs: 'developers.facebook.com', desc: 'Publish to Instagram business (uses Meta app credentials).', fields: [{ key: 'accessToken', label: 'Access Token', secret: true }, { key: 'igUserId', label: 'IG User ID' }] },
  { id: 'threads', name: 'Threads', category: 'publishing', docs: 'developers.facebook.com', desc: 'Publish to Threads (uses Meta app credentials).', fields: [{ key: 'accessToken', label: 'Access Token', secret: true }] },
  { id: 'google_oauth', name: 'Google Sign-In', category: 'google', docs: 'console.cloud.google.com', desc: 'Dashboard OAuth login (defer to production).', fields: [{ key: 'clientId', label: 'Client ID' }, { key: 'clientSecret', label: 'Client Secret', secret: true }] },
  { id: 'google_sheets', name: 'Google Sheets', category: 'google', docs: 'console.cloud.google.com', desc: 'The single source of truth. Paste service-account JSON.', fields: [{ key: 'serviceAccountJson', label: 'Service Account JSON', secret: true, textarea: true }, { key: 'sheetId', label: 'Spreadsheet ID' }] },
  { id: 'google_drive', name: 'Google Drive', category: 'google', docs: 'console.cloud.google.com', desc: 'Source + Archive image folders (FIFO + true MOVE).', fields: [{ key: 'sourceFolderId', label: 'Source Folder ID' }, { key: 'archiveFolderId', label: 'Archive Folder ID' }] },
  { id: 'discord', name: 'Discord', category: 'discord', docs: 'discord.com/developers', desc: 'Approval command center: approval webhook + button interactions.', fields: [{ key: 'botToken', label: 'Bot Token', secret: true }, { key: 'publicKey', label: 'Bot Public Key' }, { key: 'ownerId', label: 'Your Discord User ID (button lock)' }, { key: 'guildId', label: 'Guild ID' }, { key: 'webhookUrl', label: 'Approval Webhook URL', secret: true }] },
  { id: 'resend', name: 'Resend', category: 'email', docs: 'resend.com', desc: 'Newsletter + transactional email.', fields: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'fromEmail', label: 'From Email' }] },
  { id: 'google_analytics', name: 'Google Analytics', category: 'analytics', docs: 'analytics.google.com', desc: 'Website + blog traffic.', fields: [{ key: 'measurementId', label: 'Measurement ID' }, { key: 'apiSecret', label: 'API Secret', secret: true }] },
  { id: 'clarity', name: 'Microsoft Clarity', category: 'analytics', docs: 'clarity.microsoft.com', desc: 'Heatmaps + session insights.', fields: [{ key: 'projectId', label: 'Project ID' }] },
  { id: 'meta_pixel', name: 'Meta Pixel', category: 'analytics', docs: 'business.facebook.com', desc: 'Conversion tracking.', fields: [{ key: 'pixelId', label: 'Pixel ID' }] },
]

export const routes = {
  'ANY /integrations': () => {
    const saved = {}
    for (const i of db.integrations) saved[i.id] = i
    const integrations = CATALOG.map(c => {
      const s = saved[c.id] || {}
      const fields = {}
      let configured = false
      for (const f of c.fields) {
        const raw = s.fields?.[f.key]
        const has = raw !== undefined && raw !== null && String(raw) !== ''
        if (has) configured = true
        fields[f.key] = f.secret ? (has ? '•••••••• (saved)' : '') : (raw || '')
      }
      return { ...c, enabled: s.enabled !== false, configured, values: fields, status: configured ? 'connected' : 'disabled', role: s.role, priority: s.priority, lastTest: s.lastTest, lastTestedAt: s.lastTestedAt, lastLatencyMs: s.lastLatencyMs }
    })
    return json({ integrations, dependencyMap: [{ module: 'Social Automation', apis: ['nvidia', 'openrouter', 'google_drive', 'google_sheets', 'discord', 'linkedin', 'instagram', 'facebook', 'threads'] }, { module: 'Blog Engine', apis: ['nvidia', 'openrouter', 'groq', 'google_drive', 'google_sheets'] }, { module: 'News Radar', apis: ['perplexity', 'google_search', 'newsapi', 'rss'] }, { module: 'Newsletter', apis: ['resend'] }, { module: 'Analytics', apis: ['google_analytics', 'clarity', 'meta_pixel'] }] })
  },

  'POST /integrations/save': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const cat = CATALOG.find(c => c.id === body.id)
    if (!cat) return json({ error: 'Unknown integration' }, 400)
    let it = findIntegration(body.id)
    const fields = {}
    for (const f of cat.fields) {
      const v = body.fields?.[f.key]
      if (f.secret) {
        if (v && !v.startsWith('enc:')) fields[f.key] = encrypt(String(v))
        else fields[f.key] = it?.fields?.[f.key] || v || ''
      } else {
        fields[f.key] = v !== undefined && v !== null ? v : (it?.fields?.[f.key] || '')
      }
    }
    if (!it) it = upsertIntegration(body.id, { fields, enabled: body.enabled !== false, configured: true })
    else Object.assign(it, { fields, enabled: body.enabled !== false, configured: true })
    audit(user.sub, 'integration.save', { id: body.id })
    return json({ ok: true })
  },

  'POST /integrations/test': async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const it = findIntegration(body.id)
    if (!it || !it.configured) return json({ ok: false, message: 'Not configured yet' })
    const start = Date.now()
    const fail = (msg) => { it.lastTest = 'fail'; it.lastTestedAt = new Date().toISOString(); it.lastLatencyMs = Date.now() - start; return json({ ok: false, message: msg }) }
    try {
      if (body.id === 'rss') {
        const feeds = (it.fields?.feeds || '').split(',').map(s => s.trim()).filter(Boolean)
        if (!feeds.length) throw new Error('No feeds configured')
        const { fetchFeed } = await import('../../../../../lib/rss.js')
        await fetchFeed(feeds[0])
      } else if (body.id === 'resend') {
        const key = decrypt(it.fields?.apiKey)
        if (!key) throw new Error('No API key')
        const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
        if (r.status === 401) throw new Error('Invalid API key')
        if (!r.ok) throw new Error(`Resend ${r.status}`)
      } else if (body.id === 'discord') {
        const wu = decrypt(it.fields?.webhookUrl)
        if (!wu) throw new Error('No webhook URL')
        await sendApprovalCard(wu, { title: 'NEXUS connection test', description: 'This is a test from the Integrations panel ✔', color: COLOR.info })
      } else if (body.id === 'google_sheets' || body.id === 'google_drive') {
        const { googleAccessToken } = await import('../../../../../lib/google.js')
        await googleAccessToken(it.fields?.serviceAccountJson)
      }
      it.lastTest = 'pass'; it.lastTestedAt = new Date().toISOString(); it.lastLatencyMs = Date.now() - start
      return json({ ok: true, message: 'Connection OK', latencyMs: Date.now() - start })
    } catch (e) {
      return fail(e.message)
    }
  },

  'POST /integrations/disconnect': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const idx = db.integrations.findIndex(i => i.id === body.id)
    if (idx >= 0) db.integrations.splice(idx, 1)
    audit(user.sub, 'integration.disconnect', { id: body.id })
    return json({ ok: true })
  },

  'POST /integrations/role': async ({ request, user }) => {
    const body = await request.json().catch(() => ({}))
    const it = findIntegration(body.id)
    if (it) { it.role = body.role; if (body.priority !== undefined) it.priority = body.priority }
    audit(user.sub, 'integration.role', { id: body.id, role: body.role })
    return json({ ok: true })
  },

  'ANY /oauth/start': ({ url }) => {
    const provider = url.searchParams.get('provider')
    if (provider === 'linkedin') {
      const it = findIntegration('linkedin')
      const f = it?.fields || {}
      if (!f.clientId || !f.clientSecret) return json({ error: 'LinkedIn OAuth not configured — add Client ID + Secret in Integrations' }, 400)
      const redirect = `${url.origin}/api/oauth/callback?provider=linkedin`
      const state = signToken({ provider: 'linkedin', ts: Date.now() })
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(f.clientId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('w_member_social email openid profile')}`
      return json({ url: authUrl })
    }
    if (provider === 'meta') {
      const fb = findIntegration('facebook')
      const f = fb?.fields || {}
      if (!f.clientId || !f.clientSecret) return json({ error: 'Meta OAuth not configured — add App ID + Secret in Integrations' }, 400)
      const redirect = `${url.origin}/api/oauth/callback?provider=meta`
      const state = signToken({ provider: 'meta', ts: Date.now() })
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(f.clientId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,threads_basic,threads_content_publish,business_management')}`
      return json({ url: authUrl })
    }
    return json({ error: 'Unknown provider' }, 400)
  },

  'ANY /connections': () => json({ linkedin: { connected: !!findIntegration('linkedin') }, facebook: { connected: !!findIntegration('facebook') } }),
}