// Plan step 7: persona runs of every step side by side with the step 0 baseline, from the eval/<date>-stepN.md tables.
// Run: node research-vault/akinator-picker-2026-10/scripts/compare-steps.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('../eval/', import.meta.url);
const files = readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-step\d+\.md$/.test(f)).sort((a, b) => Number(a.match(/step(\d+)/)[1]) - Number(b.match(/step(\d+)/)[1]));

const parse = (file) => {
  const text = readFileSync(new URL(file, DIR), 'utf8');
  const rows = text.split('\n').filter((l) => /^\| .*, (careful|lazy) \|/.test(l)).map((l) => {
    const c = l.split('|').map((x) => x.trim());
    return { run: c[1], screens: c[2], taps: Number(c[3]), top: c[4], shown: c[5], best: c[6], seen: c[7], today: c[8] };
  });
  const total = text.match(/целей показано (\d+) из (\d+); медиана лучшего ранга цели ([\d.]+)/);
  return { step: Number(file.match(/step(\d+)/)[1]), file, rows, shown: Number(total[1]), median: Number(total[3]) };
};
const steps = files.map(parse);
const sum = (rows, key) => rows.reduce((n, r) => { const m = r[key].match(/(\d+) из (\d+)/); return [n[0] + Number(m[1]), n[1] + Number(m[2])]; }, [0, 0]);
const screens = (rows, mode) => rows.filter((r) => r.run.endsWith(mode)).map((r) => Number(r.screens.match(/^\d+/)[0]));
const range = (xs) => `${Math.min(...xs)}–${Math.max(...xs)}`;

const out = [
  '# Персоны по шагам против базы шага 0',
  '',
  'Свод таблиц `eval/<дата>-stepN.md`, скрипт `scripts/compare-steps.mjs`. Шаг 0 — движок и диалог 21.10, шаги 1–2 — правки движка и данных, 3 — новый диалог, 4 — уточнения, 5 — проверка лидера по настроению, 6 — экран результата (подбор не менялся).',
  '',
  '| Шаг | Целей показано из 36 | Медиана лучшего ранга | Экранов, внимательно | Экранов, лениво | Нажатий, внимательно | Нажатий, лениво | Уже видел в показанном | «Сегодня ты просил другое» |',
  '|---|---|---|---|---|---|---|---|---|',
  ...steps.map((s) => {
    const [seen, shownCards] = sum(s.rows, 'seen');
    const [today] = sum(s.rows, 'today');
    const taps = (mode) => range(s.rows.filter((r) => r.run.endsWith(mode)).map((r) => r.taps));
    return `| ${s.step} | ${s.shown} | ${s.median} | ${range(screens(s.rows, 'careful'))} | ${range(screens(s.rows, 'lazy'))} | ${taps('careful')} | ${taps('lazy')} | ${seen} из ${shownCards} | ${today} из ${shownCards} |`;
  }),
  '',
  'Лучший ранг цели по прогонам, шаг 0 → последний шаг:',
  '',
  '| Прогон | Шаг 0 | Последний |',
  '|---|---|---|',
  ...steps[0].rows.map((r, i) => `| ${r.run} | ${r.best} | ${steps.at(-1).rows[i]?.best ?? '—'} |`),
  '',
];
writeFileSync(new URL('../eval/compare-steps.md', import.meta.url), out.join('\n'), 'utf8');
console.log(out.join('\n'));
