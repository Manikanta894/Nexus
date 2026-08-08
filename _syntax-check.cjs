// SWC syntax-check every server file (parser identical to next build).
const fs = require('fs')
const path = require('path')
const { transform } = require('next/dist/build/swc')

const base = 'd:/Nexus/app/api/[[...path]]/server'
const files = []
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (p.endsWith('.js')) files.push(p)
  }
}
walk(base)
files.push('d:/Nexus/app/api/[[...path]]/route.js')

;(async () => {
  let fail = 0
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    try {
      await transform(src, {
        filename: f,
        jsc: { parser: { syntax: 'ecmascript', jsx: false }, target: 'es2020' },
        module: { type: 'commonjs' },
      })
      console.log('OK  ', (f.split('\\server')[1] || path.basename(f)))
    } catch (e) {
      fail++
      console.log('FAIL', f, '->', e.message)
    }
  }
  console.log(files.length - fail + '/' + files.length, 'parse OK')
  process.exit(fail ? 1 : 0)
})()