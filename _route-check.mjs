// Static cross-check: every route the OLD monolith handled must still be
// dispatchable via the NEW domain route tables. Pure regex parse — nothing
// is executed, so bundler/JSX concerns don't apply.
import fs from 'fs'
import path from 'path'

const OLD = 'd:/Nexus/_route-archive.js'
const DOMAINS = 'd:/Nexus/app/api/[[...path]]/server/domains'
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']

// 1) Parse old monolith: route literals + the method they were gated by (if any).
const oldSrc = fs.readFileSync(OLD, 'utf8')
const required = new Map() // route -> Set(method | 'ANY')
const routeRe = /route === '([^']+)'/g
let m
while ((m = routeRe.exec(oldSrc))) {
  const seg = oldSrc.slice(m.index, m.index + 140)
  const meth = seg.match(/method === '([A-Z]+)'/)
  const key = m[1]
  if (!required.has(key)) required.set(key, new Set())
  required.get(key).add(meth ? meth[1] : 'ANY')
}

// 2) Parse new domain tables: "KEY /route" keys.
const covered = new Map() // route -> Set(method)
for (const f of fs.readdirSync(DOMAINS)) {
  if (!f.endsWith('.js')) continue
  const src = fs.readFileSync(path.join(DOMAINS, f), 'utf8')
  const keyRe = /'((?:GET|POST|PUT|DELETE|PATCH|ANY)) ([^']+)'/g
  let k
  while ((k = keyRe.exec(src))) {
    if (!covered.has(k[2])) covered.set(k[2], new Set())
    covered.get(k[2]).add(k[1])
  }
}

// 3) Compare.
let missing = 0
for (const [route, reqMethods] of required) {
  const have = covered.get(route) || new Set()
  for (const req of reqMethods) {
    const ok = have.has(req) || (req !== 'ANY' && have.has('ANY')) || (req === 'ANY' && [...have].length > 0)
    if (!ok) { missing++; console.log(`MISSING  ${req} ${route}`) }
  }
}
// Also flag new routes that have no requirement in old (possible drift / typo).
for (const [route] of covered) {
  if (!required.has(route)) console.log(`NEW/UNEXPECTED  ANY ${route}`)
}

console.log(`\nold routes required: ${required.size}, new routes declared: ${covered.size}`)
console.log(missing === 0 ? 'COVERAGE OK — every old route is dispatchable' : `COVERAGE INCOMPLETE — ${missing} missing`)
process.exit(missing === 0 ? 0 : 1)