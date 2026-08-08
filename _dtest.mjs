const WH = 'https://discord.com/api/webhooks/1535617900046458940/TVUlJNgCnfQUcFjVPN06j8Zl9V4DYSn-Aj263xTlU1u0iwh7g1jRVOFppg19QOgvwNXx'
const res = await fetch(WH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'NEXUS is connecting to this Discord server ✓' }),
})
console.log('DISCORD_STATUS', res.status)
console.log((await res.text()).slice(0, 300))
