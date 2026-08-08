import fs from 'fs'
import path from 'path'
const root = 'd:/Nexus/app/api/[[...path]]'
function walk(dir, prefix = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { console.log(prefix + e.name + '/'); walk(p, prefix + '  ') }
    else console.log(prefix + e.name + '  (' + fs.statSync(p).size + ' bytes)')
  }
}
walk(root)