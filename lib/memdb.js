// Simple in-memory database for Vercel deployment
const memoryDb = {
  social_posts: [],
  blog_posts: [],
  news_opportunities: [],
  linkedin_comments: [],
  newsletter_campaigns: [],
  newsletter_subscribers: [],
  integrations: [],
  config: [],
  audit: [],
  brand: [{ id: 'brand', data: { name: 'Manikanta R', tagline: 'AI MBA HR Business Analytics Leadership', voice: 'Insightful, warm, and story-driven', tone: ['insightful', 'warm', 'confident', 'practical'], sentenceStyle: 'Short punchy opener', favoriteWords: ['clarity', 'leverage', 'compounding'], avoidWords: ['guys', 'synergy', 'disrupt'], audience: ['MBA students', 'HR professionals', 'analysts', 'founders'], pillars: ['AI', 'Business Analytics', 'HR', 'Leadership'], ctaStyle: 'Ask a genuine question', colors: { primary: '#3B82F6', secondary: '#8B5CF6' }, hashtags: ['#AI', '#Leadership', '#CareerGrowth'] }, updatedAt: new Date().toISOString() }],
  assistant: [{ id: 'assistant', data: { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true }, updatedAt: new Date().toISOString() }],
  ai_cost: [],
  news_seen: [],
  drive_locks: [],
  seasonal_events: [],
  seasonal_campaigns: [],
  repurposed_content: [],
  idea_vault: [],
  portfolio_case_studies: [],
}

function memCollection(name) {
  if (!memoryDb[name]) memoryDb[name] = []
  return {
    findOne: async (q) => {
      const items = memoryDb[name] || []
      if (!q || Object.keys(q).length === 0) return items[0] || null
      return items.find(item => Object.entries(q).every(([k, v]) => {
        if (k === 'id') return item.id === v
        if (k === 'key') return item.key === v
        if (k === 'status') return item.status === v
        return false
      })) || null
    },
    find: async (q = {}) => ({
      sort: () => ({ toArray: async () => memoryDb[name] || [] }),
      limit: () => ({ toArray: async () => (memoryDb[name] || []).slice(0, 10) }),
      toArray: async () => memoryDb[name] || [],
    }),
    insertOne: async (doc) => {
      if (!memoryDb[name]) memoryDb[name] = []
      memoryDb[name].push(doc)
      return { insertedId: doc.id }
    },
    updateOne: async (q, update) => {
      const items = memoryDb[name] || []
      const idx = items.findIndex(item => Object.entries(q).every(([k, v]) => item[k] === v))
      if (idx >= 0 && update.$set) Object.assign(items[idx], update.$set)
      return { modifiedCount: idx >= 0 ? 1 : 0 }
    },
    countDocuments: async () => (memoryDb[name] || []).length,
    deleteMany: async () => ({ deletedCount: 0 }),
  }
}

module.exports = { memCollection }
