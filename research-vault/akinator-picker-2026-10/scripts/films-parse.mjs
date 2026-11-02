const BASE = 'http://localhost:5173';
for (const text of process.argv.slice(2)) {
  const r = await fetch(`${BASE}/api/parse`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, domain: 'film' }) });
  console.log(`${text} => ${JSON.stringify(await r.json())}`);
}
