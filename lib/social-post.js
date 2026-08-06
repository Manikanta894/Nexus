// lib/social-post.js — Direct posting to social media platforms
// Handles LinkedIn, Facebook, Instagram, Threads

import crypto from 'crypto'

function encrypt(text) {
  if (!text) return ''
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(process.env.APP_SECRET || 'dev', 'nexus-salt', 32)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

function decrypt(v) {
  try {
    if (!v || !v.startsWith('enc:')) return v || ''
    const [, ivb, tagb, data] = v.split(':')
    const key = crypto.scryptSync(process.env.APP_SECRET || 'dev', 'nexus-salt', 32)
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivb, 'base64'))
    d.setAuthTag(Buffer.from(tagb, 'base64'))
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
  } catch { return '' }
}

// ============ LINKEDIN ============
export async function postToLinkedIn({ caption, imageUrl, personUrn, accessToken }) {
  try {
    // Register upload if image
    let imageAsset = null
    if (imageUrl) {
      const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-document'],
            owner: personUrn,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
          }
        })
      })
      if (regRes.ok) {
        const regData = await regRes.json()
        imageAsset = regData.value.asset
      }
    }

    // Create post
    const postBody = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: imageAsset ? 'IMAGE' : 'NONE',
          media: imageAsset ? [{ status: 'READY', media: imageAsset }] : undefined
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.message || `LinkedIn ${res.status}` }
    return { ok: true, id: data.id || 'posted' }
  } catch (e) { return { ok: false, error: e.message } }
}

// ============ FACEBOOK ============
export async function postToFacebook({ caption, imageUrl, pageId, accessToken }) {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/feed`
    const params = new URLSearchParams({ access_token: accessToken, message: caption })
    if (imageUrl) params.set('link', imageUrl)
    const res = await fetch(url, { method: 'POST', body: params })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || `Facebook ${res.status}` }
    return { ok: true, id: data.id }
  } catch (e) { return { ok: false, error: e.message } }
}

// ============ INSTAGRAM ============
export async function postToInstagram({ caption, imageUrl, igUserId, accessToken }) {
  try {
    if (!imageUrl) return { ok: false, error: 'Instagram requires an image' }
    // Create media container
    const createRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken })
    })
    const createData = await createRes.json()
    if (!createRes.ok) return { ok: false, error: createData.error?.message }
    // Publish
    const pubRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: accessToken })
    })
    const pubData = await pubRes.json()
    if (!pubRes.ok) return { ok: false, error: pubData.error?.message }
    return { ok: true, id: pubData.id }
  } catch (e) { return { ok: false, error: e.message } }
}

// ============ THREADS ============
export async function postToThreads({ caption, imageUrl, userId, accessToken }) {
  try {
    // Create media container
    const params = new URLSearchParams({ access_token: accessToken, text: caption })
    if (imageUrl) {
      params.set('media_type', 'IMAGE')
      params.set('image_url', imageUrl)
    } else {
      params.set('media_type', 'TEXT')
    }
    const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      body: params
    })
    const createData = await createRes.json()
    if (!createRes.ok) return { ok: false, error: createData.error?.message }
    // Publish
    const pubRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method: 'POST',
      body: new URLSearchParams({ creation_id: createData.id, access_token: accessToken })
    })
    const pubData = await pubRes.json()
    if (!pubRes.ok) return { ok: false, error: pubData.error?.message }
    return { ok: true, id: pubData.id }
  } catch (e) { return { ok: false, error: e.message } }
}

export { encrypt, decrypt }
