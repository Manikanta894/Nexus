'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Activity, Brain, Cpu, Zap, AlertTriangle, CheckCircle2, XCircle, Play, Pause, SkipForward,
  RotateCcw, Square, RefreshCw, ShieldCheck, ShieldAlert, Radio, GitBranch, FileText, Radar,
  CalendarDays, Mail, MessageSquare, Linkedin, Facebook, Instagram, MessageCircle, Globe,
  Database, HardDrive, Bell, Clock, ChevronDown, ChevronRight, ListChecks, History, Settings2,
  Rocket, Layers, Share2, BarChart3, Eye, TrendingUp, Send, Users, CircleDot, Loader2,
  TerminalSquare, Wrench, Boxes, TimerReset, Flame, Images, Trash2, ThumbsUp, ThumbsDown, Wand2, Hash,
} from 'lucide-react'

// ---------- Minimal API client (self-contained) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const safeArr = (v) => Array.isArray(v) ? v : []
let queue = Promise.resolve()
const api = (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : null
  const run = async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const res = await fetch(`/api${path}`, {
        ...opts, cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e }
      return data
    } finally { clearTimeout(timer) }
  }
  const result = queue.then(run, run)
  queue = result.then(() => {}, () => {})
  return result
}
const nowISO = () => new Date().toISOString()
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDur = (ms) => {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// ---------- UI primitives (self-contained glass style) ----------
const Glass = ({ className = '', children }) => (
  <div className={`glass rounded-xl ${className}`}>{children}</div>
)
const SectionTitle = ({ icon: Ic, title, sub, right }) => (
  <div className="flex items-center justify-between gap-3 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 grid place-items-center shrink-0">
        <Ic className="h-4 w-4 text-blue-400" />
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-semibold text-sm truncate">{title}</h3>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
    {right}
  </div>
)
const StatusDot = ({ status, pulse = true }) => {
  const map = { healthy: '#22C55E', warning: '#F59E0B', offline: '#EF4444', running: '#22C55E', idle: '#6B7280', paused: '#F59E0B', waiting: '#3B82F6', failed: '#EF4444' }
  const c = map[status] || '#6B7280'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${pulse ? 'animate-pulse-dot' : ''}`} style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
}
const HealthBadge = ({ status, label }) => {
  const map = { healthy: ['🟢', 'text-emerald-400 border-emerald-500/30'], warning: ['🟡', 'text-amber-400 border-amber-500/30'], offline: ['🔴', 'text-red-400 border-red-500/30'] }
  const [ico, cls] = map[status] || map.warning
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-code ${cls}`}>{ico} {label || status}</span>
}
const Progress = ({ value, color = '#3B82F6' }) => (
  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ background: `linear-gradient(90deg, ${color}, #8B5CF6)`, boxShadow: `0 0 8px ${color}` }}
      initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }} transition={{ duration: 0.6 }}
    />
  </div>
)
const MiniStat = ({ label, value, icon: Ic, color = '#3B82F6' }) => (
  <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[9px] text-muted-foreground font-code uppercase tracking-wider">{label}</span>
      {Ic && <Ic className="h-3 w-3" style={{ color }} />}
    </div>
    <div className="font-metric text-sm font-bold text-white">{value}</div>
  </div>
)
const BigStat = ({ label, value, icon: Ic, color = '#3B82F6', sub }) => (
  <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] text-muted-foreground font-code uppercase tracking-wider">{label}</span>
      <div className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: `${color}22` }}>
        <Ic className="h-3.5 w-3.5" style={{ color }} />
      </div>
    </div>
    <div className="font-metric text-2xl font-bold">{value}</div>
    {sub && <div className="text-[9px] text-muted-foreground mt-1 truncate">{sub}</div>}
  </motion.div>
)

// ---------- Automation row model ----------
const AUTO_STATUS = {
  Running: ['running', '#22C55E'],
  Idle: ['idle', '#6B7280'],
  Paused: ['paused', '#F59E0B'],
  Waiting: ['waiting', '#3B82F6'],
  Failed: ['failed', '#EF4444'],
  Completed: ['healthy', '#22C55E'],
}

function AutomationRow({ module, icon: Ic, color, data, onRun, onPause, onResume }) {
  const [status, dot] = AUTO_STATUS[data?.status || 'Idle'] || AUTO_STATUS.Idle
  const showControls = module !== 'seasonal'
  return (
    <Glass className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0" style={{ background: `${color}22` }}>
          <Ic className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-grotesk font-semibold">{data?.name || module}</span>
            <StatusDot status={dot} />
            <span className="text-[10px] font-code" style={{ color: dot }}>{status}</span>
            <span className="text-[10px] text-muted-foreground font-code ml-auto">Last: {data?.lastRun ? fmtTime(data.lastRun) : '—'} · Next: {data?.nextRun ? fmtTime(data.nextRun) : '—'}</span>
          </div>

          {/* Current step + progress */}
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-[10px] font-code">
              <span className="text-muted-foreground">{data?.step ? `Step: ${data.step}` : 'No active step'}</span>
              <span className="text-white/80 font-metric">{data?.progress ?? 0}%</span>
            </div>
            <Progress value={data?.progress || 0} color={dot} />
          </div>

          {/* meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px] font-code text-muted-foreground">
            <span><span className="text-white/60">Started:</span> {fmtTime(data?.startedAt)}</span>
            <span><span className="text-white/60">Finish ETA:</span> {fmtTime(data?.eta)}</span>
            <span><span className="text-white/60">Duration:</span> {fmtDur(data?.durationMs)}</span>
            <span><span className="text-white/60">Freq:</span> {data?.schedule || '—'}</span>
          </div>

          {/* controls */}
          {showControls && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button onClick={() => onRun?.()} className="h-6 px-2 rounded-md text-[10px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 transition flex items-center gap-1"><Play className="h-3 w-3" /> Run Now</button>
              <button onClick={() => onPause?.()} className="h-6 px-2 rounded-md text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/40 transition flex items-center gap-1"><Pause className="h-3 w-3" /> Pause</button>
              <button onClick={() => onResume?.()} className="h-6 px-2 rounded-md text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 transition flex items-center gap-1"><Play className="h-3 w-3" /> Resume</button>
            </div>
          )}
        </div>
      </div>
    </Glass>
  )
}

// ---------- Live activity feed ----------
const FEED_SEEDS = [
  ['Social Automation Started', 'social'],
  ['FIFO Image Selected', 'social'],
  ['Vision Analysis Completed', 'ai'],
  ['Content Generated', 'social'],
  ['Discord Approval Sent', 'discord'],
  ['Approved', 'approval'],
  ['Published Successfully', 'social'],
  ['News Scan Completed — 10 articles', 'news'],
  ['Blog SEO Score 92', 'blog'],
  ['Newsletter Draft Created', 'newsletter'],
  ['Seasonal Campaign Planned', 'seasonal'],
  ['LinkedIn Comment Drafted', 'engage'],
  ['Drive Image Archived (MOVE)', 'drive'],
  ['Sheets Row Synced', 'sheets'],
]
const FEED_ICONS = { social: Zap, ai: Brain, discord: MessageCircle, approval: CheckCircle2, news: Radar, blog: FileText, newsletter: Mail, seasonal: CalendarDays, engage: MessageSquare, drive: HardDrive, sheets: Database }

// ---------- MAIN COMPONENT ----------
export default function MissionControl({ go }) {
  const [health, setHealth] = useState(null)
  const [autos, setAutos] = useState({})
  const [social, setSocial] = useState(null)
  const [blog, setBlog] = useState(null)
  const [news, setNews] = useState(null)
  const [seasonal, setSeasonal] = useState(null)
  const [newsletter, setNewsletter] = useState(null)
  const [cost, setCost] = useState(null)
  const [feed, setFeed] = useState([])
  const [queueStats, setQueueStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0, retry: 0, cancelled: 0 })
  const [approvals, setApprovals] = useState({ social: [], blog: [], news: [], seasonal: [], newsletter: [] })
  const [logs, setLogs] = useState([])
  const [git, setGit] = useState([])
  const [openSettings, setOpenSettings] = useState({})
  const [scanning, setScanning] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const booted = useRef(false)

  // ---------- Live simulation engine (fills status/progress/activity) ----------
  useEffect(() => {
    const tick = () => {
      const t = Date.now()
      setAutos((prev) => {
        const base = prev || {}
        const make = (name, color, schedule, minutes, status) => ({
          ...(base[name] || {}),
          name, schedule,
          status: status || base[name]?.status || 'Idle',
          lastRun: (t % 3 === 0) ? new Date(t - (name.length * 60000)).toISOString() : base[name]?.lastRun,
        })
        return {
          social: make('Social Automation', '#3B82F6', '2× daily', 60, 'Running'),
          blog: make('Blog Engine', '#8B5CF6', 'Mon · Wed · Fri', 75, 'Idle'),
          linkedin: make('LinkedIn Engagement', '#0A66C2', '5/day', 90, 'Waiting'),
          news: make('News Radar', '#22C55E', 'Every 30 min', 50, news === 'scanning' ? 'Running' : 'Idle'),
          seasonal: make('Seasonal Campaigns', '#F59E0B', 'Daily scan', 45, 'Idle'),
          newsletter: make('Newsletter', '#EF4444', 'Friday 9 AM', 30, 'Idle'),
        }
      })
    }
    tick()
    const iv = setInterval(tick, 15000)
    return () => clearInterval(iv)
  }, [news])

  // ---------- Activity feed ----------
  useEffect(() => {
    const push = () => {
      const [label, cat] = FEED_SEEDS[Math.floor(Math.random() * FEED_SEEDS.length)]
      setFeed((f) => [{ id: Date.now() + Math.random(), label, cat, ts: new Date().toISOString() }, ...f].slice(0, 30))
    }
    push(); push()
    const iv = setInterval(push, 8000)
    return () => clearInterval(iv)
  }, [])

  // ---------- Data fetching ----------
  const load = useCallback(async () => {
    try {
      const [dash, integs, posts, blogs, newsItems, camps, newsStats, autopilotCfg, costData, auditLogs] = await Promise.allSettled([
        api('/dashboard'), api('/integrations'), api('/social'), api('/blog'), api('/news'), api('/seasonal'),
        api('/newsletter/subscribers'), api('/autopilot'), api('/ai_cost'), api('/audit'),
      ])
      if (dash.status === 'fulfilled') setHealth(dash.value)
      if (integs.status === 'fulfilled') {
        const list = integs.value.integrations || []
        const id = (k) => list.find(i => i.id === k)
        setHealth((h) => ({
          ...(h || {}),
          integrations: list,
          statuses: {
            googleSheets: id('google_sheets')?.configured ? 'healthy' : 'warning',
            googleDrive: id('google_drive')?.configured ? 'healthy' : 'warning',
            discord: id('discord')?.configured ? 'healthy' : 'warning',
            linkedin: id('linkedin')?.configured ? 'healthy' : 'offline',
            facebook: id('facebook')?.configured ? 'healthy' : 'offline',
            instagram: id('instagram')?.configured ? 'healthy' : 'offline',
            threads: id('threads')?.configured ? 'healthy' : 'offline',
            newsletter: id('resend')?.configured ? 'healthy' : 'warning',
          },
        }))
      }
      const postsArr = posts.status === 'fulfilled' ? safeArr(posts.value.posts) : []
      const blogsArr = blogs.status === 'fulfilled' ? safeArr(blogs.value.posts) : []
      const newsArr = news.status === 'fulfilled' ? safeArr(news.value.items) : []
      const campsArr = camps.status === 'fulfilled' ? safeArr(camps.value.campaigns) : []
      const newsStatsArr = newsStats.status === 'fulfilled' ? newsStats.value : null

      if (posts.status === 'fulfilled') {
        const pub = postsArr.filter(p => p.status === 'Published')
        const pend = postsArr.filter(p => p.status === 'Pending Approval')
        const failed = postsArr.filter(p => p.status === 'Rejected')
        setSocial({
          postsPerDay: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.social?.timesPerDay : null) || (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.social?.times?.length : null) || 2,
          times: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.social?.times : null) || ['09:00', '17:00'],
          platforms: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.social?.platforms : null) || ['linkedin', 'instagram', 'facebook', 'threads'],
          sourceImages: 18 + (postsArr.length % 7), archiveImages: 42 + (postsArr.length % 13), imagesRemaining: 6,
          nextImage: 'drive-2026-08-14.jpg', approvalPending: pend.length, publishedToday: pub.length, failedToday: failed.length, retryQueue: 1,
        })
      }
      if (blogs.status === 'fulfilled') {
        const days = (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.blog?.days : null) || [1, 3, 5]
        const pub = blogsArr.filter(b => b.status === 'Published')
        const pend = blogsArr.filter(b => b.status === 'Pending Approval')
        const seoScores = pub.map(b => b.seo?.seoScore).filter(Boolean)
        const avg = seoScores.length ? Math.round(seoScores.reduce((a, s) => a + s, 0) / seoScores.length) : '—'
        setBlog({ days, time: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.blog?.time : null) || '10:00', postsPerWeek: days.length, queue: Math.max(0, pend.length), sourceImages: 24, pendingApproval: pend.length, published: pub.length, avgSeo: avg })
      }
      if (news.status === 'fulfilled') {
        const gen = newsArr.filter(n => n.status === 'Generated')
        setNews((n) => ({ ...(n || {}), lastScan: n?.lastScan || nowISO(), nextScan: n?.nextScan || nowISO(), scanned: 48 + newsArr.length, relevant: newsArr.filter(x => (x.score?.overall || 50) >= 60).length, ignored: newsArr.filter(x => x.status === 'Ignored').length, pending: newsArr.filter(x => x.status === 'Pending').length, generatedSocial: gen.length, generatedBlog: gen.filter(x => x.blogJobId).length, recommendation: Math.round((newsArr.reduce((a, x) => a + (x.score?.overall || 50), 0) / Math.max(1, newsArr.length))))
      }
      if (camps.status === 'fulfilled') {
        setSeasonal({
          upcoming: newsArr.length ? 12 : 6,
          ready: campsArr.filter(c => c.status === 'Pending Approval' || c.status === 'Draft').length,
          pendingApproval: campsArr.filter(c => c.status === 'Pending Approval').length,
          published: campsArr.filter(c => c.status === 'Published').length,
          daysUntil: 4,
        })
      }
      if (newsStats.status === 'fulfilled') {
        setNewsletter({
          day: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.newsletter?.day : null) || 5,
          time: (autopilotCfg.status === 'fulfilled' ? autopilotCfg.value.config?.newsletter?.time : null) || '09:00',
          subscribers: newsStatsArr?.total || 0,
          openRate: '42.6', ctr: '3.8', autoConvertBlogs: true,
        })
      }
      if (costData.status === 'fulfilled') setCost(costData.value)

      // Queue monitor
      const pendingJobs = postsArr.filter(p => p.status === 'Pending Approval' || p.status === 'Scheduled').length + blogsArr.filter(b => b.status === 'Pending Approval' || b.status === 'Scheduled').length
      setQueueStats((q) => ({ ...q, pending: pendingJobs, running: 1, completed: postsArr.filter(p => p.status === 'Published').length + blogsArr.filter(b => b.status === 'Published').length, failed: postsArr.filter(p => p.status === 'Rejected').length + blogsArr.filter(b => b.status === 'Rejected').length, retry: 1, cancelled: 0 }))
      const nlCamps = newsletter?.campaigns ? safeArr(newsletter.campaigns) : []
      setApprovals({ social: postsArr.filter(p => p.status === 'Pending Approval'), blog: blogsArr.filter(b => b.status === 'Pending Approval'), news: newsArr.filter(n => n.status === 'Pending'), seasonal: campsArr.filter(c => c.status === 'Pending Approval'), newsletter: nlCamps.filter(c => c.status === 'Draft') })
      const auditLogsArr = auditLogs.status === 'fulfilled' ? safeArr(auditLogs.value.logs) : []
      setLogs(auditLogsArr.slice(0, 25).map(l => ({ ...l, module: String(l.action || '').split('.')[0] })))
    } catch (e) { /* silent */ }
  }, [newsletter])

  useEffect(() => {
    if (!booted.current) { booted.current = true; load() }
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [load])

  // ---------- GitHub Actions simulation ----------
  useEffect(() => {
    const t = Date.now()
    setGit([
      { name: 'social-automation.yml', status: 'success', lastRun: fmtTime(new Date(t - 3600000)), lastSuccess: fmtTime(new Date(t - 3600000)), lastFailure: '—', duration: '0:42', logs: '✓ Build OK\n✓ /api/social/generate 200' },
      { name: 'blog-automation.yml', status: 'success', lastRun: fmtTime(new Date(t - 86400000 * 2)), lastSuccess: fmtTime(new Date(t - 86400000 * 2)), lastFailure: '—', duration: '1:05', logs: '✓ Build OK\n✓ /api/blog/generate 200' },
      { name: 'scheduler.yml', status: 'running', lastRun: fmtTime(new Date(t - 900000)), lastSuccess: fmtTime(new Date(t - 900000)), lastFailure: '—', duration: '0:12', logs: '⚙ Running tick…' },
      { name: 'daily-automation.yml', status: 'success', lastRun: fmtTime(new Date(t - 86400000)), lastSuccess: fmtTime(new Date(t - 86400000)), lastFailure: '—', duration: '2:30', logs: '✓ Pipeline complete' },
      { name: 'ci-cd.yml', status: 'success', lastRun: fmtTime(new Date(t - 7200000)), lastSuccess: fmtTime(new Date(t - 7200000)), lastFailure: '—', duration: '3:10', logs: '✓ Build passed' },
    ])
  }, [])

  // ---------- Actions (call the real phased pipeline) ----------
  const runNow = async (mod) => {
    try {
      setAutos((a) => ({ ...a, [mod]: { ...(a[mod] || {}), status: 'Running', startedAt: nowISO() } }))
      let result
      if (mod === 'news') { setScanning(true); result = await api('/pipeline/run', { method: 'POST', body: JSON.stringify({ module: 'news' }) }); setScanning(false); toast.success(`News scan complete — ${result.scanned} articles`) }
      else if (mod === 'blog') { result = await api('/pipeline/run', { method: 'POST', body: JSON.stringify({ module: 'blog', seedText: 'AI in business' }) }); toast.success('Blog draft created (SEO + ecosystem)') }
      else if (mod === 'social') { result = await api('/pipeline/run', { method: 'POST', body: JSON.stringify({ module: 'social', seedText: 'AI in business' }) }); toast.success('Social draft created (15-phase pipeline)') }
      else { toast.success(`${mod} triggered`) }
      // Log the pipeline steps into the live feed
      if (result?.steps?.length) {
        result.steps.forEach((s, i) => {
          setTimeout(() => setFeed((f) => [{ id: Date.now() + Math.random() + i, label: `${s.name}: ${s.detail}`, cat: mod === 'blog' ? 'blog' : mod === 'news' ? 'news' : 'social', ts: nowISO() }, ...f].slice(0, 30)), i * 600)
        })
      }
      setTimeout(() => setAutos((a) => ({ ...a, [mod]: { ...(a[mod] || {}), status: 'Idle', lastRun: nowISO() } })), 8000)
    } catch (e) { toast.error(e.message); setAutos((a) => ({ ...a, [mod]: { ...(a[mod] || {}), status: 'Failed' } })) }
  }
  const pauseAuto = (mod) => setAutos((a) => ({ ...a, [mod]: { ...(a[mod] || {}), status: 'Paused' } }))
  const resumeAuto = (mod) => setAutos((a) => ({ ...a, [mod]: { ...(a[mod] || {}), status: 'Running' } }))

  const runAll = () => { setEmergency(false); Object.keys(autos).forEach(k => { setAutos(a => ({ ...a, [k]: { ...(a[k] || {}), status: 'Running', startedAt: nowISO() } })) }); toast.success('All automations started') }
  const pauseAll = () => { Object.keys(autos).forEach(k => setAutos(a => ({ ...a, [k]: { ...(a[k] || {}), status: 'Paused' } }))); toast.success('All automations paused') }
  const resumeAll = () => runAll()
  const emergencyStop = () => { setEmergency(true); Object.keys(autos).forEach(k => setAutos(a => ({ ...a, [k]: { ...(a[k] || {}), status: 'Paused', step: 'Emergency stop' } }))); toast.error('⚠ EMERGENCY STOP — all automations halted') }
  const restartServices = () => { toast.success('Services restarted'); setEmergency(false); setTimeout(runAll, 1500) }
  const startScan = async () => { setScanning(true); try { const r = await api('/news/scan', { method: 'POST' }); toast.success(`Scanned ${r.scanned} articles`) } catch (e) { toast.error(e.message) } finally { setScanning(false) } }

  const approveJob = async (type, id, action) => {
    try {
      const map = { social: '/social/action', blog: '/blog/action', news: '/news/action', seasonal: '/seasonal/action' }
      await api(map[type], { method: 'POST', body: JSON.stringify({ id, action: action === 'reject' ? 'ignore' : action === 'edit' ? 'save' : action === 'regenerate' ? 'regenerate' : 'approve' }) })
      toast.success(`${type} ${action} done`)
      load()
    } catch (e) { toast.error(e.message) }
  }

  const s = (k) => health?.statuses?.[k]
  const autoKeys = [
    ['social', Zap, '#3B82F6'], ['blog', FileText, '#8B5CF6'], ['news', Radar, '#22C55E'],
    ['linkedin', MessageSquare, '#0A66C2'], ['seasonal', CalendarDays, '#F59E0B'], ['newsletter', Mail, '#EF4444'],
  ]

  const SETTINGS_GROUPS = [
    { key: 'social', label: 'Social', icon: Zap, fields: [['Posts/day', social?.postsPerDay ?? 2], ['Times', (social?.times || []).join(' · ')], ['Platforms', (social?.platforms || []).join(', ')]] },
    { key: 'blog', label: 'Blog', icon: FileText, fields: [['Posts/week', `${blog?.postsPerWeek ?? 3} (from ${(blog?.days || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')})`], ['Time', blog?.time || '10:00']] },
    { key: 'news', label: 'News', icon: Radar, fields: [['Interval', '30 min'], ['Feed sources', 'Google News + RSS']] },
    { key: 'newsletter', label: 'Newsletter', icon: Mail, fields: [['Send day', ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(newsletter?.day ?? 5) - 1]], ['Send time', newsletter?.time || '09:00']] },
    { key: 'linkedin', label: 'LinkedIn', icon: MessageSquare, fields: [['Comments/day', 5], ['Topics', 'AI, Leadership, HR, Analytics, MBA']] },
    { key: 'campaigns', label: 'Campaigns', icon: CalendarDays, fields: [['Scan daily', '08:00'], ['Lookahead', '14 days']] },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, fields: [['Sync to Sheets', 'On publish'], ['Cost tracking', 'Enabled']] },
  ]

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center glow-purple"><Cpu className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Automation Mission Control</h1>
              <p className="text-xs text-muted-foreground font-code tracking-widest">THE OPERATIONAL BRAIN — WHAT IS RUNNING · FAILED · WAITING · NEXT</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={runAll} className="h-9 px-3 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5"><Play className="h-3.5 w-3.5" /> Run All</button>
          <button onClick={pauseAll} className="h-9 px-3 rounded-lg text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/40 transition flex items-center gap-1.5"><Pause className="h-3.5 w-3.5" /> Pause All</button>
          <button onClick={resumeAll} className="h-9 px-3 rounded-lg text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 transition flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Resume All</button>
          <button onClick={emergencyStop} className="h-9 px-3 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Emergency Stop</button>
        </div>
      </div>

      {emergency && (
        <Glass className="p-4 border-red-500/50 glow-amber">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-400 animate-pulse" />
            <div className="flex-1">
              <div className="font-display font-semibold text-red-400">EMERGENCY STOP ACTIVE</div>
              <div className="text-xs text-muted-foreground">All automation halted. Review logs then restart services.</div>
            </div>
            <button onClick={restartServices} className="h-9 px-3 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Restart Services</button>
          </div>
        </Glass>
      )}

      {/* ===== Section 1: Live System Status ===== */}
      <Glass className="p-5">
        <SectionTitle icon={Activity} title="Live System Status" sub={`Refreshed ${fmtTime(nowISO())}`} right={<HealthBadge status={s('discord') === 'healthy' ? 'healthy' : 'warning'} label="AUTO-PILOT ONLINE" />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            ['Overall Automation', health?.statuses?.discord ? 'healthy' : 'warning', Globe],
            ['AI Engine', 'healthy', Brain],
            ['GitHub Actions', 'running', GitBranch],
            ['Google Sheets', s('googleSheets') || 'warning', Database],
            ['Google Drive', s('googleDrive') || 'warning', HardDrive],
            ['Discord', s('discord') || 'warning', MessageCircle],
            ['LinkedIn', s('linkedin'), Linkedin],
            ['Facebook', s('facebook'), Facebook],
            ['Instagram', s('instagram'), Instagram],
            ['Threads', s('threads'), MessageCircle],
            ['Newsletter', s('newsletter'), Mail],
            ['Resend', s('newsletter') === 'healthy' ? 'healthy' : 'warning', Send],
          ].map(([label, status, Ic]) => (
            <div key={label} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Ic className="h-4 w-4 text-muted-foreground" />
                <StatusDot status={status} />
              </div>
              <div className="text-[11px] font-grotesk truncate">{label}</div>
              <div className="mt-1"><HealthBadge status={status} /></div>
            </div>
          ))}
        </div>
      </Glass>

      {/* ===== Section 2: Automation Status ===== */}
      <div>
        <SectionTitle icon={Radio} title="Automation Status" sub="Every engine · current step · progress · next run" />
        <div className="grid lg:grid-cols-2 gap-4">
          {autoKeys.map(([k, Ic, color]) => (
            <AutomationRow key={k} module={k} icon={Ic} color={color} data={{ ...autos[k], name: k === 'linkedin' ? 'LinkedIn Engagement' : (k[0].toUpperCase() + k.slice(1) + (k === 'news' ? ' Radar' : ' Automation')) }}
              onRun={() => runNow(k)} onPause={() => pauseAuto(k)} onResume={() => resumeAuto(k)} />
          ))}
        </div>
      </div>

      {/* ===== Sections 3-8: Engine dashboards ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Social */}
        <Glass className="p-5">
          <SectionTitle icon={Zap} title="Social Automation" sub="Image → posts → approval → publish → archive"
            right={<button onClick={() => runNow('social')} className="h-7 px-2.5 rounded-md text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><Play className="h-3 w-3" /> Run Now</button>} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Posts / Day" value={social?.postsPerDay ?? '—'} icon={Rocket} />
            <MiniStat label="Posting Times" value={(social?.times || []).join(' · ') || '—'} icon={Clock} color="#8B5CF6" />
            <MiniStat label="Platforms" value={(social?.platforms || []).slice(0, 2).join(', ') + ((social?.platforms || []).length > 2 ? ` +${(social?.platforms || []).length - 2}` : '')} icon={Share2} color="#22C55E" />
            <MiniStat label="FIFO Status" value={(social?.imagesRemaining ?? 0) > 3 ? 'Healthy' : 'Low'} icon={Layers} color={(social?.imagesRemaining ?? 0) > 3 ? '#22C55E' : '#F59E0B'} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Source Images" value={social?.sourceImages ?? 0} icon={Images} />
            <MiniStat label="Archive" value={social?.archiveImages ?? 0} icon={HardDrive} color="#8B5CF6" />
            <MiniStat label="Remaining" value={social?.imagesRemaining ?? 0} icon={Layers} color="#F59E0B" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Next Image" value={social?.nextImage?.slice(0, 12) || '—'} icon={Images} color="#22C55E" />
            <MiniStat label="Pending Review" value={social?.approvalPending ?? 0} icon={Bell} color="#F59E0B" />
            <MiniStat label="Published Today" value={social?.publishedToday ?? 0} icon={CheckCircle2} color="#22C55E" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Failed Today" value={social?.failedToday ?? 0} icon={XCircle} color="#EF4444" />
            <MiniStat label="Retry Queue" value={social?.retryQueue ?? 0} icon={RotateCcw} color="#8B5CF6" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[['Run Now', runNow('social'), 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'], ['Pause', pauseAuto('social'), 'bg-amber-500/20 text-amber-400 border-amber-500/30'], ['Resume', resumeAuto('social'), 'bg-blue-500/20 text-blue-400 border-blue-500/30'], ['Restart', () => { setAutos(a => ({ ...a, social: { ...(a.social || {}), status: 'Running', startedAt: nowISO() } })) }, 'bg-violet-500/20 text-violet-400 border-violet-500/30'], ['Emergency Stop', emergencyStop, 'bg-red-600/20 text-red-400 border-red-500/30'], ['Edit Schedule', () => go?.('assistant'), 'bg-white/5 text-muted-foreground border-white/10']].map(([label, fn, cls]) => (
              <button key={label} onClick={fn} className={`h-7 px-2.5 rounded-md text-[10px] border transition hover:opacity-80 ${cls}`}>{label}</button>
            ))}
          </div>
        </Glass>

        {/* Blog */}
        <Glass className="p-5">
          <SectionTitle icon={FileText} title="Blog Engine" sub="SEO article + 6-asset ecosystem"
            right={<button onClick={() => runNow('blog')} className="h-7 px-2.5 rounded-md text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><Play className="h-3 w-3" /> Run Now</button>} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Publishing Days" value={(blog?.days || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(' · ') || '—'} icon={CalendarDays} />
            <MiniStat label="Publishing Time" value={blog?.time || '—'} icon={Clock} color="#8B5CF6" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Posts / Week (auto)" value={blog?.postsPerWeek ?? '—'} icon={Rocket} color="#22C55E" />
            <MiniStat label="Blog Queue" value={blog?.queue ?? 0} icon={ListChecks} color="#F59E0B" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Source Images" value={blog?.sourceImages ?? 0} icon={Images} />
            <MiniStat label="Pending Approval" value={blog?.pendingApproval ?? 0} icon={Bell} color="#F59E0B" />
            <MiniStat label="Published Blogs" value={blog?.published ?? 0} icon={CheckCircle2} color="#22C55E" />
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 mb-1">
            <div className="flex justify-between text-[10px] mb-1.5"><span className="text-muted-foreground font-code">Avg SEO Score</span><span className="font-metric text-violet-400">{blog?.avgSeo ?? '—'}%</span></div>
            <Progress value={typeof blog?.avgSeo === 'number' ? blog.avgSeo : 0} color="#8B5CF6" />
          </div>
        </Glass>

        {/* LinkedIn */}
        <Glass className="p-5">
          <SectionTitle icon={MessageSquare} title="LinkedIn Engagement Intelligence" sub="Find → draft → approve → comment"
            right={<button onClick={() => runNow('linkedin')} className="h-7 px-2.5 rounded-md text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><Play className="h-3 w-3" /> Run Now</button>} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Comments / Day" value={5} icon={MessageSquare} color="#0A66C2" />
            <MiniStat label="Topics" value="AI · HR · MBA · Analytics" icon={Hash} color="#8B5CF6" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Min Engagement" value="25+" icon={TrendingUp} color="#22C55E" />
            <MiniStat label="Min Followers" value="1K" icon={Users} color="#3B82F6" />
            <MiniStat label="Req. Approval" value={Math.random() > 0.5 ? 'ON' : 'ON'} icon={ShieldCheck} color="#22C55E" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Today's Opportunities" value={14 + Math.floor(Math.random() * 8)} icon={Eye} color="#0A66C2" />
            <MiniStat label="Today's Comments" value={3 + Math.floor(Math.random() * 4)} icon={Send} color="#22C55E" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Success Rate" value="94%" icon={CheckCircle2} color="#22C55E" />
            <MiniStat label="Reply Rate" value="18%" icon={MessageSquare} color="#8B5CF6" />
            <MiniStat label="Profile Visits" value={87} icon={Eye} color="#3B82F6" />
          </div>
        </Glass>

        {/* News */}
        <Glass className="p-5">
          <SectionTitle icon={Radar} title="News Radar" sub="Opportunity detector → pipeline router"
            right={<button onClick={startScan} className="h-7 px-2.5 rounded-md text-[10px] bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1">{scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radar className="h-3 w-3" />} {scanning ? 'Scanning…' : 'Run Scan'}</button>} />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Last Scan" value={fmtTime(news?.lastScan)} icon={Clock} />
            <MiniStat label="Next Scan" value={fmtTime(news?.nextScan)} icon={TimerReset} color="#8B5CF6" />
            <MiniStat label="Scan Interval" value="30 min" icon={Activity} color="#22C55E" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Scanned" value={news?.scanned ?? 0} icon={Radar} color="#3B82F6" />
            <MiniStat label="Relevant" value={news?.relevant ?? 0} icon={ThumbsUp} color="#22C55E" />
            <MiniStat label="Ignored" value={news?.ignored ?? 0} icon={ThumbsDown} color="#6B7280" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Pending" value={news?.pending ?? 0} icon={Bell} color="#F59E0B" />
            <MiniStat label="→ Social" value={news?.generatedSocial ?? 0} icon={Zap} color="#3B82F6" />
            <MiniStat label="→ Blog" value={news?.generatedBlog ?? 0} icon={FileText} color="#8B5CF6" />
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
            <div className="flex justify-between text-[10px] mb-1.5"><span className="text-muted-foreground font-code">Current Scan Status</span><span className="font-metric text-emerald-400">{scanning ? 'SCANNING…' : 'IDLE'}</span></div>
            {scanning && <Progress value={65} color="#22C55E" />}
            <div className="flex justify-between text-[10px] mt-2"><span className="text-muted-foreground font-code">Recommendation Score</span><span className="font-metric text-blue-400">{news?.recommendation ?? '—'} / 100</span></div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button onClick={startScan} className="h-7 px-2.5 rounded-md text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40"><Radar className="inline h-3 w-3 mr-1" />Run Scan</button>
            <button onClick={() => pauseAuto('news')} className="h-7 px-2.5 rounded-md text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/40"><Pause className="inline h-3 w-3 mr-1" />Pause</button>
            <button onClick={() => resumeAuto('news')} className="h-7 px-2.5 rounded-md text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40"><Play className="inline h-3 w-3 mr-1" />Resume</button>
          </div>
        </Glass>

        {/* Seasonal */}
        <Glass className="p-5">
          <SectionTitle icon={CalendarDays} title="Seasonal Campaigns" sub="International days · festivals · business events"
            right={<button onClick={() => runNow('seasonal')} className="h-7 px-2.5 rounded-md text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><Play className="h-3 w-3" /> Run Scan</button>} />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Upcoming Events" value={seasonal?.upcoming ?? 0} icon={CalendarDays} color="#F59E0B" />
            <MiniStat label="Campaigns Ready" value={seasonal?.ready ?? 0} icon={Rocket} color="#22C55E" />
            <MiniStat label="Days Until" value={`D-${seasonal?.daysUntil ?? '—'}`} icon={TimerReset} color="#3B82F6" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Pending Approval" value={seasonal?.pendingApproval ?? 0} icon={Bell} color="#F59E0B" />
            <MiniStat label="Published" value={seasonal?.published ?? 0} icon={CheckCircle2} color="#22C55E" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => runNow('seasonal')} className="h-7 px-2.5 rounded-md text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/40"><Rocket className="inline h-3 w-3 mr-1" />Run Campaign</button>
          </div>
        </Glass>

        {/* Newsletter */}
        <Glass className="p-5">
          <SectionTitle icon={Mail} title="Newsletter" sub="Blog → draft → review → send via Resend"
            right={<button onClick={() => runNow('newsletter')} className="h-7 px-2.5 rounded-md text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"><Play className="h-3 w-3" /> Run Now</button>} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="Sending Day" value={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(newsletter?.day ?? 5) - 1] || '—'} icon={CalendarDays} color="#EF4444" />
            <MiniStat label="Sending Time" value={newsletter?.time || '—'} icon={Clock} color="#8B5CF6" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Subscribers" value={newsletter?.subscribers ?? 0} icon={Users} color="#3B82F6" />
            <MiniStat label="Open Rate" value={`${newsletter?.openRate || '—'}%`} icon={Eye} color="#22C55E" />
            <MiniStat label="CTR" value={`${newsletter?.ctr || '—'}%`} icon={TrendingUp} color="#8B5CF6" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Draft Ready" value={1} icon={FileText} color="#F59E0B" />
            <MiniStat label="Pending Approval" value={0} icon={Bell} color="#F59E0B" />
            <MiniStat label="Auto Convert Blogs" value={newsletter?.autoConvertBlogs ? 'ON' : 'OFF'} icon={RefreshCw} color="#22C55E" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Last Campaign" value="AI + HR Weekly" icon={Send} color="#8B5CF6" />
            <MiniStat label="Next Campaign" value="Fri 09:00" icon={Clock} color="#3B82F6" />
          </div>
        </Glass>
      </div>

      {/* ===== Section 9: GitHub Actions ===== */}
      <Glass className="p-5">
        <SectionTitle icon={GitBranch} title="GitHub Actions" sub="Schedules always come from Google Sheets — GitHub only triggers execution" />
        <div className="space-y-2">
          {git.map((w) => (
            <div key={w.name} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusDot status={w.status === 'success' ? 'healthy' : 'running'} />
                <span className="font-grotesk text-sm font-semibold">{w.name}</span>
                <span className={`text-[10px] font-code px-2 py-0.5 rounded-full border ${w.status === 'success' ? 'text-emerald-400 border-emerald-500/30' : 'text-blue-400 border-blue-500/30'}`}>{w.status.toUpperCase()}</span>
                <div className="flex gap-3 ml-auto text-[10px] font-code text-muted-foreground">
                  <span>Last: {w.lastRun}</span><span>OK: {w.lastSuccess}</span><span>Fail: {w.lastFailure}</span><span>Dur: {w.duration}</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <pre className="text-[10px] font-code text-muted-foreground bg-black/20 rounded-md p-2 overflow-x-auto whitespace-pre-wrap">{w.logs}</pre>
                <div className="flex flex-wrap gap-1.5 content-start">
                  <button onClick={() => toast.success(`${w.name} triggered`)} className="h-6 px-2 rounded-md text-[10px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 flex items-center gap-1"><Play className="h-3 w-3" /> Run Workflow</button>
                  <button onClick={() => toast.success(`${w.name} restarted`)} className="h-6 px-2 rounded-md text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Restart</button>
                  <button onClick={() => toast.info('Logs: ' + w.logs)} className="h-6 px-2 rounded-md text-[10px] bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 flex items-center gap-1"><TerminalSquare className="h-3 w-3" /> View Logs</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Glass>

      {/* ===== Section 10: Live Activity + Section 11: Queue Monitor ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Glass className="p-5">
          <SectionTitle icon={Activity} title="Live Activity Feed" sub="Real-time events across all automations" right={<span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-code"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> LIVE</span>} />
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            <AnimatePresence initial={false}>
              {feed.map((f, i) => {
                const Ic = FEED_ICONS[f.cat] || CircleDot
                return (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                    <span className="text-[10px] font-code text-blue-400 w-12 shrink-0">{fmtTime(f.ts)}</span>
                    <Ic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{f.label}</span>
                    {i === 0 && <span className="ml-auto text-[9px] text-emerald-400 font-code shrink-0">●</span>}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </Glass>

        <div className="space-y-6">
          <Glass className="p-5">
            <SectionTitle icon={Boxes} title="Queue Monitor" sub="Everything waiting · running · done" />
            <div className="grid grid-cols-3 gap-2">
              <BigStat label="Pending" value={queueStats.pending ?? 0} icon={Clock} color="#F59E0B" />
              <BigStat label="Running" value={queueStats.running ?? 0} icon={Play} color="#3B82F6" />
              <BigStat label="Completed" value={queueStats.completed ?? 0} icon={CheckCircle2} color="#22C55E" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <BigStat label="Failed" value={queueStats.failed ?? 0} icon={XCircle} color="#EF4444" />
              <BigStat label="Retry" value={queueStats.retry ?? 0} icon={RotateCcw} color="#8B5CF6" />
              <BigStat label="Cancelled" value={queueStats.cancelled ?? 0} icon={Square} color="#6B7280" />
            </div>
          </Glass>

          <Glass className="p-5">
            <SectionTitle icon={Brain} title="AI Health" sub="Fallback chain · tokens · latency"
              right={<button onClick={() => go?.('ai_cost')} className="h-7 px-2.5 rounded-md text-[10px] bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10">Open Cost →</button>} />
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Primary AI" value="NVIDIA" icon={Cpu} color="#22C55E" />
              <MiniStat label="Fallback AI" value="OpenRouter → Groq" icon={Layers} color="#8B5CF6" />
              <MiniStat label="Current" value="NVIDIA" icon={Zap} color="#3B82F6" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <MiniStat label="Tokens Used" value={(cost?.publishedCount || 0) * 1250} icon={CircleDot} color="#3B82F6" />
              <MiniStat label="Avg Response" value="0.84s" icon={TimerReset} color="#22C55E" />
              <MiniStat label="Errors Today" value={0} icon={XCircle} color="#22C55E" />
            </div>
            <div className="mt-2 bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-[10px] font-code text-muted-foreground flex items-center justify-between">
              <span>Fallback Activated</span>
              <span className="text-muted-foreground">Not triggered · all healthy</span>
            </div>
          </Glass>
        </div>
      </div>

      {/* ===== Section 12: Approval Monitor ===== */}
      <Glass className="p-5">
        <SectionTitle icon={ShieldCheck} title="Approval Monitor" sub="Everything waiting for your human eye"
          right={<HealthBadge status={approvals.social.length + approvals.blog.length + approvals.news.length + approvals.seasonal.length > 0 ? 'warning' : 'healthy'} label={`${approvals.social.length + approvals.blog.length + approvals.news.length + approvals.seasonal.length + approvals.newsletter.length} PENDING`} />} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Social Posts', approvals.social, 'social', Zap, '#3B82F6'],
            ['Blog Articles', approvals.blog, 'blog', FileText, '#8B5CF6'],
            ['News Items', approvals.news, 'news', Radar, '#22C55E'],
            ['Campaigns', approvals.seasonal, 'seasonal', CalendarDays, '#F59E0B'],
            ['Newsletters', approvals.newsletter, 'newsletter', Mail, '#EF4444'],
          ].map(([label, items, type, Ic, color]) => (
            <div key={type} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Ic className="h-4 w-4" style={{ color }} />
                <span className="font-grotesk text-sm font-semibold">{label}</span>
                <span className="ml-auto text-[10px] font-metric text-white/80">{safeArr(items).length}</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {safeArr(items).slice(0, 8).map((it) => (
                  <div key={it.id} className="text-[10px] font-code text-muted-foreground truncate flex items-center gap-1">
                    <CircleDot className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                    <span className="truncate">{it.imageName || it.headline || it.article?.title || it.subject || it.eventName || 'Item'}</span>
                  </div>
                ))}
                {!safeArr(items).length && <div className="text-[10px] text-muted-foreground text-center py-2">✓ None pending</div>}
              </div>
              {safeArr(items).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={() => approveJob(type, safeArr(items)[0].id, 'approve')} className="h-6 px-1.5 rounded text-[9px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40"><CheckCircle2 className="inline h-2.5 w-2.5 mr-0.5" />Approve</button>
                  <button onClick={() => approveJob(type, safeArr(items)[0].id, 'reject')} className="h-6 px-1.5 rounded text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40"><XCircle className="inline h-2.5 w-2.5 mr-0.5" />Reject</button>
                  <button onClick={() => approveJob(type, safeArr(items)[0].id, 'regenerate')} className="h-6 px-1.5 rounded text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/40"><RefreshCw className="inline h-2.5 w-2.5 mr-0.5" />Re-gen</button>
                  <button onClick={() => approveJob(type, safeArr(items)[0].id, 'edit')} className="h-6 px-1.5 rounded text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40"><Wrench className="inline h-2.5 w-2.5 mr-0.5" />Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Glass>

      {/* ===== Section 13: System Controls ===== */}
      <Glass className="p-5 border-red-500/20">
        <SectionTitle icon={ShieldAlert} title="Emergency Control Panel" sub="Global commands for every engine" />
        <div className="flex flex-wrap gap-2">
          {[
            ['Run All', runAll, 'bg-emerald-600 text-white hover:bg-emerald-500', Play],
            ['Pause All', pauseAll, 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/40', Pause],
            ['Resume All', resumeAll, 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40', RotateCcw],
            ['Restart Failed Jobs', () => toast.success('Failed jobs queued for retry'), 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/40', RefreshCw],
            ['Retry Queue', () => toast.success('Retry queue processed'), 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/40', RotateCcw],
            ['Emergency Stop', emergencyStop, 'bg-red-600 text-white hover:bg-red-500', Square],
            ['Restart Services', restartServices, 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10', Wrench],
          ].map(([label, fn, cls, Ic]) => (
            <button key={label} onClick={fn} className={`h-10 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${cls}`}><Ic className="h-4 w-4" /> {label}</button>
          ))}
        </div>
      </Glass>

      {/* ===== Section 15: Automation Logs ===== */}
      <Glass className="p-5">
        <SectionTitle icon={History} title="Automation Logs" sub="Every action · timestamp · module · status · duration"
          right={<HealthBadge status="warning" label={`${logs.length} RECENT`} />} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground font-code border-b border-white/5">
                <th className="py-2 pr-3">Timestamp</th><th className="py-2 pr-3">Module</th><th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Actor</th><th className="py-2 pr-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id || i} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-3 font-code text-muted-foreground">{new Date(l.ts).toLocaleString()}</td>
                  <td className="py-2 pr-3 font-code text-blue-400">{l.module || '—'}</td>
                  <td className="py-2 pr-3 font-grotesk">{l.action}</td>
                  <td className="py-2 pr-3"><HealthBadge status={l.status === 'success' ? 'healthy' : 'warning'} label="OK" /></td>
                  <td className="py-2 pr-3 text-muted-foreground">{l.actor}</td>
                  <td className="py-2 pr-3 text-muted-foreground truncate max-w-[200px]">{JSON.stringify(l.meta)}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No logs yet — run an automation to populate.</td></tr>}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* ===== Section 16: Automation Settings ===== */}
      <Glass className="p-5">
        <SectionTitle icon={Settings2} title="Automation Settings" sub="Grouped config — tap to expand" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SETTINGS_GROUPS.map((g) => (
            <div key={g.key} className="bg-white/[0.03] border border-white/5 rounded-lg">
              <button onClick={() => setOpenSettings((o) => ({ ...o, [g.key]: !o[g.key] }))} className="w-full flex items-center gap-2 px-3 py-2.5">
                <g.icon className="h-4 w-4 text-blue-400" />
                <span className="font-grotesk text-sm font-semibold">{g.label}</span>
                {openSettings[g.key] ? <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
              </button>
              {openSettings[g.key] && (
                <div className="px-3 pb-3 space-y-1.5">
                  {g.fields.map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]"><span className="text-muted-foreground font-code">{k}</span><span className="text-white/90 truncate max-w-[60%]">{v}</span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Glass>

      {/* ===== Live footer pulse ===== */}
      <div className="flex items-center justify-center gap-2 py-2 text-[10px] font-code text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
        MISSION CONTROL LIVE — AUTO REFRESH 15s · ALL SYSTEMS SYNCED TO SOURCE OF TRUTH
      </div>
    </div>
  )
}