import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

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
  brand: [{ id: 'brand', data: { name: 'Manikanta R', tagline: 'AI MBA HR Business Analytics Leadership', voice: 'Insightful, warm, story-driven', tone: ['insightful', 'warm', 'confident'], sentenceStyle: 'Short punchy opener', favoriteWords: ['clarity', 'leverage', 'compounding'], avoidWords: ['guys', 'synergy', 'disrupt'], audience: ['MBA students', 'HR professionals', 'analysts', 'founders'], pillars: ['AI', 'Business Analytics', 'HR', 'Leadership', 'Career', 'Productivity', 'MBA'], ctaStyle: 'Ask a genuine question', colors: { primary: '#3B82F6', secondary: '#8B5CF6' }, hashtags: ['#AI', '#Leadership', '#CareerGrowth', '#BusinessStrategy'] }, updatedAt: new Date().toISOString() }],
  assistant: [{ id: 'assistant', data: { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }, updatedAt: new Date().toISOString() }],
}
function coll(name) {
  if (!db[name]) db[name] = []
  return {
    findOne: async (q = {}) => {
      const items = db[name]
      if (!q || Object.keys(q).length === 0) return items[0] || null
      return items.find(i => Object.entries(q).every(([k, v]) => {
        if (k === 'id') return i.id === v
        if (k === 'key') return i.key === v
        if (k === 'status') return i.status === v
        return false
      })) || null
    },
    find: async (q = {}) => {
      let items = db[name]
      if (q.status) items = items.filter(i => i.status === q.status)
      if (q.module) items = items.filter(i => i.module === q.module)
      return { sort: async () => ({ toArray: async () => items }), limit: async (n) => ({ toArray: async () => items.slice(0, n) }), toArray: async () => items }
    },
    insertOne: async (doc) => { db[name].push(doc); return { insertedId: doc.id || uuidv4() } },
    updateOne: async (q, u) => { const i = db[name].findIndex(x => Object.entries(q).every(([k, v]) => x[k] === v)); if (i >= 0 && u.$set) Object.assign(db[name][i], u.$set); return { modifiedCount: i >= 0 ? 1 : 0 } },
    countDocuments: async () => db[name].length,
    deleteMany: async () => ({ deletedCount: 0 }),
  }
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

async function handle(request) {
  const url = new URL(request.url)
  const route = url.pathname.replace('/api', '') || '/'
  const method = request.method

  // Public
  if (route === '/' || route === '/root') return json({ message: 'NEXUS API online', time: new Date().toISOString() })

  if (route === '/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const U = process.env.ADMIN_USERNAME || 'admin'
    const P = process.env.ADMIN_PASSWORD || 'admin123'
    if (body.username === U && body.password === P) {
      const token = signToken({ sub: 'admin', name: 'Manikanta', role: 'owner', exp: Date.now() + 7 * 86400000 })
      return json({ token, user: { name: 'Manikanta', role: 'owner', username: U } })
    }
    return json({ error: 'Invalid credentials' }, 401)
  }

  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  // Dashboard
  if (route === '/dashboard') {
    const posts = db.social_posts
    const pending = posts.filter(p => p.status === 'Pending Approval').length
    const published = posts.filter(p => p.status === 'Published').length
    const integs = db.integrations
    return json({ greetingName: 'Manikanta', stats: { followersToday: 12 * published, websiteVisits: 45 + published * 10, pending, connected: integs.filter(i => i.enabled).length, integrations: 20 }, trend: Array.from({ length: 14 }, (_, i) => ({ day: `08-${String(i + 1).padStart(2, '0')}`, reach: 100 + i * 15 + Math.random() * 50, engagement: 5 + Math.random() * 10 })), systemHealth: [{ name: 'Google', status: 'connected' }, { name: 'Discord', status: db.integrations.find(i => i.id === 'discord')?.enabled ? 'connected' : 'disabled' }, { name: 'GitHub', status: 'connected' }, { name: 'Vercel', status: 'connected' }, { name: 'LinkedIn', status: db.integrations.find(i => i.id === 'linkedin')?.enabled ? 'connected' : 'disabled' }, { name: 'Meta', status: db.integrations.find(i => i.id === 'facebook')?.enabled ? 'connected' : 'disabled' }], aiCoach: 'Your content engine is ready. Generate your first post to start learning what resonates.', aiStatus: 97 })
  }

  // Social
  if (route === '/social' && method === 'GET') return json({ posts: db.social_posts.slice().reverse() })
  if (route === '/social/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const platforms = body.platforms || ['linkedin', 'instagram', 'facebook', 'threads']
    const brandDoc = db.brand[0]?.data || {}
    const analysis = makeAnalysis(body.seedText || body.imageName, body.imageName)
    const content = demoGenerate(brandDoc, analysis, platforms)
    const quality = qualityScores(analysis.topic)
    const job = { id: uuidv4(), source: body.imageUrl ? 'drive-image' : 'quick-compose', imageUrl: body.imageUrl || null, imageName: body.imageName || body.seedText?.slice(0, 40) || 'Untitled', seedText: body.seedText || null, status: 'Pending Approval', analysis, platforms: content, selectedPlatforms: platforms, quality, factcheck: runFactCheck(content), providers: { mode: 'demo' }, versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.social_posts.push(job)
    return json({ job })
  }
  if (route === '/social/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id)
    if (!post) return json({ error: 'Not found' }, 404)
    if (post.factcheck?.status === 'Blocked' && body.action === 'approve') return json({ error: 'Blocked by Fact-Check gate' }, 409)
    const now = new Date().toISOString()
    if (body.action === 'approve') { post.status = 'Published'; post.publishedAt = now }
    else if (body.action === 'reject') post.status = 'Rejected'
    else if (body.action === 'skip') post.status = 'Skipped'
    else if (body.action === 'schedule') { post.status = 'Scheduled'; post.scheduledAt = body.scheduledAt || now }
    else if (body.action === 'regenerate') { const analysis = { ...post.analysis, topic: post.analysis.topic + ' ' }; post.platforms = demoGenerate(db.brand[0]?.data || {}, analysis, post.selectedPlatforms); post.quality = qualityScores(analysis.topic) }
    else if (body.action === 'edit' && body.platforms) { post.platforms = { ...post.platforms, ...body.platforms } }
    post.updatedAt = now
    return json({ job: post })
  }

  // Blog
  if (route === '/blog' && method === 'GET') return json({ posts: db.blog_posts.slice().reverse() })
  if (route === '/blog/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const seed = body.seedText || 'AI in business'
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
    const job = { id: uuidv4(), status: 'Pending Approval', analysis: { pillar, topic: seed }, article, seo, ecosystem: eco, providers: { mode: 'demo' }, createdAt: new Date().toISOString() }
    db.blog_posts.push(job)
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
      // Auto-newsletter
      db.newsletter_campaigns.push({ id: uuidv4(), subject: post.article.title, preview: post.article.metaDescription?.slice(0, 120), body: `<h1>${post.article.title}</h1><p>${post.article.intro}</p><p><a href="${post.publishedUrl}">Read full article</a></p>`, template: 'Blog Announcement', blogId: post.id, status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: now, updatedAt: now })
    }
    else if (body.action === 'reject') post.status = 'Rejected'
    else if (body.action === 'schedule') { post.status = 'Scheduled'; post.scheduledAt = body.scheduledAt || now }
    post.updatedAt = now
    return json({ job: post })
  }

  // News
  if (route === '/news' && method === 'GET') return json({ items: db.news_opportunities.slice().reverse() })
  if (route === '/news/scan' && method === 'POST') {
    const headlines = [
      'AI model breaks new ground in decision making', 'The future of work is hybrid \u2014 here\u2019s the data', 'Why analytics teams fail and how to fix them',
      'Leadership in the age of AI', 'HR trends 2026: what actually matters', 'MBA skills that pay off immediately',
      'Productivity systems that work', 'Business strategy in uncertain times', 'The compounding power of consistency', 'Data-driven decisions: a practical guide'
    ]
    const now = new Date().toISOString()
    const added = headlines.map((h, i) => { const pillar = pickPillar(h); const item = { id: uuidv4(), headline: h, link: `https://news.example.com/${i}`, source: 'Google News', itemPublishedAt: now, description: h, pillar, score: { relevance: 60 + Math.floor(Math.random() * 30), impact: 50 + Math.floor(Math.random() * 30), seoOpportunity: 55 + Math.floor(Math.random() * 30), virality: 40 + Math.floor(Math.random() * 40), audienceMatch: 60 + Math.floor(Math.random() * 30), overall: 60 + Math.floor(Math.random() * 30) }, status: 'Pending', createdAt: now }; db.news_opportunities.push(item); return item })
    return json({ scanned: headlines.length, kept: added.length, items: added })
  }
  if (route === '/news/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const item = db.news_opportunities.find(i => i.id === body.id)
    if (!item) return json({ error: 'Not found' }, 404)
    if (body.action === 'ignore') item.status = 'Ignored'
    else if (body.action === 'save') item.status = 'Saved'
    else if (body.action === 'generate_social' || body.action === 'generate_all') {
      const analysis = makeAnalysis(item.headline, item.headline)
      const content = demoGenerate(db.brand[0]?.data || {}, analysis, ['linkedin', 'instagram', 'facebook', 'threads'])
      const job = { id: uuidv4(), source: 'news-seed', imageName: item.headline, seedText: item.headline, status: 'Pending Approval', analysis, platforms: content, selectedPlatforms: ['linkedin', 'instagram', 'facebook', 'threads'], quality: qualityScores(item.headline), factcheck: runFactCheck(content), providers: { mode: 'demo' }, versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      db.social_posts.push(job); item.status = 'Generated'; item.socialJobId = job.id
      if (body.action === 'generate_all') {
        const blog = await handle(new Request('http://localhost/api/blog/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seedText: item.headline }) }))
        item.blogJobId = (await blog.json()).job.id
      }
    }
    else if (body.action === 'generate_blog') {
      const job = { id: uuidv4(), status: 'Pending Approval', analysis: { pillar: item.pillar, topic: item.headline }, article: { title: item.headline, slug: item.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), metaDescription: item.description || item.headline, intro: item.description || '', sections: [], takeaways: [], conclusion: '', cta: '', wordCount: 500, readingTime: 3 }, seo: { primaryKeyword: item.headline, secondaryKeywords: [], seoScore: 80, readabilityScore: 75 }, ecosystem: {}, providers: { mode: 'demo' }, createdAt: new Date().toISOString() }
      db.blog_posts.push(job); item.status = 'Generated'; item.blogJobId = job.id
    }
    return json({ ok: true, item })
  }

  // Calendar
  if (route === '/calendar' && method === 'GET') {
    const items = [...db.social_posts.map(p => ({ module: 'Social', id: p.id, title: p.imageName, pillar: p.analysis?.pillar, quality: p.quality?.overall, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.blog_posts.map(p => ({ module: 'Blog', id: p.id, title: p.article?.title, pillar: p.analysis?.pillar, quality: p.seo?.seoScore, status: p.status, date: p.scheduledAt || p.createdAt })), ...db.news_opportunities.filter(i => i.status === 'Generated').map(i => ({ module: 'News', id: i.id, title: i.headline, pillar: i.pillar, quality: i.score?.overall, status: i.status, date: i.createdAt }))]
    return json({ items })
  }
  if (route === '/calendar/reschedule' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.id) || db.blog_posts.find(p => p.id === body.id)
    if (post) { post.scheduledAt = body.date; post.updatedAt = new Date().toISOString() }
    return json({ ok: true })
  }

  // Analytics
  if (route === '/analytics' && method === 'GET') {
    const published = db.social_posts.filter(p => p.status === 'Published')
    const perPillar = {}
    const perPlatform = { linkedin: 0, instagram: 0, facebook: 0, threads: 0 }
    for (const p of published) { perPillar[p.analysis?.pillar] = (perPillar[p.analysis?.pillar] || 0) + 1; for (const plat of (p.selectedPlatforms || [])) if (perPlatform[plat] !== undefined) perPlatform[plat]++ }
    return json({ totals: { reach: published.length * 200, engagementRate: '5.2', followersGained: published.length * 12, websiteVisits: published.length * 45, publishedCount: published.length }, perPillar: Object.entries(perPillar).map(([name, v]) => ({ name, v })), perPlatform: Object.entries(perPlatform).map(([name, v]) => ({ name, v })), timeline: Array.from({ length: 14 }, (_, i) => ({ day: `08-${String(i + 1).padStart(2, '0')}`, reach: 100 + i * 20, engagement: 5 + Math.random() * 10 })), best: published.filter(p => (p.quality?.overall || 0) >= 90).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, score: p.quality.overall, pillar: p.analysis?.pillar })), worst: published.filter(p => (p.quality?.overall || 0) <= 80).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, score: p.quality.overall, pillar: p.analysis?.pillar })), aiCoach: published.length > 0 ? `You've published ${published.length} posts. ${Object.entries(perPillar).sort((a, b) => b[1] - a[1])[0]?.[0] || 'AI'} content performs best.` : 'Generate your first post to build your performance baseline.', growth: { today: 150, yesterday: 140, weekly: 1000, monthly: 4500 } })
  }

  // Learning
  if (route === '/learning' && method === 'GET') {
    return json({ recommendations: ['Generate and publish content to build your performance baseline.', 'Post consistently \u2014 the Learning Engine gets smarter with every post.'], bestTopics: [], bestHashtags: [], bestPlatforms: [], bestTimes: [], bestHooks: [], totalPosts: db.social_posts.filter(p => p.status === 'Published').length, totalBlogs: db.blog_posts.filter(p => p.status === 'Published').length })
  }

  // Auto-Pilot
  if (route === '/autopilot' && method === 'GET') {
    const cfg = db.config.find(c => c.key === 'autopilot')
    return json({ config: cfg?.data || null, status: { running: true } })
  }
  if (route === '/autopilot' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    const existing = db.config.findIndex(c => c.key === 'autopilot')
    if (existing >= 0) db.config[existing].data = body.config
    else db.config.push({ key: 'autopilot', data: body.config })
    return json({ ok: true })
  }
  if (route === '/autopilot/run' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const analysis = makeAnalysis(body.seedText || 'AI in business', 'Auto-post')
    const content = demoGenerate(db.brand[0]?.data || {}, analysis, ['linkedin', 'instagram', 'facebook', 'threads'])
    const job = { id: uuidv4(), source: 'autopilot', imageName: 'Auto-generated', seedText: body.seedText || 'AI in business', status: 'Pending Approval', analysis, platforms: content, selectedPlatforms: ['linkedin', 'instagram', 'facebook', 'threads'], quality: qualityScores(analysis.topic), factcheck: runFactCheck(content), providers: { mode: 'demo' }, versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    db.social_posts.push(job)
    return json({ ok: true, social: { id: job.id } })
  }

  // Other endpoints
  if (route === '/auth/me') return json({ user })
  if (route === '/assistant') {
    const a = db.assistant[0]?.data || { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }
    return json({ assistant: a })
  }
  if (route === '/assistant' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    if (db.assistant[0]) db.assistant[0].data = body.assistant
    else db.assistant.push({ id: 'assistant', data: body.assistant })
    return json({ ok: true })
  }
  if (route === '/brand') return json({ brand: db.brand[0]?.data || {} })
  if (route === '/brand' && method === 'PUT') {
    const body = await request.json().catch(() => ({}))
    if (db.brand[0]) db.brand[0].data = body.brand
    else db.brand.push({ id: 'brand', data: body.brand })
    return json({ ok: true })
  }
  if (route === '/audit') return json({ logs: db.audit.slice(-50).reverse() })
  if (route === '/cron') return json({ jobs: db.social_posts.filter(p => p.status === 'Scheduled').map(p => ({ id: p.id, module: 'social', label: p.imageName, status: 'Scheduled', nextRun: p.scheduledAt })), logs: db.audit.filter(a => a.action === 'cron.run').slice(-10) })
  if (route === '/connections') return json({ linkedin: { connected: !!db.integrations.find(i => i.id === 'linkedin') }, facebook: { connected: !!db.integrations.find(i => i.id === 'facebook') } })
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
  if (route === '/versions') return json({ versions: [] })
  if (route === '/discord') return json({ webhook: !!db.integrations.find(i => i.id === 'discord'), publicKey: false, interactionCount: 0, interactions: [] })
  if (route === '/newsletter/subscribers') return json({ total: db.newsletter_subscribers.length, active: db.newsletter_subscribers.filter(s => s.status === 'Active').length, newThisWeek: 0, unsubscribed: 0 })
  if (route === '/newsletter/campaigns') return json({ campaigns: db.newsletter_campaigns.slice().reverse() })
  if (route === '/newsletter/subscribe' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    db.newsletter_subscribers.push({ id: uuidv4(), email: body.email, status: 'Active', ts: new Date().toISOString() })
    return json({ ok: true })
  }
  if (route === '/engage/find') {
    const topics = ['AI in leadership', 'HR trends 2026', 'MBA insights', 'Productivity systems']
    return json({ candidates: topics.map((t, i) => ({ id: `cand-${i}`, author: ['Priya S.', 'Rahul V.', 'Ananya I.', 'Karthik R'][i], text: `${t} \u2014 here's what we learned.`, likes: 100 + i * 50, comments: 20 + i * 10, link: `https://linkedin.com/posts/demo-${i}`, topic: t })) })
  }
  if (route === '/engage/comment' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const comment = `Great insights on ${body.topic || 'this'}! I especially agree with your point about practical frameworks over theory.`
    db.linkedin_comments.push({ id: uuidv4(), topic: body.topic, comment, status: 'Pending Approval', createdAt: new Date().toISOString() })
    return json({ comment: db.linkedin_comments[db.linkedin_comments.length - 1] })
  }
  if (route === '/engage' && method === 'GET') return json({ comments: db.linkedin_comments.slice().reverse() })
  if (route === '/engage/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const c = db.linkedin_comments.find(x => x.id === body.id)
    if (c) { c.status = body.action === 'approve' ? 'Published' : 'Rejected'; c.updatedAt = new Date().toISOString() }
    return json({ job: c })
  }
  if (route === '/vault') return json({ ideas: db.idea_vault.slice().reverse() })
  if (route === '/vault' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    db.idea_vault.push({ id: uuidv4(), text: body.text, cluster: pickPillar(body.text), status: 'New', createdAt: new Date().toISOString() })
    return json({ idea: db.idea_vault[db.idea_vault.length - 1] })
  }
  if (route === '/vault/cluster' && method === 'POST') return json({ processed: db.idea_vault.length })
  if (route === '/vault/promote' && method === 'POST') return json({ ok: true })
  if (route === '/vault/archive' && method === 'POST') return json({ ok: true })
  if (route === '/repurpose') return json({ items: db.repurposed_content.slice().reverse() })
  if (route === '/repurpose/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Post not found' }, 404)
    const item = { id: uuidv4(), sourcePostId: body.postId, sourceTitle: post.imageName, sourcePillar: post.analysis?.pillar, variants: { xThread: ['Thread point 1', 'Thread point 2', 'Thread point 3'], carousel: [{ slide: 1, text: 'Slide 1' }, { slide: 2, text: 'Slide 2' }], reelScript: { scene: 'Opening hook', voiceover: 'Key message', text: 'Caption overlay', cta: 'Follow for more' }, threadsSeries: ['Part 1', 'Part 2'] }, status: 'Pending Approval', createdAt: new Date().toISOString() }
    db.repurposed_content.push(item)
    return json({ item })
  }
  if (route === '/repurpose/action' && method === 'POST') return json({ ok: true, job: {} })
  if (route === '/portfolio') return json({ suggested: db.social_posts.filter(p => p.status === 'Published' && (p.quality?.overall || 0) >= 85).slice(0, 3).map(p => ({ id: p.id, title: p.imageName, quality: p.quality.overall })), studies: db.portfolio_case_studies })
  if (route === '/portfolio/draft' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const post = db.social_posts.find(p => p.id === body.postId)
    if (!post) return json({ error: 'Not found' }, 404)
    const study = { id: uuidv4(), title: `Case Study: ${post.imageName}`, category: post.analysis?.pillar, what: `Published about ${post.analysis?.topic}`, why: 'Tested a hypothesis about engagement', result: `Quality score: ${post.quality.overall}/100`, strategy: 'Platform-native content with strong hook', status: 'Pending Approval', syncStatus: 'Draft', createdAt: new Date().toISOString() }
    db.portfolio_case_studies.push(study)
    return json({ study })
  }
  if (route === '/portfolio/action' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const s = db.portfolio_case_studies.find(x => x.id === body.id)
    if (s && body.action === 'approve') s.syncStatus = 'Synced'
    return json({ job: s })
  }
  if (route === '/recruiter') return json({ config: { slug: '', passcode: '', enabled: true }, suggested: [] })
  if (route === '/recruiter' && method === 'PUT') return json({ ok: true })
  if (route === '/recruiter/public') return json({ slug: '', enabled: true, items: [] })
  if (route === '/factcheck/run' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const fc = runFactCheck('Sample content for fact checking')
    return json({ factcheck: fc })
  }
  if (route === '/ai_cost') return json({ total: 0, byProvider: {}, byModule: {}, publishedCount: db.social_posts.filter(p => p.status === 'Published').length, costPerPublishedPost: '0.0000', caps: { providers: { nvidia: 5, openrouter: 5, groq: 5 }, modules: { social: 3, blog: 3 } }, alerts: [] })
  if (route === '/ai_cost/caps' && method === 'PUT') return json({ ok: true })
  if (route === '/email/send') return json({ error: 'Configure Resend (API key + from email) first' }, 400)
  if (route === '/oauth/start') return json({ error: 'OAuth not configured' }, 400)
  if (route === '/discord/interactions' && method === 'POST') return json({ error: 'Invalid signature' }, 401)
  if (route === '/cron' && method === 'POST') {
    const due = db.social_posts.filter(p => p.status === 'Scheduled')
    for (const p of due) { p.status = 'Published'; p.publishedAt = new Date().toISOString() }
    return json({ ok: true, summary: { published: due.length, news: null } })
  }
  if (route === '/revert' && method === 'POST') return json({ job: {} })
  if (route === '/seasonal/calendar') return json({ events: [{ name: 'World AI Day', d: '12-25', cat: 'Tech', imp: 5, daysAway: 142, nextDate: '2026-12-25' }, { name: 'International Women\u2019s Day', d: '03-08', cat: 'Awareness', imp: 4, daysAway: 214, nextDate: '2027-03-08' }] })
  if (route === '/seasonal/scan' && method === 'POST') return json({ made: 1 })
  if (route === '/seasonal') return json({ campaigns: db.seasonal_campaigns })
  if (route === '/seasonal/action' && method === 'POST') return json({ job: {} })
  if (route === '/seasonal/event' && method === 'POST') return json({ ok: true })
  if (route === '/newsletter/generate' && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const blog = db.blog_posts.find(b => b.id === body.blogId)
    if (!blog) return json({ error: 'Blog not found' }, 404)
    const campaign = { id: uuidv4(), subject: blog.article.title, preview: blog.article.metaDescription?.slice(0, 100), body: `<h1>${blog.article.title}</h1><p>${blog.article.intro}</p>`, template: 'Blog Announcement', blogId: body.blogId, status: 'Draft', stats: { sent: 0, opens: 0, clicks: 0 }, createdAt: new Date().toISOString() }
    db.newsletter_campaigns.push(campaign)
    return json({ campaign })
  }
  if (route === '/newsletter/send' && method === 'POST') return json({ ok: true, mode: 'demo', recipients: db.newsletter_subscribers.length })
  if (route === '/newsletter/unsubscribe' && method === 'POST') return json({ ok: true })

  return json({ error: `Route ${route} not found` }, 404)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
