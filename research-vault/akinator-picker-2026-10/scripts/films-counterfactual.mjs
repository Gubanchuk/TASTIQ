// Re-score a saved final state with one answer changed, to see which answer caused a miss.
import { readFileSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const api = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

async function evaluate(label, state, targets) {
  const { screen } = await api('/api/dialogue', { state });
  const r = screen.result;
  const shown = [r.top, ...r.alternatives].map((x) => `${x.ru ?? x.name} [${x.label}]`);
  console.log(`\n## ${label}`);
  console.log(`показано: ${shown.join(' | ')}`);
  for (const id of targets) {
    const w = await api('/api/why', { state, id });
    if (w.removedBy) { console.log(`  ${w.name}: сито ${w.removedBy.sieve} — ${w.removedBy.reason}`); continue; }
    console.log(`  ${w.name}: место ${w.rank}, score ${w.score} (лидер ${w.leaderScore}); pen ${w.parts.penalty.toFixed(2)}; штрафы: ${w.penalties.map((p) => `${p.label} ${p.contribution}`).join(', ') || '—'}`);
  }
}
const clone = (s) => structuredClone(s);
const dropIssue = (s, f) => { for (const a of Object.values(s.answers)) a.issues = (a.issues ?? []).filter((x) => x.f !== f); return s; };
const dropAvoid = (s, id) => { s.session.avoid = s.session.avoid.filter((x) => x !== id); return s; };
const dropMood = (s, id) => { s.session.moods = s.session.moods.filter((x) => x !== id); return s; };
const setPrefs = (s, fs) => { s.preferences = fs.map((f) => ({ f })); return s; };

// ---- couple ----
{
  const base = JSON.parse(readFileSync(`${dir}/films-couple-careful.json`, 'utf8')).finalState;
  const T = ['tt0119177', 'tt2543164', 'tt2194499'];
  console.log('# ПАРА (careful), контрфакты');
  await evaluate('как было (после развилки «чёрный юмор»)', base, T);
  await evaluate('развилка: ответили «спокойное, без нервов» вместо «чёрный юмор»', setPrefs(clone(base), ['tension.low']), T);
  await evaluate('без развилки вовсе', setPrefs(clone(base), []), T);
  await evaluate('без «Ничего страшного»', dropAvoid(setPrefs(clone(base), []), 'scary'), T);
  await evaluate('без жалобы «сюжет с дырами» (Трансформеры)', dropIssue(setPrefs(clone(base), []), 'story.weak'), T);
  await evaluate('без «сюжет с дырами» и без «одни спецэффекты»', dropIssue(dropIssue(setPrefs(clone(base), []), 'story.weak'), 'aesthetic.effects'), T);
  await evaluate('без «Ничего страшного», без «сюжет с дырами», без «спецэффекты»', dropAvoid(dropIssue(dropIssue(setPrefs(clone(base), []), 'story.weak'), 'aesthetic.effects'), 'scary'), T);
  await evaluate('если бы спросили «что обязательно сегодня?» и ответ: любовная линия + фантастика', setPrefs(clone(base), ['characters.romance', 'world.scifi']), T);
  await evaluate('то же + без «Ничего страшного» и «сюжет с дырами»', dropAvoid(dropIssue(setPrefs(clone(base), ['characters.romance', 'world.scifi']), 'story.weak'), 'scary'), T);
}
// ---- cinephile ----
{
  const base = JSON.parse(readFileSync(`${dir}/films-cinephile-careful.json`, 'utf8')).finalState;
  const T = ['tt1441395', 'tt2076220', 'tt7984734', 'tt0054632', 'tt0060176'];
  console.log('\n# КИНОМАН (careful), контрфакты');
  await evaluate('как было (после развилок «нелинейный сюжет», «космос»)', base, T);
  await evaluate('без развилок', setPrefs(clone(base), []), T);
  await evaluate('развилка 1: «маленький город» вместо «нелинейный сюжет»', setPrefs(clone(base), ['world.smalltown']), T);
  await evaluate('без жалобы «затянуто, скучал» (Трансформеры)', dropIssue(setPrefs(clone(base), []), 'pace.draggy'), T);
  await evaluate('без «затянуто» и без «длинно, устал»', dropIssue(dropIssue(setPrefs(clone(base), []), 'pace.draggy'), 'length.long'), T);
  await evaluate('без «Хочу подумать»', dropMood(setPrefs(clone(base), []), 'think'), T);
  await evaluate('если бы спросили «мейнстрим или авторское?» → +стильно и необычно снято, +странное (как предпочтение)', setPrefs(dropIssue(clone(base), 'pace.draggy'), ['aesthetic.stylized', 'tone.whimsical']), T);
}
