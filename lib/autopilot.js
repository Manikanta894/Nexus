// lib/autopilot.js — 24/7 automation engine for Nexus
// Runs inside the Next.js app as a background interval (for self-hosted/persistent deployments)
// For Vercel serverless, use the n8n workflows instead.

import { MongoClient } from 'mongodb'

let intervalId = null
let client = null
let db = null

const DEFAULT_CONFIG = {
  social: { enabled: true, timesPerDay: 2, times: ['09:00', '17:00'], platforms: ['linkedin', 'instagram', 'facebook', 'threads'] },
  blog: { enabled: true, timesPerWeek: 3, days: [1, 3, 5], time: '10:00' },
  news: { enabled: true, intervalMinutes: 60 },
  seasonal: { enabled: true, scanDaily: true, scanTime: '08:00' },
  newsletter: { enabled: true, day: 4, time: '09:00', autoFromBlog: true }, // Friday
}

async function connect() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

async function getConfig() {
  const db = await connect()
  const doc = await db.collection('config').findOne({ key: 'autopilot' })
  return { ...DEFAULT_CONFIG, ...(doc?.data || {}) }
}

async function shouldRun(schedule) {
  const now = new Date()
  const currentDay = now.getDay() // 0=Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const lastRun = await getLastRun()
  if (schedule.times) {
    for (const t of schedule.times) {
      const [h, m] = t.split(':').map(Number)
      const target = h * 60 + m
      if (Math.abs(currentMinutes - target) < 5 && lastRun !== todayKey(t)) return true
    }
  }
  if (schedule.days && schedule.time) {
    if (schedule.days.includes(currentDay)) {
      const [h, m] = schedule.time.split(':').map(Number)
      const target = h * 60 + m
      if (Math.abs(currentMinutes - target) < 5 && lastRun !== todayKey(schedule.time)) return true
    }
  }
  return false
}

function todayKey(t) { return `${new Date().toISOString().slice(0, 10)}T${t}` }

async function getLastRun() {
  const db = await connect()
  const doc = await db.collection('config').findOne({ key: 'autopilot_lastrun' })
  return doc?.value || ''
}

async function setLastRun(key) {
  const db = await connect()
  await db.collection('config').updateOne({ key: 'autopilot_lastrun' }, { $set: { value: key } }, { upsert: true })
}

async function runTick() {
  const cfg = await getConfig()
  const db = await connect()
  const now = new Date()

  // 1. Social posts
  if (cfg.social?.enabled && await shouldRun(cfg.social)) {
    try {
      const { runPipeline } = await import('./pipeline.js')
      await runPipeline(db, { platforms: cfg.social.platforms }, 'autopilot')
      await setLastRun(todayKey(cfg.social.times[0] || '09:00'))
    } catch (e) { console.error('autopilot social failed:', e.message) }
  }

  // 2. Blog
  if (cfg.blog?.enabled && await shouldRun(cfg.blog)) {
    try {
      const { blogPipeline } = await import('./pipeline.js')
      await blogPipeline(db, { seedText: randomTopic() }, 'autopilot')
      await setLastRun(todayKey(cfg.blog.time))
    } catch (e) { console.error('autopilot blog failed:', e.message) }
  }

  // 3. News scan
  if (cfg.news?.enabled) {
    const lastNews = await db.collection('config').findOne({ key: 'autopilot_lastnews' })
    const lastMs = lastNews?.ts ? new Date(lastNews.ts).getTime() : 0
    if (Date.now() - lastMs > (cfg.news.intervalMinutes || 60) * 60000) {
      try {
        const { scanNews } = await import('./pipeline.js')
        await scanNews(db)
        await db.collection('config').updateOne({ key: 'autopilot_lastnews' }, { $set: { ts: new Date().toISOString() } }, { upsert: true })
      } catch (e) { console.error('autopilot news failed:', e.message) }
    }
  }

  // 4. Publish scheduled posts
  try {
    const due = await db.collection('social_posts').find({ status: 'Scheduled', scheduledAt: { $lte: now.toISOString() } }).toArray()
    for (const post of due) {
      await db.collection('social_posts').updateOne({ id: post.id }, { $set: { status: 'Published', publishedAt: now.toISOString() } })
    }
  } catch {}
}

const TOPICS = ['AI in business', 'Leadership lessons', 'HR trends', 'Career growth', 'Productivity hacks', 'MBA insights', 'Data analytics', 'Future of work']
function randomTopic() { return TOPICS[Math.floor(Math.random() * TOPICS.length)] }

export function startAutopilot(intervalMs = 60000) {
  if (intervalId) return { started: false, reason: 'already running' }
  intervalId = setInterval(() => { runTick().catch(() => {}) }, intervalMs)
  return { started: true, intervalMs }
}

export function stopAutopilot() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; return { stopped: true } }
  return { stopped: false, reason: 'not running' }
}

export function getAutopilotStatus() {
  return { running: !!intervalId, hasConfig: true }
}
