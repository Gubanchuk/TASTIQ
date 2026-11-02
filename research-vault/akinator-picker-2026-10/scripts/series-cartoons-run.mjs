// Persona runs. Usage: node series-cartoons-run.mjs <lena|dima> <careful|lazy> [seed]
// Writes transcript to ../series-cartoons-<persona>-<mode>.txt and state log to .json next to it.
import { writeFileSync } from 'node:fs';
import { post, describe, search, parse, why, byValue } from './series-cartoons-lib.mjs';

const [who, mode, seedArg] = process.argv.slice(2);
const SEED = Number(seedArg ?? 20261021);
const OUT = `C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/series-cartoons-${who}-${mode}`;

const PERSONAS = {
  lena: {
    domain: 'series',
    genres: ['genre:Comedy'],
    // in persona's order of importance; the first three get the "за что" question
    loved: ['tt0108778', 'tt2467372', 'tt0386676', 'tt1266020', 'tt0460649', 'tt0285403', 'tt4955642', 'tt1442437', 'tt4477976', 'tt3526078'],
    searchLoved: { tt0108778: 'Друзья', tt2467372: 'Бруклин 9-9', tt0386676: 'Офис', tt1266020: 'Парки и зоны отдыха' },
    reasons: {
      tt0108778: { chips: ['humor.funny', 'tone.feelgood', 'characters.friendship', 'characters.ensemble'], love: true, text: 'можно включить любую серию фоном и отдыхать' },
      tt2467372: { chips: ['humor.funny', 'tone.lighthearted', 'tone.feelgood', 'structure.procedural'], love: true, text: 'добрые герои, короткие серии по 20 минут' },
      tt0386676: { chips: ['humor.funny', 'characters.ensemble'], love: false, text: 'неловкий юмор, не надо вникать, смотрю фоном' },
    },
    disliked: ['tt0944947', 'tt1520211', 'tt0903747', 'tt5834204', 'tt8962124'],
    searchDisliked: { tt0944947: 'Игра престолов', tt1520211: 'Ходячие мертвецы', tt0903747: 'Во все тяжкие', tt5834204: 'Рассказ служанки' },
    issues: {
      tt0944947: { soft: ['tension.high', 'content.sexual'], hard: ['content.violence'], text: 'бросила из-за жестокости, всех убивают' },
      tt1520211: { soft: ['tone.creepy', 'world.postapoc'], hard: ['content.violence'], text: 'зомби и кишки, страшно, выключила' },
    },
    today: { moods: ['relax', 'laugh', 'background'], avoid: ['violence', 'dark', 'scary'] },
    lazy: { liked: ['tt0460649', 'tt0285403', 'tt0108778', 'tt0898266', 'tt1442437'], searchIfNone: 'Друзья', reason: 'humor.funny', today: { moods: ['laugh'], avoid: [] } },
    targets: ['tt10986410', 'tt1826940', 'tt14218830'],
  },
  dima: {
    domain: 'cartoon',
    genres: ['genre:Family', 'genre:Comedy', 'genre:Adventure'],
    loved: ['tt2948356', 'tt3521164', 'tt0441773', 'tt0114709', 'tt0266543', 'tt1323594', 'tt0198781', 'tt0892769', 'tt4729430', 'tt1049413'],
    searchLoved: { tt2948356: 'Зверополис', tt3521164: 'Моана', tt0441773: 'Кунг-фу Панда' },
    reasons: {
      tt2948356: { chips: ['humor.funny', 'characters.friendship', 'content.family', 'cognitive.high', 'aesthetic.beautiful'], love: true, text: 'и ребёнку смешно, и мне интересно, детектив' },
      tt3521164: { chips: ['world.music', 'aesthetic.beautiful', 'characters.female_lead', 'content.family', 'tone.feelgood'], love: true, text: 'дочка подпевает песням' },
      tt0441773: { chips: ['humor.funny', 'tone.lighthearted', 'content.family', 'pace.fast'], love: false, text: 'драки не страшные, ржали оба', accept: ['tone.creepy'] },
    },
    disliked: ['tt0327597', 'tt3121722', 'tt2293640', 'tt0107688', 'tt3874544'],
    searchDisliked: { tt0327597: 'Коралина', tt3121722: 'Щенячий патруль', tt2293640: 'Миньоны' },
    issues: {
      tt0327597: { soft: ['tone.dark'], hard: ['tone.creepy'], text: 'ребёнок испугался, выключили на 20 минуте' },
      tt3121722: { soft: ['pace.draggy', 'story.predictable'], hard: [], text: 'для совсем малышей, мне скучно, сто одинаковых серий' },
    },
    today: { moods: ['family', 'laugh'], avoid: ['scary', 'dark'] },
    lazy: { liked: ['tt0114709', 'tt2948356', 'tt0266543', 'tt1049413', 'tt0198781', 'tt0435761'], searchIfNone: 'Зверополис', reason: 'humor.funny', today: { moods: ['family'], avoid: [] } },
    targets: ['tt12801262', 'tt2953050', 'tt7979580'],
  },
};

const P = PERSONAS[who];
const transcript = [];
const say = (s) => { transcript.push(s); console.log(s); };
const log = [];

async function freeText(step, text, accept) {
  const out = await parse(P.domain, text);
  say(`   free text: "${text}" -> ${out.understood ? [...out.positive.map((x) => `+${x.label}`), ...out.negative.map((x) => `-${x.label}${x.hard ? '(hard)' : ''}`)].join(', ') : 'НЕ ПОНЯЛ'}`);
  // client (pick/app.js offered()): on "why" positives become reasons, negatives issues; on "why_not" everything is an issue.
  // The person clicks only chips that match what they meant (accept list); without a list, all offered chips.
  const ok = (f) => !accept || accept.includes(f);
  const rejected = [...out.positive, ...out.negative].filter((x) => !ok(x.f)).map((x) => x.label);
  if (rejected.length) say(`   person would NOT click: ${rejected.join(', ')}`);
  if (step === 'why') return { reasons: out.positive.filter((x) => ok(x.f)).map((x) => x.f), issues: out.negative.filter((x) => ok(x.f)).map((x) => ({ f: x.f, hard: Boolean(x.hard) })) };
  return { reasons: [], issues: [...out.positive, ...out.negative].filter((x) => ok(x.f)).map((x) => ({ f: x.f, hard: Boolean(x.hard) })) };
}

async function decideCareful(screen, state) {
  switch (screen.step) {
    case 'domain': return { type: 'choose', value: P.domain };
    case 'genres': return { type: 'genres', values: P.genres };
    case 'liked': {
      const shownIds = screen.items.map((x) => x.id);
      const ticked = shownIds.filter((id) => P.loved.includes(id));
      say(`   shown & loved: ${ticked.join(', ') || '(none)'}`);
      const found = [];
      for (const [id, q] of Object.entries(P.searchLoved)) {
        if (ticked.includes(id)) continue;
        const r = await search(P.domain, q);
        say(`   search "${q}" -> ${r.slice(0, 3).map((x) => `${x.ru ?? x.name} (${x.year}, ${x.id})`).join('; ')}`);
        if (r.some((x) => x.id === id)) found.push(id);
      }
      const ids = [...found, ...ticked];
      return { type: 'pick', ids, shownIds };
    }
    case 'why': {
      const id = screen.item.id;
      const plan = P.reasons[id];
      if (!plan) { say('   (no plan for this title: skip)'); return { type: 'skip' }; }
      const offered = new Set(screen.options.map((o) => o.value));
      const values = plan.chips.filter((f) => offered.has(f));
      const missing = plan.chips.filter((f) => !offered.has(f));
      if (missing.length) say(`   wanted but not offered: ${missing.join(', ')}`);
      const extra = plan.text ? await freeText('why', plan.text, plan.accept) : { reasons: [], issues: [] };
      return { type: 'reasons', values: [...new Set([...values, ...extra.reasons])], love: plan.love, issues: extra.issues };
    }
    case 'disliked': {
      const shownIds = screen.items.map((x) => x.id);
      const ticked = shownIds.filter((id) => P.disliked.includes(id));
      say(`   shown & disliked: ${ticked.join(', ') || '(none)'}`);
      const found = [];
      for (const [id, q] of Object.entries(P.searchDisliked)) {
        if (ticked.includes(id)) continue;
        const r = await search(P.domain, q);
        say(`   search "${q}" -> ${r.slice(0, 3).map((x) => `${x.ru ?? x.name} (${x.year}, ${x.id})`).join('; ')}`);
        if (r.some((x) => x.id === id)) found.push(id);
      }
      return { type: 'pick', ids: [...found, ...ticked], shownIds };
    }
    case 'why_not': {
      const id = screen.item.id;
      const plan = P.issues[id];
      if (!plan) { say('   (no plan for this title: skip)'); return { type: 'skip' }; }
      const offered = new Set([...screen.options, ...screen.categories].map((o) => o.value));
      const wanted = [...plan.soft, ...plan.hard];
      const missing = wanted.filter((f) => !offered.has(f));
      if (missing.length) say(`   wanted but not offered: ${missing.join(', ')}`);
      const issues = [...plan.soft.filter((f) => offered.has(f)).map((f) => ({ f, hard: false })), ...plan.hard.filter((f) => offered.has(f)).map((f) => ({ f, hard: true }))];
      const extra = plan.text ? await freeText('why_not', plan.text, plan.accept) : { issues: [] };
      for (const x of extra.issues) if (!issues.some((i) => i.f === x.f)) issues.push(x);
      return { type: 'issues', issues, badQuality: false };
    }
    case 'today': return { type: 'today', values: P.today.moods, avoid: P.today.avoid };
    case 'playback': return { type: 'choose', value: 'confirm' };
    case 'result': return null;
  }
  throw new Error(`no decision for ${screen.step}`);
}

async function decideLazy(screen, state) {
  switch (screen.step) {
    case 'domain': return { type: 'choose', value: P.domain };
    case 'genres': return { type: 'skip' };
    case 'liked': {
      const shownIds = screen.items.map((x) => x.id);
      let ids = shownIds.filter((id) => P.lazy.liked.includes(id)).slice(0, 2);
      say(`   shown & known: ${ids.join(', ') || '(none)'}`);
      if (!ids.length) {
        const r = await search(P.domain, P.lazy.searchIfNone);
        say(`   nothing familiar; search "${P.lazy.searchIfNone}" -> ${r[0]?.id}`);
        ids = [r[0].id];
      }
      return { type: 'pick', ids, shownIds };
    }
    case 'why': {
      if (state.whyIndex > 0) return { type: 'skip' };
      const f = screen.options.find((o) => o.value === P.lazy.reason)?.value ?? screen.options[0].value;
      return { type: 'reasons', values: [f], love: false, issues: [] };
    }
    case 'disliked': return { type: 'skip' };
    case 'why_not': return { type: 'skip' };
    case 'today': return { type: 'today', values: P.lazy.today.moods, avoid: P.lazy.today.avoid };
    case 'playback': return { type: 'choose', value: 'confirm' };
    case 'result': return null;
  }
  throw new Error(`no decision for ${screen.step}`);
}

const decide = mode === 'lazy' ? decideLazy : decideCareful;
let { state, screen } = await post('/api/dialogue', {});
state = { ...state, seed: SEED };
({ state, screen } = await post('/api/dialogue', { state }));
let n = 0;
while (true) {
  n++;
  say(`\n=== ${who}/${mode} screen ${n}\n${describe(screen)}`);
  log.push({ n, screen, state: structuredClone(state) });
  const action = await decide(screen, state);
  if (!action) break;
  say(`>>> ${JSON.stringify(action)}`);
  log[log.length - 1].action = action;
  ({ state, screen } = await post('/api/dialogue', { state, action }));
}
say(`\nscreens: ${n}`);

// targets: shown? else why not
const shownIds = [screen.result.top?.id, ...screen.result.alternatives.map((a) => a.id)].filter(Boolean);
say(`\n=== targets`);
for (const id of P.targets) {
  const r = await search(P.domain, id);
  const w = await why(state, id);
  say(`target ${id} (${w.name}): ${shownIds.includes(id) ? 'SHOWN' : 'not shown'} -> ${JSON.stringify(w)}`);
}
// where do the alternatives of interest rank: also check second page (fork answered) not needed.
writeFileSync(`${OUT}.txt`, transcript.join('\n'), 'utf8');
writeFileSync(`${OUT}.json`, JSON.stringify({ seed: SEED, log, finalState: state, result: screen.result }, null, 1), 'utf8');
console.log(`\nwritten ${OUT}.txt / .json`);
