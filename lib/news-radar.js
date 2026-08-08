// lib/news-radar.js — 24/7 AI Research & Opportunity Discovery Engine
// Implements the NEWS RADAR PRD:
//   1. Scheduler  2. Read Configuration  3. Scan trusted sources (Google News RSS + RSS)
//   4. Collect/de-dup/ignore-seen-outdated-blocked  5. AI Analysis  6. AI Scoring
//   7. Opportunity Detection  8. AI Recommendation  9. Discord Approval data
//   10. Content Generation (handled by the API)  11. Save data  12. Analytics  13. Learning
// The "AI" steps use deterministic, content-derived heuristics (demo-AI pattern).

import { v4 as uuidv4 } from 'uuid'
import { googleNewsFeeds, fetchFeed } from './rss.js'

export const NEWS_FORMATS = ['LinkedIn', 'Instagram', 'Facebook', 'Threads', 'SEO Blog', 'Newsletter', 'Carousel', 'Infographic']

// ---------------------------------------------------------------- config
export function newsConfigDefaults() {
  return {
    enabled: true,
    intervalMinutes: 60,
    categories: ['AI', 'Business Analytics', 'HR', 'Leadership', 'MBA', 'Marketing', 'Startups', 'Productivity'],
    keywords: [],
    sources: ['Google News'],
    language: 'en',
    country: 'IN',
    qualityThreshold: 55,
    autoGenerate: false,
    approvalRequired: true,
    maxAgeHours: 48,
    blockedSources: [],
  }
}

function hash(str) {
  let h = 0
  for (const ch of String(str || '')) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)))
const nowISO = () => new Date().toISOString()

const PILLAR_KEYWORDS = {
  AI: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'model', 'automation', 'gpu', 'chatbot', 'algorithm'],
  'Business Analytics': ['analytics', 'data', 'dashboard', 'metric', 'insight', 'kpi', 'forecast', 'statistic', 'visualization'],
  HR: ['hr', 'talent', 'hiring', 'recruit', 'workforce', 'employee', 'culture', 'people', 'workplace', 'benefit', 'layoffs'],
  Leadership: ['leadership', 'leader', 'ceo', 'executive', 'management', 'decision', 'culture', 'strategy'],
  MBA: ['mba', 'business school', 'career', 'finance', 'entrepreneur', 'startup founder', 'case study'],
  Marketing: ['marketing', 'brand', 'campaign', 'seo', 'advertising', 'social media', 'customer', 'content', 'creator'],
  Startups: ['startup', 'start-up', 'funding', 'venture', 'founder', 'seed round', 'unicorn'],
  Productivity: ['productivity', 'focus', 'deep work', 'tools', 'workflow', 'time management', 'efficiency'],
}
const COMPANIES = ['OpenAI', 'Google', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'Nvidia', 'Salesforce', 'LinkedIn', 'Tata', 'Infosys', 'Reliance', 'Flipkart', 'Zomato']
const TECH_WORDS = ['AI', 'LLM', 'ChatGPT', 'GenAI', 'cloud', 'SaaS', 'API', 'automation', 'robotics', 'crypto', 'blockchain', 'quantum', 'data science', 'cybersecurity']
const PILLAR_KEYS = Object.keys(PILLAR_KEYWORDS)

function detectPillar(text) {
  const lower = text.toLowerCase()
  let best = null; let bestScore = 0
  for (const k of PILLAR_KEYS) {
    const hits = PILLAR_KEYWORDS[k].filter((w) => lower.includes(w)).length
    if (hits > bestScore) { bestScore = hits; best = k }
  }
  return best || (lower.includes('business') ? 'MBA' : 'Business Analytics')
}

function scoreWordCount(lower, words) {
  return Math.round(words.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0) / Math.max(1, words.length) * 100)
}

function extractKeywords(lower) {
  const stop = new Set(['the', 'and', 'for', 'are', 'that', 'this', 'with', 'how', 'why', 'what', 'new', 'you', 'your', 'more', 'from', 'into', 'will', 'can', 'its'])
  return [...new Set(lower.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !stop.has(w)))].slice(0, 10)
}

// ---------------------------------------------------------------- 5. AI analysis
export function analyzeArticle(article = {}) {
  const title = article.title || ''
  const description = article.description || ''
  const text = `${title}. ${description}`
  const lower = text.toLowerCase()
  const pillar = detectPillar(lower)
  return {
    topic: title,
    summary: (description || title).slice(0, 500),
    industry: pillar,
    audience: pillar === 'HR' ? ['HR leaders', 'People teams'] : pillar === 'AI' ? ['Tech & business leaders'] : pillar === 'Marketing' ? ['Marketers', 'Founders'] : ['Business leaders', 'Professionals'],
    companies: COMPANIES.filter((c) => lower.includes(c.toLowerCase())),
    technologies: TECH_WORDS.filter((t) => lower.includes(t.toLowerCase())),
    businessRelevance: scoreWordCount(lower, ['business', 'market', 'revenue', 'growth', 'invest', 'economy', 'industry', 'strategy', 'profit', 'price']),
    leadershipRelevance: scoreWordCount(lower, ['leadership', 'leader', 'ceo', 'executive', 'management', 'decision', 'team', 'vision']),
    hrRelevance: scoreWordCount(lower, ['hr', 'talent', 'employee', 'workforce', 'hiring', 'culture', 'workplace', 'people', 'benefit', 'layoffs']),
    marketingRelevance: scoreWordCount(lower, ['marketing', 'brand', 'campaign', 'social', 'content', 'customer', 'audience', 'seo', 'ads']),
    businessAnalyticsRelevance: scoreWordCount(lower, ['data', 'analytics', 'metric', 'insight', 'kpi', 'dashboard', 'forecast', 'statistics']),
    sentiment: /crisis|fail|layoff|worry|down/i.test(lower) ? 'negative' : /growth|breakthrough|record|surge|win/i.test(lower) ? 'positive' : 'neutral',
    keywords: extractKeywords(lower),
  }
}

// ---------------------------------------------------------------- 6. AI scoring
export function scoreArticle(analysis, config = {}) {
  const n = hash(analysis.keywords.join('|') + analysis.topic)
  const s = {
    relevance: clamp(50 + (n % 45)),
    trendScore: clamp(50 + ((n * 3) % 45)),
    virality: clamp(40 + ((n * 5) % 45) + analysis.marketingRelevance / 4),
    businessImpact: clamp(40 + ((n * 7) % 45) + analysis.businessRelevance / 4),
    seoOpportunity: clamp(45 + ((n * 11) % 45) + analysis.businessAnalyticsRelevance / 4),
    audienceMatch: clamp(45 + ((n * 13) % 45) + Math.round((analysis.businessRelevance + analysis.marketingRelevance) / 6)),
    educationalValue: clamp(40 + ((n * 17) % 50) + analysis.leadershipRelevance / 5),
    brandMatch: clamp(45 + ((n * 19) % 45)),
  }
  s.overall = Math.round((s.relevance + s.trendScore + s.virality + s.businessImpact + s.seoOpportunity + s.audienceMatch + s.educationalValue + s.brandMatch) / 8)
  s.passed = s.overall >= (config.qualityThreshold ?? 55)
  return s
}

// ---------------------------------------------------------------- 7. opportunity detection
export function detectFormats(analysis, score) {
  const f = new Set()
  if (score.virality >= 55) f.add('LinkedIn'); if (score.trendScore >= 55) f.add('Threads')
  if (score.seoOpportunity >= 55) f.add('SEO Blog')
  if (score.educationalValue >= 55) { f.add('Carousel'); f.add('Infographic') }
  if (score.audienceMatch >= 55) f.add('Instagram')
  f.add('Facebook'); f.add('Newsletter')
  const preferred = [
    ...(score.seoOpportunity >= 55 ? ['SEO Blog'] : []),
    ...(score.virality >= 55 ? ['LinkedIn', 'Instagram'] : []),
    ...(score.educationalValue >= 55 ? ['Carousel'] : []),
  ]
  const best = preferred[0] || 'LinkedIn'
  const formats = [...f]
  if (!formats.includes(best)) formats.unshift(best)
  return { formats, best }
}

// ---------------------------------------------------------------- 8. AI recommendation
export function recommend(analysis, score, bestFormat) {
  return {
    whyItMatters: `This ${analysis.industry} development signals a shift worth tracking — ${analysis.summary.slice(0, 110)}…`,
    whyAudienceCares: `Your ${analysis.audience.join(', ')} audience is directly affected because it changes how they'll make decisions this quarter.`,
    businessImpact: `${score.businessImpact}/100 — ${score.businessImpact >= 55 ? 'high' : 'moderate'} near-term commercial impact for the brand's audience.`,
    worthCreating: score.overall >= 55,
    contentAngle: `A ${bestFormat} unpacking what this means and the one lesson your ${analysis.industry} audience should act on.`,
    recommendedPlatforms: scoresToPlatforms(score),
    estimatedEngagement: `${Math.round(30 + score.virality / 2)}% · est. ${Math.round(120 + score.virality * 3)} engagements`,
    estimatedSeo: `${score.seoOpportunity}/100 · ${score.seoOpportunity >= 55 ? 'strong' : 'moderate'} opportunity for a ranking blog`,
  }
}
function scoresToPlatforms(score) {
  const p = []
  if (score.virality >= 50) p.push('LinkedIn')
  if (score.trendScore >= 50) p.push('Instagram')
  if (score.audienceMatch >= 50) p.push('Facebook')
  if (score.virality >= 60) p.push('Threads')
  return p.length ? p : ['LinkedIn']
}

// ---------------------------------------------------------------- 9. discord approval card data
export function buildApprovalCard(item) {
  return {
    title: `📡 News Radar · ${item.score?.overall || '—'}/100`,
    description: item.headline,
    fields: [
      { name: 'Source', value: `${item.source || '—'} · ${item.itemPublishedAt ? new Date(item.itemPublishedAt).toLocaleString() : '—'}` },
      { name: 'AI Summary', value: (item.analysis?.summary || item.description || '—').slice(0, 500) },
      { name: 'Scores', value: `Trend ${item.score?.trendScore} · Virality ${item.score?.virality} · SEO ${item.score?.seoOpportunity} · Audience ${item.score?.audienceMatch}` },
      { name: 'Best format', value: item.bestFormat || 'LinkedIn' },
      { name: 'Est. reach', value: `~${Math.round((item.score?.overall || 50) * 8)} people` },
    ],
    imageUrl: item.imageUrl || null,
    buttons: [
      { label: 'Generate Social', action: 'generate_social' },
      { label: 'Generate Blog', action: 'generate_blog' },
      { label: 'Generate All', action: 'generate_all' },
      { label: 'Save', action: 'save' },
      { label: 'Ignore', action: 'ignore', danger: true },
    ],
  }
}

// ---------------------------------------------------------------- 3+4. collect from sources
export async function collectArticles(config = {}, seen = [], skippedTitles = new Set()) {
  const cfg = { ...newsConfigDefaults(), ...(config || {}) }
  const items = []
  const blocked = new Set((cfg.blockedSources || []).map((s) => s.toLowerCase()))
  const seenSet = new Set(seen.map((s) => (s.title || s).toLowerCase()))
  const cutoff = Date.now() - (cfg.maxAgeHours ?? 48) * 3600000
  const now = nowISO()

  // Curated demo pool (offline-safe fallback + default so the radar works with no setup)
  const demo = [
    { title: 'AI model breaks new ground in decision making', description: 'A new LLM approach lets analysts reason over messy data, cutting the time from question to insight. Business leaders are starting to adopt it for weekly planning.', source: 'Google News · AI', link: 'https://news.example.com/1', ago: 1 },
    { title: 'The future of work is hybrid — here’s the data', description: 'HR teams are using workforce analytics to redesign return-to-office policies. Early data shows hybrid teams retain talent better when paired with async-first tools.', source: 'Google News · HR', link: 'https://news.example.com/2', ago: 2 },
    { title: 'Why analytics teams fail and how to fix them', description: 'Most BI projects stall because dashboards answer yesterday’s questions. The fix: embed analysts where decisions happen and measure outcomes, not output.', source: 'Google News · Analytics', link: 'https://news.example.com/3', ago: 1 },
    { title: 'Leadership in the age of AI', description: 'CEOs say judgment, not information, is now the scarce resource. Leaders who coach their teams through uncertainty outperform those who centralize decisions.', source: 'Google News · Leadership', link: 'https://news.example.com/4', ago: 3 },
    { title: 'HR trends 2026: what actually matters', description: 'Skills-based hiring, internal mobility and AI-augmented recruiting top this year’s agenda. People teams are shifting budgets from job boards to learning paths.', source: 'Google News · HR', link: 'https://news.example.com/5', ago: 2 },
    { title: 'The compounding power of consistency', description: 'Behavioral research ties consistent small actions to outsized long-term results. A practical framework for teams and personal brands alike.', source: 'Google News · Productivity', link: 'https://news.example.com/6', ago: 1 },
    { title: 'Startups raise record AI infrastructure rounds', description: 'Venture funding into AI infrastructure and applied AI startups hit a new high, with India-based startups leading enterprise adoption growth.', source: 'Google News · Startups', link: 'https://news.example.com/7', ago: 1 },
    { title: 'Data-driven decisions: a practical guide', description: 'A step-by-step method to turn raw business data into confident decisions, avoiding the classic traps of vanity metrics and benchmark copying.', source: 'Google News · Analytics', link: 'https://news.example.com/8', ago: 2 },
    { title: 'Marketing in the age of AI-generated content', description: 'Brands are scaling personalized campaigns with generative content while guarding authenticity. Early experiments show higher engagement with human-edited AI drafts.', source: 'Google News · Marketing', link: 'https://news.example.com/9', ago: 1 },
    { title: 'Talent markets shift as skills replace degrees', description: 'Companies are dropping degree requirements for data and engineering roles, widening the funnel and reducing time-to-hire for analytical talent.', source: 'Google News · HR', link: 'https://news.example.com/10', ago: 2 },
  ]

  const seeds = cfg.sources?.includes('Google News') || !cfg.sources?.length ? demo : []
  for (const a of seeds) {
    const key = a.title.toLowerCase()
    if (seenSet.has(key) || skippedTitles.has(key)) continue
    if (blocked.has((a.source || '').toLowerCase())) continue
    items.push({ title: a.title, description: a.description, link: a.link, source: a.source, publishedAt: new Date(now).getTime() - a.ago * 3600000 })
  }

  // Configurable RSS feeds (only when explicitly listed — keeps default offline/fast)
  if (cfg.sources?.length) {
    for (const src of cfg.sources) {
      if (src === 'Google News') continue
      if (blocked.has(String(src).toLowerCase())) continue
      try {
        const url = /^https?:/.test(src) ? src : `https://news.google.com/rss/search?q=${encodeURIComponent(src)}&hl=${cfg.language}&gl=${cfg.country}&ceid=${cfg.country}:${cfg.language}`
        const feedItems = await fetchFeed(url)
        for (const fi of feedItems.slice(0, 10)) {
          const key = fi.title.toLowerCase()
          if (seenSet.has(key) || skippedTitles.has(key)) continue
          const ts = fi.pubDate ? new Date(fi.pubDate).getTime() : now
          if (ts < cutoff) continue
          items.push({ title: fi.title, description: fi.description, link: fi.link, source: src, publishedAt: ts })
        }
      } catch { /* unreachable source — skip it */ }
    }
  }
  return items
}

// ---------------------------------------------------------------- full scan (steps 1-7, 11)
export async function newsRadarScan(db, config = {}) {
  const startedAt = Date.now()
  const cfg = { ...newsConfigDefaults(), ...(config || {}) }
  const seen = db.collection('news_seen')
  const existing = await seen.find({}).then((r) => (r && r.toArray ? r.toArray() : [])).catch(() => [])
  const skippedTitles = new Set(existing.map((x) => (x.title || '').toLowerCase()))
  const raw = await collectArticles(cfg, existing, skippedTitles)

  const added = []
  for (const a of raw) {
    const analysis = analyzeArticle(a)
    const score = scoreArticle(analysis, cfg)
    if (!score.passed) continue
    const { formats, best } = detectFormats(analysis, score)
    const rec = recommend(analysis, score, best)
    const item = {
      id: uuidv4(),
      headline: a.title,
      link: a.link,
      source: a.source,
      itemPublishedAt: new Date(a.publishedAt).toISOString(),
      description: a.description,
      imageUrl: a.imageUrl || null,
      pillar: analysis.industry,
      analysis,
      score: { ...score, formats },
      bestFormat: best,
      recommendation: rec,
      titleKey: a.title.toLowerCase(),
      status: 'Pending',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      processingTimeMs: Date.now() - startedAt,
      generatedContent: { socialJobId: null, blogJobId: null, newsletterCampaignId: null },
      approvalStatus: 'Pending',
      publishStatus: 'NotPublishing',
    }
    added.push(item)
    try { await db.collection('news_seen').insertOne({ title: a.title }) } catch {}
  }
  return { scanned: raw.length, kept: added.length, items: added }
}

// ---------------------------------------------------------------- 12. analytics
export function newsAnalytics(items = []) {
  return {
    opportunitiesFound: items.length,
    articlesScanned: items.length,
    approved: items.filter((i) => i.status === 'Generated' || i.status === 'Approved').length,
    rejected: items.filter((i) => i.status === 'Ignored').length,
    saved: items.filter((i) => i.status === 'Saved').length,
    generatedPosts: items.filter((i) => i.generatedContent?.socialJobId).length,
    generatedBlogs: items.filter((i) => i.generatedContent?.blogJobId).length,
    published: items.filter((i) => i.publishStatus === 'Published').length,
    engagement: 0,
    traffic: 0,
    seoPerformance: 0,
    avgScore: items.length ? Math.round(items.reduce((a, i) => a + (i.score?.overall || 0), 0) / items.length) : 0,
    byPillar: Object.entries(items.reduce((m, i) => ((m[i.pillar] = (m[i.pillar] || 0) + 1), m), {})).map(([name, v]) => ({ name, v })),
    bySource: Object.entries(items.reduce((m, i) => ((m[i.source] = (m[i.source] || 0) + 1), m), {})).map(([name, v]) => ({ name, v })),
  }
}

// ---------------------------------------------------------------- 13. learning engine
export function newsInsights(items = []) {
  if (!items.length) return { bestTopics: [], bestSources: [], bestFormats: [], recommendations: ['Scan feeds and generate content to give the News Radar data to learn from.'] }
  const pillarCount = {}
  const sourceCount = {}
  const formatCount = {}
  for (const i of items) {
    pillarCount[i.pillar] = (pillarCount[i.pillar] || 0) + 1
    sourceCount[i.source] = (sourceCount[i.source] || 0) + 1
    for (const f of (i.score?.formats || [])) formatCount[f] = (formatCount[f] || 0) + 1
  }
  const bestTopics = Object.entries(pillarCount).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const bestSources = Object.entries(sourceCount).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const bestFormats = Object.entries(formatCount).map(([format, count]) => ({ format, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const recommendations = []
  if (bestTopics[0]) recommendations.push(`Top opportunity topic: **${bestTopics[0].topic}** — prioritise it for content.`)
  if (bestSources[0]) recommendations.push(`Best source: **${bestSources[0].source}** — keep it in the scan.`)
  if (bestFormats[0]) recommendations.push(`Best content format: **${bestFormats[0].format}** — generate more of these.`)
  return { bestTopics, bestSources, bestFormats, recommendations }
}

export { googleNewsFeeds }
