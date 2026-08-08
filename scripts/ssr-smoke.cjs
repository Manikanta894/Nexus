// SSR smoke test for client components that must never crash on render.
// React enforces its re-render limit during server rendering too, so this
// catches "Too many re-renders" (minified React error #301) bugs headlessly —
// e.g. state-updating handlers invoked during render instead of passed as refs.
//
// Usage: node scripts/ssr-smoke.cjs [path-to-component.jsx]
// Defaults to components/mission-control.jsx (Auto-Pilot 24/7 view).
//
// Works without any extra dependencies: uses Next's bundled SWC compiler to
// transpile the JSX to CommonJS, stubs browser globals, then renderToString().
const fs = require('fs')
const path = require('path')
const os = require('os')
const { transform } = require('next/dist/build/swc')

const target = process.argv[2] || path.join(__dirname, '..', 'components', 'mission-control.jsx')

// --- browser global stubs (SSR never runs effects, so these stay inert) ---
global.localStorage = { getItem: () => null, setItem: () => {} }
global.fetch = () => new Promise(() => {})
if (!global.AbortController) global.AbortController = class { constructor() { this.signal = {} } abort() {} }

async function main() {
  const src = fs.readFileSync(target, 'utf8')
  const out = await transform(src, {
    filename: path.basename(target),
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
      target: 'es2020',
    },
    module: { type: 'commonjs' },
  })

  // Write next to the project root so require() resolves node_modules deps.
  const tmp = path.join(__dirname, '..', `.ssr-smoke-${Date.now()}.cjs`)
  fs.writeFileSync(tmp, out.code)

  try {
    const React = require('react')
    const { renderToString } = require('react-dom/server')
    const Component = require(tmp).default

    const watchdog = setTimeout(() => {
      console.error('WATCHDOG TIMEOUT: render hung (infinite render loop suspected)')
      process.exit(2)
    }, 8000)

    const t0 = Date.now()
    const html = renderToString(React.createElement(Component, { go: () => {} }))
    clearTimeout(watchdog)
    console.log(`SSR SMOKE OK — ${path.basename(target)} rendered in ${Date.now() - t0}ms (${html.length} bytes)`)
    process.exit(0)
  } catch (e) {
    console.error(`SSR SMOKE FAILED — ${path.basename(target)}: ${e.message}`)
    process.exit(1)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

main().catch((e) => { console.error('ssr-smoke error:', e); process.exit(1) })