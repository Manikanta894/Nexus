// Discord helpers — approval cards via webhooks + slash-less interaction handling.
import { verifyKey, InteractionType, InteractionResponseType, MessageComponentTypes, ButtonStyleTypes } from 'discord-interactions'

export const COLOR = {
  pending: 0xf59e0b, // amber
  published: 0x22c55e, // green
  rejected: 0xef4444, // red
  info: 0x3b82f6, // blue
  violet: 0x8b5cf6,
}

export function makeButtons(module, id, status) {
  const pending = status === 'Pending Approval' || status === 'Scheduled' || status === 'Draft'
  const row = { type: 1, components: [] }
  const add = (style, label, action, danger = false) => {
    row.components.push({
      type: MessageComponentTypes.BUTTON,
      style: danger ? ButtonStyleTypes.DANGER : style,
      label,
      custom_id: `${module}|${id}|${action}`,
    })
  }
  if (pending) {
    add(ButtonStyleTypes.SUCCESS, 'Approve', 'approve')
    add(ButtonStyleTypes.PRIMARY, 'Schedule', 'schedule')
    add(ButtonStyleTypes.SECONDARY, 'Regenerate', 'regenerate')
    add(ButtonStyleTypes.SECONDARY, 'Edit', 'edit')
    add(ButtonStyleTypes.SECONDARY, 'Skip', 'skip')
    add(ButtonStyleTypes.DANGER, 'Reject', 'reject')
  }
  return row
}

export function buildEmbed({ title, description, fields = [], imageUrl, color = COLOR.pending, footer }) {
  const embed = {
    title: title ? title.slice(0, 256) : 'NEXUS Approval',
    description: description ? description.slice(0, 4000) : '',
    color,
    timestamp: new Date().toISOString(),
  }
  if (fields.length) embed.fields = fields.slice(0, 25)
  if (imageUrl) embed.image = { url: imageUrl }
  if (footer) embed.footer = { text: footer.slice(0, 200) }
  return embed
}

export async function sendApprovalCard(webhookUrl, { title, description, fields, imageUrl, color, buttons, footer }) {
  const payload = { embeds: [buildEmbed({ title, description, fields, imageUrl, color, footer })] }
  if (buttons && buttons.components.length) payload.components = [buttons]
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`)
  return true
}

export async function editInteractionMessage(applicationId, interactionToken, { embeds, components }) {
  const res = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds, components }),
  })
  if (!res.ok) throw new Error(`Discord edit failed: ${res.status}`)
  return true
}

// Verify a Discord interaction request (X-Signature-Ed25519 / X-Signature-Timestamp)
export function verifyInteractionRequest(publicKey, rawBody, signature, timestamp) {
  if (!publicKey || !signature || !timestamp) return false
  try {
    return verifyKey(rawBody, signature, timestamp, publicKey)
  } catch {
    return false
  }
}

export function interactionAck() {
  return new Response(JSON.stringify({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const INTERACTION_TYPES = InteractionType
