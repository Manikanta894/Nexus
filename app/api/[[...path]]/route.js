import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { verifyInteractionRequest, interactionAck, INTERACTION_TYPES, sendApprovalCard, editInteractionMessage, makeButtons, buildEmbed, COLOR } from '../../../lib/discord.js'
import { encrypt, decrypt } from '../../../lib/social-post.js'
import { SEED_EVENTS } from '../../../lib/events.js'

const SECRET = process.env.APP_SECRET || 'dev-fallback'
const json = (data, status = 200) => NextResponse.json(data, { status })

// Integration catalog
const CATALOG = [
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

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}
function verifyToken(t) {
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
function getAuth(request) {
  const h = request.headers.get('authorization') || ''
  return verifyToken(h.startsWith('Bearer ') ? h.slice(7) : null)
}

// In-memory data store
const db = {
  social_posts: [], blog_posts: [], news_opportunities: [], linkedin_comments: [],
  newsletter_campaigns: [], newsletter_subscribers: [], integrations: [], config: [],
  audit: [], ai_cost: [], news_seen: [], drive_locks: [], seasonal_events: [],
  seasonal_campaigns: [], repurposed_content: [], idea_vault: [], portfolio_case_studies: [],
  discord_interactions: [],
  brand: [{ id: 'brand', data: { name: 'Manikanta R', tagline: 'AI MBA HR Business Analytics Leadership', voice: 'Insightful, warm, story-driven', tone: ['insightful', 'warm', 'confident'], sentenceStyle: 'Short punchy opener', favoriteWords: ['clarity', 'leverage', 'compounding'], avoidWords: ['guys', 'synergy', 'disrupt'], audience: ['MBA students', 'HR professionals', 'analysts', 'founders'], pillars: ['AI', 'Business Analytics', 'HR', 'Leadership', 'Career', 'Productivity', 'MBA'], ctaStyle: 'Ask a genuine question', colors: { primary: '#3B82F6', secondary: '#8B5CF6' }, hashtags: ['#AI', '#Leadership', '#CareerGrowth', '#BusinessStrategy'] }, updatedAt: new Date().toISOString() }],
  assistant: [{ id: 'assistant', data: { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }, updatedAt: new Date().toISOString() }],
}

function audit(actor, action, meta = {}) {
  db.audit.push({ id: uuidv4(), actor, action, meta, ts: new Date().toISOString() })
  if (db.audit.length > 500) db.audit.splice(0, db.audit.length - 500)
}

// Demo generators
const PILLARS = { AI: { tag: '#AI', angle: 'how AI reshapes real work', hooks: ['Everyone talks about AI. Few use it right.', 'AI won\u2019t take your job. Someone using AI will.'] }, Leadership: { tag: '#Leadership', angle: 'leading through change', hooks: ['The best leaders do one thing differently.'] }, HR: { tag: '#HR', angle: 'people and culture', hooks: ['Culture isn\u2019t the free snacks. It\u2019s what you tolerate.'] }, 'Business Analytics': { tag: '#BusinessAnalytics', angle: 'data into decisions', hooks: ['Data doesn\u2019t make decisions. People do.'] }, MBA: { tag: '#MBA', angle: 'real MBA lessons', hooks: ['My MBA taught me frameworks. My job taught me judgment.'] }, Productivity: { tag: '#Productivity', angle: 'deep work', hooks: ['Busy is not the same as productive.'] } }
const PILLAR_KEYS = Object.keys(PILLARS)
function pickPillar(hint) { const h = (hint || '').toLowerCase(); for (const k of PILLAR_KEYS) if (h.includes(k.toLowerCase())) return k; if (h.includes('data') || h.includes('analy')) return 'Business Analytics'; if (h.includes('ai') || h.includes('tech')) return 'AI'; return PILLAR_KEYS[0] }
function hashtags(p) { const base = [PILLARS[p]?.tag || '#AI', '#Leadership', '#CareerGrowth', '#BusinessStrategy', '#FutureOfWork', '#Learning']; return [...new Set(base)].slice(0, 6) }
function demoGenerate(brand, analysis, platforms) {
  const p = analysis.pillar, hook = PILLARS[p]?.hooks[0] || 'A fresh insight.', cta = 'What\u2019s your take \u2014 drop it in the comments.', tags = hashtags(p), out = {}
  if (platforms.includes('linkedin')) out.linkedin = { hook, caption: `${hook}\n\nI kept seeing the same pattern around ${analysis.topic.toLowerCase()}.\n\nThe teams winning now aren\u2019t the ones with the most tools \u2014 they\u2019re the ones with the most clarity.\n\nThree things I\u2019d tell my younger self:\n\n\u2192 Start with the decision, not the data.\n\u2192 Simple and shipped beats perfect and stuck.\n\u2192 Consistency compounds louder than intensity.\n\nThe edge isn\u2019t information anymore. It\u2019s judgment.\n\n${cta}`, cta, hashtags: tags, altText: `Editorial image representing ${analysis.topic}.`, seoKeywords: [p.toLowerCase(), 'career growth', 'leadership'] }
  if (platforms.includes('instagram')) out.instagram = { hook, caption: `${hook} \u2728\n\n${analysis.topic} \u2014 broken down simply.\n\nSave this for later \ud83d\udccc\n\n${cta}`, cta: 'Save + share.', hashtags: tags, altText: `Visual post about ${analysis.topic}.` }
  if (platforms.includes('facebook')) out.facebook = { hook, caption: `${hook}\n\nGenuine question: when it comes to ${analysis.topic.toLowerCase()}, what actually moved the needle for you?`, cta: 'Share your experience below.', hashtags: tags.slice(0, 4) }
  if (platforms.includes('threads')) out.threads = { hook, caption: `${hook}\n\n${PILLARS[p]?.angle} comes down to one thing: clarity over noise.`, cta: 'Reply with your one thing.', hashtags: tags.slice(0, 3) }
  return out
}
function qualityScores(s) { let n = 0; for (const ch of (s || 'x')) n += ch.charCodeAt(0); return { grammar: 88 + (n % 9), readability: 84 + ((n * 3) % 12), originality: 90 + (n % 8), platformFit: 86 + ((n * 5) % 11), brandVoice: 89 + ((n * 7) % 9), overall: 90 + (n % 7) }
}
function runFactCheck(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content || {})
  const clichés = ['game-changer', 'revolutionize', 'think outside the box', 'synergy', 'unlock the power', 'elevate your', 'delve into']
  const hits = clichés.filter(c => text.toLowerCase().includes(c))
  const originality = Math.max(60, 96 - hits.length * 8 - (text.length % 7))
  return { status: hits.length >= 3 ? 'Blocked' : hits.length >= 1 ? 'Needs Review' : 'Clean', originalityScore: originality, confidence: Math.min(95, 78 + (originality % 15)), issues: hits }
}
function makeAnalysis(hint, imageName) {
  const pillar = pickPillar(hint || imageName)
  return { pillar, topic: hint || `${pillar} in modern business`, mood: 'confident & optimistic', contentAngle: PILLARS[pillar]?.angle || 'insight', audience: 'MBA students, HR professionals, analysts, founders' }
}

// ---- Job builders (shared by social / blog / pipelines) ----
const DEFAULT_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'threads']
function makeSocialJob(seedText, imageName, platforms, source) {
  const analysis = makeAnalysis(seedText, imageName)
  const content = demoGenerate(db.brand[0]?.data || {}, analysis, platforms)
  return {
    id: uuidv4(), source: source || 'quick-compose', imageUrl: null, imageName: (imageName || seedText || 'Untitled').slice(0, 80),
    seedText: seedText || null, status: 'Pending Approval', analysis, platforms: content, selectedPlatforms: platforms,
    quality: qualityScores(analysis.topic), factcheck: runFactCheck(content), providers: { mode: 'demo' }, versions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}
function makeBlogJob(seed) {
  const pillar = pickPillar(seed)
  const title = `The ${pillar} Playbook: ${seed.slice(0, 50)}`
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
  const article = { title, slug, metaDescription: `${seed} \u2014 a practical framework you can use this week.`, intro: `Every week I get asked about ${seed.toLowerCase()}. Here\u2019s the framework I actually use.`, sections: [{ h2: `Why ${pillar} matters now`, body: ['The window is wider than it looks.', 'Companies that win here aren\u2019t smarter; they\u2019re clearer.'] }, { h2: 'The framework', body: ['Step one: define the question.', 'Step two: find the smallest dataset.', 'Step three: present the trade-off.'] }, { h2: 'Common mistakes', body: ['Optimizing for activity instead of outcomes.', 'Copying benchmarks without context.'] }, { h2: 'How to start this week', body: ['Pick one decision you own.', 'Write down the information you\u2019d need.', 'Then go get exactly that.'] }], takeaways: [`Start with the decision, not the ${pillar.toLowerCase()}.`, 'Simple and shipped beats perfect, every time.', `Consistency on ${PILLARS[pillar]?.angle} compounds louder than intensity.`], conclusion: `If you take one thing: the edge isn\u2019t information anymore. It\u2019s judgment.`, cta: `What\u2019s one decision you\u2019re about to make? Share it in the comments.`, wordCount: 850, readingTime: 4 }
  const seo = { primaryKeyword: `${pillar.toLowerCase()} strategy`, secondaryKeywords: [pillar.toLowerCase(), 'career growth', 'business decisions', 'leadership'], seoScore: 86, readabilityScore: 82, faq: [{ q: `What is the biggest mistake in ${seed.toLowerCase()}?`, a: 'Optimizing for activity instead of outcomes.' }, { q: 'How do I get better at this?', a: 'Start with one owned decision and review your calls monthly.' }] }
  const eco = {}
  for (const p of ['linkedin', 'instagram', 'facebook', 'threads', 'newsletter']) {
    if (p === 'newsletter') eco.newsletter = { subject: title, preview: article.metaDescription.slice(0, 100), body: `<h1>${title}</h1><p>${article.metaDescription}</p><p>${article.intro}</p>` }
    else eco[p] = demoGenerate(db.brand[0]?.data || {}, { pillar, topic: seed }, [p])[p]
  }
  return { id: uuidv4(), status: 'Pending Approval', analysis: { pillar, topic: seed }, article, seo, ecosystem: eco, providers: { mode: 'demo' }, versions: [], factcheck: runFactCheck(article), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

// ---- Integration storage helpers ----
function findIntegration(id) { return db.integrations.find(i => i.id === id) }
function upsertIntegration(id, patch) {
  let it = findIntegration(id)
  if (!it) { it = { id, fields: {}, enabled: true, configured: false, role: '', priority: 0 }; db.integrations.push(it) }
  Object.assign(it, patch)
  return it
}

// ---- Seed demo data so the dashboard has baseline content ----
function makeDemoSocial(seedText, status) {
  const job = makeSocialJob(seedText, seedText, DEFAULT_PLATFORMS, 'seed')
  job.status = status
  if (status === 'Published') job.publishedAt = new Date().toISOString()
  return job
}
if (!db.social_posts.length) {
  db.social_posts.push(makeDemoSocial('AI is reshaping how teams hire', 'Published'))
  db.social_posts.push(makeDemoSocial('Why analytics teams fail', 'Pending Approval'))
  db.social_posts.push(makeDemoSocial('Leadership lessons from data', 'Pending Approval'))
  audit('system', 'seed.demo', { count: 3 })
}

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

async function handle(request) {
  const url = new URL(request.url)
  const route = url.pathname.replace('/api', '') || '/'
  const method = request.method

  // ---------- Public ----------
  const html = (msg, ok = true) => new NextResponse(`<!DOCTYPE html><html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;background:#09090B;color:#fff"><div style="text-align:center"><h2>${ok ? '' : '⚠️ '}${msg}</h2><p>You may close this tab.</p></div></body></html>`, { headers: { 'Content-Type': 'text/html' } })

  if (route === '/' || route === '/root') return json({ message: 'NEXUS API online', time: new Date().toISOString() })

  if (route === '/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const U = process.env.ADMIN_USERNAME || 'admin'
    const P = process.env.ADMIN_PASSWORD || 'admin123'
    if (body.username === U && body.password === P) {
      const token = signToken({ sub: 'admin', name: 'Manikanta', role: 'owner', exp: Date.now() + 7 * 86400000 })
      audit('admin', 'auth.login', { method: 'password' })
      return json({ token, user: { name: 'Manikanta', role: 'owner', username: U } })
    }
    return json({ error: 'Invalid credentials' }, 401)
  }

  // ---- Public recruiter page (no auth — shareable link) ----
  if (route === '/recruiter/public') {
    const slug = url.searchParams.get('slug') || ''
    const pass = url.searchParams.get('passcode') || ''
    const cfgDoc = db.config.find(c => c.key === 'recruiter' && c.data?.slug === slug)
    if (!cfgDoc || cfgDoc.data.enabled === false) return json({ error: 'Not found' }, 404)
    const cfg = cfgDoc.data
    if (cfg.passcode && cfg.passcode !== pass) return json({ error: 'Passcode required' }, 401)
    const published = db.social_posts.filter(p => p.status === 'Published')
    const items = (cfg.items || []).filter(i => i.selected).map(s => {
      const src = published.find(x => x.id === s.id)
      return { id: s.id, title: src?.imageName || s.title || '', category: src?.analysis?.pillar || s.category || '', reason: (src?.quality?.overall ? `Published with quality score ${src.quality.overall}/100` : '') || s.reason || '', url: src?.publishedUrl || null }
    })
    return json({ slug, enabled: true, name: db.brand[0]?.data?.name || 'Manikanta R', headline: db.brand[0]?.data?.tagline || '', items })
  }

  // ---- OAuth callback (browser redirect, no auth) ----
  if (route === '/oauth/callback') {
    const provider = url.searchParams.get('provider')
    const code = url.searchParams.get('code')
    const err = url.searchParams.get('error')
    if (err) return html(`OAuth error: ${err}`, false)
    if (!provider || !code) return html('Missing OAuth parameters', false)
    const redirect = `${url.origin}/api/oauth/callback?provider=${provider}`
    try {
      if (provider === 'linkedin') {
        const it = findIntegration('linkedin')
        const f = it?.fields || {}
        if (!f.clientId || !f.clientSecret) return html('LinkedIn OAuth is not configured', false)
        const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: f.clientId, client_secret: decrypt(f.clientSecret) }),
        })
        const b = await r.json()
        if (!r.ok || b.error) throw new Error(b.error_description || b.error || `LinkedIn ${r.status}`)
        upsertIntegration('linkedin', { fields: { ...f, accessToken: encrypt(b.access_token), refreshToken: b.refresh_token ? encrypt(b.refresh_token) : (f.refreshToken || '') }, configured: true })
        audit('admin', 'oauth.complete', { provider: 'linkedin' })
        return html('NEXUS · LinkedIn connected ✓')
      }
      if (provider === 'meta') {
        const fb = findIntegration('facebook')
        const f = fb?.fields || {}
        if (!f.clientId || !f.clientSecret) return html('Meta OAuth is not configured', false)
        const r = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${encodeURIComponent(f.clientId)}&client_secret=${encodeURIComponent(decrypt(f.clientSecret))}&redirect_uri=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}`)
        const b = await r.json()
        if (!r.ok || b.error) throw new Error(b.error?.message || 'Meta token exchange failed')
        let token = b.access_token
        const ll = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(f.clientId)}&client_secret=${encodeURIComponent(decrypt(f.clientSecret))}&fb_exchange_token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => ({}))
        if (ll.access_token) token = ll.access_token
        upsertIntegration('facebook', { fields: { ...f, accessToken: encrypt(token) }, configured: true })
        audit('admin', 'oauth.complete', { provider: 'meta' })
        return html('NEXUS · Meta connected ✓')
      }
      return html('Unknown OAuth provider', false)
    } catch (e) {
      return html(`OAuth failed: ${e.message}`, false)
    }
  }

  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  // ---------- Integrations management ----------
  if (route === '/integrations') {
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
  }

  if (route === '/integrations/save' && method === 'POST') {
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
  }

  if (route === '/integrations/test' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const it = findIntegration(body.id)
    if (!it || !it.configured) return json({ ok: false, message: 'Not configured yet' })
    const start = Date.now()
    const fail = (msg) => { it.lastTest = 'fail'; it.lastTestedAt = new Date().toISOString(); it.lastLatencyMs = Date.now() - start; return json({ ok: false, message: msg }) }
    try {
      if (body.id === 'rss') {
        const feeds = (it.fields?.feeds || '').split(',').map(s => s.trim()).filter(Boolean)
        if (!feeds.length) throw new Error('No feeds configured')
        const { fetchFeed } = await import('../../../lib/rss.js')
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
        const { googleAccessToken } = await import('../../../lib/google.js')
        await googleAccessToken(it.fields?.serviceAccountJson)
      }
      it.lastTest = 'pass'; it.lastTestedAt = new Date().toISOString(); it.lastLatencyMs = Date.now() - start
      return json({ ok: true, message: 'Connection OK', latencyMs: Date.now() - start })
    } catch (e) {
      return fail(e.message)
    }
  }

  if (route === '/integrations/disconnect' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const idx = db.integrations.findIndex(i => i.id === body.id)
    if (idx >= 0) db.integrations.splice(idx, 1)
    audit(user.sub, 'integration.disconnect', { id: body.id })
    return json({ ok: true })
  }

  if (route === '/integrations/role' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const it = findIntegration(body.id)
    if (it) { it.role = body.role; if (body.priority !== undefined) it.priority = body.priority }
    audit(user.sub, 'integration.role', { id: body.id, role: body.role })
    return json({ ok: true })
  }

  if (route === '/oauth/start') {
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
  }

  // Dashboard
  if (route === '/dashboard') {
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
  }

  // ---------- Social ----------
  if (route === '/social' && method === 'GET') return json({ posts: db.social_posts.slice().reverse() })
  if (route === '/social/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const platforms = body.platforms || DEFAULT_PLATFORMS
    const job = makeSocialJob(body.seedText || body.imageName || 'AI in business', body.imageName, platforms, body.imageUrl ? 'drive-image' : 'quick-compose')
    job.imageUrl = body.imageUrl || null
    db.social_posts.push(job)
    audit(user.sub, 'social.generate', { id: job.id, mode: 'demo' })
    return json({ job })
  }
  if (route === '/social/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    if (post.factcheck?.status === 'Blocked' && body.action === 'approve') return json({ error: 'Blocked by Fact-Check gate' }, 409)
    const now = new Date().toISOString()
    if (body.action === 'edit' || body.action === 'regenerate') {
      post.versions.push({ v: post.versions.length + 1, action: body.action, snapshot: JSON.parse(JSON.stringify(post.platforms)), ts: now })
    }
    if (body.action === 'approve') { post.status = 'Published'; post.publishedAt = now }
    else if (body.action === 'reject') post.status = 'Rejected'
    else if (body.action === 'skip') post.status = 'Skipped'
    else if (body.action === 'schedule') { post.status = 'Scheduled'; post.scheduledAt = body.scheduledAt || now }
    else if (body.action === 'regenerate') { const analysis = { ...post.analysis, topic: post.analysis.topic + ' ' }; post.platforms = demoGenerate(db.brand[0]?.data || {}, analysis, post.selectedPlatforms); post.quality = qualityScores(analysis.topic) }
    else if (body.action === 'edit' && body.platforms) { post.platforms = { ...post.platforms, ...body.platforms } }
    post.updatedAt = now
    audit(user.sub, `social.${body.action}`, { id: post.id })
    return json({ job: post })
  }
  if (route === '/revert' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    let job = db.social_posts.find(p => p.id === body.id) || db.blog_posts.find(p => p.id === body.id)
    if (job && (job.versions || []).length) {
      const last = job.versions.pop()
      if (body.module === 'blog' && last.snapshot?.article) job.article = last.snapshot.article
      else if (last.snapshot) job.platforms = last.snapshot
      job.updatedAt = new Date().toISOString()
      audit(user.sub, 'revert', { module: body.module, id: job.id })
    }
    return json({ ok: true, job: job || {} })
  }
  if (route === '/versions') {
    const module = url.searchParams.get('module')
    const id = url.searchParams.get('id')
    let job = null
    if (module === 'blog') job = db.blog_posts.find(p => p.id === id)
    else job = db.social_posts.find(p => p.id === id)
    return json({ versions: job?.versions || [] })
  }

  // ---------- Blog ----------
  if (route === '/blog' && method === 'GET') return json({ posts: db.blog_posts.slice().reverse() })
  if (route === '/blog/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const seed = body.seedText || 'AI in business'
    const job = makeBlogJob(seed)
    db.blog_posts.push(job)
    audit(user.sub, 'blog.generate', { id: job.id })
    return json({ job })
  }
  if (route === '/blog/action' && method === 'POST') {
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
  }

  // ---------- News ----------
  if (route === '/news' && method === 'GET') return json({ items: db.news_opportunities.slice().reverse() })
  if (route === '/news/scan' && method === 'POST') {
    const headlines = [
      'AI model breaks new ground in decision making', 'The future of work is hybrid \u2014 here\u2019s the data', 'Why analytics teams fail and how to fix them',
      'Leadership in the age of AI', 'HR trends 2026: what actually matters', 'MBA skills that pay off immediately',
      'Productivity systems that work', 'Business strategy in uncertain times', 'The compounding power of consistency', 'Data-driven decisions: a practical guide'
    ]
    const now = new Date().toISOString()
    const added = headlines.map((h, i) => { const pillar = pickPillar(h); const item = { id: uuidv4(), headline: h, link: `https://news.example.com/${i}`, source: 'Google News', itemPublishedAt: now, description: h, pillar, score: { relevance: 60 + Math.floor(Math.random() * 30), impact: 50 + Math.floor(Math.random() * 30), seoOpportunity: 55 + Math.floor(Math.random() * 30), virality: 40 + Math.floor(Math.random() * 40), audienceMatch: 60 + Math.floor(Math.random() * 30), overall: 60 + Math.floor(Math.random() * 30), formats: ['LinkedIn', 'Instagram', 'Blog'] }, status: 'Pending', createdAt: now }; db.news_opportunities.push(item); return item })
    audit(user.sub, 'news.scan', { scanned: headlines.length, kept: added.length })
    return json({ scanned: headlines.length, kept: added.length, items: added })
  }
  if (route === '/news/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const item = db.news_opportunities.find(i => i.id === body.id)
    if (!item) return json({ error: 'Not found' }, 404)
    if (body.action === 'ignore') item.status = 'Ignored'
    else if (body.action === 'save') item.status = 'Saved'
    else if (body.action === 'generate_social' || body.action === 'generate_all') {
      const job = makeSocialJob(item.headline, item.headline, DEFAULT_PLATFORMS, 'news-seed')
      db.social_posts.push(job); item.status = 'Generated'; item.socialJobId = job.id
      audit(user.sub, 'news.generate_social', { newsId: item.id, jobId: job.id })
      if (body.action === 'generate_all') {
        const bjob = makeBlogJob(item.headline)
        db.blog_posts.push(bjob); item.blogJobId = bjob.id
        audit(user.sub, 'news.generate_blog', { newsId: item.id, jobId: bjob.id })
        return json({ ok: true, item, socialJob: { id: job.id }, blogJob: { id: bjob.id } })
      }
      return json({ ok: true, item, socialJob: { id: job.id } })
    }
    else if (body.action === 'generate_blog') {
      const bjob = makeBlogJob(item.headline)
      db.blog_posts.push(bjob); item.status = 'Generated'; item.blogJobId = bjob.id
      audit(user.sub, 'news.generate_blog', { newsId: item.id, jobId: bjob.id })
      return json({ ok: true, item, blogJob: { id: bjob.id } })
    }
    return json({ ok: true, item })
  }

  // ---------- Calendar ----------
  if (route === '/calendar' && method === 'GET') {
    const items = [...db.social_posts.map(p => ({ module: 'Social', id: p.id, title: p.imageName, pillar: p.analysis?.pillar, quality: p.quality?.overall, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.blog_posts.map(p => ({ module: 'Blog', id: p.id, title: p.article?.title, pillar: p.analysis?.pillar, quality: p.seo?.seoScore, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.news_opportunities.filter(i => i.status === 'Generated').map(i => ({ module: 'News', id: i.id, title: i.headline, pillar: i.pillar, quality: i.score?.overall, status: i.status, date: i.createdAt })), ...db.seasonal_campaigns.map(c => ({ module: 'Seasonal', id: c.id, title: c.eventName, pillar: c.pillar, quality: c.quality?.overall, status: c.status, date: c.eventDate }))]
    return json({ items })
  }
  if (route === '/calendar/reschedule' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id) || db.blog_posts.find(p => p.id === body.id) || db.seasonal_campaigns.find(p => p.id === body.id)
    if (post) { post.scheduledAt = body.date; post.updatedAt = new Date().toISOString() }
    return json({ ok: true })
  }

  // ---------- Analytics ----------
  function analyticsAggregate() {
    const published = db.social_posts.filter(p => p.status === 'Published')
    const perPillar = {}
    const perPlatform = { linkedin: 0, instagram: 0, facebook: 0, threads: 0 }
    for (const p of published) { perPillar[p.analysis?.pillar] = (perPillar[p.analysis?.pillar] || 0) + 1; for (const plat of (p.selectedPlatforms || [])) if (perPlatform[plat] !== undefined) perPlatform[plat]++ }
    const hashtagMap = {}
    for (const p of published) for (const plat of (p.selectedPlatforms || [])) for (const tag of (p.platforms?.[plat]?.hashtags || [])) hashtagMap[tag] = (hashtagMap[tag] || 0) + 1
    return {
      totals: { reach: published.length * 200, engagementRate: '5.2', followersGained: published.length * 12, websiteVisits: published.length * 45, publishedCount: published.length },
      perPillar: Object.entries(perPillar).map(([name, v]) => ({ name, v })),
      perPlatform: Object.entries(perPlatform).map(([name, v]) => ({ name, v })),
      timeline: Array.from({ length: 14 }, (_, i) => ({ day: `08-${String(i + 1).padStart(2, '0')}`, reach: 100 + i * 20, engagement: 5 + Math.random() * 10 })),
      best: published.filter(p => (p.quality?.overall || 0) >= 90).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, score: p.quality.overall, pillar: p.analysis?.pillar })),
      worst: published.filter(p => (p.quality?.overall || 0) <= 80).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, score: p.quality.overall, pillar: p.analysis?.pillar })),
      aiCoach: published.length > 0 ? `You've published ${published.length} posts. ${Object.entries(perPillar).sort((a, b) => b[1] - a[1])[0]?.[0] || 'AI'} content performs best.` : 'Generate your first post to build your performance baseline.',
      growth: { today: 150, yesterday: 140, weekly: 1000, monthly: 4500 },
      hashtags: Object.entries(hashtagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    }
  }
  if (route === '/analytics' && method === 'GET') return json(analyticsAggregate())
  if (route === '/analytics/full' && method === 'GET') return json(analyticsAggregate())

  // ---------- Learning ----------
  if (route === '/learning' && method === 'GET') {
    return json({ recommendations: ['Generate and publish content to build your performance baseline.', 'Post consistently \u2014 the Learning Engine gets smarter with every post.'], bestTopics: [], bestHashtags: [], bestPlatforms: [], bestTimes: [], bestHooks: [], totalPosts: db.social_posts.filter(p => p.status === 'Published').length, totalBlogs: db.blog_posts.filter(p => p.status === 'Published').length })
  }

  // ---------- Auto-Pilot ----------
  if (route === '/autopilot' && method === 'GET') {
    const cfg = db.config.find(c => c.key === 'autopilot')
    return json({ config: cfg?.data || null, status: { running: true } })
  }
  if (route === '/autopilot' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    const config = body.config || body.cfg || {}
    const existing = db.config.findIndex(c => c.key === 'autopilot')
    if (existing >= 0) db.config[existing].data = config
    else db.config.push({ key: 'autopilot', data: config })
    audit(user.sub, 'autopilot.save', {})
    return json({ ok: true })
  }
  if (route === '/autopilot/run' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const job = makeSocialJob(body.seedText || 'AI in business', 'Auto-generated', DEFAULT_PLATFORMS, 'autopilot')
    db.social_posts.push(job)
    audit(user.sub, 'autopilot.run', { id: job.id })
    return json({ ok: true, social: { id: job.id } })
  }

  // ---------- Pipeline orchestrator (runs the full phased automation) ----------
  if (route === '/pipeline/run' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const module = body.module || 'social'
    const { runPipeline, blogPipeline, scanNews, loadSchedule, shouldRunAt } = await import('../../../lib/pipeline.js')
    // If GitHub Actions fires every 30 min but we only want scheduled posts,
    // respectSchedule:true makes the pipeline run only at the configured times
    // (default 5 posting slots per weekday → 5 posts/day).
    if (body.respectSchedule) {
      const schedule = await loadSchedule({ collection: (name) => ({ findOne: async (q = {}) => { const items = db[name] || []; if (!q || Object.keys(q).length === 0) return items[0] || null; return items.find((i) => Object.entries(q).every(([k, v]) => i[k] === v)) || null } }) })
      if (!shouldRunAt(schedule, new Date())) {
        return json({ ok: false, reason: 'Not a scheduled posting time — checking schedule from Google Sheets', schedule })
      }
    }
    // Build a minimal db adapter over the in-memory store so the pipeline works.
    const dbAdapter = {
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
        insertOne: async (doc) => { (db[name] = db[name] || []).push(doc); return { insertedId: doc.id } },
        updateOne: async (q, u) => { const i = (db[name] || []).findIndex((x) => Object.entries(q).every(([k, v]) => x[k] === v)); if (i >= 0 && u.$set) Object.assign(db[name][i], u.$set); return { modifiedCount: i >= 0 ? 1 : 0 } },
        countDocuments: async () => (db[name] || []).length,
        deleteMany: async () => ({ deletedCount: 0 }),
      }),
    }
    let result
    if (module === 'blog') result = await blogPipeline(dbAdapter, { seedText: body.seedText || 'AI in business' }, body.source || 'manual')
    else if (module === 'news') result = await scanNews(dbAdapter)
    else result = await runPipeline(dbAdapter, { platforms: body.platforms || DEFAULT_PLATFORMS, seedText: body.seedText || 'AI in business' }, body.source || 'manual')
    audit(user.sub, `pipeline.${module}`, { ok: result.ok, reason: result.reason || null })
    return json(result)
  }
  if (route === '/pipeline/publish' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find((p) => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    const { publishToPlatforms, archiveImage } = await import('../../../lib/pipeline.js')
    const integrations = {}
    for (const it of db.integrations) integrations[it.id] = it.fields || {}
    const pub = await publishToPlatforms(post, integrations)
    if (pub.ok) {
      post.status = 'Published'
      post.publishedAt = new Date().toISOString()
      await archiveImage(db, post.imageId, {}).catch(() => {})
      audit(user.sub, 'pipeline.publish', { id: post.id, ok: true })
    } else {
      post.status = 'Failed'
      post.lastError = Object.values(pub.results).find((r) => !r.ok)?.error || 'Publish failed'
      audit(user.sub, 'pipeline.publish', { id: post.id, ok: false, error: post.lastError })
    }
    return json({ ok: pub.ok, results: pub.results, job: post })
  }
  if (route === '/pipeline/status' && method === 'GET') {
    const { learningInsights } = await import('../../../lib/pipeline.js')
    const insights = learningInsights(db.social_posts)
    return json({
      running: db.social_posts.filter((p) => p.status === 'Pending Approval' || p.status === 'Scheduled').length,
      completed: db.social_posts.filter((p) => p.status === 'Published').length,
      failed: db.social_posts.filter((p) => p.status === 'Failed' || p.status === 'Rejected').length,
      insights,
    })
  }

  // ---------- Other core endpoints ----------
  if (route === '/auth/me') return json({ user })
  if (route === '/assistant' && method === 'GET') {
    const a = db.assistant[0]?.data || { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }
    return json({ assistant: a })
  }
  if (route === '/assistant' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    if (db.assistant[0]) db.assistant[0].data = body.assistant
    else db.assistant.push({ id: 'assistant', data: body.assistant })
    audit(user.sub, 'assistant.update', {})
    return json({ ok: true })
  }
  if (route === '/brand' && method === 'GET') return json({ brand: db.brand[0]?.data || {} })
  if (route === '/brand' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    if (db.brand[0]) db.brand[0].data = body.brand
    else db.brand.push({ id: 'brand', data: body.brand })
    audit(user.sub, 'brand.update', {})
    return json({ ok: true })
  }
  if (route === '/audit') return json({ logs: db.audit.slice(-50).reverse() })
  if (route === '/cron' && method === 'GET') return json({ jobs: db.social_posts.filter(p => p.status === 'Scheduled').map(p => ({ id: p.id, module: 'social', label: p.imageName, status: 'Scheduled', nextRun: p.scheduledAt })), logs: db.audit.filter(a => a.action === 'cron.run').slice(-10) })
  if (route === '/connections') return json({ linkedin: { connected: !!findIntegration('linkedin') }, facebook: { connected: !!findIntegration('facebook') } })
  if (route === '/discord' && method === 'GET') {
    const it = findIntegration('discord')
    const interactions = db.discord_interactions.slice(-20).reverse()
    return json({ webhook: !!it?.fields?.webhookUrl, publicKey: !!it?.fields?.publicKey, interactionCount: db.discord_interactions.length, interactions })
  }
  if (route === '/discord/interactions' && method === 'GET') return json({ interactions: db.discord_interactions.slice(-20).reverse() })
  if (route === '/discord/interactions' && method === 'POST') {
    const rawBody = await request.text()
    const sig = request.headers.get('x-signature-ed25519') || ''
    const stamp = request.headers.get('x-signature-timestamp') || ''
    const it = findIntegration('discord')
    const pubKey = it?.fields?.publicKey || process.env.DISCORD_PUBLIC_KEY || ''
    if (!pubKey || !verifyInteractionRequest(pubKey, rawBody, sig, stamp)) return json({ error: 'Invalid signature' }, 401)
    let ix
    try { ix = JSON.parse(rawBody) } catch { return json({ error: 'Invalid payload' }, 400) }
    db.discord_interactions.push({ id: uuidv4(), type: ix.type, user: ix.member?.user?.username || ix.user?.username || 'unknown', data: ix.data, ts: new Date().toISOString() })
    if (ix.type === INTERACTION_TYPES.PING) return json({ type: 1 })
    if (ix.type === INTERACTION_TYPES.MESSAGE_COMPONENT) {
      const [module, id, action] = (ix.data?.custom_id || '').split('|')
      let job = null
      if (module === 'social') job = db.social_posts.find(p => p.id === id)
      else if (module === 'blog') job = db.blog_posts.find(p => p.id === id)
      else if (module === 'seasonal') job = db.seasonal_campaigns.find(p => p.id === id)
      const ownerId = it?.fields?.ownerId
      const uid = ix.member?.user?.id
      if (ownerId && uid && uid !== ownerId) return json({ type: 4, data: { content: 'Only the NEXUS owner can approve.', flags: 64 } })
      if (job) {
        if (action === 'approve') { job.status = 'Published'; job.publishedAt = new Date().toISOString() }
        else if (action === 'reject') job.status = 'Rejected'
        else if (action === 'skip') job.status = 'Skipped'
        else if (action === 'schedule') job.status = 'Scheduled'
        else if (action === 'regenerate') { const a = { ...job.analysis, topic: job.analysis.topic + ' ' }; job.platforms = demoGenerate(db.brand[0]?.data || {}, a, job.selectedPlatforms || DEFAULT_PLATFORMS); job.quality = qualityScores(a.topic) }
        job.updatedAt = new Date().toISOString()
        audit('discord', `${module}.${action}`, { id: job.id })
        try {
          await editInteractionMessage(ix.application_id, ix.token, { embeds: [buildEmbed({ title: job.imageName || job.article?.title || 'NEXUS', description: `Status → ${job.status}`, color: job.status === 'Published' ? COLOR.published : job.status === 'Rejected' ? COLOR.rejected : COLOR.pending })], components: [] })
        } catch {}
      }
      return interactionAck()
    }
    return json({ type: 4, data: { content: 'Unsupported interaction', flags: 64 } })
  }
  if (route === '/discord/test' && method === 'POST') {
    const it = findIntegration('discord')
    const wu = it?.fields?.webhookUrl ? decrypt(it.fields.webhookUrl) : ''
    if (!wu) return json({ error: 'Discord webhook not configured' }, 400)
    const body = await request.json().catch(() => ({}))
    await sendApprovalCard(wu, { title: 'NEXUS test', description: body.message || 'Discord Hub is connected ✓', color: COLOR.info }).catch(e => { throw new Error(e.message) })
    return json({ ok: true })
  }
  if (route === '/newsletter/subscribers') return json({ total: db.newsletter_subscribers.length, active: db.newsletter_subscribers.filter(s => s.status === 'Active').length, newThisWeek: 0, unsubscribed: 0 })
  if (route === '/newsletter/campaigns') return json({ campaigns: db.newsletter_campaigns.slice().reverse() })
  if (route === '/newsletter/campaign' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const campaign = { id: uuidv4(), subject: body.subject || '(no subject)', preview: body.preview || '', body: body.body || '', template: body.template || 'Custom', status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.newsletter_campaigns.push(campaign)
    audit(user.sub, 'newsletter.create', { id: campaign.id })
    return json({ campaign })
  }
  if (route === '/newsletter/subscribe' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (!body.email) return json({ error: 'Email required' }, 400)
    db.newsletter_subscribers.push({ id: uuidv4(), email: body.email, status: 'Active', ts: new Date().toISOString() })
    audit(user.sub, 'newsletter.subscribe', { email: body.email })
    return json({ ok: true })
  }
  if (route === '/newsletter/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const blog = db.blog_posts.find(b => b.id === body.blogId)
    if (!blog) return json({ error: 'Blog not found' }, 404)
    const campaign = { id: uuidv4(), subject: blog.article.title, preview: blog.article.metaDescription?.slice(0, 100), body: `<h1>${blog.article.title}</h1><p>${blog.article.intro}</p>`, template: 'Blog Announcement', blogId: body.blogId, status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: new Date().toISOString() }
    db.newsletter_campaigns.push(campaign)
    return json({ campaign })
  }
  if (route === '/newsletter/send' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const camp = db.newsletter_campaigns.find(c => c.id === body.id)
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
  }
  if (route === '/newsletter/unsubscribe' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const s = db.newsletter_subscribers.find(x => x.email === body.email)
    if (s) s.status = 'Unsubscribed'
    return json({ ok: true })
  }
  if (route === '/email/send' && method === 'POST') {
    const resend = findIntegration('resend')
    const key = resend?.fields?.apiKey ? decrypt(resend.fields.apiKey) : ''
    const from = resend?.fields?.fromEmail
    if (!key || !from) return json({ error: 'Configure Resend (API key + from email) first' }, 400)
    const body = await request.json().catch(() => ({}))
    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: body.to, subject: body.subject, html: body.body || '' }) })
    return json({ ok: true, mode: 'live' })
  }

  // ---------- Engage ----------
  if (route === '/engage/find') {
    const topics = ['AI in leadership', 'HR trends 2026', 'MBA insights', 'Productivity systems']
    return json({ candidates: topics.map((t, i) => ({ id: `cand-${i}`, author: ['Priya S.', 'Rahul V.', 'Ananya I.', 'Karthik R'][i], text: `${t} \u2014 here's what we learned.`, likes: 100 + i * 50, comments: 20 + i * 10, link: `https://linkedin.com/posts/demo-${i}`, topic: t })) })
  }
  if (route === '/engage/comment' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const comment = `Great insights on ${body.topic || 'this'}! I especially agree with your point about practical frameworks over theory.`
    const c = { id: uuidv4(), topic: body.topic, comment, status: 'Pending Approval', mode: 'demo', author: body.author, createdAt: new Date().toISOString() }
    db.linkedin_comments.push(c)
    audit(user.sub, 'engage.draft', { id: c.id })
    return json({ comment: c })
  }
  if (route === '/engage' && method === 'GET') return json({ comments: db.linkedin_comments.slice().reverse() })
  if (route === '/engage/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const c = db.linkedin_comments.find(x => x.id === body.id)
    if (c) { c.status = body.action === 'approve' ? 'Published' : 'Rejected'; c.updatedAt = new Date().toISOString(); audit(user.sub, `engage.${body.action}`, { id: c.id }) }
    return json({ job: c })
  }

  // ---------- Idea Vault ----------
  if (route === '/vault' && method === 'GET') return json({ ideas: db.idea_vault.slice().reverse() })
  if (route === '/vault' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    db.idea_vault.push({ id: uuidv4(), text: body.text, cluster: pickPillar(body.text), status: 'New', createdAt: new Date().toISOString() })
    audit(user.sub, 'vault.capture', {})
    return json({ idea: db.idea_vault[db.idea_vault.length - 1] })
  }
  if (route === '/vault/cluster' && method === 'POST') {
    for (const idea of db.idea_vault) if (idea.status === 'New') { idea.status = 'Clustered'; idea.cluster = pickPillar(idea.text) }
    audit(user.sub, 'vault.cluster', { processed: db.idea_vault.length })
    return json({ processed: db.idea_vault.length })
  }
  if (route === '/vault/promote' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const idea = db.idea_vault.find(i => i.id === body.id)
    if (!idea) return json({ error: 'Idea not found' }, 404)
    const pipeline = body.pipeline === 'blog' ? 'blog' : 'social'
    let job
    if (pipeline === 'social') {
      job = makeSocialJob(idea.text, idea.text, DEFAULT_PLATFORMS, 'idea-vault')
      db.social_posts.push(job)
    } else {
      job = makeBlogJob(idea.text)
      db.blog_posts.push(job)
    }
    idea.status = 'Promoted'; idea.promotedJobId = job.id; idea.promotedPipeline = pipeline
    audit(user.sub, 'vault.promote', { ideaId: idea.id, pipeline, jobId: job.id })
    return json({ ok: true, job: { id: job.id } })
  }
  if (route === '/vault/archive' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const idea = db.idea_vault.find(i => i.id === body.id)
    if (idea) idea.status = 'Archived'
    return json({ ok: true })
  }

  // ---------- Repurposing ----------
  if (route === '/repurpose' && method === 'GET') return json({ items: db.repurposed_content.slice().reverse() })
  if (route === '/repurpose/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Post not found' }, 404)
    const item = { id: uuidv4(), sourcePostId: body.postId, sourceTitle: post.imageName, sourcePillar: post.analysis?.pillar, variants: { xThread: ['Thread point 1', 'Thread point 2', 'Thread point 3'], carousel: [{ slide: 1, text: 'Slide 1' }, { slide: 2, text: 'Slide 2' }], reelScript: { scene: 'Opening hook', voiceover: 'Key message', text: 'Caption overlay', cta: 'Follow for more' }, threadsSeries: ['Part 1', 'Part 2'] }, status: 'Pending Approval', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.repurposed_content.push(item)
    audit(user.sub, 'repurpose.generate', { id: item.id })
    return json({ item })
  }
  if (route === '/repurpose/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const item = db.repurposed_content.find(x => x.id === body.id)
    if (item) {
      if (body.action === 'approve') { item.status = 'Published'; item.publishedAt = new Date().toISOString() }
      else if (body.action === 'reject') item.status = 'Rejected'
      else if (body.action === 'skip') item.status = 'Skipped'
      item.updatedAt = new Date().toISOString()
      audit(user.sub, `repurpose.${body.action}`, { id: item.id })
    }
    return json({ ok: true, job: item || {} })
  }

  // ---------- Portfolio ----------
  if (route === '/portfolio' && method === 'GET') return json({ suggested: db.social_posts.filter(p => p.status === 'Published' && (p.quality?.overall || 0) >= 85).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, quality: p.quality.overall })), studies: db.portfolio_case_studies })
  if (route === '/portfolio/draft' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Not found' }, 404)
    const study = { id: uuidv4(), title: `Case Study: ${post.imageName}`, category: post.analysis?.pillar, what: `Published about ${post.analysis?.topic}`, why: 'Tested a hypothesis about engagement', result: `Quality score: ${post.quality.overall}/100`, strategy: 'Platform-native content with strong hook', status: 'Pending Approval', syncStatus: 'Draft', createdAt: new Date().toISOString() }
    db.portfolio_case_studies.push(study)
    audit(user.sub, 'portfolio.draft', { id: study.id })
    return json({ study })
  }
  if (route === '/portfolio/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const s = db.portfolio_case_studies.find(x => x.id === body.id)
    if (s && body.action === 'approve') { s.syncStatus = 'Synced'; s.status = 'Published'; s.updatedAt = new Date().toISOString(); audit(user.sub, 'portfolio.approve', { id: s.id }) }
    return json({ job: s })
  }

  // ---------- Recruiter ----------
  if (route === '/recruiter' && method === 'GET') {
    const cfgDoc = db.config.find(c => c.key === 'recruiter')
    const cfg = cfgDoc?.data || { slug: '', passcode: '', enabled: true, items: [] }
    const suggested = db.social_posts.filter(p => p.status === 'Published' && (p.quality?.overall || 0) >= 75).slice(0, 10).map(p => ({ id: p.id, title: p.imageName, category: p.analysis?.pillar || 'Content', reason: `Published with quality score ${p.quality?.overall}/100`, url: p.publishedUrl || null, selected: false }))
    return json({ config: cfg, suggested })
  }
  if (route === '/recruiter' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    const existing = db.config.findIndex(c => c.key === 'recruiter')
    if (existing >= 0) db.config[existing].data = body.config
    else db.config.push({ key: 'recruiter', data: body.config })
    audit(user.sub, 'recruiter.save', {})
    return json({ ok: true })
  }

  // ---------- Fact-Check ----------
  if (route === '/factcheck/run' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    let content = null, target = null
    if (body.type === 'blog') { target = db.blog_posts.find(b => b.id === body.id); content = target?.article || target }
    else { target = db.social_posts.find(p => p.id === body.id); content = target?.platforms || target }
    const fc = runFactCheck(content || 'No content found')
    if (target) target.factcheck = fc
    audit(user.sub, 'factcheck.run', { type: body.type, id: body.id })
    return json({ factcheck: fc })
  }

  // ---------- AI Cost ----------
  if (route === '/ai_cost') return json({ total: 0, byProvider: {}, byModule: {}, publishedCount: db.social_posts.filter(p => p.status === 'Published').length, costPerPublishedPost: '0.0000', caps: { providers: { nvidia: 5, openrouter: 5, groq: 5 }, modules: { social: 3, blog: 3 } }, alerts: [] })
  if (route === '/ai_cost/caps' && method === 'PUT') { audit(user.sub, 'ai_cost.caps', {}); return json({ ok: true }) }

  // ---------- Seasonal ----------
  if (route === '/seasonal/calendar' && method === 'GET') return json({ events: seasonalCalendar() })
  if (route === '/seasonal/scan' && method === 'POST') {
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
  }
  if (route === '/seasonal' && method === 'GET') return json({ campaigns: db.seasonal_campaigns })
  if (route === '/seasonal/action' && method === 'POST') {
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
  }
  if (route === '/seasonal/event' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (body.name && body.d) {
      db.seasonal_events.push({ ...body, id: uuidv4(), createdAt: new Date().toISOString() })
      return json({ ok: true })
    }
    return json({ error: 'Name + MM-DD date required' }, 400)
  }

  // ---------- Cron ----------
  if (route === '/cron' && method === 'POST') {
    const cronToken = request.headers.get('x-cron-token')
    if (cronToken !== SECRET) return json({ error: 'Unauthorized' }, 401)
    const now = new Date()
    const due = db.social_posts.filter(p => p.status === 'Scheduled' && (!p.scheduledAt || new Date(p.scheduledAt) <= now))
    for (const p of due) { p.status = 'Published'; p.publishedAt = now.toISOString() }
    audit('cron', 'cron.run', { published: due.length })
    return json({ ok: true, processed: due.length, summary: { published: due.length, news: null } })
  }

  return json({ error: `Route ${route} not found` }, 404)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle