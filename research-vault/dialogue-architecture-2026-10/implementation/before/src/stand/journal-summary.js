// Live answers from the journal (plan step 10, research-vault/akinator-picker-2026-10/SUMMARY.md): the stand guesses
// how people answer, the journal says it. Every dialogue action is written by the client as
// { event, data: { from, qid, step, domain, asked, action } }: «from» is the screen the action was taken on, «qid»
// the adaptive question on it, «step» the screen that came next, «asked» the number of adaptive questions so far.
// Lines written before «from» existed (until 2026-10-25) are counted as old and left out.
//
// Usage: node src/stand/journal-summary.js [path=data/journal.ndjson]
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../lib/fsx.js';
import { summarizeFeedback, feedbackTable } from './feedback-summary.js';

export function summarizeJournal(lines) {
  const questions = {};
  const cards = { shown: 0, marked: 0, unknown: 0, untouched: 0 };
  const results = { reached: 0, askedBefore: [], played: 0, rated: 0, unplayed: 0, notMine: 0 };
  let skippedOld = 0;
  for (const { event, data } of lines) {
    if (event === 'quality-feedback') continue;
    if (!data?.from) {
      skippedOld += 1;
      continue;
    }
    if (data.from === 'ask' && data.qid) {
      const q = (questions[data.qid] ??= { kind: data.qid.split(':')[0], shown: 0, dontCare: 0 });
      q.shown += 1;
      if (event === 'skip') q.dontCare += 1;
    }
    if (event === 'react') {
      const shown = new Set(data.action.shownIds ?? []);
      const marks = data.action.marks ?? [];
      cards.shown += shown.size;
      cards.marked += marks.length;
      cards.unknown += marks.filter((m) => m.reaction === 'unknown').length;
      cards.untouched += [...shown].filter((id) => !marks.some((m) => m.id === id)).length;
    }
    if (data.step === 'result' && data.from !== 'result') {
      results.reached += 1;
      results.askedBefore.push(data.asked ?? 0);
    }
    // «Уже смотрел» is one tap (played); «понравилось / не зашло» after it (rate_played) and «Вернуть» (unplayed)
    // are separate lines. Until 2026-10-29 the reaction came inside the played line.
    if (data.from === 'result' && event === 'played') results.played += 1;
    if (data.from === 'result' && (event === 'rate_played' || (event === 'played' && data.action?.reaction))) results.rated += 1;
    if (data.from === 'result' && event === 'unplayed') results.unplayed += 1;
    if (data.from === 'result' && event === 'not_mine') results.notMine += 1;
  }
  return { questions, cards, results, skippedOld, feedback: summarizeFeedback(lines) };
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export function journalTable(summary) {
  const { questions, cards, results, skippedOld } = summary;
  const out = ['| Вопрос | Вид | Показан | «Всё равно» |', '|---|---|---|---|'];
  for (const [qid, q] of Object.entries(questions).sort((a, b) => b[1].shown - a[1].shown)) {
    out.push(`| ${qid.replaceAll('|', '\\|')} | ${q.kind} | ${q.shown} | ${pct(q.dontCare, q.shown)} |`);
  }
  const asked = results.askedBefore;
  const mean = asked.length ? (asked.reduce((a, b) => a + b, 0) / asked.length).toFixed(2) : '—';
  out.push('', '| Показатель | Значение |', '|---|---|',
    `| Карточек показано | ${cards.shown} |`,
    `| Из отмеченных «не видел» | ${pct(cards.unknown, cards.marked)} (${cards.unknown} из ${cards.marked}) |`,
    `| Карточек без отметки | ${pct(cards.untouched, cards.shown)} |`,
    `| Дошли до результата | ${results.reached} |`,
    `| Адаптивных вопросов до результата, в среднем | ${mean} |`,
    `| «Уже смотрел» на результате, на один результат | ${results.reached ? (results.played / results.reached).toFixed(2) : '—'} |`,
    `| Из них оценили (понравилось / не зашло) | ${pct(results.rated, results.played)} |`,
    `| Из них вернули | ${pct(results.unplayed, results.played)} |`,
    `| «Не моё» на результате, на один результат | ${results.reached ? (results.notMine / results.reached).toFixed(2) : '—'} |`,
    `| Старых строк без «from» (не учтены) | ${skippedOld} |`);
  if (summary.feedback) out.push('', feedbackTable(summary.feedback));
  return out.join('\n');
}

function main() {
  const path = resolve(process.argv[2] ?? resolve(ROOT, 'data', 'journal.ndjson'));
  if (!existsSync(path)) {
    console.log(`Журнала нет: ${path}`);
    return;
  }
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(journalTable(summarizeJournal(lines)));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'src', 'stand', 'journal-summary.js')) main();
