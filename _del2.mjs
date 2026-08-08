import fs from 'fs'
const p = 'd:/Nexus/app/api/[[...path]]/route.js'
const bak = 'd:/Nexus/_route-archive.js'
if (fs.existsSync(p)) {
  fs.copyFileSync(p, bak)
  console.log('backed up to', bak, '(', fs.statSync(bak).size, 'bytes )')
  fs.rmSync(p, { force: true })
  console.log('deleted original:', !fs.existsSync(p))
} else console.log('route.js already gone')