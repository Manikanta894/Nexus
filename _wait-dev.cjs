// Wait until the dev server responds on /api/root, then exit 0.
const BASE = process.env.BASE || 'http://127.0.0.1:3100'
const until = Date.now() + 120000
;(async () => {
  while (Date.now() < until) {
    try {
      const r = await fetch(BASE + '/api/root', { signal: AbortSignal.timeout(4000) })
      if (r.ok) { console.log('READY'); process.exit(0) }
      // not 200 but responding -> maybe compiling; keep waiting
      console.error('status', r.status)
    } catch {}
    await new Promise((res) => setTimeout(res, 3000))
  }
  console.error('TIMEOUT waiting for dev server')
  process.exit(2)
})()