// Offline audit of where fixed persona targets leave the recommendation path. Never calls an AI service.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { candidatesOf } from '../ai/pick.js';
import { loadCatalogs } from '../core/catalog.js';
import { initialState, profileOf, reduce, sessionOf } from '../core/dialogue.js';
import { buildTaste } from '../core/profile.js';
import { choose } from '../core/recommend.js';
import { checkSieves } from '../core/sieves.js';
import { ROOT } from '../lib/fsx.js';
import { loadPersonas, play } from './personas.js';

export const STAGES = {
  missing: 'нет в каталоге', filtered: 'убрано ситом', ranked: 'вне короткого списка AI',
  shortlist: 'в списке AI, не показано движком', shown: 'показано движком',
};

export function stateAtFirstResult(run, catalogs) {
  let state = { ...initialState(), seed: run.seed };
  for (const action of run.actions.slice(0, run.dialogueActions)) state = reduce(state, action, catalogs);
  return state;
}

export function diagnoseTargets(catalog, state, targets, { shortlistSize } = {}) {
  const { rows, ranked } = candidatesOf(catalog, state, shortlistSize);
  const indices = new Map(ranked.map((r, i) => [r.game.id, i]));
  const short = new Map(rows.map((r, i) => [r.game.id, i + 1]));
  const shown = new Set(choose(ranked).picked.map((r) => r.game.id));
  const profile = profileOf(state);
  const taste = buildTaste(catalog, profile);
  const session = sessionOf(state);
  const feature = (f) => catalog.dict.featureById.get(f)?.label ?? f;
  return targets.map((target) => {
    const item = catalog.byId.get(target.id);
    const base = { id: target.id, name: target.name, stage: 'missing', rank: null, shortlistPosition: null, matches: [], penalties: [] };
    if (!item) return base;
    const removed = checkSieves(item, taste, session, catalog);
    if (removed) return { ...base, stage: 'filtered', sieve: removed.sieve, reason: removed.reason };
    const index = indices.get(item.id);
    const row = ranked[index];
    return {
      ...base, stage: shown.has(item.id) ? 'shown' : short.has(item.id) ? 'shortlist' : 'ranked',
      rank: index + 1, score: row.score, shortlistPosition: short.get(item.id) ?? null,
      confidentFeatures: Object.values(item.features).filter((v) => v.r >= 0.5 && v.c >= 0.5).length,
      matches: row.matches.slice(0, 4).map((m) => ({ feature: feature(m.f), contribution: m.contribution, confirmed: Boolean(m.confirmed) })),
      penalties: row.penalties.map((p) => ({ feature: feature(p.f), contribution: p.contribution })),
    };
  });
}

const cell = (x) => String(x ?? '—').replaceAll('|', '/').replace(/\s+/g, ' ');
const facts = (row) => row.reason ?? [
  `явных признаков ${row.confidentFeatures}`,
  `совпадения: ${row.matches.map((m) => `${m.feature} ${m.contribution.toFixed(3)}${m.confirmed ? ' (подтверждено)' : ''}`).join(', ') || 'нет'}`,
  `штрафы: ${row.penalties.map((p) => `${p.feature} ${p.contribution.toFixed(3)}`).join(', ') || 'нет'}`,
].join('; ');

function main() {
  const catalogs = loadCatalogs();
  const runs = [];
  for (const persona of loadPersonas()) for (const mode of ['careful', 'lazy']) {
    if (!persona.modes[mode]) continue;
    const run = play(persona, mode, catalogs);
    const state = stateAtFirstResult(run, catalogs);
    const targets = diagnoseTargets(catalogs[persona.domain], state, persona.targets);
    runs.push({ persona, mode, targets });
    console.log(`${persona.id} ${mode}: ${targets.map((t) => `${t.name}: ${STAGES[t.stage]}${t.rank ? ` (#${t.rank})` : ''}`).join('; ')}`);
  }
  const all = runs.flatMap((r) => r.targets);
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
  const lines = [
    `# Где теряются цели персон, ${date}`, '',
    'Команда: `npm run diagnose`. Только офлайн, платных запросов нет. Использовано состояние непосредственно перед первым результатом, до замен «Уже смотрел».', '',
    '| Этап | Целей |', '|---|---|',
    ...Object.entries(STAGES).map(([stage, label]) => `| ${label} | ${all.filter((t) => t.stage === stage).length} |`), '',
    `Всего ${all.length} целей в ${runs.length} прогонах. Эти этапы показывают место потери, а не доказывают причину субъективного промаха.`, '',
    'OpenAI ещё не оценивался этим скриптом. Тайтл вне короткого списка всё ещё может быть назван моделью как собственное предложение и проверен среди прошедших сита. У целей внутри списка предстоит проверить выбор настоящей модели.', '',
    'Число «явных признаков» — все признаки с r и c не ниже 0.5, включая факты; это не оценка полноты вкусового описания. Совпадения и штрафы — фактические слагаемые движка, не мнение модели.', '',
  ];
  for (const run of runs) {
    lines.push(`## ${run.persona.name}, ${run.mode}`, '', `Сегодня: ${run.persona.today}`, '',
      '| Цель | Этап | Ранг | Место в списке AI | Данные движка |', '|---|---|---|---|---|',
      ...run.targets.map((t) => `| ${cell(t.name)} | ${STAGES[t.stage]} | ${cell(t.rank)} | ${cell(t.shortlistPosition)} | ${cell(t.stage === 'missing' ? 'нет записи' : facts(t))} |`), '');
  }
  const dir = resolve(ROOT, 'research-vault', 'akinator-picker-2026-10', 'eval');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${date}-diagnosis.md`);
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');
  console.log(`отчёт: ${path}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'src/stand/diagnose.js')) main();
