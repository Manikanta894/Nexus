const BASE = 'http://127.0.0.1:3000'
const api = async (path, opts = {}) => {
  const r = await fetch(BASE + '/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
const token = login.data.token;
const auth = { Authorization: 'Bearer ' + token };
let pass = 0, fail = 0;
const results = [];
const test = async (name, fn) => {
  try { const ok = await fn(); if (ok) { pass++; results.push(`PASS  ${name}`); } else { fail++; results.push(`FAIL  ${name}`); } }
  catch (e) { fail++; results.push(`FAIL  ${name} -> ${e.message}`); }
};

// Quick final check
await test('Login', async () => !!token);
await test('Dashboard', async () => { const r = await api('/dashboard', { headers: auth }); return r.data.greetingName && r.data.stats; });
await test('Social generate', async () => { const r = await api('/social/generate', { method: 'POST', headers: auth, body: JSON.stringify({ platforms: ['linkedin'] }) }); return r.data.job?.id; });
await test('Blog generate', async () => { const r = await api('/blog/generate', { method: 'POST', headers: auth, body: JSON.stringify({ seedText: 'test' }) }); return r.data.job?.article?.title; });
await test('News scan', async () => { const r = await api('/news/scan', { method: 'POST', headers: auth }); return typeof r.data.scanned === 'number'; });
await test('Mission Control', async () => { const r = await api('/analytics/full', { headers: auth }); return r.data.totals && r.data.aiCoach; });
await test('Learning Engine', async () => { const r = await api('/learning', { headers: auth }); return r.data.recommendations?.length > 0; });
await test('Integrations catalog', async () => { const r = await api('/integrations', { headers: auth }); return r.data.integrations?.length >= 20; });
await test('Autopilot run', async () => { const r = await api('/autopilot/run', { method: 'POST', headers: auth }); return r.data.ok; });
await test('Cron security', async () => { const r = await api('/cron', { method: 'POST' }); return r.status === 401; });
await test('Frontend renders', async () => { const r = await fetch(BASE + '/'); return r.status === 200; });

console.log(results.join('\n'));
console.log(`\n==== FINAL: ${pass} passed, ${fail} failed ====`);
