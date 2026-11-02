import { initialState, reduce } from '../core/dialogue.js';
import { loadPersonas } from './personas.js';

// Authored counterfactuals, NOT real human sessions or ground-truth labels. Existing personas/targets stay intact.
const PAIRS = [
  { persona: 'andrey', wishes: [
    { note: 'Сегодня хочу спокойную историю, без напряжения', wants: [['tension.low', 'спокойную']], avoids: [['tension.high', 'без напряжения']] },
    { note: 'Сегодня хочу напряжённую историю, чтобы держала в напряжении, а не спокойный сюжет', wants: [['tension.high', 'держала в напряжении']], avoids: [['tension.low', 'не спокойный сюжет']] },
  ] },
  { persona: 'danya', wishes: [
    { note: 'Сегодня хочу смешной кооператив, без соревнования', wants: [['humor.funny', 'смешной'], ['social.coop', 'кооператив']], avoids: [['social.pvp', 'без соревнования']] },
    { note: 'Сегодня хочу соревнование с другими игроками, не спокойное развлечение', wants: [['social.pvp', 'соревнование с другими игроками']], avoids: [['tension.low', 'не спокойное развлечение']] },
  ] },
  { persona: 'dima', wishes: [
    { note: 'Сегодня хочется смешного и лёгкого, без грусти', wants: [['humor.funny', 'смешного'], ['tone.lighthearted', 'лёгкого']], avoids: [['tone.melancholic', 'без грусти']] },
    { note: 'Сегодня хочется грустной драмы, чтобы пробрало, без шуток', wants: [['tone.melancholic', 'грустной драмы, чтобы пробрало']], avoids: [['humor.funny', 'без шуток']] },
  ] },
  { persona: 'lena', wishes: [
    { note: 'Сегодня хочу смотреть фоном, без необходимости вникать', wants: [['cognitive.low', 'без необходимости вникать']], avoids: [['cognitive.high', 'без необходимости вникать']] },
    { note: 'Сегодня хочу внимательно следить за хитрым сюжетом, не фоновое шоу', wants: [['cognitive.high', 'внимательно следить за хитрым сюжетом']], avoids: [['cognitive.low', 'не фоновое шоу']] },
  ] },
];

export function sessionCases(catalogs) {
  const personas = loadPersonas();
  return PAIRS.flatMap((pair, index) => {
    const persona = personas.find((p) => p.id === pair.persona), catalog = catalogs[persona.domain];
    const answers = Object.fromEntries([
      ...persona.loved.map((x) => [x.id, { reaction: x.love ? 'love' : 'like', reasons: x.reasons ?? [], text: x.text ?? '', issues: [] }]),
      ...persona.disliked.map((x) => [x.id, { reaction: 'dislike', issues: x.issues ?? [], text: x.text ?? '' }]),
    ].filter(([id]) => catalog.byId.has(id)));
    return pair.wishes.map((wish, evening) => {
      const before = { ...initialState(), seed: 101 + index, step: 'anchors', domain: persona.domain, platform: persona.platform ?? 'windows', answers,
        stops: persona.stops ?? [], situation: { ...initialState().situation, ...persona.situation, note: wish.note } };
      const signals = (rows) => rows.map(([f, evidence]) => {
        if (!catalog.dict.featureById.has(f)) throw new Error(`Unknown authored feature ${f}`);
        return { f, evidence };
      });
      const after = reduce(before, { type: 'confirm_intent', intent: { sourceText: wish.note, wants: signals(wish.wants), avoids: signals(wish.avoids), time: null } }, catalogs);
      return { caseId: `pair-${index + 1}-evening-${evening + 1}`, pairId: `pair-${index + 1}`, before, after };
    });
  });
}
