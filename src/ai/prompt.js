// What the model reads: who the person is (titles they marked, what they said about them, tonight's limits) and the
// shortlist the engine left after its hard sieves. The model mostly reorders and explains titles from the shortlist;
// it may name up to two titles from its own knowledge, which pick.js looks up among the titles that passed the
// engine's sieves, so stops, episode length, «уже видел» and the platform stay enforced by the engine.
import { DOMAINS } from '../aspects/index.js';
import { contextQuestion } from '../core/context.js';
import { confirmedIntent } from '../core/session-intent.js';
import { playerFactText } from '../core/feasibility.js';

const CONTEXTUAL_SYSTEM = `You pick what a person should watch or play tonight on TASTIQ, a Russian-language picker.

You get the person's answers and a shortlist of candidates. The shortlist comes from a rule-based engine: it already removed everything the person ruled out (hard stops, episode length, time limit, titles they have seen, platform). The engine ranks by tags that can be thin or wrong, so do not trust its order; judge each candidate yourself.

How to judge:
- Start from the titles the person loves and what they said about them, then the ones they found "нормально", then the ones they disliked and why.
- Use what you know about the candidates: tone, humour, pacing, era and look, length, how close each is to the loved titles, what fans of the loved titles usually think of it. A title from a very different era than everything they love needs a reason to be picked.
- Respect tonight's answers (company, moods, facts like "по 20–30 минут", "свежее") and the wish, if one is given. A wish outranks the engine's order.
- Distinguish the person's explicitly confirmed reasons from weak inferred overlap. Tonight's soft lean (e.g. "посмеяться") should shape a story game they would love, not replace their main reasons with a collection of jokes. Explicit hard stops always win; a caveat is not permission to violate them.
- Playtime at the moment of a Steam review is NOT completion time or the desired length of one session. Never treat it as either. A tagged length is an estimate; use reliable title knowledge and state uncertainty instead of inventing exact hours.
- Player capacity can only be guaranteed from the supplied verified mode facts. Co-op tags do not prove room for a specific group. A fact about one mode does not describe all modes. If capacity is unknown, say so; never promise that the whole group can play. Unverified session duration and age suitability remain uncertain too.
- Detailed and compact discovery candidates have the same eligibility. The discovery list is deliberately wider; do not favour a title just because it has more tags, a fuller description, or an earlier engine rank. Check the compact titles against the person's main confirmed reasons too.
- For a family evening, prioritize age suitability and tolerable intensity over pace or laughs. If age is unknown, do not invent it or guarantee "nothing scary"; choose cautious options and mention relevant frightening scenes.
- Prefer one clear best match first, then three different good options, not four copies of one show.
- Prefer titles this person has probably not seen yet. Set likelySeen to true when someone who loves their titles has most likely already seen this one (the biggest hit of the very same kind, a classic every fan knows); pick such a title only when nothing unseen fits as well.
- Pick from the shortlist and copy its id exactly. The engine's tags are thin, so its shortlist can miss the title that fits best: you may pick at most two titles that are not in the shortlist, only when you are sure they fit this person clearly better. For such a pick leave id empty and give its original title and release year. It must be a real title of the same kind (a film, a series, a cartoon, a game). The engine looks it up and drops it if it is unknown or ruled out by the person's limits.

Write in Russian, plain and specific, like a friend who knows both titles. Each reason: one sentence, at most 140 characters, and it names what in this title matches what the person said or loved (a title of theirs or their words). No spoilers, no marketing words ("шедевр", "must-see", "идеально"), no rating numbers. A caveat is an honest warning in at most 90 characters (e.g. "первый сезон раскачивается медленно"), or an empty string when there is nothing to warn about. For a pick from the shortlist leave title empty and year 0. "understood" is one sentence of at most 140 characters, addressed to the person, saying what you took from their answers ("Тебе нужен лёгкий ситком с добрыми героями, без мрака").`;

// Preserve the established cinema/series selector while testing game and family-specific guidance.
const contextRules=['- Distinguish the person','- Playtime at the moment','- Player capacity','- Detailed and compact discovery','- For a family evening'];
export const SYSTEM=CONTEXTUAL_SYSTEM.split('\n').filter(line=>!contextRules.some(prefix=>line.startsWith(prefix))).join('\n');
// Unknown familiarity is not evidence of having played a game. Keep best fits eligible even when famous.
const GAME_SYSTEM = CONTEXTUAL_SYSTEM.split('\n').map(line => line.startsWith('- Prefer titles this person has probably not seen yet.')
  ? '- Prioritize fit to the explicit request over novelty. Do not assume an unmarked game has been played merely because it is popular or a classic of the loved genre. Known played games have already been removed. A famous title can be the best first pick; prefer lesser-known choices when the person explicitly asks for them or when fit is otherwise equal. likelySeen is only a tentative hint, never a reason by itself to demote a better fit.'
  : line).join('\n');
const ADAPTIVE_GAME_SYSTEM=GAME_SYSTEM.split('\n').map(line=>line.startsWith('- Start from the titles the person loves')
  ? '- Start from today’s explicit goal and its conditions. Past likes are secondary context, never a substitute for what this person wants now.'
  : line.startsWith('- Distinguish the person')
  ? '- Use only supported active preferences. Corrections and retractions supersede earlier interpretations. Indifference is not dislike; an unknown reason is not permission to invent one. A conditional tolerance stays conditional. Explicit exclusions win; never recommend a known violation with a caveat.'
  : line).join('\n')+'\nIn this adaptive game dialogue only explicitly completed or excluded titles have been removed. A game merely started or dropped may be offered to continue if the current request allows it. Respect the full evidence-backed conversation; factual unknowns must be stated, not guessed.';
export const systemFor=(state)=>state.domain==='game'?(state.conversation?ADAPTIVE_GAME_SYSTEM:GAME_SYSTEM):state.domain==='cartoon'||state.situation?.company==='kids'?CONTEXTUAL_SYSTEM:SYSTEM;

// Structured output: four picks in order, each with a reason, a caveat and a guess whether the person has seen it;
// a pick outside the shortlist comes as title and year instead of an id.
export const SCHEMA = {
  type: 'object',
  properties: {
    understood: { type: 'string' },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          year: { type: 'integer' },
          reason: { type: 'string' },
          caveat: { type: 'string' },
          likelySeen: { type: 'boolean' },
        },
        required: ['id', 'title', 'year', 'reason', 'caveat', 'likelySeen'],
        additionalProperties: false,
      },
    },
  },
  required: ['understood', 'picks'],
  additionalProperties: false,
};

const REACTION = { love: 'обожаю', like: 'нормально', dislike: 'не моё', tried: 'не моё, бросил' };
const nameOf = (g) => (g.ru && g.ru !== g.name ? `${g.ru} (${g.name})` : g.name);

function lengthOf(g) {
  if (g.kind === 'game') {
    const length = ['length.short', 'length.long', 'length.endless'].find((f) => g.features[f]?.r >= 0.5 && g.features[f]?.c >= 0.5);
    const label = { 'length.short': 'короткая', 'length.long': 'длинная', 'length.endless': 'без конца' }[length];
    return [label ? `объём по разметке: ${label}${g.features[length].src?.includes('hours') ? ' (косвенно по часам отзывов)' : ''}` : '',
      g.medianHoursAtReview ? `на момент отзыва: ${Math.round(g.medianHoursAtReview)} ч, не время прохождения` : 'время прохождения в каталоге неизвестно'].filter(Boolean).join('; ');
  }
  if (g.kind === 'series') {
    return [g.seasons ? `${g.seasons} сез.` : '', g.episodes ? `${g.episodes} сер.` : '', g.runtime ? `по ${g.runtime} мин` : '', g.status === 'Ended' ? 'закончен' : g.status ? 'идёт' : '']
      .filter(Boolean).join(', ');
  }
  return g.runtime ? `${g.runtime} мин` : '';
}

/** The person: domain, tonight, marked titles with reasons and complaints, preferences, wish. */
export function describePerson(state, catalog, { wish = '', previous = [], alreadyShown = [] } = {}) {
  const { featureById, complaintByFeature, stops, company } = catalog.dict;
  const label = (f) => featureById.get(f)?.label ?? complaintByFeature.get(f)?.label ?? f;
  const domain = DOMAINS[state.domain];
  const lines = [`Что ищет: ${domain.label.toLowerCase()}.`];
  if (state.conversation) {
    lines.push('Актуальный разговор и проверяемое понимание: ' + JSON.stringify(state.conversation));
    lines.push('Сегодняшний запрос главнее прежних симпатий. Используй действующие факты и поправки; снятые выводы не восстанавливай из старых реплик. История/условие/неважно/неизвестно не являются запретами. Только начало игры не означает dislike: её можно предложить продолжить, если это согласуется с запросом. Не выдавай предположения за слова человека. При нехватке фактов о пригодности укажи конкретную непроверенность.');
    const returning=(state.conversation.familiarity?.returnToIds??[]).map(id=>catalog.byId.get(id)).filter(Boolean);
    if(returning.length)lines.push(`Человек явно оставил для сегодняшнего выбора — хочет вернуться или переиграть: ${returning.map(nameOf).join(', ')}. Даже если раньше прошёл игру, этот выбор разрешает возвращение; это не оценка симпатии и не новый вкус. Явное сегодняшнее жёсткое исключение всё равно сильнее, действующие сита обязательны.`);
  }
  const s = state.situation ?? {};
  const time = domain.time?.find((t) => t.id === s.time);
  if (time) lines.push(`Время: ${time.label}.`);
  const who = company?.find((c) => c.id === s.company);
  if (who) lines.push(`С кем: ${who.label}.`);
  const context=contextQuestion(state);
  const contextLabel=context?.options.find(o=>o.value===s[context.contextKey])?.label;
  if(contextLabel) lines.push(`${context.contextKey==='childAge'?'Возраст детей':'Игроков'}: ${contextLabel}.`);
  if(s.note) lines.push(`Сегодня своими словами: «${String(s.note).replace(/\s+/g,' ').trim().slice(0,300)}».`);
  const intent = confirmedIntent(s, catalog.dict);
  if (intent) {
    const confirmed = [...intent.wants.map((x) => `хочется ${label(x.f)} (из слов «${x.evidence}»)`),
      ...intent.avoids.map((x) => `меньше ${label(x.f)} (из слов «${x.evidence}»)`),
      ...(intent.time ? [`есть ${intent.time.minutes} мин на сегодняшний сеанс, не на всё прохождение`] : [])];
    if (confirmed.length) lines.push(`Подтверждено на сегодня: ${confirmed.join('; ')}. Это контекст сессии, не постоянный вкус. Не делай дополнительных выводов из снятых или неподтверждённых пунктов.`);
    else lines.push('Человек проверил разбор и не подтвердил ни одного структурированного желания или ограничения. Не восстанавливай снятые выводы из исходного текста и не выводи желаемое впечатление из одного эмоционального состояния. Опирайся на остальные явные ответы.');
  }
  if (state.domain === 'game' && state.platform) lines.push(`Платформа: ${state.platform}.`);
  const facts = [
    s.episodeLength === 'short' ? 'серии по 20–30 минут' : s.episodeLength === 'long' ? 'серии по часу' : '',
    s.popularity === 'mainstream' ? 'то, о чём все говорят' : s.popularity === 'niche' ? 'то, о чём мало кто знает' : '',
    s.era === 'new' ? 'свежее, с 2015 года' : s.era === 'any' ? 'старое тоже можно, эпоха не важна' : '',
    s.onlyEnded ? 'только законченные сериалы' : '',
    ...(s.leans ?? []).map((l) => `сегодня: ${l.label}`),
  ].filter(Boolean);
  if (facts.length) lines.push(`Сегодня просил: ${facts.join('; ')}.`);
  if (state.stops?.length) lines.push(`Точно не надо: ${state.stops.map((f) => stops.find((x) => x.f === f)?.label ?? label(f)).join(', ')}.`);

  const marked = Object.entries(state.answers ?? {}).filter(([, a]) => a?.reaction && a.reaction !== 'unknown');
  if (marked.length) {
    lines.push('', 'Знакомые тайтлы:');
    for (const [id, a] of marked) {
      const g = catalog.byId.get(id);
      if (!g) continue;
      const said = [
        a.reasons?.length ? `за что: ${a.reasons.map(label).join(', ')}` : '',
        a.issues?.length ? `что мешало: ${a.issues.map((x) => `${label(x.f)}${x.hard ? ' (никогда)' : ''}`).join(', ')}` : '',
        a.badQuality ? 'такое любит, просто это плохо сделано' : '',
        a.text ? `своими словами: «${a.text}»` : '',
      ].filter(Boolean).join('; ');
      lines.push(`- ${nameOf(g)}, ${g.year ?? 'год ?'}: ${REACTION[a.reaction] ?? a.reaction}${said ? `; ${said}` : ''}`);
    }
  }
  const prefs = (state.preferences ?? []).map((p) => (typeof p === 'string' ? p : p?.f)).filter(Boolean);
  if (prefs.length) lines.push('', `На вопрос «что важнее» выбрал: ${prefs.map(label).join(', ')}.`);
  // «Уже смотрел» on a result card: seen, so not to be picked again; a rating, when given, says how it went.
  const seen = (state.corrections ?? []).filter((c) => c.kind === 'played').map((c) => ({ g: catalog.byId.get(c.id), c })).filter((x) => x.g);
  if (seen.length) lines.push(`${state.domain === 'game' ? 'Уже играл' : 'Уже смотрел'} (сказал на подборе): ${seen.map(({ g, c }) => `${nameOf(g)}${c.reaction === 'like' ? ' — понравилось' : c.reaction === 'dislike' ? ' — не зашло' : ''}`).join(', ')}.`);
  const neutralShown = new Set(alreadyShown);
  const notNow = (state.session?.notNow ?? []).filter(id=>!neutralShown.has(id));
  if (notNow.length) lines.push(`Отказался сейчас («не сейчас»): ${notNow.map((id) => catalog.byId.get(id)).filter(Boolean).map(nameOf).join(', ')}.`);
  if (previous.length) lines.push(`Уже показано и не устроило: ${previous.map((id) => catalog.byId.get(id)).filter(Boolean).map(nameOf).join(', ')}.`);
  if (alreadyShown.length) lines.push(`Уже показано для выбора: ${alreadyShown.map(id=>catalog.byId.get(id)).filter(Boolean).map(nameOf).join(', ')}. Исключено только ради новых вариантов; это не означает отказ, неприязнь или знакомство. Продолжай тот же запрос без выводов о вкусе по факту показа.`);
  if (wish) lines.push('', `Пожелание своими словами: «${wish}»`);
  return lines.join('\n');
}

// Cosine of two titles' tag vectors (r·c per feature): which liked title a candidate is closest to, by tags.
function similarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [f, v] of Object.entries(a.features)) {
    const x = v.r * v.c;
    na += x * x;
    const w = b.features[f];
    if (w) dot += x * w.r * w.c;
  }
  for (const v of Object.values(b.features)) nb += (v.r * v.c) ** 2;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
const described = (g) => Object.values(g.features).filter((v) => v.r >= 0.5 && v.c >= 0.5).length;

/**
 * One line per candidate: id, name, year, length, genres, audience rating, engine rank and tags, the liked title it
 * is closest to by tags, a note when its tags are few (so a thin title is not judged by its tags), summary.
 */
export function describeCandidates(rows, catalog, liked = [], { detailed = 40 } = {}) {
  const { featureById } = catalog.dict;
  return rows.map((r, i) => {
    const g = r.game;
    const focused=catalog.domain.id==='game'||catalog.domain.id==='cartoon';
    const near = liked.map((l) => ({ l, s: similarity(g, l) })).sort((a, b) => b.s - a.s)[0];
    const positive = r.matches.filter((m) => m.contribution > 0);
    const matched = positive.filter((m) => m.confirmed || m.preferred).slice(0, 6).map((m) => featureById.get(m.f)?.label ?? m.f);
    const weak = positive.filter((m) => !m.confirmed && !m.preferred).slice(0, 3).map((m) => featureById.get(m.f)?.label ?? m.f);
    const legacyMatches=positive.slice(0,6).map(m=>featureById.get(m.f)?.label??m.f);
    const against = r.penalties.slice(0, 2).map((p) => featureById.get(p.f)?.label ?? p.f);
    const summary = (g.summary ?? '').replace(/\s+/g, ' ').slice(0, 220);
    if (i >= detailed) return [
      i === detailed ? '\nДополнительный поиск (те же сита, краткие карточки):\n' : '',
      `id=${g.id}`, nameOf(g), g.year ?? 'год ?',
      g.kind === 'game' ? playerFactText(g) : '',
      matched.length ? `подтверждено: ${matched.slice(0, 3).join(', ')}` : weak.length ? `слабый вывод: ${weak.slice(0, 2).join(', ')}` : '',
      against.length ? `против: ${against.join(', ')}` : '',
    ].filter(Boolean).join(' | ');
    return [
      `id=${g.id}`,
      nameOf(g),
      g.year ?? 'год ?',
      lengthOf(g),
      g.kind === 'game' ? playerFactText(g) : '',
      (g.genres ?? []).slice(0, 3).join('/'),
      g.reviews?.desc ? `${g.reviews.desc}, ${g.reviews.total} оценок` : '',
      focused ? `движок #${r.rank ?? i + 1}${matched.length ? `, подтверждено: ${matched.join(', ')}` : ''}${weak.length ? `, слабый вывод: ${weak.join(', ')}` : ''}${against.length ? `, против: ${against.join(', ')}` : ''}`
        : `движок #${i+1}${legacyMatches.length?`, совпало: ${legacyMatches.join(', ')}`:''}${against.length?`, против: ${against.join(', ')}`:''}`,
      near && near.s >= 0.4 ? `по тегам ближе всего к: ${nameOf(near.l)} (${near.s.toFixed(2)})` : '',
      described(g) < 6 ? 'тегов мало, суди по тому, что знаешь' : '',
      summary ? `о чём: ${summary}` : '',
    ].filter(Boolean).join(' | ');
  }).join('\n');
}
