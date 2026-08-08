// ---------------------------------------------------------------------------
// domains/analytics.js — Mission Control analytics + Learning Engine + AI cost.
//   GET /analytics        aggregate (alias of /analytics/full)
//   GET /analytics/full   full aggregate for Mission Control
//   GET /learning         Learning Engine insights
//   ANY /ai_cost          spend dashboard (Phase 6 wires real provider costs)
//   PUT /ai_cost/caps     budget caps
// ---------------------------------------------------------------------------
import { json } from '../core/http.js'
import { db, audit } from '../core/store.js'
import { estimateReach } from '../../../../../lib/pipeline.js'

function analyticsAggregate() {
  const published = db.social_posts.filter(p => p.status === 'Published')
  const perPillar = {}
  const perPlatform = { linkedin: 0, instagram: 0, facebook: 0, threads: 0 }
  for (const p of published) { perPillar[p.analysis?.pillar] = (perPillar[p.analysis?.pillar] || 0) + 1; for (const plat of (p.selectedPlatforms || [])) if (perPlatform[plat] !== undefined) perPlatform[plat]++ }
  const hashtagMap = {}
  for (const p of published) for (const plat of (p.selectedPlatforms || [])) for (const tag of (p.platforms?.[plat]?.hashtags || [])) hashtagMap[tag] = (hashtagMap[tag] || 0) + 1
  // PRD Social Step 12 — sum the full metric set per published post (per-post analytics if
  // stamped, else quality-based estimate) so the dashboard tracks the complete lifecycle.
  const sum = (key) => published.reduce((acc, p) => acc + (p.analytics?.[key] ?? estimateReach(p)[key] ?? 0), 0)
  const totals = {
    reach: sum('reach'), impressions: sum('impressions'), likes: sum('likes'), comments: sum('comments'),
    shares: sum('shares'), saves: sum('saves'), followersGained: sum('followersGained'),
    websiteClicks: sum('websiteClicks'), profileVisits: sum('profileVisits'), publishedCount: published.length,
  }
  return {
    totals,
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

export const routes = {
  'GET /analytics': () => json(analyticsAggregate()),
  'GET /analytics/full': () => json(analyticsAggregate()),

  'GET /learning': () => {
    return json({ recommendations: ['Generate and publish content to build your performance baseline.', 'Post consistently \u2014 the Learning Engine gets smarter with every post.'], bestTopics: [], bestHashtags: [], bestPlatforms: [], bestTimes: [], bestHooks: [], totalPosts: db.social_posts.filter(p => p.status === 'Published').length, totalBlogs: db.blog_posts.filter(p => p.status === 'Published').length })
  },

  'ANY /ai_cost': () => json({ total: 0, byProvider: {}, byModule: {}, publishedCount: db.social_posts.filter(p => p.status === 'Published').length, costPerPublishedPost: '0.0000', caps: { providers: { nvidia: 5, openrouter: 5, groq: 5 }, modules: { social: 3, blog: 3 } }, alerts: [] }),
  'PUT /ai_cost/caps': async ({ user }) => { audit(user.sub, 'ai_cost.caps', {}); return json({ ok: true }) },
}