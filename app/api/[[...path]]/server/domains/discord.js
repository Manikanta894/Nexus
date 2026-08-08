// ---------------------------------------------------------------------------
// domains/discord.js — Discord Operations Center (signature-verified
// interactions, webhook test, status).
//   GET  /discord               connection status + recent interactions
//   GET  /discord/interactions  recent interactions
//   POST /discord/interactions  Ed25519-signed interaction endpoint
//   POST /discord/test          send a test approval card via webhook
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid'
import { json } from '../core/http.js'
import { db, audit, findIntegration } from '../core/store.js'
import { demoGenerate, qualityScores } from '../core/content.js'
import { verifyInteractionRequest, interactionAck, INTERACTION_TYPES, sendApprovalCard, editInteractionMessage, buildEmbed, COLOR } from '../../../../../lib/discord.js'
import { decrypt } from '../../../../../lib/social-post.js'

// Discord approval webhook resolution: the saved (encrypted) integration field
// takes priority; fall back to the DISCORD_WEBHOOK env var for persistence
// across restarts / redeploys.
function resolveDiscordWebhook(it) {
  if (it?.fields?.webhookUrl) { try { return decrypt(it.fields.webhookUrl) } catch {} }
  return process.env.DISCORD_WEBHOOK || ''
}

export const routes = {
  // Resolve the Discord approval webhook: saved (encrypted) integration wins,
  // otherwise fall back to the DISCORD_WEBHOOK env var — so the connection
  // survives server restarts / redeploys even before the in-memory store is
  // populated.
  'GET /discord': () => {
    const it = findIntegration('discord')
    const interactions = db.discord_interactions.slice(-20).reverse()
    const webhook = resolveDiscordWebhook(it)
    return json({ webhook: !!webhook, publicKey: !!it?.fields?.publicKey || !!process.env.DISCORD_PUBLIC_KEY, interactionCount: db.discord_interactions.length, interactions })
  },

  'GET /discord/interactions': () => json({ interactions: db.discord_interactions.slice(-20).reverse() }),

  'POST /discord/interactions': async ({ request }) => {
    const rawBody = await request.text()
    const sig = request.headers.get('x-signature-ed25519') || ''
    const stamp = request.headers.get('x-signature-timestamp') || ''
    const it = findIntegration('discord')
    const pubKey = it?.fields?.publicKey || process.env.DISCORD_PUBLIC_KEY || ''
    if (!pubKey || !verifyInteractionRequest(pubKey, rawBody, sig, stamp)) return json({ error: 'Invalid signature' }, 401)
    let ix
    try { ix = JSON.parse(rawBody) } catch { return json({ error: 'Invalid payload' }, 400) }
    db.discord_interactions.push({ id: uuidv4(), type: ix.type, user: ix.member?.user?.username || ix.user?.username || 'unknown', data: ix.data, ts: new Date().toISOString() })
    if (ix.type === INTERACTION_TYPES.PING) return json({ type: 1 })
    if (ix.type === INTERACTION_TYPES.MESSAGE_COMPONENT) {
      const [module, id, action] = (ix.data?.custom_id || '').split('|')
      let job = null
      if (module === 'social') job = db.social_posts.find(p => p.id === id)
      else if (module === 'blog') job = db.blog_posts.find(p => p.id === id)
      else if (module === 'seasonal') job = db.seasonal_campaigns.find(p => p.id === id)
      const ownerId = it?.fields?.ownerId
      const uid = ix.member?.user?.id
      if (ownerId && uid && uid !== ownerId) return json({ type: 4, data: { content: 'Only the NEXUS owner can approve.', flags: 64 } })
      if (job) {
        if (action === 'approve') { job.status = 'Published'; job.publishedAt = new Date().toISOString() }
        else if (action === 'reject') job.status = 'Rejected'
        else if (action === 'skip') job.status = 'Skipped'
        else if (action === 'schedule') job.status = 'Scheduled'
        else if (action === 'regenerate') { const a = { ...job.analysis, topic: job.analysis.topic + ' ' }; job.platforms = demoGenerate(db.brand[0]?.data || {}, a, job.selectedPlatforms || ['linkedin', 'instagram', 'facebook', 'threads']); job.quality = qualityScores(a.topic) }
        job.updatedAt = new Date().toISOString()
        audit('discord', `${module}.${action}`, { id: job.id })
        try {
          await editInteractionMessage(ix.application_id, ix.token, { embeds: [buildEmbed({ title: job.imageName || job.article?.title || 'NEXUS', description: `Status → ${job.status}`, color: job.status === 'Published' ? COLOR.published : job.status === 'Rejected' ? COLOR.rejected : COLOR.pending })], components: [] })
        } catch {}
      }
      return interactionAck()
    }
    return json({ type: 4, data: { content: 'Unsupported interaction', flags: 64 } })
  },

  'POST /discord/test': async ({ request }) => {
    const it = findIntegration('discord')
    const wu = resolveDiscordWebhook(it)
    if (!wu) return json({ error: 'Discord webhook not configured' }, 400)
    const body = await request.json().catch(() => ({}))
    await sendApprovalCard(wu, { title: 'NEXUS test', description: body.message || 'Discord Hub is connected ✓', color: COLOR.info }).catch(e => { throw new Error(e.message) })
    return json({ ok: true })
  },
}