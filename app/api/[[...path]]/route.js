import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const SECRET = process.env.APP_SECRET || 'dev-fallback-secret-change-me'

function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

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
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  return verifyToken(token)
}

// Simple in-memory data
const data = {
  social_posts: [],
  blog_posts: [],
  integrations: [],
  config: [],
}

export async function GET(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api', '') || '/'
  
  if (path === '/' || path === '/root') {
    return json({ message: 'NEXUS API online', time: new Date().toISOString() })
  }

  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  if (path === '/dashboard') {
    return json({
      greetingName: 'Manikanta',
      stats: { followersToday: 0, websiteVisits: 0, pending: 0, connected: 0, integrations: 0 },
      trend: [], systemHealth: [], aiCoach: 'Welcome to NEXUS!',
      aiStatus: 97,
    })
  }

  if (path === '/social') return json({ posts: [] })
  if (path === '/blog') return json({ posts: [] })
  if (path === '/news') return json({ items: [] })
  if (path === '/autopilot') return json({ config: null })
  if (path === '/calendar') return json({ items: [] })
  if (path === '/analytics') return json({ totals: {}, perPillar: [], perPlatform: [], timeline: [] })
  if (path === '/learning') return json({ recommendations: ['Start publishing to build your baseline'] })
  if (path === '/assistant') return json({ assistant: { wakeWord: 'Hey Jarvis', honorific: 'Boss', voiceEnabled: true } })
  if (path === '/audit') return json({ logs: [] })
  if (path === '/cron') return json({ jobs: [], logs: [] })
  if (path === '/connections') return json({ linkedin: { connected: false }, facebook: { connected: false } })
  if (path === '/integrations') return json({ integrations: [], dependencyMap: [] })
  if (path === '/brand') return json({ brand: { name: 'Manikanta R' } })
  if (path === '/discord') return json({ webhook: false, publicKey: false })
  if (path === '/versions') return json({ versions: [] })

  return json({ error: 'Not found', path }, { status: 404 })
}

export async function POST(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api', '') || '/'

  if (path === '/auth/login') {
    const body = await request.json().catch(() => ({}))
    const U = process.env.ADMIN_USERNAME || 'admin'
    const P = process.env.ADMIN_PASSWORD || 'admin123'
    if (body.username === U && body.password === P) {
      const token = signToken({ sub: 'admin', name: 'Manikanta', role: 'owner', exp: Date.now() + 7 * 86400000 })
      return json({ token, user: { name: 'Manikanta', role: 'owner', username: U } })
    }
    return json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  if (path === '/autopilot/run') {
    return json({ ok: true, social: { id: 'demo-' + Date.now() } })
  }

  return json({ message: 'POST received', path })
}

export async function PUT(request) {
  const user = getAuth(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)
  return json({ ok: true })
}
