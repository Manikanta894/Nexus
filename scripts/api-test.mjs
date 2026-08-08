// End-to-end API test against a running NEXUS server + in-memory MongoDB.
const BASE = process.env.BASE || 'http://127.0.0.1:3100'
let token = null
let failures = 0
let passes = 0

async function req(path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(path === '/discord/interactions' ? { 'x-signature-ed25519': 'deadbeef', 'x-signature-timestamp': String(Date.now()) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = raw ? await res.text() : await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function test(name, fn) {
  try {
    const out = await fn()
    const ok = out === true || out?.ok === true
    if (ok) { passes++; console.log(`PASS  ${name}`) }
    else { failures++; console.log(`FAIL  ${name}  -> ${JSON.stringify(out).slice(0, 300)}`) }
  } catch (e) {
    failures++; console.log(`FAIL  ${name}  -> threw ${e.message}`)
  }
}

;(async () => {
  await test('root online', async () => (await req('/root')).status === 200)

  await test('login', async () => {
    const r = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } })
    if (r.status === 200 && r.data.token) { token = r.data.token; return true }
    return r
  })
  await test('auth/me', async () => (await req('/auth/me')).status === 200)
  await test('dashboard', async () => (await req('/dashboard')).status === 200)
  await test('social list (seeded 3)', async () => {
    const r = await req('/social')
    return r.status === 200 && r.data.posts.length >= 3
  })
  await test('integrations catalog (20)', async () => {
    const r = await req('/integrations')
    return r.status === 200 && r.data.integrations.length === 20 && r.data.dependencyMap.length > 0
  })
  await test('integration save (rss feeds)', async () => {
    const r = await req('/integrations/save', { method: 'POST', body: { id: 'rss', fields: { feeds: 'https://feeds.bbci.co.uk/news/technology/rss.xml' }, enabled: true } })
    return r.status === 200
  })
  await test('integration test (unconfigured provider)', async () => {
    const r = await req('/integrations/test', { method: 'POST', body: { id: 'resend' } })
    return r.status === 200 && r.data.ok === false
  })
  await test('brand get/put', async () => {
    const g = await req('/brand')
    if (g.status !== 200 || !g.data.brand?.name) return false
    const p = await req('/brand', { method: 'PUT', body: { brand: { ...g.data.brand, name: 'Manikanta R' } } })
    return p.status === 200
  })

  // Social pipeline
  let socialJobId = null
  await test('social generate (compose)', async () => {
    const r = await req('/social/generate', { method: 'POST', body: { seedText: 'How AI is reshaping HR hiring', platforms: ['linkedin', 'instagram', 'threads'] } })
    if (r.status === 200 && r.data.job?.id && r.data.job.platforms?.linkedin) { socialJobId = r.data.job.id; return true }
    return r
  })
  await test('social approve → Published', async () => {
    const r = await req('/social/action', { method: 'POST', body: { id: socialJobId, action: 'approve' } })
    return r.status === 200 && r.data.job?.status === 'Published'
  })
  await test('social edit → version archived', async () => {
    const r = await req('/social/action', { method: 'POST', body: { id: socialJobId, action: 'edit', platforms: { linkedin: { caption: 'EDITED' }, instagram: {}, facebook: {}, threads: {} } } })
    return r.status === 200 && r.data.job?.versions?.length === 1
  })
  await test('social revert', async () => {
    const r = await req('/revert', { method: 'POST', body: { module: 'social', id: socialJobId } })
    return r.status === 200 && r.data.job?.versions?.length === 0
  })

  // Blog pipeline
  let blogJobId = null
  await test('blog generate', async () => {
    const r = await req('/blog/generate', { method: 'POST', body: { seedText: 'Why analytics teams fail' } })
    if (r.status === 200 && r.data.job?.article?.title && r.data.job.ecosystem?.newsletter) { blogJobId = r.data.job.id; return true }
    return r
  })
  await test('blog approve → Published + URL', async () => {
    const r = await req('/blog/action', { method: 'POST', body: { id: blogJobId, action: 'approve' } })
    return r.status === 200 && r.data.job?.status === 'Published' && !!r.data.job?.publishedUrl
  })

  // News radar
  await test('news scan', async () => {
    const r = await req('/news/scan', { method: 'POST' })
    return r.status === 200 && typeof r.data.scanned === 'number' && typeof r.data.kept === 'number'
  })
  let newsId = null
  await test('news list + pick first', async () => {
    const r = await req('/news')
    if (r.status === 200 && r.data.items.length) { newsId = r.data.items[0].id; return true }
    return r.status === 200
  })
  await test('news generate_social', async () => {
    if (!newsId) return true
    const r = await req('/news/action', { method: 'POST', body: { id: newsId, action: 'generate_social' } })
    return r.status === 200 && !!r.data.socialJob
  })
  await test('news generate_blog', async () => {
    if (!newsId) return true
    const r = await req('/news/action', { method: 'POST', body: { id: newsId, action: 'generate_blog' } })
    return r.status === 200 && !!r.data.blogJob
  })
  await test('news config get/put', async () => {
    const g = await req('/news/config')
    if (g.status !== 200 || !g.data.config) return false
    const p = await req('/news/config', { method: 'PUT', body: { config: { qualityThreshold: 70 } } })
    return p.status === 200 && p.data.config?.qualityThreshold === 70
  })
  await test('news generate_all (social+blog+newsletter)', async () => {
    if (!newsId) return true
    const r = await req('/news/action', { method: 'POST', body: { id: newsId, action: 'generate_all' } })
    return r.status === 200 && !!r.data.socialJob && !!r.data.blogJob && !!r.data.newsletterCampaign
  })
  await test('news analytics', async () => {
    const r = await req('/news/analytics')
    return r.status === 200 && typeof r.data.opportunitiesFound === 'number' && typeof r.data.avgScore === 'number'
  })
  await test('news learning', async () => {
    const r = await req('/news/learning')
    return r.status === 200 && Array.isArray(r.data.bestTopics) && Array.isArray(r.data.recommendations)
  })

  // Seasonal
  await test('seasonal calendar', async () => {
    const r = await req('/seasonal/calendar')
    return r.status === 200 && r.data.events.length > 50
  })
  await test('seasonal scan → campaigns', async () => {
    const r = await req('/seasonal/scan', { method: 'POST' })
    return r.status === 200 && r.data.made >= 0 && Array.isArray(r.data.campaigns)
  })
  let seasonalId = null
  await test('seasonal campaigns list', async () => {
    const r = await req('/seasonal')
    if (r.data.campaigns?.length) seasonalId = r.data.campaigns[0].id
    return r.status === 200
  })
  await test('seasonal approve', async () => {
    if (!seasonalId) return true
    const r = await req('/seasonal/action', { method: 'POST', body: { id: seasonalId, action: 'approve' } })
    return r.status === 200 && r.data.job?.status === 'Published'
  })

  // Idea vault
  await test('vault capture (clusters to HR)', async () => {
    const r = await req('/vault', { method: 'POST', body: { text: 'Hiring and retention strategy for HR teams' } })
    return r.status === 200 && r.data.idea?.cluster === 'HR'
  })
  await test('vault cluster', async () => {
    const r = await req('/vault/cluster', { method: 'POST' })
    return r.status === 200 && typeof r.data.processed === 'number'
  })
  await test('vault promote', async () => {
    const r = await req('/vault')
    const idea = r.data.ideas?.find((i) => ['New', 'Clustered'].includes(i.status))
    if (!idea) return true
    const p = await req('/vault/promote', { method: 'POST', body: { id: idea.id, pipeline: 'social' } })
    return p.status === 200 && !!p.data.job?.id
  })

  // Repurposing
  let repItemId = null
  await test('repurpose generate', async () => {
    const r = await req('/repurpose/generate', { method: 'POST', body: { postId: socialJobId } })
    if (r.status === 200 && r.data.item?.variants?.xThread) { repItemId = r.data.item.id; return true }
    return r
  })
  await test('repurpose approve', async () => {
    if (!repItemId) return true
    const r = await req('/repurpose/action', { method: 'POST', body: { id: repItemId, action: 'approve' } })
    return r.status === 200 && r.data.job?.status === 'Published'
  })

  // LinkedIn engagement
  await test('engage find', async () => {
    const r = await req('/engage/find?topic=AI')
    return r.status === 200 && r.data.candidates.length >= 3
  })
  let engageId = null
  await test('engage comment draft', async () => {
    const r = await req('/engage/comment', { method: 'POST', body: { topic: 'AI', postText: 'AI is changing how teams make decisions', author: 'Demo' } })
    if (r.status === 200 && r.data.comment?.comment?.length > 10) { engageId = r.data.comment.id; return true }
    return r
  })
  await test('engage approve', async () => {
    if (!engageId) return true
    const r = await req('/engage/action', { method: 'POST', body: { id: engageId, action: 'approve' } })
    return r.status === 200 && r.data.job?.status === 'Published'
  })

  // Newsletter
  await test('newsletter subscribe + stats', async () => {
    await req('/newsletter/subscribe', { method: 'POST', body: { email: 'reader@example.com' } })
    const r = await req('/newsletter/subscribers')
    return r.status === 200 && r.data.total >= 1 && r.data.active >= 1
  })
  await test('newsletter generate from blog', async () => {
    const r = await req('/newsletter/generate', { method: 'POST', body: { blogId: blogJobId } })
    return r.status === 200 && !!r.data.campaign?.subject
  })
  let campaignId = null
  await test('newsletter campaign create (Draft)', async () => {
    const r = await req('/newsletter/campaign', { method: 'POST', body: { subject: 'Test digest', preview: 'preview', body: '<p>body</p>', template: 'Weekly Digest' } })
    if (r.status === 200 && r.data.campaign?.id && r.data.campaign.status === 'Draft') campaignId = r.data.campaign.id
    return r.status === 200 && r.data.campaign?.status === 'Draft'
  })
  await test('newsletter send blocked until approved (409)', async () => {
    if (!campaignId) return true
    const r = await req('/newsletter/send', { method: 'POST', body: { id: campaignId } })
    return r.status === 409
  })
  await test('newsletter approve', async () => {
    if (!campaignId) return true
    const r = await req('/newsletter/action', { method: 'POST', body: { id: campaignId, action: 'approve' } })
    return r.status === 200 && r.data.campaign?.status === 'Approved'
  })
  await test('newsletter send (demo)', async () => {
    if (!campaignId) return true
    const r = await req('/newsletter/send', { method: 'POST', body: { id: campaignId } })
    return r.status === 200 && r.data.mode === 'demo'
  })
  await test('email/send requires resend config', async () => {
    const r = await req('/email/send', { method: 'POST', body: { to: 'x@y.z', subject: 'hi' } })
    return r.status === 400
  })

  // AI cost
  await test('ai_cost stats + caps', async () => {
    const r = await req('/ai_cost')
    return r.status === 200 && typeof r.data.total === 'number' && r.data.caps?.providers?.nvidia === 5
  })
  await test('ai_cost caps save', async () => {
    const r = await req('/ai_cost/caps', { method: 'PUT', body: { caps: { providers: { groq: 2 }, modules: { social: 1 } } } })
    return r.status === 200
  })

  // Fact-check
  await test('factcheck run on blog', async () => {
    const r = await req('/factcheck/run', { method: 'POST', body: { type: 'blog', id: blogJobId } })
    return r.status === 200 && ['Clean', 'Needs Review', 'Blocked'].includes(r.data.factcheck?.status)
  })

  // Analytics + calendar
  await test('analytics aggregates', async () => {
    const r = await req('/analytics')
    return r.status === 200 && r.data.totals?.reach > 0 && Array.isArray(r.data.timeline)
  })
  await test('calendar aggregate', async () => {
    const r = await req('/calendar')
    return r.status === 200 && r.data.items.length >= 5
  })
  await test('calendar reschedule', async () => {
    const r = await req('/calendar/reschedule', { method: 'POST', body: { module: 'Social', id: socialJobId, date: '2026-08-20T09:00:00.000Z' } })
    return r.status === 200
  })

  // Recruiter
  let recruiterSlug = ''
  await test('recruiter get', async () => {
    const r = await req('/recruiter')
    return r.status === 200 && Array.isArray(r.data.suggested)
  })
  await test('recruiter save + public', async () => {
    recruiterSlug = 'proof-test-' + Date.now().toString(36)
    const s = await req('/recruiter', { method: 'PUT', body: { config: { slug: recruiterSlug, passcode: 'secret1', enabled: true, items: [] } } })
    if (s.status !== 200) return false
    const g = await req('/recruiter')
    const item = g.data.suggested[0]
    if (!item) return true
    await req('/recruiter', { method: 'PUT', body: { config: { slug: recruiterSlug, passcode: 'secret1', enabled: true, items: [{ ...item, selected: true }] } } })
    const bad = await req(`/recruiter/public?slug=${recruiterSlug}`)
    if (bad.status !== 401) return false
    const good = await req(`/recruiter/public?slug=${recruiterSlug}&passcode=secret1`)
    return good.status === 200 && good.data.items.length === 1
  })

  // Portfolio
  let portfolioId = null
  await test('portfolio draft from published post', async () => {
    const r = await req('/portfolio/draft', { method: 'POST', body: { postId: socialJobId } })
    if (r.status === 200 && r.data.study?.id) portfolioId = r.data.study.id
    return r.status === 200
  })
  await test('portfolio approve → synced', async () => {
    if (!portfolioId) return true
    const r = await req('/portfolio/action', { method: 'POST', body: { id: portfolioId, action: 'approve' } })
    return r.status === 200 && r.data.job?.syncStatus === 'Synced'
  })

  // OAuth + Discord guards
  await test('oauth start requires creds', async () => {
    const r = await req('/oauth/start?provider=linkedin')
    return r.status === 400
  })
  await test('discord interactions bad signature → 401', async () => {
    const r = await req('/discord/interactions', { method: 'POST', body: { type: 1 } })
    return r.status === 401
  })
  await test('cron requires token', async () => {
    const r = await fetch(`${BASE}/api/cron`, { method: 'POST' })
    return r.status === 401
  })

  // Audit
  await test('audit log populated', async () => {
    const r = await req('/audit')
    return r.status === 200 && r.data.logs.length > 10
  })

  console.log(`\n==== ${passes} passed, ${failures} failed ====`)
  process.exit(failures ? 1 : 0)
})()
