const { MongoMemoryServer } = require('mongodb-memory-server')
;(async () => {
  const m = await MongoMemoryServer.create({ instance: { port: 27999, ip: '127.0.0.1' } })
  console.log('MONGO_READY ' + m.getUri())
  setInterval(() => {}, 1000)
})().catch((e) => { console.error('MONGO_FATAL ' + e.message); process.exit(1) })
