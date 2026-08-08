// lib/watchdog.js — turns raw system data (integrations, queues, drive counts, costs)
// into the two things NEXUS needs to feel alive:
//   1. a formatted Live Activity Feed  (formatActivity)
//   2. Reason / Impact / Fix warnings   (buildWarnings)
// Nothing here talks to Mongo or Google directly — it's pure functions over data
// the API route already has, so it's easy to test and easy to extend.

// ---------------------------------------------------------------- time helpers
export function timeAgo(iso) {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatUptime(sinceIso) {
  if (!sinceIso) return { days: 0, hours: 0, minutes: 0, label: '0m' }
  const ms = Math.max(0, Date.now() - new Date(sinceIso).getTime())
  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const label = days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  return { days, hours, minutes: mins, label }
}

// ---------------------------------------------------------------- next scheduled task
// Given the autopilot config, finds the nearest upcoming task across all modules.
export function computeNextTask(cfg, now = new Date()) {
  if (!cfg) return null
  const candidates = []
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const pushTime = (label, hhmm, module) => {
    if (!hhmm) return
    const [h, m] = hhmm.split(':').map(Number)
    let target = h * 60 + m
    let dayOffset = 0
    if (target <= nowMin) { target += 1440; dayOffset = 1 } // rolls to tomorrow
    candidates.push({ label, module, etaMinutes: target - nowMin, dayOffset, time: hhmm })
  }

  if (cfg.social?.enabled) (cfg.social.times || []).forEach((t) => pushTime('Social post generation', t, 'social'))
  if (cfg.blog?.enabled) {
    if (Array.isArray(cfg.blog.times)) cfg.blog.times.forEach((t) => pushTime('Blog generation', t, 'blog'))
    else if (cfg.blog.time) pushTime('Blog generation', cfg.blog.time, 'blog')
  }
  if (cfg.newsletter?.enabled && cfg.newsletter.time) {
    const targetDow = cfg.newsletter.day ?? 5
    let dayOffset = (targetDow - now.getDay() + 7) % 7
    const [h, m] = cfg.newsletter.time.split(':').map(Number)
    const target = h * 60 + m
    if (dayOffset === 0 && target <= nowMin) dayOffset = 7
    candidates.push({ label: 'Newsletter send', module: 'newsletter', etaMinutes: dayOffset * 1440 + (target - nowMin), dayOffset, time: cfg.newsletter.time })
  }
  if (cfg.news?.enabled && cfg.news.intervalMinutes) {
    candidates.push({ label: 'News Radar scan', module: 'news', etaMinutes: cfg.news.intervalMinutes, dayOffset: 0, time: null, recurring: true })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => a.etaMinutes - b.etaMinutes)
  const next = candidates[0]
  const h = Math.floor(next.etaMinutes / 60)
  const m = next.etaMinutes % 60
  next.etaLabel = h > 0 ? `${h}h ${m}m` : `${m}m`
  return next
}

// ---------------------------------------------------------------- activity feed
const ACTION_META = {
  'social.generate': { label: (m) => `Generated a new social draft (${m.pillar || 'general'})`, icon: 'sparkles', severity: 'info' },
  'social.linkedin': { label: () => 'Published to LinkedIn', icon: 'linkedin', severity: 'success' },
  'social.facebook': { label: () => 'Published to Facebook', icon: 'facebook', severity: 'success' },
  'social.instagram': { label: () => 'Published to Instagram', icon: 'instagram', severity: 'success' },
  'social.threads': { label: () => 'Published to Threads', icon: 'sparkles', severity: 'success' },
  'social.post': { label: () => 'Cross-platform publish completed', icon: 'send', severity: 'success' },
  'social.publish': { label: () => 'Social post approved & published', icon: 'check', severity: 'success' },
  'social.reject': { label: () => 'Social draft rejected', icon: 'x', severity: 'warning' },
  'social.schedule': { label: () => 'Social post scheduled', icon: 'clock', severity: 'info' },
  'social.edit': { label: () => 'Social draft edited', icon: 'pencil', severity: 'info' },
  'social.regenerate': { label: () => 'Social draft regenerated', icon: 'refresh', severity: 'info' },
  'social.revert': { label: () => 'Social post reverted to a previous version', icon: 'refresh', severity: 'info' },
  'blog.generate': { label: (m) => `Generated a new blog draft (${m.pillar || 'general'})`, icon: 'file', severity: 'info' },
  'blog.published': { label: () => 'Blog article published', icon: 'check', severity: 'success' },
  'blog.publish_failed': { label: (m) => `Blog publish failed — ${m.error || 'unknown error'}`, icon: 'alert', severity: 'critical' },
  'blog.reject': { label: () => 'Blog draft rejected', icon: 'x', severity: 'warning' },
  'newsletter.auto_generated': { label: () => 'Newsletter draft auto-generated from blog', icon: 'mail', severity: 'info' },
  'newsletter.send': { label: (m) => `Newsletter sent to ${m.recipients || 0} subscribers`, icon: 'mail', severity: 'success' },
  'drive.archive': { label: () => 'Source image archived after publishing', icon: 'archive', severity: 'info' },
  'drive.pick': { label: (m) => `Picked next image from Drive — ${m.fileName || ''}`, icon: 'image', severity: 'info' },
  'news.scan': { label: (m) => `News Radar scan complete — ${m.scanned || 0} scanned, ${m.kept || 0} relevant`, icon: 'radar', severity: 'info' },
  'seasonal.scan': { label: (m) => `Seasonal scan produced ${m.made || 0} campaign ideas`, icon: 'calendar', severity: 'info' },
  'vault.cluster': { label: (m) => `Idea Vault clustered ${m.processed || 0} items`, icon: 'lightbulb', severity: 'info' },
  'vault.promote': { label: () => 'Idea promoted to pipeline', icon: 'rocket', severity: 'info' },
  'repurpose.generate': { label: () => 'Repurposed a published post into new content', icon: 'repeat', severity: 'info' },
  'integration.save': { label: (m) => `Integration updated — ${m.id}`, icon: 'plug', severity: 'info' },
  'integration.test': { label: (m) => `Integration test ${m.ok ? 'passed' : 'FAILED'} — ${m.id}`, icon: 'plug', severity: (m) => m.ok ? 'success' : 'critical' },
  'integration.disconnect': { label: (m) => `Integration disconnected — ${m.id}`, icon: 'plug', severity: 'warning' },
  'discord.test': { label: () => 'Discord webhook test sent', icon: 'discord', severity: 'info' },
  'oauth.connect': { label: (m) => `OAuth connected — ${m.provider}`, icon: 'plug', severity: 'success' },
  'factcheck.run': { label: (m) => `Fact-check run — status: ${m.status}`, icon: 'shield', severity: (m) => m.status === 'Blocked' ? 'warning' : 'info' },
  'cron.publish': { label: (m) => `Scheduled ${m.module} auto-published`, icon: 'send', severity: 'success' },
  'cron.run': { label: (m) => `Scheduler heartbeat — ${m.publishedSocial || 0} social, ${m.publishedBlog || 0} blog published`, icon: 'activity', severity: 'info' },
  'autopilot.update': { label: () => 'Auto-Pilot configuration saved', icon: 'zap', severity: 'info' },
  'autopilot.run': { label: () => 'Auto-Pilot manually triggered — Run Now', icon: 'zap', severity: 'info' },
  'auth.login': { label: () => 'Signed in to NEXUS', icon: 'lock', severity: 'info' },
  'brand.update': { label: () => 'Brand intelligence profile updated', icon: 'brain', severity: 'info' },
  'sheets.sync_failed': { label: (m) => `Google Sheets sync failed for ${m.collection}`, icon: 'alert', severity: 'critical' },
}

export function formatActivity(entry) {
  const meta = ACTION_META[entry.action] || { label: () => entry.action, icon: 'activity', severity: 'info' }
  let label = entry.action
  try { label = meta.label(entry.meta || {}) } catch { label = entry.action }
  return {
    id: entry.id,
    ts: entry.ts,
    timeAgo: timeAgo(entry.ts),
    actor: entry.actor,
    action: entry.action,
    icon: meta.icon,
    severity: typeof meta.severity === 'function' ? meta.severity(entry.meta || {}) : meta.severity,
    label,
  }
}

// ---------------------------------------------------------------- warnings
// Every warning: { id, severity, title, reason, impact, fix }
// severity: 'critical' | 'warning' | 'info' | 'success'
export function buildWarnings({ imagesRemaining, driveConfigured, integrations, aiConnectedCount, budgetUsedPct, oldestPendingHours, lockedStuck }) {
  const warnings = []

  if (!driveConfigured) {
    warnings.push({
      id: 'drive-not-configured',
      severity: 'warning',
      title: 'Google Drive is not connected',
      reason: 'No Source Folder ID / service account is saved for Google Drive.',
      impact: 'Auto-Pilot cannot pick images for Social Automation — it will fall back to quick-compose or stop generating.',
      fix: 'Go to Integrations → Google Drive and add the Source + Archive Folder IDs.',
    })
  } else if (typeof imagesRemaining === 'number') {
    if (imagesRemaining === 0) {
      warnings.push({
        id: 'drive-empty',
        severity: 'critical',
        title: 'Social Source folder is empty',
        reason: 'Every image in the Drive Source folder has been used or is currently locked.',
        impact: 'Automation will stop generating new image-based posts after the current schedule.',
        fix: 'Upload new images to the Social Source folder in Google Drive.',
      })
    } else if (imagesRemaining <= 10) {
      warnings.push({
        id: 'drive-low',
        severity: 'warning',
        title: `Only ${imagesRemaining} image${imagesRemaining === 1 ? '' : 's'} remaining`,
        reason: 'The Social Source Drive folder is running low on unused images.',
        impact: `At the current posting rate, automation has roughly ${Math.max(1, Math.round(imagesRemaining / 2))}–${imagesRemaining} day(s) of runway left.`,
        fix: 'Upload at least 30 new images to keep Auto-Pilot fed.',
      })
    }
  }

  if (lockedStuck > 0) {
    warnings.push({
      id: 'drive-locks-stuck',
      severity: 'warning',
      title: `${lockedStuck} image${lockedStuck === 1 ? ' is' : 's are'} locked but never published`,
      reason: 'An image was picked from Drive (FIFO lock created) but no matching post completed the pipeline.',
      impact: 'These images are stuck out of rotation and will never be re-picked until the lock clears.',
      fix: 'Open Mission Control → Queue Monitor and clear or retry the stalled job.',
    })
  }

  if (aiConnectedCount === 0) {
    warnings.push({
      id: 'ai-none-connected',
      severity: 'critical',
      title: 'No AI provider is connected',
      reason: 'None of NVIDIA NIM, OpenRouter, Groq or OpenAI have a saved, enabled API key.',
      impact: 'Content generation is running in demo mode with placeholder text instead of real AI output.',
      fix: 'Add at least one API key under Integrations → AI Providers.',
    })
  }

  if (typeof budgetUsedPct === 'number' && budgetUsedPct >= 85) {
    warnings.push({
      id: 'ai-budget-high',
      severity: budgetUsedPct >= 100 ? 'critical' : 'warning',
      title: `AI budget ${budgetUsedPct >= 100 ? 'exceeded' : `at ${budgetUsedPct}%`}`,
      reason: 'Monthly spend across AI providers is approaching or has passed the configured cap.',
      impact: budgetUsedPct >= 100 ? 'Further generation calls may be blocked or fall back to a lower-quality provider.' : 'Generation may soon fall back to a cheaper provider if usage continues at this rate.',
      fix: 'Review AI Cost Dashboard and raise the cap or reduce posting frequency.',
    })
  }

  for (const integ of integrations || []) {
    if (integ.status === 'expired') {
      warnings.push({
        id: `integ-expired-${integ.id}`,
        severity: 'critical',
        title: `${integ.name} connection failed its last test`,
        reason: `The last connection test for ${integ.name} returned a failure — the token or key is likely expired or revoked.`,
        impact: `Any automation step that depends on ${integ.name} will fail silently until reconnected.`,
        fix: `Go to Integrations → ${integ.name}, re-enter credentials and run Test again.`,
      })
    }
  }

  if (typeof oldestPendingHours === 'number' && oldestPendingHours >= 24) {
    warnings.push({
      id: 'approval-stale',
      severity: 'warning',
      title: 'A draft has been waiting for approval over 24h',
      reason: 'The oldest item in the approval queue has not been approved, edited, or rejected.',
      impact: 'Scheduled follow-up content may be delayed since the pipeline is backing up behind it.',
      fix: 'Open the Approval Center in Discord or the PWA and clear the backlog.',
    })
  }

  if (!warnings.length) {
    warnings.push({
      id: 'all-clear',
      severity: 'success',
      title: 'Everything is healthy',
      reason: 'All connected watchers reported normal status on the last check.',
      impact: 'No action needed.',
      fix: null,
    })
  }

  return warnings
}
