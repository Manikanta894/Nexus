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
  const coll = {
    _name: name,
    findOne: async (q) => {
      const items = memoryDb[name] || []
      if (!q || Object.keys(q).length === 0) return items[0] || null
      return items.find(item => Object.entries(q).every(([k, v]) => {
        if (k === 'id') return item.id === v
        if (k === 'key') return item.key === v
        if (k === 'status') return item.status === v
        if (k === 'scheduledAt') return true
        return false
      })) || null
    },
    find: async (q = {}) => {
      let items = memoryDb[name] || []
      if (q.status) items = items.filter(i => i.status === q.status)
      if (q.module) items = items.filter(i => i.module === q.module)
      return {
        sort: (s) => ({ toArray: async () => items }),
        limit: (n) => ({ toArray: async () => items.slice(0, n) }),
        toArray: async () => items,
      }
    },
    insertOne: async (doc) => {
      if (!memoryDb[name]) memoryDb[name] = []
      memoryDb[name].push(doc)
      return { insertedId: doc.id || 'mem-' + Date.now() }
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
  return coll
}

// Create a memory DB that behaves like a real MongoDB database
function createMemDb() {
  const collNames = ['social_posts','blog_posts','news_opportunities','linkedin_comments','newsletter_campaigns','newsletter_subscribers','integrations','config','audit','brand','assistant','ai_cost','news_seen','drive_locks','seasonal_events','seasonal_campaigns','repurposed_content','idea_vault','portfolio_case_studies']
  const db = {
    collection: (name) => memCollection(name),
  }
  return db
}

module.exports = { memCollection }
