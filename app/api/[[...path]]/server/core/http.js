// ---------------------------------------------------------------------------
// core/http.js — response helpers shared by every API domain module.
// ---------------------------------------------------------------------------
import { NextResponse } from 'next/server'

export const json = (data, status = 200) => NextResponse.json(data, { status })

// Small HTML page for browser-redirect flows (OAuth callbacks).
export const html = (msg, ok = true) =>
  new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;background:#09090B;color:#fff"><div style="text-align:center"><h2>${ok ? '' : '⚠️ '}${msg}</h2><p>You may close this tab.</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )