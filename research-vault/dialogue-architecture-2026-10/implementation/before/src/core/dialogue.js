// Step-by-step dialogue: one question per screen, the next one depends on the answers so far.
//   domain → (platform) → (time) → company → anchors → why ×2 → why not ×1 → stops → ask ×0–3 → result
// Facts about tonight come first and act as hard limits; titles the person knows get one of four reactions;
// «за что» starts as a choice between two features (plan step 3); then up to three questions, each chosen by how
// much its answer splits the leaders, and none when the leader is clear (plan step 4, ask.js).
// research-vault/akinator-picker-2026-10/SUMMARY.md describes both steps.
// Pure functions over a plain state object the client keeps; the server holds nothing between calls.
import { DOMAINS } from '../aspects/index.js';
import { nextQuestion } from './ask.js';
import { searchItems } from './catalog.js';
import { complaintChips, likeChips, pairFor, seedItems } from './questions.js';
import { recommend } from './recommend.js';
import { PLATFORMS } from './sieves.js';
import { contextQuestion } from './context.js';
import { confirmedIntent, intentProposal, withNote } from './session-intent.js';
export { contextQuestion };

export const MAX_WHY = 2; // «за что» asked for at most this many liked titles (pilot error 6: long onboarding)
export const MAX_WHY_NOT = 1;
const PICK_PAGE = 8;
const EXTRA_PAGE_BELOW = 2; // fewer known titles than this on the anchors screen: one more page
const REACTIONS = ['love', 'like', 'dislike', 'unknown'];

export function initialState() {
  return {
    step: 'domain',
    domain: null,
    platform: 'windows',
    situation: { time: null, company: null, childAge: null, partySize: null, note: '', popularity: null, era: null, onlyEnded: false, episodeLength: null, leans: [] },
    stops: [],
    asked: [],
    shown: [],
    liked: [],
    disliked: [],
    whyIndex: 0,
    answers: {},
    corrections: [],
    preferences: [],
    session: { notNow: [] },
    seed: Math.floor(Math.random() * 1e6),
  };
}

const card = (item) => ({
  id: item.id,
  name: item.name,
  ru: item.ru,
  original: item.original ?? null,
  year: item.year,
  image: item.image ?? null,
  poster: item.poster ?? null,
  kind: item.kind,
  genres: (item.genres ?? []).slice(0, 3),
  rating: item.reviews?.desc ?? null,
});

const isGame = (domainId) => domainId === 'game';
const timeOptions = (state) => DOMAINS[state.domain]?.time ?? [];
const companyOptions = (state) => DOMAINS[state.domain]?.dict.company ?? [];


export function profileOf(state) {
  return { answers: state.answers, corrections: state.corrections, preferences: state.preferences, stops: state.stops };
}

/** Tonight: the platform, the time limit and the company as hard limits and session moods. */
export function sessionOf(state) {
  const time = timeOptions(state).find((t) => t.id === state.situation?.time);
  const company = companyOptions(state).find((c) => c.id === state.situation?.company);
  const intent = confirmedIntent(state.situation, DOMAINS[state.domain]?.dict);
  return {
    ...state.session,
    platform: state.platform,
    partySize: state.domain === 'game' ? (state.situation?.company === 'friend' ? '2' : state.situation?.company === 'group' && ['2','3','4','5+'].includes(state.situation?.partySize) ? state.situation.partySize : null) : null,
    childAge: state.situation?.company === 'kids' ? state.situation.childAge ?? null : null,
    ...time?.session,
    intent,
    ...(intent?.time ? { minutes: intent.time.minutes,
      ...(state.domain !== 'game' ? { maxRuntime: Math.min(time?.session?.maxRuntime ?? Infinity, intent.time.minutes) } : {}),
    } : {}),
    moods: [time?.mood, company?.mood].filter(Boolean),
    popularity: state.situation?.popularity ?? null,
    era: state.situation?.era ?? null,
    onlyEnded: Boolean(state.situation?.onlyEnded),
    episodeLength: state.situation?.episodeLength ?? null,
    leans: state.situation?.leans ?? [],
  };
}

const questionFor = (state, catalog) => nextQuestion(catalog, profileOf(state), sessionOf(state), { asked: state.asked ?? [], shown: state.shown });
const afterAnswers = (state, catalog) => (questionFor(state, catalog) ? 'ask' : 'result');

// An answer to an adaptive question: a lean is tonight's mood (session only), a pair a taste preference (weighs like
// a reason, never counts as one), a fact shifts tonight's session, «уже видел» records the title as played.
export function applyAnswer(s, q, value) {
  const qid = q.id;
  const [kind, rest] = [qid.slice(0, qid.indexOf(':')), qid.slice(qid.indexOf(':') + 1)];
  const sides = rest.split('|');
  if (kind === 'lean' && sides.includes(value)) {
    s.situation.leans = [...(s.situation.leans ?? []), { f: value, against: sides.find((x) => x !== value), label: q.options.find((o) => o.value === value).label }];
  }
  if (kind === 'pair' && sides.includes(value)) s.preferences.push({ f: value, qid });
  if (qid === 'fact:popularity' && (value === 'mainstream' || value === 'niche')) s.situation.popularity = value;
  if (qid === 'fact:era' && (value === 'new' || value === 'any')) s.situation.era = value;
  if (qid === 'fact:ended' && value === 'yes') s.situation.onlyEnded = true;
  if (qid === 'fact:episode' && (value === 'short' || value === 'long')) s.situation.episodeLength = value;
  if (kind === 'guess' && (value === 'like' || value === 'dislike')) s.corrections.push({ id: rest, kind: 'played', reaction: value });
  s.asked.push(qid);
}

// Titles to ask about lean towards what tonight needs: family titles when watching with kids, co-op with friends.
function seedFocus(state) {
  const company = state.situation?.company;
  if (company === 'kids') return ['content.family'];
  // Alone: single-player games first; the most played games are online shooters a solo story player has not touched.
  if (isGame(state.domain) && company === 'solo') return ['social.solo'];
  if (isGame(state.domain) && company === 'friend') return ['social.coop'];
  if (isGame(state.domain) && company === 'group') return ['social.coop', 'social.pvp'];
  return [];
}

function anchorsScreen(state, catalog) {
  const game = isGame(state.domain);
  const exclude = [...new Set([...Object.keys(state.answers), ...state.shown])];
  const first = !state.shown.length && !state.firstPage;
  const items = seedItems(catalog, { answered: exclude, platform: state.platform, genres: seedFocus(state), strict: state.situation?.company === 'kids', n: PICK_PAGE, seed: state.seed + state.shown.length, first });
  const extra = Boolean(state.firstPage);
  return {
    step: 'anchors',
    title: extra ? 'Может, что-то из этого знаешь?' : game ? 'Во что играл, и как?' : 'Что смотрел, и как?',
    hint: extra
      ? 'Пока отмечено мало, и подбор выйдет наугад. Отметь, что знаешь. Если ничего, жми «Дальше».'
      : 'Отметь, как тебе знакомые названия, затем нажми «Дальше». Все карточки заполнять не нужно.',
    extra,
    items: items.map(card),
    reactions: [
      { value: 'love', label: 'обожаю' },
      { value: 'like', label: 'нормально' },
      { value: 'dislike', label: 'не моё' },
      { value: 'unknown', label: game ? 'не играл' : 'не видел' },
    ],
    search: true,
    more: true,
  };
}

/** The screen for the current state. */
export function screen(state, catalogs) {
  const catalog = state.domain ? catalogs[state.domain] : null;
  switch (state.step) {
    case 'domain':
      return {
        step: 'domain',
        title: 'Что хочешь?',
        options: Object.values(DOMAINS).filter((d) => catalogs[d.id]).map((d) => ({ value: d.id, label: d.label })),
        later: ['Почитать', 'Аниме'],
      };
    case 'platform':
      return { step: 'platform', title: 'Где играешь?', options: Object.entries(PLATFORMS).map(([value, p]) => ({ value, label: p.label })) };
    case 'time':
      return {
        step: 'time',
        title: state.domain === 'series' ? 'На сколько готов засесть?' : 'Сколько есть времени?',
        options: timeOptions(state).map((t) => ({ value: t.id, label: t.label })),
        canSkip: true,
      };
    case 'company':
      return {
        step: 'company',
        title: isGame(state.domain) ? 'Один или с друзьями?' : 'Один или с кем-то?',
        options: companyOptions(state).map((c) => ({ value: c.id, label: c.label })),
        canSkip: true,
      };
    case 'context': {
      const q = contextQuestion(state);
      return q ? {step:'context',...q,canSkip:true} : anchorsScreen(state,catalog);
    }
    case 'anchors':
      return anchorsScreen(state, catalog);
    case 'why': {
      const id = state.liked[state.whyIndex];
      const item = catalog.byId.get(id);
      return {
        step: 'why',
        title: `За что тебе ${state.answers[id]?.reaction === 'love' ? 'так нравится' : 'зашло'} «${item.ru ?? item.name}»?`,
        hint: 'Что главное? Можно выбрать несколько, остальные причины ниже.',
        item: card(item),
        pair: pairFor(item, catalog).map((c) => ({ value: c.f, label: c.label })),
        options: likeChips(item, catalog).map((c) => ({ value: c.f, label: c.label })),
        freeText: true,
        canSkip: true,
        progress: `${state.whyIndex + 1} из ${state.liked.length}`,
      };
    }
    case 'why_not': {
      const id = state.disliked[state.whyIndex];
      const item = catalog.byId.get(id);
      const chips = complaintChips(item, catalog, 'dislike');
      return {
        step: 'why_not',
        title: `Что не так с «${item.ru ?? item.name}»?`,
        hint: 'Один тап: мешало. Второй: «никогда, ни в чём».',
        item: card(item),
        options: chips.complaints.map((c) => ({ value: c.f, label: c.label })),
        categories: chips.categories.map((c) => ({ value: c.f, label: c.label })),
        badQuality: true,
        tried: isGame(state.domain) ? 'Бросил, не доиграл' : 'Бросил, не досмотрел',
        freeText: true,
        canSkip: true,
      };
    }
    case 'stops':
      return {
        step: 'stops',
        title: 'Что точно не надо?',
        hint: 'Такое не предложу совсем. Если всё можно, просто дальше.',
        // «Длинное» after a time answer is either already sieved («до полутора часов») or contradicts it («надолго»).
        options: catalog.dict.stops.filter((x) => x.f !== 'length.long' || !state.situation?.time).map((x) => ({ value: x.f, label: x.label })),
        canSkip: true,
      };
    case 'ask': {
      const q = questionFor(state, catalog);
      if (!q) return screen({ ...state, step: 'result' }, catalogs);
      return {
        step: 'ask',
        kind: q.kind,
        qid: q.id,
        title: q.text,
        hint: q.kind === 'guess' ? 'Если уже знаешь его, предложу другое.'
          : q.kind === 'lean' ? 'Выбери, чего хочется сегодня. Если оба варианта подходят — нажми «Всё равно».'
            : 'Уточним, что тебе подходит сегодня. Если не важно — нажми «Всё равно».',
        options: q.options,
        canSkip: true,
        progress: `${(state.asked?.length ?? 0) + 1}`,
      };
    }
    case 'result': {
      const session = sessionOf(state);
      const result = recommend(catalog, profileOf(state), session);
      const hasIntent = Boolean(session.intent && (session.intent.wants.length || session.intent.avoids.length || session.intent.time));
      const context=contextQuestion(state);
      result.uncheckedContext=[
        context?.contextKey === 'childAge' && context.options.some(o=>o.value===state.situation?.childAge) ? 'возраст детей' : '',
        state.situation?.note && !hasIntent ? 'пожелание на вечер' : '',
      ].filter(Boolean);
      result.today = session.intent;
      return { step: 'result', title: 'Вот что я подобрал', result };
    }
    default:
      throw new Error(`Unknown step ${state.step}`);
  }
}

// What the person typed about a title, kept as said: the parser turns it into chips for the engine, the AI picker
// reads the words themselves («можно включить любую серию фоном» is more than any chip).
const ownWords = (action) => {
  const text = typeof action.text === 'string' ? action.text.replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  return text ? { text } : {};
};

// An answer about this title from an earlier dialogue (the client keeps it in «Моё»). Taken only when it
// is of the same kind as the reaction and says something; otherwise the title is asked about like any other.
function knownAnswer(a, reaction) {
  if (!a || typeof a !== 'object') return null;
  const reasons = Array.isArray(a.reasons) ? a.reasons.filter((x) => typeof x === 'string') : [];
  const issues = Array.isArray(a.issues) ? a.issues.filter((x) => typeof x?.f === 'string').map((x) => ({ f: x.f, hard: Boolean(x.hard) })) : [];
  const words = ownWords(a);
  const liking = (r) => r === 'like' || r === 'love';
  if (liking(reaction) && liking(a.reaction) && (reasons.length || issues.length || a.reaction === 'love' || words.text)) {
    return { reaction: a.reaction, reasons, issues, ...words };
  }
  if (reaction === 'dislike' && a.reaction === 'dislike' && (issues.length || a.badQuality || words.text)) {
    return { reaction: 'dislike', issues, badQuality: Boolean(a.badQuality), ...words };
  }
  return null;
}

const afterTitles = (s) => (s.liked.length ? 'why' : s.disliked.length ? 'why_not' : 'stops');
const afterSituation = (s) => (s.step === 'platform' && timeOptions(s).length ? 'time' : 'company');

/** Applies one answer and moves to the next step. */
export function reduce(state, action, catalogs) {
  const s = structuredClone(state);
  const catalog = s.domain ? catalogs[s.domain] : null;
  switch (action.type) {
    case 'choose':
      if (s.step === 'domain') {
        if (!catalogs[action.value]) throw new Error(`No catalog for ${action.value}`);
        const next = { ...initialState(), seed: s.seed, domain: action.value };
        return { ...next, step: isGame(action.value) ? 'platform' : timeOptions(next).length ? 'time' : 'company' };
      }
      if (s.step === 'platform') return { ...s, platform: action.value, step: afterSituation(s) };
      if (s.step === 'time') {
        s.situation.time = timeOptions(s).some((t) => t.id === action.value) ? action.value : null;
        return { ...s, step: 'company' };
      }
      if (s.step === 'company') {
        s.situation.company = companyOptions(s).some((c) => c.id === action.value) ? action.value : null;
        s.situation.childAge = null;
        s.situation.partySize = null;
        return { ...s, step: contextQuestion(s) ? 'context' : 'anchors' };
      }
      if (s.step === 'context') {
        const q=contextQuestion(s);
        if(q) s.situation[q.contextKey]=q.options.some(o=>o.value===action.value)?action.value:null;
        return {...s,step:'anchors'};
      }
      break;
    case 'more': // show another page of titles on the anchors screen
      if (typeof action.note==='string')s.situation=withNote(s.situation,action.note);
      return { ...s, shown: [...s.shown, ...(action.ids ?? [])] };
    case 'confirm_intent': {
      if (s.step !== 'anchors') break;
      if (action.intent?.sourceText !== s.situation.note) return s;
      const intent = intentProposal(action.intent, s.situation.note, catalog.dict);
      s.situation.intent = intent ? { ...intent, source: 'confirmed' } : null;
      return s;
    }
    case 'react': { // marks: [{ id, reaction }] in the order marked; known: { id: answer } kept from earlier dialogues
      if (s.step !== 'anchors') break;
      if (action.note !== undefined) s.situation = withNote(s.situation, action.note);
      // The site sends an authoritative snapshot; older stands send only additions on the extra page.
      const fresh = (action.marks ?? []).filter((m) => catalog.byId.has(m.id) && REACTIONS.includes(m.reaction));
      const snapshot = action.marksMode === 'snapshot';
      const marks = snapshot ? fresh : [...(s.firstPage?.marks ?? []).filter((m) => !fresh.some((x) => x.id === m.id)), ...fresh];
      const knownById = { ...(!snapshot ? s.firstPage?.known ?? {} : {}), ...(action.known ?? {}) };
      if (snapshot) s.answers = {};
      s.shown = [...new Set([...s.shown, ...(action.shownIds ?? [])])];
      const asked = { love: [], like: [], dislike: [] };
      for (const { id, reaction } of marks) {
        const known = knownAnswer(knownById[id], reaction);
        if (reaction === 'unknown') s.answers[id] = { reaction: 'unknown' };
        else if (known) s.answers[id] = known;
        else {
          s.answers[id] = reaction === 'dislike' ? { reaction, issues: [] } : { reaction, reasons: [], issues: [] };
          asked[reaction].push(id);
        }
      }
      // Fewer than two titles known: one more page before «за что». A person who marked one title told the picker
      // almost nothing, and each mark both points at a taste and keeps a seen title off the result (night plan 29.10).
      if (!s.firstPage && marks.filter((m) => m.reaction !== 'unknown').length < EXTRA_PAGE_BELOW) {
        s.firstPage = { marks, known: knownById };
        return s;
      }
      // Loved titles say the most about a person, so «за что» goes to them first.
      s.liked = [...asked.love, ...asked.like].slice(0, MAX_WHY);
      s.disliked = asked.dislike.slice(0, MAX_WHY_NOT);
      return { ...s, whyIndex: 0, step: afterTitles(s) };
    }
    case 'reasons': {
      const id = s.liked[s.whyIndex];
      const reaction = s.answers[id]?.reaction === 'love' ? 'love' : 'like';
      s.answers[id] = { reaction, reasons: action.values ?? [], issues: action.issues ?? [], ...ownWords(action) };
      s.whyIndex++;
      if (s.whyIndex < s.liked.length) return s;
      return { ...s, whyIndex: 0, step: s.disliked.length ? 'why_not' : 'stops' };
    }
    case 'issues': {
      const id = s.disliked[s.whyIndex];
      s.answers[id] = { reaction: action.tried ? 'tried' : 'dislike', issues: action.issues ?? [], badQuality: Boolean(action.badQuality), ...ownWords(action) };
      s.whyIndex++;
      if (s.whyIndex < s.disliked.length) return s;
      return { ...s, whyIndex: 0, step: 'stops' };
    }
    case 'stops': {
      const offered = new Set(catalog.dict.stops.map((x) => x.f));
      const next = { ...s, stops: (action.values ?? []).filter((f) => offered.has(f)) };
      return { ...next, step: afterAnswers(next, catalog) };
    }
    case 'answer': { // { qid, value }: the answer to the question on the screen
      const q = s.step === 'ask' ? questionFor(s, catalog) : null;
      if (q?.id !== action.qid) break;
      applyAnswer(s, q, action.value);
      return { ...s, step: afterAnswers(s, catalog) };
    }
    case 'skip': // «не знаю», «всё равно», «всё можно»
      if (s.step === 'time') return reduce(s, { type: 'choose', value: null }, catalogs);
      if (s.step === 'company') return reduce(s, { type: 'choose', value: null }, catalogs);
      if (s.step === 'context') return reduce(s, { type: 'choose', value: null }, catalogs);
      if (s.step === 'why') return reduce(s, { type: 'reasons', values: [] }, catalogs);
      if (s.step === 'why_not') return reduce(s, { type: 'issues', issues: [] }, catalogs);
      if (s.step === 'stops') return reduce(s, { type: 'stops', values: [] }, catalogs);
      if (s.step === 'ask') {
        const q = questionFor(s, catalog);
        if (q) s.asked.push(q.id);
        return { ...s, step: afterAnswers(s, catalog) };
      }
      break;
    // Result screen actions: the profile changes and the pick is recomputed at once.
    case 'remove': // «это не так» on one line of what was understood
      for (const a of Object.values(s.answers)) {
        if (action.kind === 'reason') a.reasons = (a.reasons ?? []).filter((f) => f !== action.f);
        else a.issues = (a.issues ?? []).filter((x) => x.f !== action.f);
      }
      if (action.kind === 'reason') s.preferences = s.preferences.filter((p) => p.f !== action.f);
      else s.stops = s.stops.filter((f) => f !== action.f);
      return s;
    case 'played': // «Уже смотрел» on a result card, one tap
    case 'rate_played': // «понравилось / не зашло» right after it: one mark per title, the later answer wins
      s.corrections = s.corrections.filter((c) => !(c.kind === 'played' && c.id === action.id));
      s.corrections.push({ id: action.id, kind: 'played', reaction: action.reaction });
      return s;
    case 'unplayed': // «Вернуть» after a mistaken «Уже смотрел»
      s.corrections = s.corrections.filter((c) => !(c.kind === 'played' && c.id === action.id));
      return s;
    case 'not_mine':
      s.corrections.push({ id: action.id, kind: 'not_mine', issues: action.issues ?? [] });
      return s;
    case 'not_now':
      s.session.notNow.push(action.id);
      return s;
    case 'restart':
      return initialState();
  }
  throw new Error(`Action ${action.type} does not fit step ${s.step}`);
}

/** Title search inside the chosen domain (for "назови своё"). */
export function searchInDomain(state, catalogs, query) {
  const catalog = catalogs[state.domain];
  return catalog ? searchItems(catalog, query).map((x) => card(x, catalog)) : [];
}
