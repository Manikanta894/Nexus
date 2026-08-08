'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
  RadialBarChart, RadialBar, BarChart, Bar,
} from 'recharts'
import {
  LayoutDashboard, Sparkles, FileText, Radar, CalendarDays, BarChart3, MessageSquare,
  Mail, Lightbulb, Kanban, Repeat, DollarSign, Brain, Plug, ScrollText, Bot, ShieldCheck,
  Menu, Search, Bell, LogOut, Check, X, RefreshCw, Pencil, SkipForward, Clock, Upload,
  Zap, Activity, ChevronLeft, Cpu, TrendingUp, Users, Eye, Send, Save, Trash2, Play,
  Star, Rocket, Newspaper, Mic, Fingerprint, Loader2, Copy, ExternalLink, Globe, Github,
  Triangle, Linkedin, Facebook, Instagram, MessageCircle, CircleDot, Layers, Award, ImageIcon,
  Lock, Wand2, Plus, Filter, ShieldAlert, Wallet, BookOpen, Hash, ScanFace, ScanEye, Settings2, ShieldCheck as ShieldIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ------------------------------------------------------------------ api
// The preview proxy can stall a lone response until a *concurrent* request
// nudges the pipe. So we: (1) serialize — only one request in flight at a
// time, so the proxy's connection pool never jams; (2) fire a single tiny
// unblocking ping at 500ms if the request hasn't settled; (3) hard-abort at
// 12s and retry GETs once on a fresh connection.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const safeArr = (v) => Array.isArray(v) ? v : []

const ping = (() => {
  let last = 0
  return () => {
    const now = Date.now()
    if (now - last < 300) return
    last = now
    fetch('/api/root', { cache: 'no-store', signal: AbortSignal.timeout(3000) }).catch(() => {})
  }
})()

const rawRequest = async (path, opts, token, signal) => {
  const res = await fetch(`/api${path}`, {
    ...opts,
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e }
  return data
}

let requestQueue = Promise.resolve()
const api = (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : null
  const safeToRetry = !opts.method || opts.method === 'GET'
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController()
      const p = rawRequest(path, opts, token, ctrl.signal)
      let settled = false
      p.then(() => { settled = true }, () => { settled = true })
      const nudge = setTimeout(() => { if (!settled) ping() }, 500)
      const killer = setTimeout(() => ctrl.abort(), safeToRetry ? 15000 : 45000)
      try {
        return await p
      } catch (e) {
        if (e.name === 'AbortError' && safeToRetry && attempt < 2) { await sleep(400); continue }
        throw e
      } finally {
        clearTimeout(nudge); clearTimeout(killer)
      }
    }
  }
  const result = requestQueue.then(run, run)
  requestQueue = result.then(() => {}, () => {})
  return result
}

const DEMO_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71', name: 'analytics-dashboard.jpg', hint: 'business analytics dashboard' },
  { url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952', name: 'team-meeting.jpg', hint: 'leadership team meeting' },
  { url: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01', name: 'ai-brain.jpg', hint: 'artificial intelligence technology' },
  { url: 'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86', name: 'modern-dashboard.jpg', hint: 'data dashboard interface' },
  { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0', name: 'leadership-talk.jpg', hint: 'leadership presentation' },
  { url: 'https://images.unsplash.com/photo-1674027444485-cec3da58eef4', name: 'ai-network.jpg', hint: 'ai neural network' },
]

const PLATFORM_META = {
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  instagram: { label: 'Instagram', icon: Instagram, color: '#E4405F' },
  facebook: { label: 'Facebook', icon: Facebook, color: '#1877F2' },
  threads: { label: 'Threads', icon: MessageCircle, color: '#8B5CF6' },
}

// ------------------------------------------------------------------ nav
const NAV = [
  { section: 'COMMAND', items: [{ id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }] },
  { section: 'CONTENT ENGINE', items: [
    { id: 'social', label: 'Social Automation', icon: Sparkles },
    { id: 'blog', label: 'Blog Engine', icon: FileText },
    { id: 'news', label: 'News Radar', icon: Radar },
    { id: 'seasonal', label: 'Seasonal Campaigns', icon: CalendarDays },
    { id: 'repurposing', label: 'Repurposing Engine', icon: Repeat },
    { id: 'idea_vault', label: 'Idea Vault', icon: Lightbulb },
    { id: 'calendar', label: 'Content Calendar', icon: Kanban },
  ] },
  { section: 'INTELLIGENCE', items: [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'linkedin_engage', label: 'LinkedIn Engagement', icon: MessageSquare },
    { id: 'brand', label: 'Brand Intelligence', icon: Brain },
    { id: 'factcheck', label: 'Fact-Check Pass', icon: ShieldCheck },
    { id: 'ai_cost', label: 'AI Cost Dashboard', icon: DollarSign },
  ] },
  { section: 'GROWTH', items: [
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'recruiter', label: 'Recruiter Signal', icon: Award },
    { id: 'portfolio', label: 'Portfolio Sync', icon: Rocket },
  ] },
  { section: 'INTELLIGENCE+', items: [
    { id: 'mission_control', label: 'Mission Control', icon: Activity },
    { id: 'learning', label: 'Learning Engine', icon: TrendingUp },
    { id: 'versions', label: 'Version History', icon: Layers },
  ] },
  { section: 'AUTOMATION', items: [
    { id: 'autopilot', label: 'Auto-Pilot 24/7', icon: Zap },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
  ] },
  { section: 'SYSTEM', items: [
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'assistant', label: 'Jarvis / PWA', icon: Bot },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'discord', label: 'Discord Hub', icon: MessageCircle },
    { id: 'email', label: 'Email Studio', icon: Send },
    { id: 'connections', label: 'Connections', icon: ExternalLink },
  ] },
]

// ================================================================== LOGIN
function Login({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      localStorage.setItem('nexus_token', token)
      localStorage.setItem('nexus_user', JSON.stringify(user))
      toast.success('Access granted', { description: 'Welcome back, Boss.' })
      onLogin(user)
    } catch (err) {
      toast.error('Access denied', { description: String(err.message || err) })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-strong glow-blue rounded-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center glow-blue">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">NEXUS</h1>
            <p className="text-xs text-muted-foreground font-code tracking-widest">AI COMMAND CENTER</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">OPERATOR ID</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="bg-secondary/50 border-white/10 font-code" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">PASSPHRASE</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="bg-secondary/50 border-white/10 font-code" />
          </div>
          <Button type="button" onClick={submit} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 h-11">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Authenticating…</> : <><Fingerprint className="h-4 w-4 mr-2" /> Initialize Session</>}
          </Button>
          <p className="text-center text-xs text-muted-foreground pt-2">Dev login <span className="font-code text-blue-400">admin / admin123</span> · Google Sign-In + 2FA + Face ID activate on production domain</p>
        </div>
      </motion.div>
    </div>
  )
}

// ================================================================== FACE + EYEBALL VERIFICATION
// Face verification uses the WebAuthn API (Face ID / Touch ID / Windows Hello /
// platform biometrics). Falls back to a PIN if biometrics are unavailable.
const FACE_KEY = 'nexus_face_credential'
const FACE_PIN = 'nexus_face_pin'

function isWebAuthnAvailable() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials
}

async function registerBiometric() {
  if (!isWebAuthnAvailable()) return { ok: false, reason: 'unsupported' }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'NEXUS Command Center' },
        user: { id: new Uint8Array(16), name: 'admin', displayName: 'Manikanta R' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    })
    if (cred) {
      localStorage.setItem(FACE_KEY, 'registered')
      return { ok: true }
    }
    return { ok: false, reason: 'cancelled' }
  } catch (e) {
    return { ok: false, reason: e.name === 'NotAllowedError' ? 'cancelled' : 'unsupported' }
  }
}

async function verifyBiometric() {
  if (!isWebAuthnAvailable()) return { ok: false, reason: 'unsupported' }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return cred ? { ok: true } : { ok: false, reason: 'cancelled' }
  } catch (e) {
    return { ok: false, reason: e.name === 'NotAllowedError' ? 'cancelled' : 'unsupported' }
  }
}

// Face verification gate — shown ONCE per session after login.
// iOS Safari requires a user gesture for WebAuthn, so Face ID is enabled
// via an explicit "Enable Face ID" button (never auto-registered in useEffect).
function FaceGate({ onVerified, onSkip }) {
  const [state, setState] = useState('checking') // checking | ready | pin | error | enabling
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')

  // Jarvis announces the gate once
  useEffect(() => {
    speak('Face authentication required', 'Boss')
    const registered = localStorage.getItem(FACE_KEY)
    if (!isWebAuthnAvailable()) {
      if (!localStorage.getItem(FACE_PIN)) { setState('pin'); setMsg('Set a 4-digit PIN — Face ID needs Safari on a secure (https) site') }
      else { setState('pin'); setMsg('Enter your PIN') }
      return
    }
    if (registered) { setState('ready'); setMsg('Face ID ready — tap to verify') }
    else { setState('ready'); setMsg('Enable Face ID to unlock with your biometrics') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enable Face ID — MUST be triggered by a user tap for iOS to allow it
  const enableFaceId = async () => {
    setState('enabling'); setMsg('Setting up Face ID…')
    const r = await registerBiometric()
    if (r.ok) { setState('ready'); setMsg('Face ID enabled — tap to verify now') }
    else {
      setState('pin')
      setMsg('Face ID needs Safari + a device passcode + https. Set a PIN instead.')
    }
  }

  const doVerify = async () => {
    setMsg('Verifying…')
    const r = await verifyBiometric()
    if (r.ok) { speak('Access granted'); toast.success('Identity verified'); onVerified(); return }
    if (r.reason === 'unsupported') { setState('pin'); setMsg('Enter your PIN'); return }
    setMsg('Verification cancelled — try again or use PIN')
  }

  const doPin = () => {
    const stored = localStorage.getItem(FACE_PIN)
    if (!stored) {
      if (pin.length === 4) {
        localStorage.setItem(FACE_PIN, pin)
        if (isWebAuthnAvailable()) localStorage.setItem(FACE_KEY, 'registered') // remember choice
        speak('Access granted'); toast.success('Identity verified'); onVerified(); return
      }
      setMsg('PIN must be 4 digits')
      return
    }
    if (pin === stored) { speak('Access granted'); toast.success('Identity verified'); onVerified(); return }
    setMsg('Incorrect PIN')
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong glow-blue rounded-2xl w-full max-w-md p-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center mx-auto mb-4 glow-blue">
          <ScanFace className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-display text-xl font-bold mb-1">Identity Verification</h1>
        <p className="text-sm text-muted-foreground mb-6">Face ID / biometric or PIN required to open the Command Center.</p>

        {state === 'ready' && (
          <div className="space-y-3">
            {localStorage.getItem(FACE_KEY) ? (
              <Button onClick={doVerify} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-11">
                <ScanFace className="h-4 w-4 mr-2" /> Verify with Face ID
              </Button>
            ) : (
              <Button onClick={enableFaceId} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-11">
                <ScanFace className="h-4 w-4 mr-2" /> Enable Face ID
              </Button>
            )}
            <Button variant="outline" className="w-full border-white/10" onClick={() => { setState('pin'); setMsg('Enter your PIN') }}>
              Use PIN instead
            </Button>
          </div>
        )}

        {state === 'enabling' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <p className="text-sm text-muted-foreground">Unlock with Face ID to register…</p>
          </div>
        )}

        {state === 'pin' && (
          <div className="space-y-3">
            <Input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && doPin()} placeholder="••••" className="bg-secondary/50 border-white/10 font-code text-center text-2xl tracking-[0.5em]" />
            <Button onClick={doPin} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-11">
              <Fingerprint className="h-4 w-4 mr-2" /> {localStorage.getItem(FACE_PIN) ? 'Verify PIN' : 'Set PIN'}
            </Button>
            {isWebAuthnAvailable() && <Button variant="outline" className="w-full border-white/10" onClick={() => { setState('ready'); setMsg(localStorage.getItem(FACE_KEY) ? 'Face ID ready — tap to verify' : 'Enable Face ID to unlock') }}>Use Face ID</Button>}
          </div>
        )}

        {msg && <p className="text-xs text-amber-400 mt-4">{msg}</p>}
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-white mt-6 underline underline-offset-4">Skip for this session</button>
      </motion.div>
    </div>
  )
}

// Eyeball verification — visual confirmation before high-impact actions
function EyeballGate({ open, onConfirm, onCancel, title }) {
  const [checked, setChecked] = useState(false)
  const [hold, setHold] = useState(false)
  useEffect(() => { if (open) { setChecked(false); setHold(false) } }, [open])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="glass-strong border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><ScanEye className="h-5 w-5 text-emerald-400" /> Eyeball Verification</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">You are about to <span className="text-white font-medium">{title}</span>. This action is logged and cannot be undone without a manual revert.</p>
        <div className="glass rounded-lg p-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" />
            <span className="text-sm text-muted-foreground">I have <span className="text-white">eyeballed</span> the content on every platform tab and confirm it is accurate, on-brand, and ready to publish.</span>
          </label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldIcon className="h-3.5 w-3.5 text-emerald-400" /> This confirmation is recorded in the Audit Log.
          </div>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button onClick={onCancel} variant="outline" className="border-white/10 flex-1">Cancel</Button>
          <Button onClick={() => { if (checked) onConfirm() }} disabled={!checked} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
            <Check className="h-4 w-4 mr-1" /> Confirm & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================== SHARED UI
const StatusDot = ({ status }) => {
  const map = { connected: '#22C55E', expiring: '#F59E0B', expired: '#EF4444', disabled: '#6B7280' }
  return <span className="inline-block h-2.5 w-2.5 rounded-full animate-pulse-dot" style={{ background: map[status] || '#6B7280', boxShadow: `0 0 10px ${map[status] || '#6B7280'}` }} />
}

const Panel = ({ className = '', children }) => (
  <div className={`glass rounded-xl ${className}`}>{children}</div>
)

const ScoreRing = ({ value, size = 120, label }) => {
  const data = [{ v: value, fill: value >= 85 ? '#22C55E' : value >= 70 ? '#F59E0B' : '#EF4444' }]
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar background={{ fill: 'rgba(255,255,255,0.06)' }} dataKey="v" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-metric text-2xl font-bold">{value}</div>
          {label && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>}
        </div>
      </div>
    </div>
  )
}

const THINKING_STEPS = ['Understanding the image…', 'Matching content pillars…', 'Querying Brand Intelligence…', 'Generating editorial content…', 'Optimizing per platform + SEO…', 'Running quality + fact-check pass…']
function ThinkingOverlay({ step }) {
  return (
    <div className="glass-strong rounded-xl p-8 relative overflow-hidden scan-line">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display font-semibold">AI Engine working…</div>
          <div className="text-xs text-muted-foreground font-code">multi-provider fallback chain active</div>
        </div>
      </div>
      <div className="space-y-2.5">
        {THINKING_STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i <= step ? 'opacity-100' : 'opacity-30'}`}>
            {i < step ? <Check className="h-4 w-4 text-emerald-400" /> : i === step ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : <CircleDot className="h-4 w-4 text-muted-foreground" />}
            <span className={i === step ? 'text-white font-grotesk' : 'text-muted-foreground'}>{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 h-1 rounded-full overflow-hidden bg-white/5"><div className="h-full animate-shimmer" /></div>
    </div>
  )
}

const STATUS_STYLES = {
  'Pending Approval': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  Scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Skipped: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  Failed: 'bg-red-500/20 text-red-400 border-red-500/40',
  Draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  Pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Saved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Generated: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Ignored: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

// Shared approval action bar — the same spine for every module
function ActionBar({ job, onAct, onEdit, onRevert }) {
  const [eyeballOpen, setEyeballOpen] = useState(false)
  const pending = ['Pending Approval', 'Scheduled'].includes(job?.status)
  const doApprove = () => {
    if (job?.factcheck?.status === 'Blocked') { toast.error('Blocked by Fact-Check gate'); return }
    setEyeballOpen(true)
  }
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-t border-white/5 bg-secondary/20">
      <EyeballGate
        open={eyeballOpen}
        title="publish this content to all selected platforms"
        onCancel={() => setEyeballOpen(false)}
        onConfirm={() => { setEyeballOpen(false); onAct('approve') }}
      />
      {pending && (
        <>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={doApprove}><Check className="h-4 w-4 mr-1" /> Approve & Publish</Button>
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => onAct('regenerate')}><RefreshCw className="h-4 w-4 mr-1" /> Regenerate</Button>
          {onEdit && <Button size="sm" variant="outline" className="border-white/10" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>}
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => onAct('schedule')}><Clock className="h-4 w-4 mr-1" /> Schedule</Button>
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => onAct('skip')}><SkipForward className="h-4 w-4 mr-1" /> Skip</Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => onAct('reject')}><X className="h-4 w-4 mr-1" /> Reject</Button>
        </>
      )}
      {onRevert && (job?.versions?.length || 0) > 0 && (
        <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10" onClick={onRevert} title={`${job.versions.length} prior version(s) archived`}>
          <RefreshCw className="h-4 w-4 mr-1" /> Revert to v{job.versions.length}
        </Button>
      )}
      {!pending && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" /> {job?.status} · logged to source-of-truth + Audit_Log
          {job?.publishedAt ? ` · ${new Date(job.publishedAt).toLocaleString()}` : ''}
          {job?.sheetsSync && <span className="text-red-400" title={job.sheetsSync}> · Sheets sync FAILED</span>}
        </div>
      )}
    </div>
  )
}

const FactCheckBadge = ({ fc }) => {
  const color = fc?.status === 'Clean' ? 'border-emerald-500/30 text-emerald-400' : fc?.status === 'Blocked' ? 'border-red-500/40 text-red-400' : 'border-amber-500/30 text-amber-400'
  return <Badge variant="outline" className={color}><ShieldCheck className="h-3 w-3 mr-1" /> {fc?.status || '—'}{fc?.originalityScore ? ` ${fc.originalityScore}` : ''}</Badge>
}

// ================================================================== DASHBOARD
function DashboardView({ go }) {
  const [d, setD] = useState(null)
  useEffect(() => { api('/dashboard').then(setD).catch(() => {}) }, [])
  if (!d) return <Loading />
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const healthIcon = { Google: Globe, Discord: MessageCircle, GitHub: Github, Vercel: Triangle, LinkedIn: Linkedin, Meta: Facebook }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-code">{new Date().toDateString().toUpperCase()}</p>
          <h1 className="font-display text-3xl font-bold">{greet}, <span className="text-gradient">{d.greetingName}</span></h1>
        </div>
        <Button onClick={() => go('social')} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90"><Sparkles className="h-4 w-4 mr-2" /> New Post</Button>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Followers Today" value={`+${d.stats.followersToday}`} accent="#3B82F6" />
        <StatCard icon={Eye} label="Website Visits" value={d.stats.websiteVisits.toLocaleString()} accent="#8B5CF6" />
        <StatCard icon={Clock} label="Pending Approvals" value={d.stats.pending} accent="#F59E0B" onClick={() => go('social')} />
        <StatCard icon={Plug} label="Integrations Live" value={`${d.stats.connected}/${d.stats.integrations}`} accent="#22C55E" onClick={() => go('integrations')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* engagement chart */}
        <Panel className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Performance Trend</h3>
              <p className="text-xs text-muted-foreground">Reach · engagement · followers · last 14 days</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400"><TrendingUp className="h-3 w-3 mr-1" /> +18.4%</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.trend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} /><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Area type="monotone" dataKey="reach" stroke="#3B82F6" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="engagement" stroke="#8B5CF6" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        {/* brand health */}
        <Panel className="p-5 flex flex-col items-center justify-center text-center">
          <h3 className="font-display font-semibold mb-1">Brand Health Score</h3>
          <p className="text-xs text-muted-foreground mb-4">growth · engagement · consistency</p>
          <ScoreRing value={d.stats.brandHealth} size={160} label="/ 100" />
          <p className="text-xs text-muted-foreground mt-4">Combining reach growth, engagement quality and posting consistency.</p>
        </Panel>
      </div>

      {/* AI status + system health */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel className="p-5">
          <div className="flex items-center gap-2 mb-4"><Activity className="h-4 w-4 text-blue-400" /><h3 className="font-display font-semibold">System Status</h3></div>
          <div className="space-y-3 font-code text-xs">
            <StatusBar label="AI ENGINE" value={d.aiStatus} />
            <StatusBar label="APPROVAL QUEUE" value={92} />
            <StatusBar label="LEARNING ENGINE" value={88} />
          </div>
        </Panel>
        <Panel className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4"><Zap className="h-4 w-4 text-violet-400" /><h3 className="font-display font-semibold">System Health Strip</h3></div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {(d.systemHealth || []).map((h) => {
              const Ic = healthIcon[h.name] || Globe
              return (
                <div key={h.name} className="glass rounded-lg p-3 flex flex-col items-center gap-2">
                  <Ic className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{h.name}</span>
                  <StatusDot status={h.status} />
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* AI Coach */}
      <Panel className="p-5 glow-purple">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Brain className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="font-display font-semibold mb-1">AI Coach</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{d.aiCoach}</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
const StatCard = ({ icon: Ic, label, value, accent, onClick }) => (
  <motion.div whileHover={{ y: -3 }} onClick={onClick} className={`glass rounded-xl p-4 ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${accent}22` }}><Ic className="h-4 w-4" style={{ color: accent }} /></div>
    </div>
    <div className="font-metric text-2xl font-bold mt-2">{value}</div>
  </motion.div>
)
const StatusBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between mb-1"><span className="text-muted-foreground">{label}</span><span className="text-emerald-400">{value}% ONLINE</span></div>
    <div className="h-2 rounded-full bg-white/5 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" /></div>
  </div>
)

// ================================================================== SOCIAL AUTOMATION
function SocialView() {
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('image')
  const [selImg, setSelImg] = useState(DEMO_IMAGES[0])
  const [upload, setUpload] = useState(null)
  const [seed, setSeed] = useState('')
  const [plats, setPlats] = useState({ linkedin: true, instagram: true, facebook: true, threads: true })
  const [gen, setGen] = useState(false)
  const [step, setStep] = useState(0)
  const [job, setJob] = useState(null)
  const [ptab, setPtab] = useState('linkedin')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const fileRef = useRef()

  const load = useCallback(() => { api('/social').then((r) => setPosts(safeArr(r.posts))).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const selectedPlatforms = () => Object.keys(plats).filter((k) => plats[k])

  const generate = async () => {
    const sel = selectedPlatforms()
    if (!sel.length) return toast.error('Select at least one platform')
    setGen(true); setStep(0); setJob(null)
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 650)
    try {
      const payload = { platforms: sel }
      if (tab === 'image') { payload.imageUrl = upload?.dataUrl || selImg.url; payload.imageName = upload?.name || selImg.name; payload.seedText = upload ? '' : selImg.hint }
      else if (tab === 'fifo') { /* no source → backend picks the oldest unlocked Drive image (FIFO + lock) */ }
      else { payload.seedText = seed || 'A insight about AI and leadership' }
      const { job } = await api('/social/generate', { method: 'POST', body: JSON.stringify(payload) })
      setTimeout(() => {
        clearInterval(timer)
        setJob(job); setPtab(job.selectedPlatforms[0]); setGen(false)
        toast.success('Draft ready for approval', { description: `Quality ${job.quality.overall}/100 · ${job.providers.mode}` })
        load()
      }, 1200)
    } catch (err) { clearInterval(timer); setGen(false); toast.error('Generation failed', { description: err.message }) }
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => setUpload({ name: f.name, dataUrl: reader.result })
    reader.readAsDataURL(f)
  }

  const act = async (action, extra = {}) => {
    try {
      const { job: updated } = await api('/social/action', { method: 'POST', body: JSON.stringify({ id: job.id, action, ...extra }) })
      setJob(updated); load()
      const msgs = { approve: 'Published + source image archived (Drive MOVE)', reject: 'Draft rejected', skip: 'Skipped', schedule: 'Scheduled', regenerate: 'Regenerated', edit: 'Edit saved' }
      toast.success(msgs[action] || 'Done')
    } catch (err) { toast.error(err.message) }
  }

  const revert = async () => {
    try {
      const { job: updated } = await api('/revert', { method: 'POST', body: JSON.stringify({ module: 'social', id: job.id }) })
      setJob(updated); load(); toast.success('Reverted to previous version')
    } catch (err) { toast.error(err.message) }
  }

  const review = (p) => { setJob(p); setPtab((p.selectedPlatforms || ['linkedin'])[0]); setEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-blue-400" /> Social Automation</h1>
        <p className="text-sm text-muted-foreground">Image → AI Vision → platform-native posts → human approval → publish → archive → learn.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* composer */}
        <Panel className="lg:col-span-2 p-5 h-fit">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Wand2 className="h-4 w-4 text-violet-400" /> Compose</h3>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 w-full bg-secondary/50">
              <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Image</TabsTrigger>
              <TabsTrigger value="compose"><Pencil className="h-3.5 w-3.5 mr-1.5" /> Compose</TabsTrigger>
              <TabsTrigger value="fifo"><Layers className="h-3.5 w-3.5 mr-1.5" /> Drive FIFO</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Demo images (real Drive queue appears when Drive is connected).</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_IMAGES.map((im) => (
                  <button key={im.name} onClick={() => { setSelImg(im); setUpload(null) }}
                    className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${!upload && selImg.name === im.name ? 'border-blue-500 glow-blue' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={im.url} alt={im.hint} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <Button variant="outline" className="w-full border-white/10" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> {upload ? upload.name : 'Upload your own'}</Button>
            </TabsContent>
            <TabsContent value="compose" className="pt-4 space-y-3">
              <Label className="text-xs text-muted-foreground">One-line idea</Label>
              <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. How AI is reshaping HR hiring in 2025" className="bg-secondary/50 border-white/10 min-h-24" />
            </TabsContent>
            <TabsContent value="fifo" className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">Picks the <span className="text-blue-400">oldest unlocked image</span> from the Drive Source folder and locks it — nothing is reused, ever.</p>
              <div className="glass rounded-lg p-3 text-xs text-muted-foreground">FIFO → vision → posts → approval → publish → <span className="text-emerald-400">true MOVE to Archive</span>.</div>
            </TabsContent>
          </Tabs>

          <div className="mt-5">
            <Label className="text-xs text-muted-foreground mb-2 block">Target platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PLATFORM_META).map(([k, m]) => {
                const Ic = m.icon
                return (
                  <button key={k} onClick={() => setPlats((p) => ({ ...p, [k]: !p[k] }))}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${plats[k] ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 opacity-60'}`}>
                    <Ic className="h-4 w-4" style={{ color: m.color }} /> {m.label}
                    {plats[k] && <Check className="h-3.5 w-3.5 ml-auto text-blue-400" />}
                  </button>
                )
              })}
            </div>
          </div>
          <Button onClick={generate} disabled={gen} className="w-full mt-5 h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
            {gen ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Zap className="h-4 w-4 mr-2" /> Generate Multi-Platform Draft</>}
          </Button>
        </Panel>

        {/* review */}
        <div className="lg:col-span-3">
          {gen ? <ThinkingOverlay step={step} /> : job ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-5 border-b border-white/5">
                {job.imageUrl && <img src={job.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={STATUS_STYLES[job.status]}>{job.status}</Badge>
                    <Badge variant="outline" className="border-violet-500/30 text-violet-300">{job.analysis?.pillar}</Badge>
                    <Badge variant="outline" className="border-white/10 text-muted-foreground font-code text-[10px]">{job.providers?.mode}</Badge>
                  </div>
                  <h3 className="font-grotesk font-semibold mt-1.5 truncate">{job.imageName}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{job.analysis?.contentAngle} · {job.analysis?.mood}</p>
                </div>
                <div className="text-center shrink-0"><ScoreRing value={job.quality?.overall} size={72} /><span className="text-[10px] text-muted-foreground">QUALITY</span></div>
              </div>

              {/* quality + factcheck bar */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-white/5 text-xs">
                {['grammar', 'readability', 'originality', 'platformFit', 'brandVoice'].map((k) => (
                  <span key={k} className="text-muted-foreground">{k}: <span className="text-white font-metric">{job.quality?.[k]}</span></span>
                ))}
                <Badge variant="outline" className={`ml-auto ${job.factcheck?.status === 'Clean' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}><ShieldCheck className="h-3 w-3 mr-1" /> {job.factcheck?.status}</Badge>
              </div>

              {/* platform tabs */}
              <div className="p-5">
                <Tabs value={ptab} onValueChange={setPtab}>
                  <TabsList className="bg-secondary/50">
                    {(job.selectedPlatforms || []).map((p) => {
                      const Ic = PLATFORM_META[p].icon
                      return <TabsTrigger key={p} value={p}><Ic className="h-3.5 w-3.5 mr-1.5" style={{ color: PLATFORM_META[p].color }} />{PLATFORM_META[p].label}</TabsTrigger>
                    })}
                  </TabsList>
                  {(job.selectedPlatforms || []).map((p) => {
                    const c = job.platforms?.[p]
                    if (!c) return null
                    return (
                      <TabsContent key={p} value={p} className="pt-4">
                        {editing && ptab === p ? (
                          <div className="space-y-3">
                            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="bg-secondary/50 border-white/10 min-h-52 font-grotesk" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => { act('edit', { platforms: { ...job.platforms, [p]: { ...c, caption: draft } } }); setEditing(false) }} className="bg-emerald-600 hover:bg-emerald-500"><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                              <Button size="sm" variant="outline" className="border-white/10" onClick={() => setEditing(false)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="glass rounded-lg p-4 relative group">
                              <button onClick={() => { navigator.clipboard.writeText(c.caption); toast.success('Copied') }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition"><Copy className="h-4 w-4 text-muted-foreground" /></button>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed font-grotesk">{c.caption}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">{(c.hashtags || []).map((h) => <span key={h} className="text-xs text-blue-400">{h}</span>)}</div>
                            <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="glass rounded-lg p-3"><span className="text-white/70 font-medium">CTA:</span> {c.cta}</div>
                              <div className="glass rounded-lg p-3"><span className="text-white/70 font-medium">Alt text:</span> {c.altText}</div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </div>

              {/* action bar */}
              <ActionBar job={job} onAct={act} onRevert={revert}
                onEdit={() => { setDraft(job.platforms[ptab].caption); setEditing(true) }} />
            </motion.div>
          ) : (
            <div className="glass rounded-xl h-full grid place-items-center p-10 text-center">
              <div>
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 grid place-items-center mx-auto mb-3"><Sparkles className="h-7 w-7 text-blue-400" /></div>
                <p className="text-muted-foreground">Pick an image or compose an idea, then generate a multi-platform draft to review.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* queue */}
      <Panel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Content Queue <span className="text-muted-foreground font-normal text-sm">({posts.length})</span></h3>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 glass rounded-lg p-3 hover:bg-white/5 transition cursor-pointer" onClick={() => review(p)}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-md object-cover" /> : <div className="h-11 w-11 rounded-md bg-secondary grid place-items-center"><Pencil className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="font-grotesk text-sm truncate">{p.imageName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">{p.analysis?.pillar} · {(p.selectedPlatforms || []).length} platforms · Q{p.quality?.overall}</div>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[p.status]}>{p.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== INTEGRATIONS
const CAT_LABELS = { ai: 'AI Providers', research: 'Research & News', publishing: 'Publishing', google: 'Google Workspace', discord: 'Discord', email: 'Email', analytics: 'Analytics' }
function IntegrationsView() {
  const [data, setData] = useState(null)
  const [active, setActive] = useState(null)
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { api('/integrations').then(setData).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const open = (it) => { setActive(it); const f = {}; (it.fields || []).forEach((fd) => { f[fd.key] = fd.secret ? '' : (it.values[fd.key] || '') }); setForm(f) }
  const save = async () => {
    setBusy(true)
    try { await api('/integrations/save', { method: 'POST', body: JSON.stringify({ id: active.id, fields: form, enabled: true }) }); toast.success(`${active.name} saved (encrypted)`); setActive(null); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const test = async (id) => { toast.loading('Testing connection…', { id: 't' }); try { const r = await api('/integrations/test', { method: 'POST', body: JSON.stringify({ id }) }); r.ok ? toast.success('Connection OK', { id: 't', description: `${r.message} (${r.latencyMs}ms)` }) : toast.error('Test failed', { id: 't', description: r.message }); load() } catch (e) { toast.error(e.message, { id: 't' }) } }
  const disconnect = async (id) => { await api('/integrations/disconnect', { method: 'POST', body: JSON.stringify({ id }) }); toast.success('Disconnected'); setActive(null); load() }
  const toggle = async (it, enabled) => { await api('/integrations/save', { method: 'POST', body: JSON.stringify({ id: it.id, enabled }) }); load() }
  const setRole = async (it, role) => { await api('/integrations/role', { method: 'POST', body: JSON.stringify({ id: it.id, role, priority: it.priority }) }); toast.success(`${it.name} → ${role}`); load() }
  const oauthConnect = async () => {
    try {
      const provider = active.id === 'linkedin' ? 'linkedin' : 'meta'
      const r = await api(`/oauth/start?provider=${provider}`)
      window.open(r.url, '_blank')
      toast.info('OAuth flow opened in a new tab', { description: 'After authorizing you are returned here with tokens stored encrypted' })
    } catch (e) { toast.error(e.message) }
  }

  if (!data) return <Loading />
  const grouped = data.integrations.reduce((a, it) => { (a[it.category] = a[it.category] || []).push(it); return a }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Plug className="h-6 w-6 text-blue-400" /> Integrations & API Management</h1>
        <p className="text-sm text-muted-foreground">Connect, test, and manage every credential from here. Secrets are AES-256 encrypted at rest — never in code.</p>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-xs font-code tracking-widest text-muted-foreground mb-3">{(CAT_LABELS[cat] || cat).toUpperCase()}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <motion.div whileHover={{ y: -2 }} key={it.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={it.status} />
                    <span className="font-grotesk font-semibold">{it.name}</span>
                  </div>
                  <Switch checked={it.enabled} onCheckedChange={(v) => toggle(it, v)} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 min-h-8 line-clamp-2">{it.desc}</p>
                {it.chain && it.configured && (
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => setRole(it, 'primary')} className={`text-[10px] px-2 py-0.5 rounded-full border ${it.role === 'primary' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-white/10 text-muted-foreground'}`}>Primary</button>
                    <button onClick={() => setRole(it, 'fallback')} className={`text-[10px] px-2 py-0.5 rounded-full border ${it.role === 'fallback' ? 'border-violet-500 text-violet-400 bg-violet-500/10' : 'border-white/10 text-muted-foreground'}`}>Fallback</button>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-8" onClick={() => open(it)}>{it.configured ? 'Manage' : 'Connect'}</Button>
                  <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => test(it.id)}><Play className="h-3.5 w-3.5" /></Button>
                </div>
                {it.lastTestedAt && <p className="text-[10px] text-muted-foreground mt-2">Last test: <span className={it.lastTest === 'pass' ? 'text-emerald-400' : 'text-red-400'}>{it.lastTest}</span> · {it.lastLatencyMs}ms</p>}
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* dependency map */}
      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Layers className="h-4 w-4 text-violet-400" /> Automation Dependency Map</h3>
        <p className="text-xs text-muted-foreground mb-4">Which APIs each module depends on — a single failure shows its full blast radius.</p>
        <div className="space-y-2">
          {(data.dependencyMap || []).map((m) => (
            <div key={m.module} className="flex flex-wrap items-center gap-2 glass rounded-lg p-3">
              <span className="font-grotesk text-sm w-44 shrink-0">{m.module}</span>
              <div className="flex flex-wrap gap-1.5">
                {(m.apis || []).map((a) => {
                  const it = data.integrations.find((x) => x.id === a)
                  return <Badge key={a} variant="outline" className="border-white/10 text-[10px] gap-1"><StatusDot status={it?.status || 'disabled'} /> {it?.name || a}</Badge>
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="glass-strong border-white/10 max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Lock className="h-4 w-4 text-blue-400" /> {active?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">{active?.desc} · docs: <span className="text-blue-400">{active?.docs}</span></p>
          <div className="space-y-3 py-2">
            {(active?.fields || []).map((fd) => (
              <div key={fd.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{fd.label}{fd.secret && <Lock className="h-3 w-3 inline ml-1" />}</Label>
                {fd.textarea ? (
                  <Textarea value={form[fd.key] || ''} onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })} placeholder={fd.secret ? (active.values[fd.key] || 'Paste value') : ''} className="bg-secondary/50 border-white/10 font-code text-xs min-h-24" />
                ) : (
                  <Input type={fd.secret ? 'password' : 'text'} value={form[fd.key] || ''} onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })} placeholder={fd.secret ? (active.values[fd.key] || 'Enter secret') : ''} className="bg-secondary/50 border-white/10 font-code text-xs" />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Save</>}</Button>
              <Button variant="outline" className="border-white/10" onClick={() => test(active.id)}><Play className="h-4 w-4 mr-1" /> Test</Button>
              {['linkedin', 'facebook'].includes(active?.id) && (
                <Button variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10" onClick={oauthConnect}><ExternalLink className="h-4 w-4 mr-1" /> OAuth Connect</Button>
              )}
            </div>
            {active?.configured && <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => disconnect(active.id)}><Trash2 className="h-4 w-4 mr-1" /> Disconnect</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ================================================================== BRAND
function BrandView() {
  const [b, setB] = useState(null)
  useEffect(() => { api('/brand').then((r) => setB(r.brand)).catch(() => {}) }, [])
  const save = async () => { try { await api('/brand', { method: 'PUT', body: JSON.stringify({ brand: b }) }); toast.success('Brand Intelligence updated') } catch (e) { toast.error(e.message) } }
  if (!b) return <Loading />
  const arr = (k) => (b[k] || []).join(', ')
  const setArr = (k, v) => setB({ ...b, [k]: v.split(',').map((s) => s.trim()).filter(Boolean) })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-violet-400" /> Brand Intelligence Engine</h1>
          <p className="text-sm text-muted-foreground">The digital brain every module queries before writing a word. Seeded with defaults — edit freely.</p>
        </div>
        <Button onClick={save} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90"><Save className="h-4 w-4 mr-2" /> Save</Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5 space-y-4">
          <Field label="Creator name"><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Tagline"><Input value={b.tagline} onChange={(e) => setB({ ...b, tagline: e.target.value })} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Voice"><Textarea value={b.voice} onChange={(e) => setB({ ...b, voice: e.target.value })} className="bg-secondary/50 border-white/10 min-h-24" /></Field>
          <Field label="Sentence style"><Textarea value={b.sentenceStyle} onChange={(e) => setB({ ...b, sentenceStyle: e.target.value })} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="CTA style"><Input value={b.ctaStyle} onChange={(e) => setB({ ...b, ctaStyle: e.target.value })} className="bg-secondary/50 border-white/10" /></Field>
        </Panel>
        <Panel className="p-5 space-y-4">
          <Field label="Tone (comma separated)"><Input value={arr('tone')} onChange={(e) => setArr('tone', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Content pillars"><Input value={arr('pillars')} onChange={(e) => setArr('pillars', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Audience"><Input value={arr('audience')} onChange={(e) => setArr('audience', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Favorite words"><Input value={arr('favoriteWords')} onChange={(e) => setArr('favoriteWords', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Words to avoid"><Input value={arr('avoidWords')} onChange={(e) => setArr('avoidWords', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Base hashtags"><Input value={arr('hashtags')} onChange={(e) => setArr('hashtags', e.target.value)} className="bg-secondary/50 border-white/10" /></Field>
          <div className="flex gap-3">
            <Field label="Primary color"><div className="flex items-center gap-2"><input type="color" value={b.colors?.primary || '#3B82F6'} onChange={(e) => setB({ ...b, colors: { ...b.colors, primary: e.target.value } })} className="h-9 w-12 rounded bg-transparent" /><span className="font-code text-xs">{b.colors?.primary}</span></div></Field>
            <Field label="Secondary color"><div className="flex items-center gap-2"><input type="color" value={b.colors?.secondary || '#8B5CF6'} onChange={(e) => setB({ ...b, colors: { ...b.colors, secondary: e.target.value } })} className="h-9 w-12 rounded bg-transparent" /><span className="font-code text-xs">{b.colors?.secondary}</span></div></Field>
          </div>
        </Panel>
      </div>
    </div>
  )
}
const Field = ({ label, children }) => (<div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>)

// ================================================================== ANALYTICS
function AnalyticsView() {
  const [d, setD] = useState(null)
  useEffect(() => { api('/analytics').then(setD).catch(() => {}) }, [])
  if (!d) return <Loading />
  const pillarData = Object.entries(d.perPillar).map(([name, v]) => ({ name, v }))
  const platformData = Object.entries(d.perPlatform).map(([name, v]) => ({ name: name[0].toUpperCase() + name.slice(1), v }))
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-400" /> Analytics Intelligence</h1><p className="text-sm text-muted-foreground">Live numbers from published posts — numbers turned into next actions, not just charts.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Reach (all time)" value={d.totals.reach.toLocaleString()} accent="#3B82F6" />
        <StatCard icon={TrendingUp} label="Engagement Rate" value={`${d.totals.engagementRate}%`} accent="#8B5CF6" />
        <StatCard icon={Users} label="Followers Gained" value={`+${d.totals.followersGained.toLocaleString()}`} accent="#22C55E" />
        <StatCard icon={Send} label="Website Visits" value={d.totals.websiteVisits.toLocaleString()} accent="#F59E0B" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Published posts by Content Pillar</h3>
          {pillarData.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={pillarData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#3B82F6" /></BarChart></ResponsiveContainer>
          : <p className="text-sm text-muted-foreground py-16 text-center">No published posts yet.</p>}
        </Panel>
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Publishes by Platform</h3>
          {platformData.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={platformData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#8B5CF6" /></BarChart></ResponsiveContainer>
          : <p className="text-sm text-muted-foreground py-16 text-center">No published posts yet.</p>}
        </Panel>
      </div>
      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Reach trend — last 14 days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.timeline}>
            <defs><linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
            <RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
            <Area type="monotone" dataKey="reach" stroke="#3B82F6" fill="url(#ga1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
      <div className="grid sm:grid-cols-2 gap-4">
        {d.best && <Panel className="p-4 glow-blue"><div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-amber-400" /><h3 className="font-display font-semibold text-sm">Best performer</h3></div><p className="text-sm font-grotesk truncate">{d.best.title}</p><p className="text-xs text-muted-foreground mt-1">Quality {d.best.score}/100 · AI note: contrarian hooks + strong visual lead drove the engagement.</p></Panel>}
        {d.worst && <Panel className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-red-400" /><h3 className="font-display font-semibold text-sm">Needs attention</h3></div><p className="text-sm font-grotesk truncate">{d.worst.title}</p><p className="text-xs text-muted-foreground mt-1">Quality {d.worst.score}/100 · try a sharper hook and a specific CTA next time.</p></Panel>}
      </div>
      <Panel className="p-5 glow-purple"><div className="flex items-start gap-4"><div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Brain className="h-5 w-5 text-white" /></div><div><h3 className="font-display font-semibold mb-1">AI Coach — Why it happened</h3><p className="text-sm text-muted-foreground leading-relaxed">{d.aiCoach}</p></div></div></Panel>
      <p className="text-xs text-muted-foreground text-center">Reach figures are modeled from publish quality until platform APIs are connected in Integrations.</p>
    </div>
  )
}

// ================================================================== JARVIS VOICE ASSISTANT
// Real wake-word voice assistant using the Web Speech API.
// Listens for "Hey Jarvis" (or custom wake word), parses commands, executes
// them (navigate, generate, publish, schedule), and speaks responses.
function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  return SR ? new SR() : null
}
function speak(text, honorific = 'Boss') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${honorific}. ${text}`)
    u.rate = 1; u.pitch = 1
    window.speechSynthesis.speak(u)
  } catch {}
}

// Voice command engine — maps spoken phrases to app actions
function VoiceAssistant({ enabled, wakeWord, honorific, go, onStatus }) {
  const recRef = useRef(null)
  const listeningRef = useRef(false)
  const [heard, setHeard] = useState('')

  const handleCommand = (transcript) => {
    const t = transcript.toLowerCase()
    setHeard(transcript)
    // Wake word check
    const ww = (wakeWord || 'hey jarvis').toLowerCase()
    if (!t.includes(ww)) return
    const cmd = t.replace(ww, '').trim()
    const say = (msg) => speak(msg, honorific)

    if (!cmd) { say('How can I help you?'); return }

    // Navigation commands
    if (cmd.includes('dashboard') || cmd.includes('command center')) { go('dashboard'); say('Opening the command center.') }
    else if (cmd.includes('social') || cmd.includes('generate') || cmd.includes('post')) { go('social'); say('Opening social automation.') }
    else if (cmd.includes('blog') || cmd.includes('article')) { go('blog'); say('Opening the blog engine.') }
    else if (cmd.includes('news') || cmd.includes('radar')) { go('news'); say('Opening the news radar.') }
    else if (cmd.includes('analytics') || cmd.includes('performance')) { go('analytics'); say('Opening analytics.') }
    else if (cmd.includes('calendar') || cmd.includes('schedule')) { go('calendar'); say('Opening the content calendar.') }
    else if (cmd.includes('integrations') || cmd.includes('connections')) { go('integrations'); say('Opening integrations.') }
    else if (cmd.includes('newsletter') || cmd.includes('email')) { go('newsletter'); say('Opening the newsletter.') }
    else if (cmd.includes('audit') || cmd.includes('log')) { go('audit'); say('Opening the audit log.') }
    else if (cmd.includes('autopilot') || cmd.includes('auto pilot')) { go('autopilot'); say('Opening auto pilot.') }
    else if (cmd.includes('learning')) { go('learning'); say('Opening the learning engine.') }
    else if (cmd.includes('mission')) { go('mission_control'); say('Opening mission control.') }
    else if (cmd.includes('vault') || cmd.includes('idea')) { go('idea_vault'); say('Opening the idea vault.') }
    else if (cmd.includes('repurpose')) { go('repurposing'); say('Opening the repurposing engine.') }
    else if (cmd.includes('seasonal')) { go('seasonal'); say('Opening seasonal campaigns.') }
    else if (cmd.includes('portfolio')) { go('portfolio'); say('Opening portfolio sync.') }
    else if (cmd.includes('recruiter')) { go('recruiter'); say('Opening recruiter signal.') }
    else if (cmd.includes('versions') || cmd.includes('history')) { go('versions'); say('Opening version history.') }
    else if (cmd.includes('discord')) { go('discord'); say('Opening the discord hub.') }
    else if (cmd.includes('cost') || cmd.includes('budget')) { go('ai_cost'); say('Opening the AI cost dashboard.') }
    else if (cmd.includes('fact') || cmd.includes('check')) { go('factcheck'); say('Opening the fact check pass.') }
    else if (cmd.includes('brand')) { go('brand'); say('Opening brand intelligence.') }
    else if (cmd.includes('engage') || cmd.includes('comment')) { go('linkedin_engage'); say('Opening LinkedIn engagement.') }
    else if (cmd.includes('assistant') || cmd.includes('jarvis')) { go('assistant'); say('I am here, ' + honorific + '.') }
    // Action commands
    else if (cmd.includes('publish') || cmd.includes('approve')) { go('social'); say('Opening pending approvals for you to review.') }
    else if (cmd.includes('turn off') || cmd.includes('stop listening')) { onStatus && onStatus(false); say('Voice commands turned off.') }
    else if (cmd.includes('hello') || cmd.includes('hi ') || cmd.includes('hey')) { say('Hello! I am ready to help.') }
    else { say('I heard you, but I did not understand that command. Try saying, open social, or open analytics.') }
  }

  useEffect(() => {
    if (!enabled) { if (recRef.current) { try { recRef.current.stop() } catch {} } return }
    const rec = getSpeechRecognition()
    if (!rec) { onStatus && onStatus(false); return }
    recRef.current = rec
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-IN'
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        handleCommand(t)
      }
    }
    rec.onerror = (e) => { if (e.error === 'not-allowed') { onStatus && onStatus(false) } }
    rec.onend = () => { if (enabled && listeningRef.current) { try { rec.start() } catch {} } }
    try { rec.start(); listeningRef.current = true } catch {}
    return () => { listeningRef.current = false; try { rec.stop() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, wakeWord, honorific])

  return null
}

// ================================================================== JARVIS / PWA
function AssistantView({ voiceEnabled, setVoiceEnabled, wakeWord, setWakeWord, honorific, setHonorific }) {
  const [a, setA] = useState(null)
  useEffect(() => { api('/assistant').then((r) => { setA(r.assistant); if (r.assistant?.wakeWord) setWakeWord(r.assistant.wakeWord); if (r.assistant?.honorific) setHonorific(r.assistant.honorific); if (r.assistant?.voiceEnabled !== undefined) setVoiceEnabled(r.assistant.voiceEnabled) }).catch(() => {}) }, [])
  const update = async (patch) => { const next = { ...a, ...patch }; setA(next); await api('/assistant', { method: 'PUT', body: JSON.stringify({ assistant: next }) }); toast.success(patch.voiceEnabled === false ? 'Voice commands off, Boss.' : patch.voiceEnabled === true ? 'Voice commands back on, Boss.' : 'Saved') }
  if (!a) return <Loading />
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6 text-violet-400" /> Jarvis Voice Mode & Mobile PWA</h1><p className="text-sm text-muted-foreground">Phone-first control center: face-gate on open, wake word, one-tap approvals, standing greeting.</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5 space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Mic className="h-4 w-4 text-blue-400" /> Assistant Config</h3>
          <Field label="Wake word"><Input value={wakeWord} onChange={(e) => setWakeWord(e.target.value)} onBlur={() => update({ wakeWord })} className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Honorific"><Input value={honorific} onChange={(e) => setHonorific(e.target.value)} onBlur={() => update({ honorific })} className="bg-secondary/50 border-white/10" /></Field>
          <div className="flex items-center justify-between glass rounded-lg p-4">
            <div><div className="font-grotesk text-sm">Voice commands</div><div className="text-xs text-muted-foreground">Self-toggling wake-word listener</div></div>
            <Switch checked={voiceEnabled} onCheckedChange={(v) => { setVoiceEnabled(v); update({ voiceEnabled: v }) }} />
          </div>
          <div className="glass rounded-lg p-4 text-sm"><span className="text-muted-foreground">Standing greeting preview: </span><span className="text-gradient font-grotesk">"Good morning, {honorific}."</span></div>
          <div className={`glass rounded-lg p-3 text-xs ${voiceEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {voiceEnabled ? '● Listening for "' + wakeWord + '" — say it then a command' : 'Voice listener is off. Toggle it on to enable.'}
          </div>
        </Panel>
        <Panel className="p-5 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2"><Fingerprint className="h-4 w-4 text-emerald-400" /> Security Gates</h3>
          {[['Face ID / biometric on every app open', true], ['PIN / password fallback', true], ['2FA (TOTP) for high-impact actions', true], ['Re-confirm publish / delete / credential change', true], ['Session auto-expire on inactivity', true], ['Audit log on every critical action', true]].map(([t, on]) => (
            <div key={t} className="flex items-center gap-3 text-sm"><ShieldCheck className={`h-4 w-4 ${on ? 'text-emerald-400' : 'text-muted-foreground'}`} /> <span className="text-muted-foreground">{t}</span></div>
          ))}
          <div className="pt-2 text-xs text-muted-foreground">Google Sign-In, WebAuthn biometrics and TOTP activate on your production HTTPS domain. Wake-word + push notifications initialize when the PWA is installed to your home screen.</div>
        </Panel>
      </div>
      <Panel className="p-5"><h3 className="font-display font-semibold mb-3">Voice Commands</h3><div className="grid sm:grid-cols-2 gap-2">{['"Hey Jarvis, open social"', '"Hey Jarvis, open analytics"', '"Hey Jarvis, open the blog engine"', '"Hey Jarvis, open news radar"', '"Hey Jarvis, open calendar"', '"Hey Jarvis, turn off voice commands"'].map((c) => <div key={c} className="glass rounded-lg px-3 py-2 text-sm text-muted-foreground font-grotesk">{c}</div>)}</div></Panel>
    </div>
  )
}

// ================================================================== AUDIT
function AuditView() {
  const [logs, setLogs] = useState([])
  useEffect(() => { api('/audit').then((r) => setLogs(safeArr(r.logs))).catch(() => {}) }, [])
  const icons = { 'auth.login': Fingerprint, 'social.publish': Send, 'social.generate': Sparkles, 'integration.save': Save, 'integration.test': Play, 'brand.update': Brain }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-blue-400" /> Audit Log</h1><p className="text-sm text-muted-foreground">Full who/what/when trail of every critical action.</p></div>
      <Panel className="p-2">
        {logs.map((l) => { const Ic = icons[l.action] || CircleDot; return (
          <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0">
            <div className="h-8 w-8 rounded-lg bg-secondary grid place-items-center shrink-0"><Ic className="h-4 w-4 text-blue-400" /></div>
            <span className="font-code text-xs text-white/80 w-44 shrink-0">{l.action}</span>
            <span className="text-xs text-muted-foreground flex-1 truncate">{JSON.stringify(l.meta)}</span>
            <span className="text-xs text-muted-foreground">{l.actor}</span>
            <span className="text-[10px] text-muted-foreground font-code hidden sm:inline">{new Date(l.ts).toLocaleString()}</span>
          </div>
        )})}
        {!logs.length && <p className="text-sm text-muted-foreground p-4 text-center">No activity yet.</p>}
      </Panel>
    </div>
  )
}

// ================================================================== BLOG ENGINE
function BlogView() {
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('image')
  const [selImg, setSelImg] = useState(DEMO_IMAGES[0])
  const [seed, setSeed] = useState('')
  const [gen, setGen] = useState(false)
  const [step, setStep] = useState(0)
  const [job, setJob] = useState(null)
  const [pview, setPview] = useState('article')
  const [reviewing, setReviewing] = useState(null)

  const load = useCallback(() => { api('/blog').then((r) => setPosts(safeArr(r.posts))).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGen(true); setStep(0); setJob(null)
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 650)
    try {
      const payload = tab === 'image' ? { imageUrl: selImg.url, imageName: selImg.name, seedText: selImg.hint } : { seedText: seed || 'How AI is reshaping hiring and HR' }
      const { job: j } = await api('/blog/generate', { method: 'POST', body: JSON.stringify(payload) })
      setTimeout(() => { clearInterval(timer); setJob(j); setPview('article'); setGen(false); toast.success('Article + content ecosystem ready', { description: `SEO ${j.seo.seoScore}/100 · Readability ${j.seo.readabilityScore}/100` }); load() }, 1200)
    } catch (e) { clearInterval(timer); setGen(false); toast.error(e.message) }
  }

  const act = async (action) => {
    try {
      const { job: updated } = await api('/blog/action', { method: 'POST', body: JSON.stringify({ id: job.id, action }) })
      setJob(updated); load()
      toast.success(action === 'approve' ? 'Published + URL captured + image archived' : 'Done')
    } catch (e) { toast.error(e.message) }
  }

  const review = (p) => { setJob(p); setPview('article'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const a = job?.article
  const eco = job?.ecosystem || {}

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-blue-400" /> Blog Engine</h1><p className="text-sm text-muted-foreground">Image or idea → full SEO article + a 6-asset content ecosystem → approval → publish → archive → learn.</p></div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Panel className="lg:col-span-2 p-5 h-fit">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Wand2 className="h-4 w-4 text-violet-400" /> Compose article</h3>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full bg-secondary/50">
              <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5 mr-1.5" /> From Image</TabsTrigger>
              <TabsTrigger value="compose"><Pencil className="h-3.5 w-3.5 mr-1.5" /> Topic Seed</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {DEMO_IMAGES.slice(0, 3).map((im) => (
                  <button key={im.name} onClick={() => setSelImg(im)} className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${selImg.name === im.name ? 'border-blue-500 glow-blue' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={im.url} alt={im.hint} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="compose" className="pt-4">
              <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. Why analytics teams fail and how to fix them" className="bg-secondary/50 border-white/10 min-h-24" />
            </TabsContent>
          </Tabs>
          <Button onClick={generate} disabled={gen} className="w-full mt-5 h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
            {gen ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing…</> : <><Zap className="h-4 w-4 mr-2" /> Generate Article + Ecosystem</>}
          </Button>
        </Panel>

        <div className="lg:col-span-3 space-y-4">
          {gen ? <ThinkingOverlay step={step} /> : job ? (
            <Panel className="overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-start gap-3 flex-wrap">
                  {job.imageUrl && <img src={job.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={STATUS_STYLES[job.status]}>{job.status}</Badge>
                      <Badge variant="outline" className="border-violet-500/30 text-violet-300">{job.analysis?.pillar}</Badge>
                      <Badge variant="outline" className="border-white/10 text-muted-foreground font-code text-[10px]">{job.providers?.mode}</Badge>
                      <FactCheckBadge fc={job.factcheck} />
                    </div>
                    <h3 className="font-display text-lg font-bold leading-snug">{a?.title}</h3>
                    <p className="text-xs text-muted-foreground font-code mt-1">/{a?.slug} · {a?.wordCount} words · {a?.readingTime} min read</p>
                    {job.publishedUrl && <p className="text-xs text-blue-400 font-code mt-1">{job.publishedUrl}</p>}
                  </div>
                  <div className="flex gap-3">
                    <div className="text-center"><ScoreRing value={job.seo?.seoScore} size={64} /><span className="text-[10px] text-muted-foreground">SEO</span></div>
                    <div className="text-center"><ScoreRing value={job.seo?.readabilityScore} size={64} /><span className="text-[10px] text-muted-foreground">READ</span></div>
                  </div>
                </div>
                <Tabs value={pview} onValueChange={setPview}>
                  <TabsList className="bg-secondary/50 flex-wrap h-auto">
                    <TabsTrigger value="article">Article</TabsTrigger>
                    {['linkedin', 'instagram', 'facebook', 'threads', 'newsletter'].map((k) => <TabsTrigger key={k} value={k}>{PLATFORM_META[k]?.label || 'Newsletter'}</TabsTrigger>)}
                  </TabsList>
                  <TabsContent value="article" className="pt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{a?.metaDescription}</p>
                    <div className="glass rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-grotesk">{a?.intro}</div>
                    {a?.sections?.map((s, i) => (
                      <div key={i} className="glass rounded-lg p-4">
                        <h4 className="font-grotesk font-semibold mb-2">{s.h2}</h4>
                        {s.body.map((b, j) => <p key={j} className="text-sm text-muted-foreground leading-relaxed mb-2 whitespace-pre-wrap">{b}</p>)}
                      </div>
                    ))}
                    <div className="glass rounded-lg p-4">
                      <h4 className="font-grotesk font-semibold mb-2">Key takeaways</h4>
                      {a?.takeaways?.map((t, i) => <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground mb-1.5"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />{t}</div>)}
                    </div>
                    <div className="glass rounded-lg p-4">
                      <h4 className="font-grotesk font-semibold mb-1">Conclusion</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a?.conclusion}</p>
                      <p className="text-sm text-blue-400 mt-2 whitespace-pre-wrap">CTA: {a?.cta}</p>
                    </div>
                    <div className="glass rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                      <div><span className="text-white/70">Primary keyword:</span> {job.seo?.primaryKeyword}</div>
                      <div><span className="text-white/70">Secondary:</span> {(job.seo?.secondaryKeywords || []).join(', ')}</div>
                      <div className="pt-2"><span className="text-white/70">FAQ:</span></div>
                      {job.seo?.faq?.map((f, i) => <div key={i} className="pt-1"><p className="text-white/80 font-grotesk">{f.q}</p><p>{f.a}</p></div>)}
                      <div className="pt-2"><span className="text-white/70">Schema markup:</span> <span className="font-code">jsonld attached on publish</span></div>
                    </div>
                  </TabsContent>
                  {['linkedin', 'instagram', 'facebook', 'threads', 'newsletter'].map((k) => (
                    <TabsContent key={k} value={k} className="pt-4 space-y-3">
                      {k === 'newsletter' ? (
                        <div className="space-y-3">
                          <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">SUBJECT</div><p className="font-grotesk font-semibold mt-1">{eco.newsletter?.subject}</p></div>
                          <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">PREVIEW</div><p className="text-sm mt-1">{eco.newsletter?.preview}</p></div>
                          <div className="glass rounded-lg p-4"><div className="text-xs text-muted-foreground">BODY (HTML)</div><p className="text-sm text-muted-foreground mt-1 line-clamp-6 whitespace-pre-wrap">{eco.newsletter?.body}</p></div>
                        </div>
                      ) : (
                        <>
                          <div className="glass rounded-lg p-4"><p className="whitespace-pre-wrap text-sm leading-relaxed font-grotesk">{eco[k]?.caption}</p></div>
                          <div className="flex flex-wrap gap-1.5">{(eco[k]?.hashtags || []).map((h) => <span key={h} className="text-xs text-blue-400">{h}</span>)}</div>
                          <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="glass rounded-lg p-3"><span className="text-white/70 font-medium">CTA:</span> {eco[k]?.cta}</div>
                            <div className="glass rounded-lg p-3"><span className="text-white/70 font-medium">Alt text:</span> {eco[k]?.altText}</div>
                          </div>
                        </>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              <ActionBar job={job} onAct={act} />
            </Panel>
          ) : (
            <div className="glass rounded-xl h-full grid place-items-center p-10 text-center">
              <div>
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 grid place-items-center mx-auto mb-3"><BookOpen className="h-7 w-7 text-blue-400" /></div>
                <p className="text-muted-foreground">Generate an article — you'll get the full SEO piece plus LinkedIn, IG, FB, Threads and Newsletter versions to approve.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Panel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Articles <span className="text-muted-foreground font-normal text-sm">({posts.length})</span></h3>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 glass rounded-lg p-3 hover:bg-white/5 transition cursor-pointer" onClick={() => review(p)}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-md object-cover" /> : <div className="h-11 w-11 rounded-md bg-secondary grid place-items-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="font-grotesk text-sm truncate">{p.article?.title}</div>
                <div className="text-xs text-muted-foreground">{p.article?.readingTime} min · SEO {p.seo?.seoScore} · {Object.keys(p.ecosystem || {}).length} eco-assets</div>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[p.status]}>{p.status}</Badge>
            </div>
          ))}
          {!posts.length && <p className="text-sm text-muted-foreground py-6 text-center">No articles yet. Generate your first one.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== NEWS RADAR
function NewsView({ go }) {
  const [items, setItems] = useState([])
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState('All')
  const [cfg, setCfg] = useState(null)
  const [showCfg, setShowCfg] = useState(false)

  const load = useCallback(() => { api('/news').then((r) => setItems(safeArr(r.items))).catch(() => {}) }, [])
  const loadCfg = useCallback(() => api('/news/config').then((r) => setCfg(r.config)).catch(() => {}), [])
  useEffect(() => { load(); loadCfg() }, [load, loadCfg])

  const saveCfg = async () => {
    try { await api('/news/config', { method: 'PUT', body: JSON.stringify({ config: cfg }) }); toast.success('News Radar config saved'); setShowCfg(false) }
    catch (e) { toast.error(e.message) }
  }

  const scan = async () => {
    setScanning(true)
    try {
      const r = await api('/news/scan', { method: 'POST' })
      toast.success('Scan complete', { description: `${r.scanned} new articles checked · ${r.kept} above threshold` })
      load()
    } catch (e) { toast.error(e.message) } finally { setScanning(false) }
  }

  const action = async (id, a) => {
    try {
      await api('/news/action', { method: 'POST', body: JSON.stringify({ id, action: a }) })
      if (a === 'generate_social') { toast.success('Seeded into Social pipeline'); load(); go('social') }
      else if (a === 'generate_blog') { toast.success('Seeded into Blog pipeline'); load(); go('blog') }
      else if (a === 'generate_all') { toast.success('Seeded into Social + Blog pipelines'); load() }
      else { toast.success(a === 'ignore' ? 'Ignored' : 'Saved'); load() }
    } catch (e) { toast.error(e.message) }
  }

  const filtered = items.filter((i) => filter === 'All' || i.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Radar className="h-6 w-6 text-blue-400" /> News Radar</h1><p className="text-sm text-muted-foreground">An opportunity detector, not a news reader — Google News + RSS → AI scoring → route to pipelines.</p></div>
        <Button onClick={scan} disabled={scanning} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
          {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning feeds…</> : <><Radar className="h-4 w-4 mr-2" /> Scan for opportunities</>}
        </Button>
        <Button variant="outline" className="border-white/10" onClick={() => setShowCfg(v => !v)}><Settings2 className="h-4 w-4 mr-2" /> Configure</Button>
      </div>

      {showCfg && cfg && (
        <Panel className="p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-blue-400" /> News Radar Config</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-xs text-muted-foreground">Scan interval (min)
              <input type="number" value={cfg.intervalMinutes ?? 60} onChange={(e) => setCfg({ ...cfg, intervalMinutes: Number(e.target.value) })} className="w-full mt-1 bg-secondary/50 border border-white/10 rounded-md px-2 py-1.5 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">Quality threshold
              <input type="number" value={cfg.qualityThreshold ?? 55} onChange={(e) => setCfg({ ...cfg, qualityThreshold: Number(e.target.value) })} className="w-full mt-1 bg-secondary/50 border border-white/10 rounded-md px-2 py-1.5 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">Max age (hours)
              <input type="number" value={cfg.maxAgeHours ?? 48} onChange={(e) => setCfg({ ...cfg, maxAgeHours: Number(e.target.value) })} className="w-full mt-1 bg-secondary/50 border border-white/10 rounded-md px-2 py-1.5 text-sm text-foreground" />
            </label>
            <div className="text-xs text-muted-foreground">Approval required
              <label className="flex items-center gap-2 mt-2 text-sm text-foreground"><input type="checkbox" checked={cfg.approvalRequired !== false} onChange={(e) => setCfg({ ...cfg, approvalRequired: e.target.checked })} className="accent-blue-500" /> Nothing generates w/o approval</label>
            </div>
          </div>
          <label className="text-xs text-muted-foreground block">Sources (RSS urls or keyword searches, one per line — 'Google News' is built-in)
            <textarea rows={2} value={safeArr(cfg.sources).join('\n')} onChange={(e) => setCfg({ ...cfg, sources: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} className="w-full mt-1 bg-secondary/50 border border-white/10 rounded-md px-2 py-1.5 text-sm text-foreground" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={saveCfg}><Check className="h-3.5 w-3.5 mr-1" /> Save config</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCfg(false)}>Cancel</Button>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
        {['All', 'Pending', 'Saved', 'Generated', 'Ignored'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === f ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-white/10 text-muted-foreground'}`}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((it) => (
          <Panel key={it.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">{it.pillar}</Badge>
              <Badge variant="outline" className={STATUS_STYLES[it.status] || 'border-white/10 text-muted-foreground'}>{it.status}</Badge>
              <span className="text-xs text-muted-foreground">{it.source}</span>
              {it.itemPublishedAt && <span className="text-[10px] text-muted-foreground font-code">{it.itemPublishedAt}</span>}
            </div>
            <a href={it.link} target="_blank" rel="noreferrer" className="font-grotesk font-semibold hover:text-blue-400 transition flex items-start gap-1">{it.headline}<ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" /></a>
            {it.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description}</p>}
            {it.recommendation?.worthCreating && (
              <p className="text-[11px] text-blue-300/90 mt-1.5 line-clamp-2">🧠 {it.recommendation.whyItMatters}</p>
            )}
            {it.recommendation?.contentAngle && (
              <p className="text-[11px] text-violet-300/90 mt-0.5 line-clamp-2">🎯 {it.recommendation.contentAngle}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
              <span className="text-muted-foreground font-code">Relevance {it.score?.relevance}</span>
              <span className="text-muted-foreground font-code">Trend {it.score?.trendScore}</span>
              <span className="text-muted-foreground font-code">Virality {it.score?.virality}</span>
              <span className="text-muted-foreground font-code">SEO {it.score?.seoOpportunity}</span>
              <span className="text-muted-foreground font-code">Audience {it.score?.audienceMatch}</span>
              <span className="text-muted-foreground font-code">Educational {it.score?.educationalValue}</span>
              <span className="text-muted-foreground font-code">Brand {it.score?.brandMatch}</span>
              <span className="font-metric text-blue-400">Score {it.score?.overall}</span>
              {it.bestFormat && <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400">Best: {it.bestFormat}</span>}
              <div className="flex gap-1 ml-auto">{it.score?.formats?.map((f) => <span key={f} className="px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">{f}</span>)}</div>
            </div>
            {it.status === 'Pending' && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 h-8" onClick={() => action(it.id, 'generate_social')}><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Social</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 h-8" onClick={() => action(it.id, 'generate_blog')}><FileText className="h-3.5 w-3.5 mr-1" /> Generate Blog</Button>
                <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => action(it.id, 'generate_all')}><Layers className="h-3.5 w-3.5 mr-1" /> Generate All</Button>
                <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => action(it.id, 'save')}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" className="border-white/10 h-8 text-muted-foreground" onClick={() => action(it.id, 'ignore')}><X className="h-3.5 w-3.5 mr-1" /> Ignore</Button>
              </div>
            )}
          </Panel>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-10 text-center">Nothing here yet — hit Scan to watch the feeds. Sources: Google News (AI, Analytics, HR, Leadership, MBA, Startups) + your custom RSS list in Integrations.</p>}
      </div>
    </div>
  )
}

// ================================================================== SEASONAL CAMPAIGNS
function SeasonalView() {
  const [events, setEvents] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [sel, setSel] = useState(null)
  const [ptab, setPtab] = useState('linkedin')
  const [scanning, setScanning] = useState(false)
  const [newEv, setNewEv] = useState({ name: '', d: '', cat: 'Custom', imp: 3 })

  const load = useCallback(() => {
    api('/seasonal/calendar').then((r) => setEvents(r.events)).catch(() => {})
    api('/seasonal').then((r) => setCampaigns(safeArr(r.campaigns))).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const scan = async () => {
    setScanning(true)
    try { const r = await api('/seasonal/scan', { method: 'POST' }); toast.success(`${r.made} campaign(s) planned`, { description: 'Content generated — approve before publish' }); load() }
    catch (e) { toast.error(e.message) } finally { setScanning(false) }
  }
  const act = async (action) => {
    try { const { job } = await api('/seasonal/action', { method: 'POST', body: JSON.stringify({ id: sel.id, action }) }); setSel(job); load(); toast.success('Done') }
    catch (e) { toast.error(e.message) }
  }
  const addEvent = async () => {
    if (!newEv.name || !newEv.d) return toast.error('Name + MM-DD date required')
    await api('/seasonal/event', { method: 'POST', body: JSON.stringify(newEv) })
    setNewEv({ name: '', d: '', cat: 'Custom', imp: 3 }); load(); toast.success('Event added to calendar')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-blue-400" /> Seasonal Campaign Engine</h1><p className="text-sm text-muted-foreground">International days · Indian festivals · business events — planned before the world starts posting.</p></div>
        <Button onClick={scan} disabled={scanning} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
          {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Planning…</> : <><CalendarDays className="h-4 w-4 mr-2" /> Scan next 14 days</>}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Upcoming events</h3>
          <div className="space-y-2">
            {events.filter((e) => e.daysAway <= 14).slice(0, 8).map((e) => (
              <div key={`${e.d}-${e.name}`} className="flex items-center gap-3 glass rounded-lg p-3 text-sm">
                <span className="font-code text-blue-400 w-12 shrink-0">D-{e.daysAway}</span>
                <span className="text-muted-foreground text-xs w-16 shrink-0">{e.nextDate}</span>
                <span className="font-grotesk flex-1 truncate">{e.name}</span>
                <Badge variant="outline" className="border-white/10 text-[10px]">{e.cat}</Badge>
                <span className="text-[10px] font-code text-muted-foreground">imp {e.imp}</span>
              </div>
            ))}
            {!events.filter((e) => e.daysAway <= 14).length && <p className="text-xs text-muted-foreground py-4 text-center">No qualifying events in the next 14 days.</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex gap-2">
              <Input value={newEv.name} onChange={(e) => setNewEv({ ...newEv, name: e.target.value })} placeholder="Event name" className="bg-secondary/50 border-white/10 text-sm flex-1" />
              <Input value={newEv.d} onChange={(e) => setNewEv({ ...newEv, d: e.target.value })} placeholder="MM-DD" className="bg-secondary/50 border-white/10 text-sm w-24 font-code" />
            </div>
            <Button size="sm" variant="outline" className="border-white/10" onClick={addEvent}><Plus className="h-3.5 w-3.5 mr-1" /> Add custom event</Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Rocket className="h-4 w-4 text-violet-400" /> Campaigns ({campaigns.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {campaigns.map((c) => (
              <div key={c.id} className={`glass rounded-lg p-3 cursor-pointer transition ${sel?.id === c.id ? 'ring-1 ring-blue-500/50' : 'hover:bg-white/5'}`} onClick={() => { setSel(c); setPtab('linkedin') }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-grotesk text-sm flex-1 truncate">{c.eventName}</span>
                  <span className="text-[10px] text-muted-foreground font-code">{c.eventDate}</span>
                  <Badge variant="outline" className={STATUS_STYLES[c.status]}>{c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.objective}</div>
              </div>
            ))}
            {!campaigns.length && <p className="text-xs text-muted-foreground py-6 text-center">No campaigns yet — run the scan.</p>}
          </div>
        </Panel>
      </div>

      {sel && (
        <Panel className="overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={STATUS_STYLES[sel.status]}>{sel.status}</Badge>
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">{sel.pillar}</Badge>
              <FactCheckBadge fc={sel.factcheck} />
              <span className="text-xs text-muted-foreground ml-auto">{sel.eventDate} · D-{sel.daysAway}</span>
            </div>
            <h3 className="font-display text-lg font-bold">{sel.eventName}</h3>
            <p className="text-sm text-muted-foreground mt-1">{sel.objective} · {sel.audience}</p>
            {sel.note && <p className="text-xs text-amber-400 mt-1">Note: {sel.note}</p>}
            <Tabs value={ptab} onValueChange={setPtab}>
              <TabsList className="bg-secondary/50 mt-3">
                {sel.platforms.map((p) => { const Ic = PLATFORM_META[p].icon; return <TabsTrigger key={p} value={p}><Ic className="h-3.5 w-3.5 mr-1.5" style={{ color: PLATFORM_META[p].color }} />{PLATFORM_META[p].label}</TabsTrigger> })}
              </TabsList>
              {sel.platforms.map((p) => (
                <TabsContent key={p} value={p} className="pt-4">
                  <div className="glass rounded-lg p-4"><p className="whitespace-pre-wrap text-sm leading-relaxed font-grotesk">{sel.content?.[p]?.caption}</p></div>
                  <div className="flex flex-wrap gap-1.5 mt-3">{(sel.content?.[p]?.hashtags || []).map((h) => <span key={h} className="text-xs text-blue-400">{h}</span>)}</div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <ActionBar job={sel} onAct={act} />
        </Panel>
      )}
    </div>
  )
}

// ================================================================== IDEA VAULT
function VaultView({ go }) {
  const [ideas, setIdeas] = useState([])
  const [text, setText] = useState('')
  const [clustering, setClustering] = useState(false)

  const load = useCallback(() => { api('/vault').then((r) => setIdeas(r.ideas)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const capture = async () => {
    if (!text.trim()) return toast.error('Type an idea first')
    await api('/vault', { method: 'POST', body: JSON.stringify({ text, source: 'web' }) })
    setText(''); load(); toast.success('Idea captured')
  }
  const cluster = async () => {
    setClustering(true)
    try { const r = await api('/vault/cluster', { method: 'POST' }); toast.success(`Clustering pass complete — ${r.processed} idea(s) processed`); load() }
    catch (e) { toast.error(e.message) } finally { setClustering(false) }
  }
  const promote = async (id, pipeline) => {
    try {
      await api('/vault/promote', { method: 'POST', body: JSON.stringify({ id, pipeline }) })
      toast.success(`Promoted to ${pipeline === 'blog' ? 'Blog' : 'Social'} pipeline`)
      load(); go(pipeline === 'blog' ? 'blog' : 'social')
    } catch (e) { toast.error(e.message) }
  }
  const archive = async (id) => { await api('/vault/archive', { method: 'POST', body: JSON.stringify({ id }) }); load() }

  const counts = ideas.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a }, {})
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6 text-amber-400" /> Content Idea Vault</h1><p className="text-sm text-muted-foreground">Dump raw sparks — voice notes, links, half-thoughts — cluster them, and promote the best into the approval pipeline.</p></div>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-blue-400" /> Quick capture</h3>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="A spark… e.g. 'Why HR teams should interview AI vendors like they interview people'" className="bg-secondary/50 border-white/10 min-h-20" />
        <div className="flex gap-2 mt-3">
          <Button onClick={capture} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-9"><Save className="h-4 w-4 mr-1" /> Capture</Button>
          <Button variant="outline" className="border-white/10 h-9" onClick={cluster} disabled={clustering}>{clustering ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Layers className="h-4 w-4 mr-1" />} Cluster & de-dupe</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
          {Object.entries(counts).map(([k, v]) => <span key={k} className="px-2 py-1 rounded-full border border-white/10">{k}: <span className="text-white font-metric">{v}</span></span>)}
        </div>
      </Panel>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideas.map((i) => (
          <Panel key={i.id} className={`p-4 ${i.status === 'Duplicate' ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">{i.cluster || 'Idea'}</Badge>
              <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px]">{i.status}</Badge>
            </div>
            <p className="text-sm font-grotesk line-clamp-4 min-h-16">{i.text}</p>
            {i.promotedJobId && <p className="text-[10px] text-emerald-400 mt-2 font-code">→ {i.promotedPipeline} job created</p>}
            <div className="flex gap-2 mt-3">
              {['New', 'Clustered'].includes(i.status) && <>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 h-8 flex-1" onClick={() => promote(i.id, 'social')}><Sparkles className="h-3.5 w-3.5 mr-1" /> Social</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 h-8 flex-1" onClick={() => promote(i.id, 'blog')}><FileText className="h-3.5 w-3.5 mr-1" /> Blog</Button>
              </>}
              {i.status !== 'Archived' && <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => archive(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
            </div>
          </Panel>
        ))}
        {!ideas.length && <p className="text-sm text-muted-foreground py-10 text-center col-span-full">Vault is empty — capture your first spark above.</p>}
      </div>
    </div>
  )
}

// ================================================================== REPURPOSING
function RepurposeView() {
  const [posts, setPosts] = useState([])
  const [items, setItems] = useState([])
  const [selId, setSelId] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    api('/social').then((r) => setPosts(r.posts.filter((p) => p.status === 'Published'))).catch(() => {})
    api('/repurpose').then((r) => setItems(safeArr(r.items))).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const generate = async () => {
    if (!selId) return toast.error('Pick a published post first')
    setBusy(true)
    try { const { item } = await api('/repurpose/generate', { method: 'POST', body: JSON.stringify({ postId: selId }) }); setOpen(item); load(); toast.success('Variants ready for approval') }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const act = async (action) => {
    try { const { job } = await api('/repurpose/action', { method: 'POST', body: JSON.stringify({ id: open.id, action }) }); setOpen(job); load(); toast.success('Done') }
    catch (e) { toast.error(e.message) }
  }

  const v = open?.variants || {}
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Repeat className="h-6 w-6 text-blue-400" /> Repurposing Engine</h1><p className="text-sm text-muted-foreground">Multiply your best published content — X thread, carousel, reel script, Threads series — through the same approval gate.</p></div>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-3">Source post</h3>
        <div className="flex gap-2">
          <select value={selId} onChange={(e) => setSelId(e.target.value)} className="flex-1 bg-secondary/50 border border-white/10 rounded-lg px-3 h-10 text-sm outline-none focus:border-blue-500/50">
            <option value="">Pick a Published post…</option>
            {posts.map((p) => <option key={p.id} value={p.id}>{p.imageName} · Q{p.quality?.overall}</option>)}
          </select>
          <Button onClick={generate} disabled={busy} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" /> Generate variants</>}</Button>
        </div>
      </Panel>

      {open && (
        <Panel className="overflow-hidden">
          <div className="p-5 border-b border-white/5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={STATUS_STYLES[open.status]}>{open.status}</Badge>
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">{open.sourcePillar}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">Source: {open.sourceTitle}</span>
            </div>
            <div>
              <h4 className="font-grotesk font-semibold text-sm mb-2 flex items-center gap-2"><Hash className="h-4 w-4 text-blue-400" /> X / Twitter thread</h4>
              <div className="space-y-1.5">{v.xThread?.map((t, i) => <div key={i} className="glass rounded-lg p-2.5 text-sm text-muted-foreground">{i + 1}. {t}</div>)}</div>
            </div>
            <div>
              <h4 className="font-grotesk font-semibold text-sm mb-2 flex items-center gap-2"><Layers className="h-4 w-4 text-violet-400" /> Instagram carousel</h4>
              <div className="grid sm:grid-cols-4 gap-2">{v.carousel?.map((s) => <div key={s.slide} className="glass rounded-lg p-2.5 text-center"><div className="font-metric text-[10px] text-blue-400">SLIDE {s.slide}</div><p className="text-xs text-muted-foreground mt-1">{s.text}</p></div>)}</div>
            </div>
            <div>
              <h4 className="font-grotesk font-semibold text-sm mb-2 flex items-center gap-2"><Play className="h-4 w-4 text-emerald-400" /> Reel / Short script</h4>
              <div className="glass rounded-lg p-3 text-sm text-muted-foreground space-y-1">
                <p><span className="text-white/70">Scene:</span> {v.reelScript?.scene}</p>
                <p><span className="text-white/70">VO:</span> {v.reelScript?.voiceover}</p>
                <p className="line-clamp-2">{v.reelScript?.text}</p>
                <p className="text-blue-400 text-xs">CTA: {v.reelScript?.cta}</p>
              </div>
            </div>
            <div>
              <h4 className="font-grotesk font-semibold text-sm mb-2 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-purple-400" /> Threads mini-series</h4>
              <div className="space-y-1.5">{v.threadsSeries?.map((t, i) => <div key={i} className="glass rounded-lg p-2.5 text-sm text-muted-foreground">P{i + 1}. {t}</div>)}</div>
            </div>
          </div>
          <ActionBar job={open} onAct={act} />
        </Panel>
      )}

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Repurposed content ({items.length})</h3>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-white/5 transition" onClick={() => setOpen(it)}>
              <div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{it.sourceTitle}</div><div className="text-xs text-muted-foreground">{Object.keys(it.variants || {}).length} variant types · {it.sourcePillar}</div></div>
              <Badge variant="outline" className={STATUS_STYLES[it.status]}>{it.status}</Badge>
            </div>
          ))}
          {!items.length && <p className="text-sm text-muted-foreground py-6 text-center">Nothing repurposed yet.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== LINKEDIN ENGAGEMENT
function EngageView() {
  const [topic, setTopic] = useState('AI')
  const [cands, setCands] = useState([])
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { api('/engage').then((r) => setComments(safeArr(r.comments))).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const find = async () => {
    setBusy(true)
    try { const r = await api(`/engage/find?topic=${encodeURIComponent(topic)}`); setCands(r.candidates); setDraft(null) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const draftComment = async (c) => {
    setBusy(true)
    try { const r = await api('/engage/comment', { method: 'POST', body: JSON.stringify({ link: c.link, postText: c.text, author: c.author, topic }) }); setDraft(r.comment); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const act = async (action) => {
    try { const { job } = await api('/engage/action', { method: 'POST', body: JSON.stringify({ id: draft.id, action }) }); setDraft(job); load(); toast.success(action === 'approve' ? 'Comment posted' : 'Done') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-blue-400" /> LinkedIn Engagement Intelligence</h1><p className="text-sm text-muted-foreground">Genuine, value-adding comments — never "Great post!" — drafted by AI, approved by you, then posted.</p></div>

      <Panel className="p-5">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic: AI, HR, Leadership…" className="bg-secondary/50 border-white/10 flex-1" />
          <Button onClick={find} disabled={busy} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Radar className="h-4 w-4 mr-1" /> Find relevant posts</>}</Button>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-code tracking-widest text-muted-foreground">CANDIDATES</h3>
          {cands.map((c) => (
            <Panel key={c.id} className="p-4">
              <div className="flex items-center gap-2 mb-1"><span className="font-grotesk text-sm font-semibold">{c.author}</span><span className="text-[10px] text-muted-foreground font-code">♥ {c.likes} · 💬 {c.comments}</span></div>
              <p className="text-sm text-muted-foreground line-clamp-3">{c.text}</p>
              <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 h-8 mt-3" onClick={() => draftComment(c)} disabled={busy}><Pencil className="h-3.5 w-3.5 mr-1" /> Draft comment</Button>
            </Panel>
          ))}
          {!cands.length && <p className="text-sm text-muted-foreground py-8 text-center border border-white/5 rounded-xl">Pick a topic and hit Find to surface quality posts.</p>}
        </div>

        <div className="space-y-4">
          {draft && (
            <Panel className="overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="outline" className={STATUS_STYLES[draft.status]}>{draft.status}</Badge>
                  <Badge variant="outline" className="border-white/10 text-muted-foreground font-code text-[10px]">{draft.mode}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{draft.author || draft.topic}</span>
                </div>
                <div className="glass rounded-lg p-4"><p className="whitespace-pre-wrap text-sm leading-relaxed font-grotesk">{draft.comment}</p></div>
              </div>
              <ActionBar job={draft} onAct={act} />
            </Panel>
          )}
          <div>
            <h3 className="text-xs font-code tracking-widest text-muted-foreground mb-3">COMMENT HISTORY</h3>
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="glass rounded-lg p-3 cursor-pointer hover:bg-white/5 transition" onClick={() => setDraft(c)}>
                  <div className="flex items-center gap-2"><span className="text-sm font-grotesk flex-1 truncate">{c.comment}</span><Badge variant="outline" className={STATUS_STYLES[c.status]}>{c.status}</Badge></div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-code">{c.topic} · {new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
              {!comments.length && <p className="text-sm text-muted-foreground py-6 text-center border border-white/5 rounded-xl">No comments drafted yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================== NEWSLETTER
function NewsletterView() {
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [blogs, setBlogs] = useState([])
  const [email, setEmail] = useState('')
  const [blogSel, setBlogSel] = useState('')
  const [sub, setSub] = useState({ subject: '', preview: '', body: '', template: 'Custom' })

  const load = useCallback(() => {
    api('/newsletter/subscribers').then(setStats).catch(() => {})
    api('/newsletter/campaigns').then((r) => setCampaigns(safeArr(r.campaigns))).catch(() => {})
    api('/blog').then((r) => setBlogs(r.posts)).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const subscribe = async () => {
    if (!email) return toast.error('Email required')
    await api('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email }) }); setEmail(''); load(); toast.success('Subscriber added')
  }
  const genFromBlog = async () => {
    if (!blogSel) return toast.error('Pick a blog first')
    try { const { campaign } = await api('/newsletter/generate', { method: 'POST', body: JSON.stringify({ blogId: blogSel }) }); setSub({ subject: campaign.subject, preview: campaign.preview, body: campaign.body, template: campaign.template }); load(); toast.success('Draft generated from blog') }
    catch (e) { toast.error(e.message) }
  }
  const create = async () => {
    if (!sub.subject) return toast.error('Subject required')
    await api('/newsletter/campaign', { method: 'POST', body: JSON.stringify(sub) })
    setSub({ subject: '', preview: '', body: '', template: 'Custom' }); load(); toast.success('Campaign saved as draft')
  }
  const send = async (c) => {
    if (!window.confirm(`Send "${c.subject}" to active subscribers?`)) return
    try { const r = await api('/newsletter/send', { method: 'POST', body: JSON.stringify({ id: c.id }) }); toast.success(r.mode === 'live' ? `Sent via Resend to ${r.recipients}` : `Demo sent (${r.recipients} recipients) — configure Resend to go live`); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-blue-400" /> Newsletter (Resend)</h1><p className="text-sm text-muted-foreground">Every approved blog auto-converts into a newsletter draft — review, then send via Resend.</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total subscribers" value={stats?.total ?? '—'} accent="#3B82F6" />
        <StatCard icon={Check} label="Active" value={stats?.active ?? '—'} accent="#22C55E" />
        <StatCard icon={TrendingUp} label="New this week" value={`+${stats?.newThisWeek ?? '—'}`} accent="#8B5CF6" />
        <StatCard icon={X} label="Unsubscribed" value={stats?.unsubscribed ?? '—'} accent="#F59E0B" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5 space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-blue-400" /> Add subscriber</h3>
          <div className="flex gap-2"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reader@example.com" className="bg-secondary/50 border-white/10" /><Button onClick={subscribe} className="bg-blue-600 hover:bg-blue-500 h-10">Add</Button></div>
          <div className="pt-3 border-t border-white/5">
            <h4 className="font-grotesk font-semibold text-sm mb-2">Auto-generate from blog</h4>
            <div className="flex gap-2">
              <select value={blogSel} onChange={(e) => setBlogSel(e.target.value)} className="flex-1 bg-secondary/50 border border-white/10 rounded-lg px-3 h-10 text-sm outline-none focus:border-blue-500/50">
                <option value="">Pick a blog…</option>
                {blogs.map((b) => <option key={b.id} value={b.id}>{b.article?.title}</option>)}
              </select>
              <Button variant="outline" className="border-white/10 h-10" onClick={genFromBlog}><Sparkles className="h-4 w-4 mr-1" /> Generate</Button>
            </div>
          </div>
        </Panel>
        <Panel className="p-5 space-y-3">
          <h3 className="font-display font-semibold">Campaign editor</h3>
          <Input value={sub.subject} onChange={(e) => setSub({ ...sub, subject: e.target.value })} placeholder="Subject line" className="bg-secondary/50 border-white/10" />
          <Input value={sub.preview} onChange={(e) => setSub({ ...sub, preview: e.target.value })} placeholder="Preview text" className="bg-secondary/50 border-white/10" />
          <Textarea value={sub.body} onChange={(e) => setSub({ ...sub, body: e.target.value })} placeholder="Body (HTML allowed)" className="bg-secondary/50 border-white/10 min-h-28 font-code text-xs" />
          <select value={sub.template} onChange={(e) => setSub({ ...sub, template: e.target.value })} className="w-full bg-secondary/50 border border-white/10 rounded-lg px-3 h-10 text-sm outline-none">
            {['Weekly Digest', 'Monthly Roundup', 'Breaking News', 'Blog Announcement', 'Custom'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <Button onClick={create} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 w-full h-10"><Save className="h-4 w-4 mr-1" /> Save as draft</Button>
        </Panel>
      </div>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Campaigns ({campaigns.length})</h3>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 glass rounded-lg p-3">
              <div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{c.subject}</div><div className="text-xs text-muted-foreground">{c.template} · {c.stats?.sent || 0} sent · {c.sentAt ? new Date(c.sentAt).toLocaleString() : 'not sent'}</div></div>
              <Badge variant="outline" className="border-white/10 text-muted-foreground">{c.status}</Badge>
              <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 h-8" onClick={() => send(c)}><Send className="h-3.5 w-3.5 mr-1" /> Send</Button>
            </div>
          ))}
          {!campaigns.length && <p className="text-sm text-muted-foreground py-6 text-center">No campaigns yet.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== AI COST DASHBOARD
function CostView() {
  const [d, setD] = useState(null)
  const [caps, setCaps] = useState(null)

  const load = useCallback(() => { api('/ai_cost').then((r) => { setD(r); setCaps(JSON.parse(JSON.stringify(r.caps))) }).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const saveCaps = async () => { await api('/ai_cost/caps', { method: 'PUT', body: JSON.stringify({ caps }) }); toast.success('Budget caps saved'); load() }
  if (!d) return <Loading />

  const provMax = Math.max(0.01, ...Object.values(d.byProvider))
  const modMax = Math.max(0.01, ...Object.values(d.byModule))
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-amber-400" /> AI Cost & Token Dashboard</h1><p className="text-sm text-muted-foreground">Spend per call, module, provider — with budget caps that pause + alert before runaway spend.</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Spend (this month)" value={`$${d.total.toFixed(4)}`} accent="#3B82F6" />
        <StatCard icon={Send} label="Cost per published post" value={`$${d.costPerPublishedPost}`} accent="#8B5CF6" />
        <StatCard icon={TrendingUp} label="Published posts" value={d.publishedCount} accent="#22C55E" />
      </div>

      {d.alerts.length > 0 && (
        <Panel className="p-4 border-amber-500/30 glow-amber">
          <h3 className="font-display font-semibold mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /> Budget alerts</h3>
          {(d.alerts || []).map((a) => <div key={a.type + a.id} className={`text-sm ${a.over ? 'text-red-400' : 'text-amber-400'}`}>{a.type === 'provider' ? 'Provider' : 'Module'} <span className="font-metric">{a.id}</span>: ${a.usage.toFixed(4)} of ${a.cap} cap — {a.over ? 'OVER — paused' : 'near cap'}</div>)}
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">Spend by provider</h3>
          {Object.entries(d.byProvider).map(([p, v]) => (
            <div key={p} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span className="font-code text-muted-foreground">{p.toUpperCase()}</span><span className="font-metric">${v.toFixed(4)}</span></div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${(v / provMax) * 100}%` }} /></div>
            </div>
          ))}
          {!Object.keys(d.byProvider).length && <p className="text-xs text-muted-foreground py-6 text-center">No paid calls yet — costs start logging on the first live provider call.</p>}
        </Panel>
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">Spend by module</h3>
          {Object.entries(d.byModule).map(([m, v]) => (
            <div key={m} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span className="font-code text-muted-foreground">{m.toUpperCase()}</span><span className="font-metric">${v.toFixed(4)}</span></div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${(v / modMax) * 100}%` }} /></div>
            </div>
          ))}
          {!Object.keys(d.byModule).length && <p className="text-xs text-muted-foreground py-6 text-center">No module spend yet.</p>}
        </Panel>
      </div>

      {caps && (
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">Budget caps (USD / month)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-code text-muted-foreground mb-1">PER PROVIDER</div>
              {Object.entries(caps.providers).map(([p, v]) => (
                <div key={p} className="flex items-center gap-2"><span className="text-sm w-28">{p}</span><Input type="number" step="0.5" value={v} onChange={(e) => setCaps({ ...caps, providers: { ...caps.providers, [p]: Number(e.target.value) } })} className="bg-secondary/50 border-white/10 h-8 font-code" /></div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-xs font-code text-muted-foreground mb-1">PER MODULE</div>
              {Object.entries(caps.modules).map(([m, v]) => (
                <div key={m} className="flex items-center gap-2"><span className="text-sm w-28">{m}</span><Input type="number" step="0.5" value={v} onChange={(e) => setCaps({ ...caps, modules: { ...caps.modules, [m]: Number(e.target.value) } })} className="bg-secondary/50 border-white/10 h-8 font-code" /></div>
              ))}
            </div>
          </div>
          <Button onClick={saveCaps} className="mt-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-9"><Save className="h-4 w-4 mr-1" /> Save caps</Button>
        </Panel>
      )}
    </div>
  )
}

// ================================================================== FACT-CHECK
function FactCheckView() {
  const [posts, setPosts] = useState([])
  const [blogs, setBlogs] = useState([])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('/social').then((r) => setPosts(r.posts.filter((p) => ['Pending Approval', 'Scheduled'].includes(p.status)))).catch(() => {})
    api('/blog').then((r) => setBlogs(r.posts.filter((b) => ['Pending Approval', 'Scheduled'].includes(b.status)))).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (type, id) => {
    setBusy(true); setTarget(null)
    try { const r = await api('/factcheck/run', { method: 'POST', body: JSON.stringify({ type, id }) }); setTarget({ type, id, ...r.factcheck }); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const statusColor = { Clean: 'text-emerald-400', 'Needs Review': 'text-amber-400', Blocked: 'text-red-400' }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-400" /> Fact-Check & Originality Pass</h1><p className="text-sm text-muted-foreground">A hard safety gate before approval. Blocked items cannot be approved until resolved — it's a gate, not a suggestion.</p></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-400" /> Social drafts ({posts.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 glass rounded-lg p-3">
                <div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{p.imageName}</div><div className="text-xs text-muted-foreground">Q{p.quality?.overall} · {p.analysis?.pillar}</div></div>
                <FactCheckBadge fc={p.factcheck} />
                <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => run('social', p.id)} disabled={busy}><Play className="h-3.5 w-3.5 mr-1" /> Run</Button>
              </div>
            ))}
            {!posts.length && <p className="text-xs text-muted-foreground py-6 text-center">No pending social drafts.</p>}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-400" /> Blog drafts ({blogs.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {blogs.map((b) => (
              <div key={b.id} className="flex items-center gap-3 glass rounded-lg p-3">
                <div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{b.article?.title}</div><div className="text-xs text-muted-foreground">SEO {b.seo?.seoScore} · {b.article?.readingTime} min</div></div>
                <FactCheckBadge fc={b.factcheck} />
                <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => run('blog', b.id)} disabled={busy}><Play className="h-3.5 w-3.5 mr-1" /> Run</Button>
              </div>
            ))}
            {!blogs.length && <p className="text-xs text-muted-foreground py-6 text-center">No pending blog drafts.</p>}
          </div>
        </Panel>
      </div>

      {target && (
        <Panel className={`p-5 ${target.status === 'Blocked' ? 'border-red-500/40' : target.status === 'Clean' ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display font-semibold">Result</h3>
            <span className={`font-metric text-xl ${statusColor[target.status]}`}>{target.status}</span>
            <span className="text-xs text-muted-foreground font-code">Originality {target.originalityScore}/100 · confidence {target.confidence}%</span>
          </div>
          {target.issues?.length > 0 && (
            <div className="mt-3 text-sm text-amber-400">Flagged phrases: {target.issues.map((i) => <span key={i} className="font-code text-xs ml-1">"{i}"</span>)}</div>
          )}
          {target.status === 'Blocked' && <p className="mt-2 text-sm text-red-400">This item cannot be approved until you regenerate or edit it. Approve button is disabled by the gate.</p>}
          {target.status === 'Clean' && <p className="mt-2 text-sm text-emerald-400">Safe to approve — gate passes.</p>}
        </Panel>
      )}
    </div>
  )
}

// ================================================================== CONTENT CALENDAR
function CalendarView() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('All')

  const load = useCallback(() => { api('/calendar').then((r) => setItems(safeArr(r.items))).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const resched = async (it, date) => {
    if (!date) return
    try { await api('/calendar/reschedule', { method: 'POST', body: JSON.stringify({ module: it.module, id: it.id, date }) }); toast.success('Rescheduled — source row updated'); load() }
    catch (e) { toast.error(e.message) }
  }

  const filtered = items.filter((i) => filter === 'All' || i.module === filter)
  const moduleColor = { Social: 'text-blue-400 border-blue-500/30', Blog: 'text-violet-400 border-violet-500/30', News: 'text-amber-400 border-amber-500/30', Seasonal: 'text-emerald-400 border-emerald-500/30' }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Kanban className="h-6 w-6 text-blue-400" /> Visual Content Calendar</h1><p className="text-sm text-muted-foreground">Read-only aggregation across every module — Sheets stays the truth. Drag-to-reschedule is emulated via the date field.</p></div>

      <div className="flex flex-wrap gap-2">
        {['All', 'Social', 'Blog', 'News', 'Seasonal'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === f ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-white/10 text-muted-foreground'}`}>{f}</button>
        ))}
      </div>

      <Panel className="p-2 overflow-x-auto">
        <div className="min-w-[720px]">
          {filtered.map((it) => (
            <div key={`${it.module}-${it.id}`} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0">
              <Badge variant="outline" className={`${moduleColor[it.module] || 'border-white/10 text-muted-foreground'} text-[10px] w-20 justify-center`}>{it.module}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-grotesk text-sm truncate">{it.title}</div>
                <div className="text-[10px] text-muted-foreground font-code">{it.pillar} · {it.quality ? `Q${it.quality}` : ''}</div>
              </div>
              <Badge variant="outline" className={STATUS_STYLES[it.status] || 'border-white/10 text-muted-foreground'}>{it.status}</Badge>
              <input type="date" defaultValue={it.date?.slice(0, 10)} onBlur={(e) => resched(it, e.target.value)}
                className="bg-secondary/50 border border-white/10 rounded-lg px-2 h-8 text-xs font-code outline-none focus:border-blue-500/50" />
            </div>
          ))}
          {!filtered.length && <p className="text-sm text-muted-foreground py-10 text-center">Nothing scheduled yet — generate content and it appears here automatically.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== RECRUITER SIGNAL
function RecruiterView() {
  const [d, setD] = useState(null)
  const [cfg, setCfg] = useState(null)

  const load = useCallback(() => { api('/recruiter').then((r) => { setD(r); setCfg(r.config) }).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loading />

  const toggle = (id) => setCfg({ ...cfg, items: (cfg.items || []).map((i) => i.id === id ? { ...i, selected: !i.selected } : i) })
  const save = async () => {
    try { await api('/recruiter', { method: 'PUT', body: JSON.stringify({ config: cfg }) }); toast.success('Recruiter Signal saved') }
    catch (e) { toast.error(e.message) }
  }
  const shareUrl = cfg?.slug ? `${window.location.origin}/recruiter?slug=${encodeURIComponent(cfg.slug)}${cfg.passcode ? `&passcode=${encodeURIComponent(cfg.passcode)}` : ''}` : ''

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-amber-400" /> Recruiter Signal Mode</h1><p className="text-sm text-muted-foreground">A curated, shareable proof-of-skill page. Everything is opt-in — nothing appears without your selection.</p></div>

      <Panel className="p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Share slug"><Input value={cfg.slug || ''} onChange={(e) => setCfg({ ...cfg, slug: e.target.value })} className="bg-secondary/50 border-white/10 font-code" /></Field>
          <Field label="Passcode (optional)"><Input value={cfg.passcode || ''} onChange={(e) => setCfg({ ...cfg, passcode: e.target.value })} className="bg-secondary/50 border-white/10 font-code" placeholder="leave empty for public" /></Field>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Signal page</Label><div className="flex items-center justify-between glass rounded-lg p-3"><span className="text-sm">{cfg.enabled !== false ? 'Live' : 'Paused'}</span><Switch checked={cfg.enabled !== false} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} /></div></div>
        </div>
        <Button onClick={save} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90"><Save className="h-4 w-4 mr-2" /> Save config</Button>
        {shareUrl && (
          <div className="flex items-center gap-2 glass rounded-lg p-3">
            <span className="text-xs text-muted-foreground flex-1 truncate font-code">{shareUrl}</span>
            <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied') }}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
            <Button size="sm" variant="outline" className="border-white/10 h-8" onClick={() => window.open(shareUrl, '_blank')}><ExternalLink className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </Panel>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Opt-in proof items ({cfg.items?.filter((i) => i.selected).length || 0} selected)</h3>
        <div className="space-y-2">
          {d.suggested.map((s) => {
            const isSel = (cfg.items || []).some((i) => i.id === s.id && i.selected)
            return (
              <div key={s.id} className={`flex items-center gap-3 glass rounded-lg p-3 transition ${isSel ? 'ring-1 ring-emerald-500/40' : ''}`}>
                <Switch checked={isSel} onCheckedChange={() => toggle(s.id)} />
                <div className="flex-1 min-w-0">
                  <div className="font-grotesk text-sm truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.category} · {s.reason}</div>
                </div>
              </div>
            )
          })}
          {!d.suggested.length && <p className="text-sm text-muted-foreground py-6 text-center">Publish content with quality ≥ 75 to unlock proof items.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== PORTFOLIO SYNC
function PortfolioView() {
  const [d, setD] = useState(null)
  const [sel, setSel] = useState(null)

  const load = useCallback(() => { api('/portfolio').then(setD).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  if (!d) return <Loading />

  const draft = async (postId) => {
    try { const r = await api('/portfolio/draft', { method: 'POST', body: JSON.stringify({ postId }) }); setSel(r.study); load(); toast.success('Case study drafted — approve to sync to manikantar.in') }
    catch (e) { toast.error(e.message) }
  }
  const act = async (action) => {
    try { const { job } = await api('/portfolio/action', { method: 'POST', body: JSON.stringify({ id: sel.id, action }) }); setSel(job); load(); toast.success('Done') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6 text-violet-400" /> Proof-of-Work Portfolio Sync</h1><p className="text-sm text-muted-foreground">Turn top-performing posts into recruiter-facing case studies — approval first, then synced to "Things My Resume Will Never Tell You".</p></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">Eligible published posts</h3>
          <div className="space-y-2">
            {d.suggested.map((s) => (
              <div key={s.id} className="flex items-center gap-3 glass rounded-lg p-3">
                <div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{s.title}</div><div className="text-xs text-muted-foreground">Quality {s.quality}/100 — above threshold</div></div>
                <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 h-8" onClick={() => draft(s.id)}><Pencil className="h-3.5 w-3.5 mr-1" /> Draft case study</Button>
              </div>
            ))}
            {!d.suggested.length && <p className="text-sm text-muted-foreground py-6 text-center">Posts with quality ≥ 85 unlock case-study drafting.</p>}
          </div>
        </Panel>
        <div className="space-y-4">
          <h3 className="text-xs font-code tracking-widest text-muted-foreground">CASE STUDIES</h3>
          {d.studies.map((st) => (
            <Panel key={st.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className="border-violet-500/30 text-violet-300">{st.category}</Badge>
                  <Badge variant="outline" className={STATUS_STYLES[st.status]}>{st.status}</Badge>
                  {st.syncStatus && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{st.syncStatus}</Badge>}
                </div>
                <h4 className="font-grotesk font-semibold mb-1">{st.title}</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="text-white/70">What:</span> {st.what}</p>
                  <p><span className="text-white/70">Why:</span> {st.why}</p>
                  <p><span className="text-white/70">Result:</span> {st.result}</p>
                  <p><span className="text-white/70">Strategy:</span> {st.strategy}</p>
                </div>
              </div>
              <ActionBar job={st} onAct={(a) => { setSel(st); act(a) }} />
            </Panel>
          ))}
          {!d.studies.length && <p className="text-sm text-muted-foreground py-8 text-center border border-white/5 rounded-xl">No case studies yet.</p>}
        </div>
      </div>
    </div>
  )
}

// ================================================================== SCHEDULER / CRON
function SchedulerView() {
  const [jobs, setJobs] = useState([])
  const [logs, setLogs] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('/cron').then((r) => { setJobs(r.jobs || []); setLogs(r.logs || []) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const run = async () => {
    setBusy(true)
    try { const r = await api('/cron', { method: 'POST' }); toast.success('Scheduler tick run', { description: `Processed ${r.processed} job(s)` }); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-blue-400" /> Scheduler & Cron</h1><p className="text-sm text-muted-foreground">Automated watchers that publish scheduled content and run maintenance ticks.</p></div>
        <Button onClick={run} disabled={busy} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</> : <><Play className="h-4 w-4 mr-2" /> Run tick now</>}
        </Button>
      </div>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Scheduled jobs ({jobs.length})</h3>
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-3 glass rounded-lg p-3">
              <Badge variant="outline" className={STATUS_STYLES[j.status] || 'border-white/10 text-muted-foreground'}>{j.status}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-grotesk text-sm truncate">{j.label}</div>
                <div className="text-xs text-muted-foreground font-code">{j.module} · next: {j.nextRun || '—'}</div>
              </div>
              {j.lastRun && <span className="text-[10px] text-muted-foreground font-code">last: {new Date(j.lastRun).toLocaleString()}</span>}
            </div>
          ))}
          {!jobs.length && <p className="text-sm text-muted-foreground py-6 text-center">No scheduled jobs yet — approve a post with a future date to create one.</p>}
        </div>
      </Panel>

      <Panel className="p-5">
        <h3 className="font-display font-semibold mb-4">Recent tick logs ({logs.length})</h3>
        <div className="space-y-1.5">
          {logs.slice(0, 15).map((l) => (
            <div key={l.id} className="flex items-center gap-3 text-xs">
              <span className="font-code text-muted-foreground w-40 shrink-0">{new Date(l.ts).toLocaleString()}</span>
              <span className="font-code text-blue-400 w-24 shrink-0">{l.action}</span>
              <span className="text-muted-foreground flex-1 truncate">{l.detail}</span>
            </div>
          ))}
          {!logs.length && <p className="text-sm text-muted-foreground py-4 text-center">No ticks run yet.</p>}
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== DISCORD HUB
function DiscordView() {
  const [config, setConfig] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [testMsg, setTestMsg] = useState('')

  const load = useCallback(() => {
    api('/discord').then(setConfig).catch(() => {})
    api('/discord/interactions').then((r) => setInteractions(r.interactions || [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const sendTest = async () => {
    if (!testMsg) return toast.error('Type a message first')
    try { await api('/discord/test', { method: 'POST', body: JSON.stringify({ message: testMsg }) }); toast.success('Test message sent'); setTestMsg('') }
    catch (e) { toast.error(e.message) }
  }

  if (!config) return <Loading />

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-purple-400" /> Discord Hub</h1><p className="text-sm text-muted-foreground">Approval cards, slash commands, and interaction events — all from one bot.</p></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5 space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Plug className="h-4 w-4 text-purple-400" /> Bot Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between glass rounded-lg p-3"><span className="text-sm">Webhook</span><StatusDot status={config.webhook ? 'connected' : 'disabled'} /></div>
            <div className="flex items-center justify-between glass rounded-lg p-3"><span className="text-sm">Public Key</span><StatusDot status={config.publicKey ? 'connected' : 'disabled'} /></div>
            <div className="flex items-center justify-between glass rounded-lg p-3"><span className="text-sm">Interactions received</span><span className="font-metric text-white">{config.interactionCount || 0}</span></div>
          </div>
          <div className="pt-3 border-t border-white/5 space-y-2">
            <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} placeholder="Send a test message…" className="bg-secondary/50 border-white/10" />
            <Button onClick={sendTest} variant="outline" className="w-full border-white/10"><Send className="h-4 w-4 mr-1" /> Send test</Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Recent Interactions</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {interactions.slice(0, 20).map((ix) => (
              <div key={ix.id} className="glass rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-1"><span className="font-code text-purple-400">{ix.type}</span><span className="text-muted-foreground">{ix.user}</span></div>
                <p className="text-muted-foreground truncate">{ix.data?.custom_id || ix.data?.name || ''}</p>
              </div>
            ))}
            {!interactions.length && <p className="text-sm text-muted-foreground py-6 text-center">No interactions yet — configure Discord in Integrations.</p>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ================================================================== EMAIL STUDIO
function EmailView() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState([])

  const send = async () => {
    if (!to || !subject) return toast.error('To + Subject required')
    setBusy(true)
    try {
      const r = await api('/email/send', { method: 'POST', body: JSON.stringify({ to, subject, body }) })
      toast.success(r.mode === 'live' ? 'Sent via Resend' : 'Demo sent — configure Resend to go live')
      setSent((s) => [{ id: Date.now(), to, subject, ts: new Date().toISOString() }, ...s])
      setTo(''); setSubject(''); setBody('')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Send className="h-6 w-6 text-blue-400" /> Email Studio</h1><p className="text-sm text-muted-foreground">Send one-off transactional emails — powered by Resend when configured.</p></div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Panel className="lg:col-span-3 p-5 space-y-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Pencil className="h-4 w-4 text-violet-400" /> Compose</h3>
          <Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" className="bg-secondary/50 border-white/10 font-code" /></Field>
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" className="bg-secondary/50 border-white/10" /></Field>
          <Field label="Body (HTML allowed)"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email…" className="bg-secondary/50 border-white/10 min-h-48 font-grotesk" /></Field>
          <Button onClick={send} disabled={busy} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-11">
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send email</>}
          </Button>
        </Panel>

        <Panel className="lg:col-span-2 p-5">
          <h3 className="font-display font-semibold mb-4">Sent ({sent.length})</h3>
          <div className="space-y-2">
            {sent.map((s) => (
              <div key={s.id} className="glass rounded-lg p-3">
                <div className="font-grotesk text-sm truncate">{s.subject}</div>
                <div className="text-xs text-muted-foreground">{s.to} · {new Date(s.ts).toLocaleString()}</div>
              </div>
            ))}
            {!sent.length && <p className="text-sm text-muted-foreground py-8 text-center">No emails sent yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ================================================================== CONNECTIONS (OAuth Hub)
function ConnectionsView() {
  const [data, setData] = useState(null)

  const load = useCallback(() => { api('/connections').then(setData).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const connect = async (provider) => {
    try { const r = await api(`/oauth/start?provider=${provider}`); window.open(r.url, '_blank'); toast.info('OAuth opened — authorize in the new tab') }
    catch (e) { toast.error(e.message) }
  }

  if (!data) return <Loading />

  const PROVIDERS = [
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
    { id: 'facebook', label: 'Meta / Facebook', icon: Facebook, color: '#1877F2' },
  ]

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><ExternalLink className="h-6 w-6 text-blue-400" /> Connections Hub</h1><p className="text-sm text-muted-foreground">OAuth status for every platform — tokens stored encrypted, refreshed automatically.</p></div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const Ic = p.icon
          const c = data[p.id] || {}
          return (
            <Panel key={p.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg grid place-items-center" style={{ background: `${p.color}22` }}><Ic className="h-5 w-5" style={{ color: p.color }} /></div>
                <div><div className="font-grotesk font-semibold">{p.label}</div><div className="text-xs text-muted-foreground">{c.connected ? 'Connected' : 'Not connected'}</div>
                </div>
                <StatusDot status={c.connected ? 'connected' : 'disabled'} />
              </div>
              {c.connected ? (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between glass rounded-lg p-2"><span>Account</span><span className="text-white">{c.account || '—'}</span></div>
                  <div className="flex justify-between glass rounded-lg p-2"><span>Token expires</span><span className="text-white">{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '—'}</span></div>
                </div>
              ) : (
                <Button onClick={() => connect(p.id)} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 h-9"><ExternalLink className="h-4 w-4 mr-1" /> Connect {p.label}</Button>
              )}
            </Panel>
          )
        })}
      </div>

      <Panel className="p-5 glow-purple">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Lock className="h-5 w-5 text-white" /></div>
          <div>
            <h3 className="font-display font-semibold mb-1">Token security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">All OAuth tokens are AES-256 encrypted at rest and refreshed automatically before expiry. Revoke anytime from the platform side.</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ================================================================== MODULE 9: MISSION CONTROL (Social Media Intelligence Dashboard)
function MissionControlView() {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('overview')
  useEffect(() => { api('/analytics/full').then(setD).catch(() => {}) }, [])
  if (!d) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-blue-400" /> Mission Control</h1><p className="text-sm text-muted-foreground">One unified, AI-narrated view of every platform — not just charts, but explanations and next actions.</p></div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 h-fit"><TrendingUp className="h-3 w-3 mr-1" /> Brand Health {Math.min(99, 70 + d.totals.publishedCount * 2)}/100</Badge>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Reach" value={d.totals.reach.toLocaleString()} accent="#3B82F6" />
        <StatCard icon={TrendingUp} label="Engagement Rate" value={`${d.totals.engagementRate}%`} accent="#8B5CF6" />
        <StatCard icon={Users} label="Followers Gained" value={`+${d.totals.followersGained.toLocaleString()}`} accent="#22C55E" />
        <StatCard icon={Send} label="Website Visits" value={d.totals.websiteVisits.toLocaleString()} accent="#F59E0B" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary/50 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="posts">Post Performance</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Reach & Engagement — 14 days</h3>
              <ResponsiveContainer width="100%" height={240}><AreaChart data={d.timeline}><defs><linearGradient id="mc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Area type="monotone" dataKey="reach" stroke="#3B82F6" fill="url(#mc1)" strokeWidth={2} /><Area type="monotone" dataKey="engagement" stroke="#8B5CF6" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer>
            </Panel>
            <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Publishes by Content Pillar</h3>
              {d.perPillar.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={d.perPillar}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#3B82F6" /></BarChart></ResponsiveContainer>
              : <p className="text-sm text-muted-foreground py-16 text-center">No published posts yet.</p>}
            </Panel>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Publishes by Platform</h3>
              <ResponsiveContainer width="100%" height={200}><BarChart data={d.perPlatform}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#8B5CF6" /></BarChart></ResponsiveContainer>
            </Panel>
            <Panel className="p-5 glow-purple"><div className="flex items-start gap-4"><div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Brain className="h-5 w-5 text-white" /></div><div><h3 className="font-display font-semibold mb-1">AI Coach</h3><p className="text-sm text-muted-foreground leading-relaxed">{d.aiCoach}</p></div></div></Panel>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="pt-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Today" value={d.growth.today.toLocaleString()} accent="#3B82F6" />
            <StatCard icon={TrendingUp} label="Yesterday" value={String(d.growth.yesterday)} accent="#8B5CF6" />
            <StatCard icon={TrendingUp} label="This Week" value={d.growth.weekly.toLocaleString()} accent="#22C55E" />
            <StatCard icon={TrendingUp} label="This Month" value={d.growth.monthly.toLocaleString()} accent="#F59E0B" />
          </div>
          <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Reach trend</h3>
            <ResponsiveContainer width="100%" height={250}><AreaChart data={d.timeline}><defs><linearGradient id="mc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} /><stop offset="100%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} /><RTooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} /><Area type="monotone" dataKey="reach" stroke="#22C55E" fill="url(#mc2)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
          </Panel>
        </TabsContent>

        <TabsContent value="posts" className="pt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel className="p-5"><h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Best Performers</h3>
              <div className="space-y-2">{(d.best || []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 glass rounded-lg p-3"><ScoreRing value={b.score} size={48} /><div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{b.title}</div><div className="text-xs text-muted-foreground">{b.pillar}</div></div></div>
              ))}{!d.best.length && <p className="text-sm text-muted-foreground py-4 text-center">No high-scoring posts yet.</p>}</div>
            </Panel>
            <Panel className="p-5"><h3 className="font-display font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-400" /> Needs Attention</h3>
              <div className="space-y-2">{(d.worst || []).map((w) => (
                <div key={w.id} className="flex items-center gap-3 glass rounded-lg p-3"><ScoreRing value={w.score} size={48} /><div className="flex-1 min-w-0"><div className="font-grotesk text-sm truncate">{w.title}</div><div className="text-xs text-muted-foreground">{w.pillar}</div></div></div>
              ))}{!d.worst.length && <p className="text-sm text-muted-foreground py-4 text-center">No underperformers.</p>}</div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="hashtags" className="pt-6">
          <Panel className="p-5"><h3 className="font-display font-semibold mb-4">Hashtag Intelligence</h3>
            <div className="flex flex-wrap gap-2">{(d.hashtags || []).map((h) => (
              <Badge key={h.tag} variant="outline" className="border-blue-500/30 text-blue-400 gap-1.5 px-3 py-1.5"><Hash className="h-3 w-3" />{h.tag}<span className="text-muted-foreground ml-1">×{h.count}</span></Badge>
            ))}{!d.hashtags.length && <p className="text-sm text-muted-foreground">No hashtag data yet.</p>}</div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ================================================================== MODULE 20: VERSION HISTORY
function VersionsView() {
  const [jobs, setJobs] = useState([])
  const [sel, setSel] = useState(null)
  const [versions, setVersions] = useState([])

  useEffect(() => {
    api('/social').then((r) => setJobs(r.posts || [])).catch(() => {})
  }, [])

  const loadVersions = async (module, id) => {
    setSel({ module, id })
    const r = await api(`/versions?module=${module}&id=${id}`)
    setVersions(r.versions || [])
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-violet-400" /> Version History & Rollback</h1><p className="text-sm text-muted-foreground">Every edit and regenerate archives the previous draft — revert to any prior version until publish.</p></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">Jobs with versions ({jobs.filter((j) => (j.versions || []).length).length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {jobs.filter((j) => (j.versions || []).length).map((j) => (
              <div key={j.id} className={`glass rounded-lg p-3 cursor-pointer transition ${sel?.id === j.id ? 'ring-1 ring-blue-500/50' : 'hover:bg-white/5'}`} onClick={() => loadVersions('social', j.id)}>
                <div className="font-grotesk text-sm truncate">{j.imageName}</div>
                <div className="text-xs text-muted-foreground">{j.versions.length} version(s) · {j.status}</div>
              </div>
            ))}
            {!jobs.filter((j) => (j.versions || []).length).length && <p className="text-sm text-muted-foreground py-6 text-center">No versioned jobs yet — edit or regenerate a draft to create versions.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-4">{sel ? 'Versions' : 'Select a job'}</h3>
          {sel ? (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={i} className="glass rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className="border-violet-500/30 text-violet-300">v{v.v}</Badge><span className="text-xs text-muted-foreground">{v.action} · {new Date(v.ts).toLocaleString()}</span></div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{typeof v.snapshot === 'string' ? v.snapshot : JSON.stringify(v.snapshot).slice(0, 200)}</p>
                  {sel.id && i === versions.length - 1 && <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-8 mt-3" onClick={async () => { const r = await api('/revert', { method: 'POST', body: JSON.stringify({ module: 'social', id: sel.id }) }); toast.success('Reverted'); loadVersions('social', sel.id) }}><RefreshCw className="h-3 w-3 mr-1" /> Revert to this version</Button>}
                </div>
              ))}
              {!versions.length && <p className="text-sm text-muted-foreground py-6 text-center">No versions.</p>}
            </div>
          ) : <p className="text-sm text-muted-foreground py-8 text-center">Pick a job on the left to view its version history.</p>}
        </Panel>
      </div>
    </div>
  )
}

// ================================================================== AUTOPILOT 24/7 — MISSION CONTROL
import MissionControl from '@/components/mission-control'
function AutopilotView() {
  return <MissionControl go={(v) => { if (typeof window !== 'undefined') history.replaceState(null, '', v === 'dashboard' ? '/' : `/#${v}`); window.dispatchEvent(new HashChangeEvent('hashchange')) }} />
}

// ================================================================== LEARNING ENGINE
function LearningView() {
  const [data, setData] = useState(null)
  useEffect(() => { api('/learning').then(setData).catch(() => {}) }, [])
  if (!data) return <Loading />

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-emerald-400" /> Learning Engine</h1><p className="text-sm text-muted-foreground">AI-analyzed patterns from your published content — what works, what doesn't, and what to do next.</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Published Posts" value={data.totalPosts || 0} accent="#3B82F6" />
        <StatCard icon={FileText} label="Published Blogs" value={data.totalBlogs || 0} accent="#8B5CF6" />
        <StatCard icon={Hash} label="Top Hashtag" value={data.bestHashtags?.[0]?.tag || '—'} accent="#22C55E" />
        <StatCard icon={Clock} label="Best Time" value={data.bestTimes?.[0]?.time || '—'} accent="#F59E0B" />
      </div>

      <Panel className="p-5 glow-purple">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Brain className="h-5 w-5 text-white" /></div>
          <div><h3 className="font-display font-semibold mb-2">AI Recommendations</h3>
            <div className="space-y-2">{data.recommendations?.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><span>{r}</span></div>
            ))}</div>
          </div>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Best Topics</h3>
          <div className="space-y-3">{data.bestTopics?.map((t) => (
            <div key={t.pillar} className="flex items-center gap-3"><span className="text-sm w-32 truncate">{t.pillar}</span><div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${t.avgScore}%` }} /></div><span className="font-metric text-xs w-12 text-right">{t.avgScore}</span></div>
          ))}{!data.bestTopics?.length && <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>}</div>
        </Panel>
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Best Platforms</h3>
          <div className="space-y-3">{data.bestPlatforms?.map((p) => (
            <div key={p.platform} className="flex items-center gap-3"><span className="text-sm w-32 truncate capitalize">{p.platform}</span><div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${p.avgScore}%` }} /></div><span className="font-metric text-xs w-12 text-right">{p.avgScore}</span></div>
          ))}{!data.bestPlatforms?.length && <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>}</div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Hash className="h-4 w-4 text-blue-400" /> Hashtag Intelligence</h3>
          <div className="flex flex-wrap gap-2">{data.bestHashtags?.map((h) => (
            <Badge key={h.tag} variant="outline" className="border-blue-500/30 text-blue-400 gap-1.5 px-3 py-1.5">{h.tag}<span className="text-muted-foreground ml-1">×{h.count}</span></Badge>
          ))}{!data.bestHashtags?.length && <p className="text-sm text-muted-foreground">No hashtag data yet.</p>}</div>
        </Panel>
        <Panel className="p-5"><h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Best Hooks</h3>
          <div className="space-y-2">{data.bestHooks?.map((h) => (
            <div key={h.hook} className="glass rounded-lg p-3"><p className="text-sm font-grotesk line-clamp-2">{h.hook}</p><div className="text-xs text-muted-foreground mt-1">Avg score: {h.avgScore}/100 · used {h.count}×</div></div>
          ))}{!data.bestHooks?.length && <p className="text-sm text-muted-foreground py-4 text-center">No hook data yet.</p>}</div>
        </Panel>
      </div>
    </div>
  )
}

const DEFAULT_AUTOPILOT = {
  social: { enabled: true, timesPerDay: 5, times: ['07:00', '10:00', '13:00', '16:00', '19:00'], platforms: ['linkedin', 'instagram', 'facebook', 'threads'] },
  blog: { enabled: true, timesPerDay: 3, times: ['09:00', '14:00', '19:00'] },
  news: { enabled: true, intervalMinutes: 120, autoGenerateSocial: true, autoGenerateBlog: true },
  linkedin: { enabled: true, commentsPerDay: 5, topics: ['AI', 'Leadership', 'HR', 'Business Analytics', 'MBA'] },
  newsletter: { enabled: true, day: 5, time: '09:00', autoFromBlog: true },
}

const Loading = () => (<div className="grid place-items-center py-20"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" /><p className="text-sm text-muted-foreground font-code">Loading module…</p></div></div>)

// ================================================================== COPILOT
function Copilot({ go }) {
  const [open, setOpen] = useState(false)
  const cmds = [['Generate today\u2019s post', () => go('social')], ['Show pending approvals', () => go('social')], ['Find AI news', () => go('news')], ['Show failed jobs', () => go('audit')], ['Open Integrations', () => go('integrations')]]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="fixed bottom-6 right-6 h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 grid place-items-center glow-purple z-50 hover:scale-105 transition">
          <Brain className="h-6 w-6 text-white" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="glass-strong border-white/10 w-72 mr-2">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-violet-400" /><span className="font-display font-semibold text-sm">AI Copilot</span></div>
        <div className="space-y-1.5">
          {cmds.map(([label, fn]) => (
            <button key={label} onClick={() => { fn(); setOpen(false) }} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition flex items-center gap-2"><Play className="h-3 w-3 text-blue-400" /> {label}</button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ================================================================== SHELL
function Shell({ user, onLogout }) {
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#integrations' ? 'integrations' : 'dashboard'))
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [wakeWord, setWakeWord] = useState('Hey Jarvis')
  const [honorific, setHonorific] = useState('Boss')
  const go = (v) => { setView(v); setMobileOpen(false); if (typeof window !== 'undefined') history.replaceState(null, '', v === 'dashboard' ? '/' : `/#${v}`) }

  const render = () => {
    switch (view) {
      case 'dashboard': return <DashboardView go={go} />
      case 'social': return <SocialView />
      case 'blog': return <BlogView />
      case 'news': return <NewsView go={go} />
      case 'seasonal': return <SeasonalView />
      case 'repurposing': return <RepurposeView />
      case 'idea_vault': return <VaultView go={go} />
      case 'calendar': return <CalendarView />
      case 'analytics': return <AnalyticsView />
      case 'linkedin_engage': return <EngageView />
      case 'brand': return <BrandView />
      case 'factcheck': return <FactCheckView />
      case 'ai_cost': return <CostView />
      case 'newsletter': return <NewsletterView />
      case 'recruiter': return <RecruiterView />
      case 'portfolio': return <PortfolioView />
      case 'integrations': return <IntegrationsView />
      case 'assistant': return <AssistantView voiceEnabled={voiceEnabled} setVoiceEnabled={setVoiceEnabled} wakeWord={wakeWord} setWakeWord={setWakeWord} honorific={honorific} setHonorific={setHonorific} />
      case 'audit': return <AuditView />
      case 'scheduler': return <SchedulerView />
      case 'discord': return <DiscordView />
      case 'email': return <EmailView />
      case 'connections': return <ConnectionsView />
      case 'mission_control': return <MissionControlView />
      case 'learning': return <LearningView />
      case 'versions': return <VersionsView />
      case 'autopilot': return <AutopilotView />
      default: return <DashboardView go={go} />
    }
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 h-16 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center shrink-0"><Cpu className="h-5 w-5 text-white" /></div>
        {!collapsed && <div><div className="font-display font-bold leading-tight">NEXUS</div><div className="text-[9px] text-muted-foreground font-code tracking-widest">COMMAND CENTER</div></div>}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {NAV.map((grp) => (
          <div key={grp.section} className="mb-4">
            {!collapsed && <div className="px-3 text-[10px] font-code tracking-widest text-muted-foreground/60 mb-1.5">{grp.section}</div>}
            {grp.items.map((it) => {
              const Ic = it.icon; const active = view === it.id
              return (
                <button key={it.id} onClick={() => go(it.id)} title={it.label}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 mb-0.5 text-sm transition-all relative ${active ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white' : 'text-muted-foreground hover:text-white hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gradient-to-b from-blue-400 to-violet-400" />}
                  <Ic className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : ''}`} />
                  {!collapsed && <span className="truncate font-grotesk">{it.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex grid-bg">
      {/* desktop sidebar */}
      <aside className={`hidden lg:flex flex-col glass-strong border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <SidebarInner />
        <button onClick={() => setCollapsed(!collapsed)} className="h-10 border-t border-white/5 grid place-items-center text-muted-foreground hover:text-white"><ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} /></button>
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed inset-y-0 left-0 w-64 glass-strong z-50 lg:hidden"><SidebarInner /></motion.aside>
          </>
        )}
      </AnimatePresence>

      <VoiceAssistant
        enabled={voiceEnabled}
        wakeWord={wakeWord}
        honorific={honorific}
        go={go}
        onStatus={setVoiceEnabled}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* topbar */}
        <header className="h-16 glass-strong border-b border-white/5 flex items-center gap-3 px-4 sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search modules, posts, integrations…" className="w-full bg-secondary/40 border border-white/10 rounded-lg pl-9 pr-3 h-9 text-sm outline-none focus:border-blue-500/50" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 gap-1.5 hidden sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> AI 97%</Badge>
            <button className="relative h-9 w-9 rounded-lg glass grid place-items-center"><Bell className="h-4 w-4 text-muted-foreground" /><span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-400" /></button>
            <div className="flex items-center gap-2 pl-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center text-xs font-bold">M</div>
              <div className="hidden md:block"><div className="text-sm font-grotesk leading-tight">{user.name}</div><div className="text-[10px] text-muted-foreground">{user.role}</div></div>
              <button onClick={onLogout} className="h-8 w-8 rounded-lg glass grid place-items-center text-muted-foreground hover:text-red-400 ml-1"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ErrorBoundary key={view}>{render()}</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Copilot go={go} />
    </div>
  )
}

// ================================================================== Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('View Error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center p-8">
          <div className="glass rounded-xl p-8 max-w-md text-center">
            <div className="h-12 w-12 rounded-lg bg-red-500/20 grid place-items-center mx-auto mb-4"><ShieldAlert className="h-6 w-6 text-red-400" /></div>
            <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">{String(this.state.error?.message || 'An error occurred')}</p>
            <Button onClick={() => { this.setState({ hasError: false }); window.location.reload() }} className="bg-blue-600 hover:bg-blue-500">Reload Page</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ================================================================== ROOT
function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null
    try { const u = localStorage.getItem('nexus_user'); const t = localStorage.getItem('nexus_token'); return (u && t) ? JSON.parse(u) : null } catch { return null }
  })
  const [ready, setReady] = useState(false)
  // Persist face verification in sessionStorage — survives page reloads / HMR /
  // preview proxy refreshes that re-showed the FaceGate every few seconds.
  const [faceVerified, setFaceVerified] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return sessionStorage.getItem('nexus_face_verified') === 'true' } catch { return false }
  })
  const [showFace, setShowFace] = useState(false)
  const markFace = (v) => { setFaceVerified(v); try { if (v) sessionStorage.setItem('nexus_face_verified', 'true'); else sessionStorage.removeItem('nexus_face_verified') } catch {} }
  useEffect(() => {
    const t = localStorage.getItem('nexus_token'); const u = localStorage.getItem('nexus_user')
    if (t && u) {
      try { setUser(JSON.parse(u)) } catch {}
      api('/auth/me').then((r) => setUser(r.user)).catch((err) => {
        if (String(err.message).toLowerCase().includes('unauthorized')) { localStorage.removeItem('nexus_token'); localStorage.removeItem('nexus_user'); setUser(null) }
      })
    }
    setReady(true)
  }, [])
  // Face ID is verified ONCE per tab session and stored in sessionStorage —
  // no focus/visibility re-prompting, and it survives page reloads/HMR/preview
  // refreshes that were re-showing the gate every few seconds.
  const logout = () => { try { sessionStorage.removeItem('nexus_face_verified') } catch {} localStorage.removeItem('nexus_token'); localStorage.removeItem('nexus_user'); setUser(null); setFaceVerified(false); toast.success('Session ended') }
  if (!ready) return <div className="min-h-screen grid-bg grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
  if (!user) return <Login onLogin={setUser} />
  if (!faceVerified) {
    return <FaceGate
      onVerified={() => { markFace(true); setShowFace(false) }}
      onSkip={() => { markFace(true); setShowFace(false) }}
    />
  }
  return <Shell user={user} onLogout={logout} />
}

export default App
