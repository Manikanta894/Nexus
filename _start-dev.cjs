// Launch the Next dev server detached on port 3100 (API test target).
const { spawn } = require('child_process')
const fs = require('fs')
const log = 'd:/Nexus/_dev.log'
fs.writeFileSync(log, '')
const child = spawn(
  'cmd.exe',
  ['/d', '/s', '/c', 'npx next dev -p 3100 > d:\\Nexus\\_dev.log 2>&1'],
  { cwd: 'd:/Nexus', detached: true, windowsHide: true, stdio: 'ignore' }
)
child.unref()
console.log('dev server spawned, pid', child.pid)