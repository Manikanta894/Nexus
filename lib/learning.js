// lib/learning.js — Learning Engine for Nexus
// Analyzes historical performance to recommend best hooks, hashtags, times, topics

export function analyzePerformance(socialPosts, blogs) {
  if (!socialPosts?.length) {
    return {
      bestHooks: [], bestHashtags: [], bestTimes: [], bestTopics: [], bestPlatforms: [],
      recommendations: ['Generate and publish content to build your performance baseline.'],
    }
  }

  const published = socialPosts.filter((p) => p.status === 'Published')
  const scored = published.filter((p) => p.quality?.overall)

  // Hook analysis — extract first sentence of LinkedIn caption
  const hookMap = {}
  for (const p of scored) {
    const caption = p.platforms?.linkedin?.caption || p.platforms?.instagram?.caption || ''
    const hook = caption.split('\n')[0]?.slice(0, 80) || 'Unknown'
    if (!hookMap[hook]) hookMap[hook] = { count: 0, totalScore: 0 }
    hookMap[hook].count++
    hookMap[hook].totalScore += p.quality.overall
  }
  const bestHooks = Object.entries(hookMap)
    .map(([hook, d]) => ({ hook, avgScore: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)

  // Hashtag analysis
  const tagMap = {}
  for (const p of scored) {
    for (const plat of (p.selectedPlatforms || [])) {
      for (const tag of (p.platforms?.[plat]?.hashtags || [])) {
        if (!tagMap[tag]) tagMap[tag] = { count: 0, totalScore: 0 }
        tagMap[tag].count++
        tagMap[tag].totalScore += p.quality.overall
      }
    }
  }
  const bestHashtags = Object.entries(tagMap)
    .map(([tag, d]) => ({ tag, avgScore: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)

  // Topic / pillar analysis
  const pillarMap = {}
  for (const p of scored) {
    const pillar = p.analysis?.pillar || 'Other'
    if (!pillarMap[pillar]) pillarMap[pillar] = { count: 0, totalScore: 0 }
    pillarMap[pillar].count++
    pillarMap[pillar].totalScore += p.quality.overall
  }
  const bestTopics = Object.entries(pillarMap)
    .map(([pillar, d]) => ({ pillar, avgScore: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Platform analysis
  const platMap = {}
  for (const p of scored) {
    for (const plat of (p.selectedPlatforms || [])) {
      if (!platMap[plat]) platMap[plat] = { count: 0, totalScore: 0 }
      platMap[plat].count++
      platMap[plat].totalScore += p.quality.overall
    }
  }
  const bestPlatforms = Object.entries(platMap)
    .map(([platform, d]) => ({ platform, avgScore: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Best posting time (hour of day)
  const hourMap = {}
  for (const p of scored) {
    const hour = new Date(p.publishedAt || p.createdAt).getHours()
    const bucket = `${hour}:00`
    if (!hourMap[bucket]) hourMap[bucket] = { count: 0, totalScore: 0 }
    hourMap[bucket].count++
    hourMap[bucket].totalScore += p.quality.overall
  }
  const bestTimes = Object.entries(hourMap)
    .map(([time, d]) => ({ time, avgScore: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3)

  // Generate recommendations
  const recommendations = []
  if (bestTopics.length) recommendations.push(`Your best-performing topic is **${bestTopics[0].pillar}** (avg score ${bestTopics[0].avgScore}/100). Create more content in this pillar.`)
  if (bestPlatforms.length) recommendations.push(`**${bestPlatforms[0].platform}** delivers your highest quality scores. Prioritize it for key messages.`)
  if (bestTimes.length) recommendations.push(`Best posting time learned: **${bestTimes[0].time}** — schedule important posts around this hour.`)
  if (bestHashtags.length) recommendations.push(`Top hashtag: **${bestHashtags[0].tag}** — consistently associated with higher-quality drafts.`)
  if (bestHooks.length) recommendations.push(`Your strongest opening style: "${bestHooks[0].hook.slice(0, 50)}..." — use similar hooks.`)
  if (!recommendations.length) recommendations.push('Keep publishing — the Learning Engine gets smarter with every post.')

  return { bestHooks, bestHashtags, bestTimes, bestTopics, bestPlatforms, recommendations }
}
