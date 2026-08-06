// Minimal working version for Vercel
import { NextResponse } from 'next/server'

export async function GET(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/api/root' || path === '/') {
    return NextResponse.json({ message: 'NEXUS API online', status: 'working', time: new Date().toISOString() })
  }

  if (path === '/api/health') {
    return NextResponse.json({ status: 'healthy' })
  }

  return NextResponse.json({ error: 'Not found', path }, { status: 404 })
}

export async function POST(request) {
  return NextResponse.json({ message: 'POST received' })
}
