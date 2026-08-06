// Google service-account (JWT) helpers — Sheets + Drive, no SDK needed.
import crypto from 'crypto'

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

export function parseServiceAccount(saJson) {
  try { return JSON.parse(saJson) } catch { return null }
}

export async function googleAccessToken(saJson) {
  const sa = parseServiceAccount(saJson)
  if (!sa?.client_email || !sa?.private_key) throw new Error('Invalid service account JSON')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const data = `${b64u(header)}.${b64u(claims)}`
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), sa.private_key)
  const assertion = `${data}.${sig.toString('base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.access_token) throw new Error(`Google token failed: ${res.status} ${body.error_description || body.error || ''}`)
  return body.access_token
}

// Write one row of headers + values to a sheet tab (appends, creates headers on first write)
export async function sheetsEnsureTab(saJson, spreadsheetId, tabName, headers) {
  const token = await googleAccessToken(saJson)
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = await metaRes.json().catch(() => ({}))
  const exists = (meta.sheets || []).some((s) => s.properties.title === tabName)
  if (!exists) {
    const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
    })
    if (!addRes.ok) throw new Error('Could not create sheet tab')
  }
  // Ensure header row exists (only write if row 1 is empty)
  const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:${String.fromCharCode(64 + headers.length)}1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const read = await readRes.json().catch(() => ({}))
  const values = read.values || []
  if (!values.length) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:${String.fromCharCode(64 + headers.length)}1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] }),
    })
  }
  return true
}

// Append a row of values to a tab (tab must exist)
export async function sheetsAppend(saJson, spreadsheetId, tabName, row) {
  const token = await googleAccessToken(saJson)
  const range = `${tabName}!A1:ZZ1`
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  })
  if (!res.ok) throw new Error(`Sheets append failed: ${res.status}`)
  return true
}

export async function sheetsRead(saJson, spreadsheetId, tabName) {
  const token = await googleAccessToken(saJson)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`)
  return (await res.json()).values || []
}

// ---------------- Drive ----------------
export async function driveList(saJson, folderId) {
  const token = await googleAccessToken(saJson)
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=100&fields=files(id,name,mimeType,createdTime,size)&orderBy=createdTime`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  return (await res.json()).files || []
}

export async function driveMove(saJson, fileId, toFolderId) {
  const token = await googleAccessToken(saJson)
  // First get current parents (Drive API needs explicit parent IDs, ~ wildcard doesn't work)
  const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = await getRes.json().catch(() => ({}))
  const removeParents = (meta.parents || []).join(',')
  // Move: add new parent + remove old parents
  const qs = `addParents=${toFolderId}` + (removeParents ? `&removeParents=${encodeURIComponent(removeParents)}` : '')
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${qs}&fields=id,name,parents`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive move failed: ${res.status}`)
  return (await res.json()).id
}

export async function driveThumbnail(file) {
  return file ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w800` : null
}
