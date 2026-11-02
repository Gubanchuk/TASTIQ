// Persona runs with the AI picker on top (src/ai/pick.js): each persona plays the dialogue as in personas.js, then
// the model picks four titles from the engine's shortlist. Prints, per run, the engine's four and the model's four
// with the targets marked, and writes research-vault/akinator-picker-2026-10/eval/<date>-ai[-<tag>].md.
// Every run is one paid OpenAI request. Explicit --paid is required; by default only one run is made.
//
// Usage: node src/stand/personas-ai.js [all|film|game|series|cartoon|<persona id>] [--mode careful|lazy] [--tag x]
//        --paid [--limit 1] [--effort low|medium|high]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { AI, aiPick, shortlistOf } from '../ai/pick.js';
import { estimateCost } from '../ai/usage.js';
import { loadCatalogs } from '../core/catalog.js';
import { initialState, reduce, screen } from '../core/dialogue.js';
import { requestResponse } from '../ai/openai.js';
import { hiddenKnownIds, median } from './metrics.js';
import { ROOT } from '../lib/fsx.js';
import { loadPersonas, play } from './personas.js';

const args = process.argv.slice(2);
let options, filter, replay;
try {
  const parsed = parseArgs({ args, allowPositionals: true, options: {
    paid: { type: 'boolean' }, limit: { type: 'string', default: '1' },
    'budget-usd': { type: 'string', default: '1' },
    mode: { type: 'string' }, tag: { type: 'string' }, effort: { type: 'string' },
    replay: { type: 'string' },
  } });
  options = parsed.values;
  if (parsed.positionals.length > 1) throw new Error('укажи только один домен или персону');
  filter = parsed.positionals[0] ?? 'all';
  if (!/^[1-9]\d*$/.test(options.limit) || !Number.isSafeInteger(Number(options.limit))) throw new Error('--limit должен быть положительным целым числом');
  if (!Number.isFinite(Number(options['budget-usd'])) || Number(options['budget-usd']) <= 0) throw new Error('--budget-usd должен быть положительным числом');
  if (options.mode && !['careful', 'lazy'].includes(options.mode)) throw new Error('--mode: careful или lazy');
  if (options.tag && !/^[a-zA-Z0-9_-]{1,60}$/.test(options.tag)) throw new Error('--tag: до 60 латинских букв, цифр, дефисов или подчёркиваний');
  if (options.effort && !['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(options.effort)) throw new Error('неизвестный --effort');
  if (!options.paid) throw new Error('Платный запуск: добавь --paid. По умолчанию один запрос; --limit задаёт число прогонов.');
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('Добавь OPENAI_API_KEY в .env; не передавай ключ в аргументах команды.');
  if (process.env.AI_ACCESS === 'off') throw new Error('AI_ACCESS=off: платные проверки выключены.');
  if (options.replay) {
    replay = JSON.parse(readFileSync(resolve(ROOT, options.replay),'utf8'));
    if (!Array.isArray(replay) || replay.some(x=>!x.persona || !['careful','lazy'].includes(x.mode) || x.state?.step!=='result')) throw new Error('Некорректные сохранённые состояния --replay');
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
if (options.effort) AI.effort = options.effort;
const personas = loadPersonas().filter((p) => filter === 'all' || p.domain === filter || p.id === filter);
if (!personas.length) { console.error(`Неизвестный домен или персона: ${filter}`); process.exit(1); }
const catalogs = loadCatalogs();
const modes = options.mode ? [options.mode] : ['careful', 'lazy'];
const lines = [];
const records = [];
const total = { engine: 0, ai: 0, engineTop: 0, aiTop: 0, targets: 0, inShortlist: 0, ms: [], usd: 0, own: 0, ownHits: 0, engineSeen: 0, aiSeen: 0, flagged: 0, flaggedSeen: 0 };
let attempted = 0, errors = 0, unknownUsage = 0;

runs:
for (const P of personas) {
  for (const mode of modes) {
    if (!P.modes[mode]) continue;
    if (attempted >= Number(options.limit)) break runs;
    let state;
    if (replay) {
      state=structuredClone(replay.find(x=>x.persona===P.id && x.mode===mode)?.state);
      if (!state || state.domain!==P.domain) throw new Error(`Нет корректного сохранённого состояния ${P.id} ${mode}`);
    } else {
      const run = play(P, mode, catalogs);
      state = { ...initialState(), seed: P.modes[mode].seed };
      for (const a of run.actions.slice(0, run.dialogueActions)) state = reduce(state, a, catalogs);
    }
    const catalog = catalogs[P.domain];
    const name = (id) => { const g = catalog.byId.get(id); return g ? g.ru ?? g.name : id; };
    const targets = new Set(P.targets.map((t) => t.id));
    // Titles the persona has seen but did not mark: showing them is a miss the model's likelySeen should catch.
    const seenUnmarked = hiddenKnownIds(P,state);
    const res = screen(state,catalogs).result;
    const engine = res?.top ? [res.top, ...res.alternatives].map((p) => p.id) : [];
    const shortlist = new Set(shortlistOf(catalog, state).map((r) => r.game.id));
    let request;
    const ai = await aiPick(catalogs, state, { maxCostUsd: Number(options['budget-usd']) - total.usd, api: async(body)=>{request=body;return requestResponse(body);} });
    if (ai.notRequested) {
      const message = `Прогон остановлен до следующего запроса: ${ai.error}. Израсходовано по известному usage $${total.usd.toFixed(4)} из $${options['budget-usd']}.`;
      console.log(message);
      lines.push(message, '');
      break runs;
    }
    attempted++;
    const estimated = estimateCost(ai.usage, AI.model);
    records.push({persona:P.id,mode,domain:P.domain,state,request,engine,ai,estimatedUsd:estimated});
    if (estimated == null) unknownUsage++;
    else total.usd += estimated;
    if (ai.error) {
      errors++;
      const error = `${P.id} ${mode}: ошибка AI — ${ai.error}. Прогон остановлен; это не оценка качества выбора.`;
      console.log(error);
      lines.push(error, '');
      break runs;
    }
    const picked = [...ai.picks.map((p) => p.id), ...(ai.filled ?? [])].slice(0, AI.picks);
    const hits = (ids) => ids.filter((id) => targets.has(id)).length;
    total.engine += hits(engine);
    total.ai += hits(picked);
    total.engineTop += targets.has(engine[0]) ? 1 : 0;
    total.aiTop += targets.has(picked[0]) ? 1 : 0;
    const own = (ai.picks ?? []).filter((p) => p.own && picked.includes(p.id));
    total.own += own.length;
    total.ownHits += own.filter((p) => targets.has(p.id)).length;
    total.engineSeen += engine.filter((id) => seenUnmarked.has(id)).length;
    total.aiSeen += picked.filter((id) => seenUnmarked.has(id)).length;
    const flagged = (ai.picks ?? []).filter((p) => p.likelySeen && picked.includes(p.id));
    total.flagged += flagged.length;
    total.flaggedSeen += flagged.filter((p) => seenUnmarked.has(p.id)).length;
    total.targets += targets.size;
    total.inShortlist += [...targets].filter((id) => shortlist.has(id)).length;
    if (ai.ms) total.ms.push(ai.ms);
    const mark = (id) => `${targets.has(id) ? '**' : ''}${name(id)}${targets.has(id) ? '**' : ''}`;
    const row = `${P.id} ${mode}: движок ${hits(engine)}/3 [${engine.map(mark).join(', ')}] | нейросеть ${ai.error ? `ошибка: ${ai.error}` : `${hits(picked)}/3 [${picked.map(mark).join(', ')}]`} | целей в коротком списке ${[...targets].filter((id) => shortlist.has(id)).length}/3 | ${ai.ms ?? '-'} мс`;
    console.log(row);
    lines.push(`### ${P.name}, ${mode}`, '', row, '');
    if (ai.understood) lines.push(`Понял так: ${ai.understood}`, '');
    for (const p of ai.picks.slice(0, AI.picks)) lines.push(`- ${mark(p.id)}${p.own ? ' (своё, не из списка)' : ''}${p.likelySeen ? ' (наверное, видел)' : ''}${seenUnmarked.has(p.id) ? ' — персона видела' : ''}: ${p.reason}${p.caveat ? ` Учти: ${p.caveat}` : ''}`);
    lines.push('');
    if (estimated == null) { lines.push('Расход запроса неизвестен; следующие платные вызовы остановлены.', ''); break runs; }
  }
}

const summary = `Успешных прогонов ${attempted - errors}, ошибок ${errors}. Целей среди показанных четырёх на успешных прогонах: движок ${total.engine} из ${total.targets}, нейросеть ${total.ai} из ${total.targets}; первым цель: движок ${total.engineTop}, нейросеть ${total.aiTop}; целей в коротком списке ${total.inShortlist}. Своих (не из списка) ${total.own}, из них целей ${total.ownHits}. Виденного, но не отмеченного персоной, в четвёрке: движок ${total.engineSeen}, нейросеть ${total.aiSeen}; помечено «наверное, видел» ${total.flagged}, из них персона и правда видела ${total.flaggedSeen}. Медиана ответа ${median(total.ms)} мс. Расчётная стоимость известной части $${total.usd.toFixed(4)}, запросов без расчёта ${unknownUsage} (effort ${AI.effort}, короткий список ${AI.shortlist}); это расчёт по токенам Standard, не счёт провайдера.`;
console.log(`\n${summary}`);
const date = new Date().toISOString().slice(0, 10);
const tag = options.tag;
const dir = resolve(ROOT, 'research-vault', 'akinator-picker-2026-10', 'eval');
mkdirSync(dir, { recursive: true });
const file = resolve(dir, `${date}-ai${filter === 'all' ? '' : `-${filter}`}${tag ? `-${tag}` : ''}.md`);
writeFileSync(file, [`# Персоны с нейросетью, ${date}`, '', `Команда: \`node src/stand/personas-ai.js ${args.join(' ')}\`. Модель ${AI.model}, effort ${AI.effort}, короткий список ${AI.shortlist}. Цели выделены жирным.`, '', summary, '', ...lines].join('\n') + '\n', 'utf8');
writeFileSync(file.replace(/\.md$/,'.json'),JSON.stringify({date,model:AI.model,effort:AI.effort,detailed:AI.shortlist,discovery:AI.discovery,summary:total,attempted,errors,unknownUsage,records},null,2)+'\n','utf8');
console.log(`отчёт: ${file}`);
if (errors || unknownUsage) process.exitCode = 1;
