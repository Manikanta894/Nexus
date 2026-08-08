// ---------------------------------------------------------------------------
// core/content.js — brand pillars, demo content generators, and the shared
// job builders used by social / blog / news / pipeline domains.
// Phase 3 replaces the demo generators with real multi-provider AI calls.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { db, audit } from './store.js'

export const PILLARS = { AI: { tag: '#AI', angle: 'how AI reshapes real work', hooks: ['Everyone talks about AI. Few use it right.', 'AI won\u2019t take your job. Someone using AI will.'] }, Leadership: { tag: '#Leadership', angle: 'leading through change', hooks: ['The best leaders do one thing differently.'] }, HR: { tag: '#HR', angle: 'people and culture', hooks: ['Culture isn\u2019t the free snacks. It\u2019s what you tolerate.'] }, 'Business Analytics': { tag: '#BusinessAnalytics', angle: 'data into decisions', hooks: ['Data doesn\u2019t make decisions. People do.'] }, MBA: { tag: '#MBA', angle: 'real MBA lessons', hooks: ['My MBA taught me frameworks. My job taught me judgment.'] }, Productivity: { tag: '#Productivity', angle: 'deep work', hooks: ['Busy is not the same as productive.'] } }
const PILLAR_KEYS = Object.keys(PILLARS)

export function pickPillar(hint) { const h = (hint || '').toLowerCase(); for (const k of PILLAR_KEYS) if (h.includes(k.toLowerCase())) return k; if (h.includes('data') || h.includes('analy')) return 'Business Analytics'; if (h.includes('ai') || h.includes('tech')) return 'AI'; return PILLAR_KEYS[0] }

function hashtags(p) { const base = [PILLARS[p]?.tag || '#AI', '#Leadership', '#CareerGrowth', '#BusinessStrategy', '#FutureOfWork', '#Learning']; return [...new Set(base)].slice(0, 6) }

export function demoGenerate(brand, analysis, platforms) {
  const p = analysis.pillar, hook = PILLARS[p]?.hooks[0] || 'A fresh insight.', cta = 'What\u2019s your take \u2014 drop it in the comments.', tags = hashtags(p), out = {}
  if (platforms.includes('linkedin')) out.linkedin = { hook, caption: `${hook}\n\nI kept seeing the same pattern around ${analysis.topic.toLowerCase()}.\n\nThe teams winning now aren\u2019t the ones with the most tools \u2014 they\u2019re the ones with the most clarity.\n\nThree things I\u2019d tell my younger self:\n\n\u2192 Start with the decision, not the data.\n\u2192 Simple and shipped beats perfect and stuck.\n\u2192 Consistency compounds louder than intensity.\n\nThe edge isn\u2019t information anymore. It\u2019s judgment.\n\n${cta}`, cta, hashtags: tags, altText: `Editorial image representing ${analysis.topic}.`, seoKeywords: [p.toLowerCase(), 'career growth', 'leadership'] }
  if (platforms.includes('instagram')) out.instagram = { hook, caption: `${hook} \u2728\n\n${analysis.topic} \u2014 broken down simply.\n\nSave this for later \ud83d\udccc\n\n${cta}`, cta: 'Save + share.', hashtags: tags, altText: `Visual post about ${analysis.topic}.` }
  if (platforms.includes('facebook')) out.facebook = { hook, caption: `${hook}\n\nGenuine question: when it comes to ${analysis.topic.toLowerCase()}, what actually moved the needle for you?`, cta: 'Share your experience below.', hashtags: tags.slice(0, 4) }
  if (platforms.includes('threads')) out.threads = { hook, caption: `${hook}\n\n${PILLARS[p]?.angle} comes down to one thing: clarity over noise.`, cta: 'Reply with your one thing.', hashtags: tags.slice(0, 3) }
  return out
}

export function qualityScores(s) { let n = 0; for (const ch of (s || 'x')) n += ch.charCodeAt(0); return { grammar: 88 + (n % 9), readability: 84 + ((n * 3) % 12), originality: 90 + (n % 8), platformFit: 86 + ((n * 5) % 11), brandVoice: 89 + ((n * 7) % 9), overall: 90 + (n % 7) } }

export function runFactCheck(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content || {})
  const clichés = ['game-changer', 'revolutionize', 'think outside the box', 'synergy', 'unlock the power', 'elevate your', 'delve into']
  const hits = clichés.filter(c => text.toLowerCase().includes(c))
  const originality = Math.max(60, 96 - hits.length * 8 - (text.length % 7))
  return { status: hits.length >= 3 ? 'Blocked' : hits.length >= 1 ? 'Needs Review' : 'Clean', originalityScore: originality, confidence: Math.min(95, 78 + (originality % 15)), issues: hits }
}

export function makeAnalysis(hint, imageName) {
  const pillar = pickPillar(hint || imageName)
  return { pillar, topic: hint || `${pillar} in modern business`, mood: 'confident & optimistic', contentAngle: PILLARS[pillar]?.angle || 'insight', audience: 'MBA students, HR professionals, analysts, founders' }
}

// ---- Job builders (shared by social / blog / pipelines) ----
export const DEFAULT_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'threads']

export function makeSocialJob(seedText, imageName, platforms, source) {
  const analysis = makeAnalysis(seedText, imageName)
  const content = demoGenerate(db.brand[0]?.data || {}, analysis, platforms)
  return {
    id: uuidv4(), source: source || 'quick-compose', imageUrl: null, imageName: (imageName || seedText || 'Untitled').slice(0, 80),
    seedText: seedText || null, status: 'Pending Approval', analysis, platforms: content, selectedPlatforms: platforms,
    quality: qualityScores(analysis.topic), factcheck: runFactCheck(content), providers: { mode: 'demo' }, versions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

export function makeBlogJob(seed) {
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

// ---- Demo seed so the dashboard has baseline content on cold start ----
function makeDemoSocial(seedText, status) {
  const job = makeSocialJob(seedText, seedText, DEFAULT_PLATFORMS, 'seed')
  job.status = status
  if (status === 'Published') job.publishedAt = new Date().toISOString()
  return job
}

export function ensureDemoSeed() {
  if (db.social_posts.length) return
  db.social_posts.push(makeDemoSocial('AI is reshaping how teams hire', 'Published'))
  db.social_posts.push(makeDemoSocial('Why analytics teams fail', 'Pending Approval'))
  db.social_posts.push(makeDemoSocial('Leadership lessons from data', 'Pending Approval'))
  audit('system', 'seed.demo', { count: 3 })
}