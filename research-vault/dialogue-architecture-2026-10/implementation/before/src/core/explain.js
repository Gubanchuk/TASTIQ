// Explanations only from facts with ids (research raw/04, section 6.2). A template renders them
// here; an LLM explainer, if added, must return [{claim, factIds}] and pass the same validator.
import { episodesRu } from '../lib/text.js';

const names = (sources) => [...new Set(sources.map((s) => s.name).filter(Boolean))];
const list = (items) => (items.length <= 2 ? items.join(' и ') : `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`);
// Titles stay in quotes and in their own form, never declined: «В поисках Немо», not «В В поисках Немо».
const titles = (items) => list(items.map((x) => `«${x}»`));

const RISK_MIN_R = 0.34;
// A quote from a thumbs-down review ("Too many puzzles") cannot back a plus; it still backs a risk.
const supporting = (ev) => ev.filter((e) => e.thumb !== 'down');
const MAX_CONFIRMED = 4;
const MAX_INFERRED = 2;

export function buildFacts(item, detail, taste, catalog) {
  const { featureById } = catalog.dict;
  const facts = [];
  // What the person said (reasons, fork answers) first; inferred features are weak and only two of them are worth reading.
  const said = (m) => m.confirmed || m.preferred;
  const confirmed = detail.matches.filter(said).slice(0, MAX_CONFIRMED);
  const inferred = detail.matches.filter((m) => !said(m)).slice(0, MAX_INFERRED);
  for (const m of [...confirmed, ...inferred]) {
    const v = item.features[m.f];
    const kinds = new Set(m.sources.map((s) => s.kind));
    facts.push({
      id: `match:${m.f}`,
      type: 'match',
      f: m.f,
      basis: kinds.has('confirmed') ? 'confirmed' : kinds.has('preference') ? 'preference' : 'inferred',
      sources: names(m.sources.filter((s) => s.kind !== 'inferred' || !kinds.has('confirmed'))),
      evidence: supporting(v.ev).slice(0, 2),
      contribution: m.contribution,
    });
  }
  const shown = new Set(facts.map((x) => x.f));
  for (const h of detail.moodHits.filter((x) => x.sign > 0 && !shown.has(x.f)).slice(0, 2)) {
    facts.push({ id: `mood:${h.f}`, type: 'mood', f: h.f, why: h.why, evidence: supporting(item.features[h.f].ev).slice(0, 1) });
  }
  for (const p of detail.penalties.filter((x) => x.r >= RISK_MIN_R)) {
    facts.push({ id: `risk:dislike:${p.f}`, type: 'risk_dislike', f: p.f, sources: names(p.sources), evidence: item.features[p.f].ev.slice(0, 1) });
  }
  for (const h of detail.moodHits.filter((x) => x.sign < 0 && item.features[x.f].r >= RISK_MIN_R).slice(0, 2)) {
    facts.push({ id: `risk:mood:${h.f}`, type: 'risk_mood', f: h.f, why: h.why, evidence: item.features[h.f].ev.slice(0, 1) });
  }
  for (const [f, v] of Object.entries(item.features)) {
    const feature = featureById.get(f);
    if (!feature?.risk || v.r < RISK_MIN_R || taste.dislike.has(f)) continue;
    if (f === 'completeness.unfinished' && v.src.includes('fact')) {
      facts.push({ id: 'risk:early_access', type: 'risk_fact', f });
      continue;
    }
    if (taste.weights.get(f)?.confirmed || taste.weights.get(f)?.preferred) continue; // the person said they like it (grind fans exist)
    facts.push({ id: `risk:flaw:${f}`, type: 'risk_flaw', f, evidence: v.ev.filter((e) => e.kind !== 'fact').slice(0, 1) });
  }
  if (item.quality < catalog.domain.qualityWarn) {
    facts.push({ id: 'risk:quality', type: 'risk_quality', ratio: item.reviews.ratio, desc: item.reviews.desc });
  }
  const hasLength = ['length.short', 'length.long', 'length.endless'].some((f) => item.features[f]?.r >= 0.5);
  if (catalog.domain.id === 'game' && !hasLength && item.medianHoursAtReview == null) facts.push({ id: 'gap:length', type: 'gap', what: 'длина' });

  facts.push({ id: 'fact:reviews', type: 'fact', ratio: item.reviews.ratio, total: item.reviews.total, desc: item.reviews.desc });
  if (item.medianHoursAtReview != null) facts.push({ id: 'fact:hours', type: 'fact', hours: item.medianHoursAtReview });
  if (item.deck) facts.push({ id: 'fact:deck', type: 'fact', deck: item.deck });
  if (item.runtime && item.kind === 'film') facts.push({ id: 'fact:runtime', type: 'fact', runtime: item.runtime });
  if (item.kind === 'series' && (item.seasons || item.episodes)) facts.push({ id: 'fact:seasons', type: 'fact', seasons: item.seasons, episodes: item.episodes, status: item.status });
  return facts;
}

const DECK_RU = { verified: 'проверена для Steam Deck', playable: 'играбельна на Steam Deck', unsupported: 'не поддерживается на Steam Deck', unknown: 'статус на Steam Deck неизвестен' };
const STATUS_RU = { Ended: 'закончен', Running: 'ещё выходит', 'To Be Determined': 'судьба неизвестна', 'In Development': 'в разработке' };

export function renderExplanation(facts, catalog) {
  const { featureById, complaintByFeature } = catalog.dict;
  const isGame = catalog.domain.id === 'game';
  const label = (f) => featureById.get(f)?.label ?? f;
  const complaint = (f) => complaintByFeature.get(f)?.label ?? label(f);
  const reasons = [];
  const risks = [];
  const info = [];
  for (const fact of facts) {
    const f = fact.f ? `«${label(fact.f)}»` : '';
    switch (fact.type) {
      case 'match':
        if (fact.basis === 'confirmed') reasons.push({ text: `${titles(fact.sources)}: ты отметил ${f}, здесь это тоже есть`, factIds: [fact.id] });
        else if (fact.basis === 'preference') reasons.push({ text: `Ты сказал, что тебе важно ${f}, здесь это есть`, factIds: [fact.id] });
        else {
          // Inferred matches read as one line, not one sentence each: they are the weakest part of the case.
          const slot = reasons.find((x) => x.inferred) ?? reasons[reasons.push({ inferred: [], sources: [], factIds: [], weak: true }) - 1];
          slot.inferred.push(f);
          slot.sources.push(...fact.sources);
          slot.factIds.push(fact.id);
        }
        break;
      case 'mood':
        reasons.push({ text: `Под настроение «${fact.why[0]}»: ${f}`, factIds: [fact.id] });
        break;
      case 'risk_dislike':
        risks.push({ text: `${titles(fact.sources)}: тебе мешало «${complaint(fact.f)}». Здесь это тоже есть`, factIds: [fact.id] });
        break;
      case 'risk_mood':
        risks.push({ text: `Сегодня ты просил другое («${fact.why[0]}»), а здесь ${f}`, factIds: [fact.id] });
        break;
      case 'risk_flaw':
        risks.push({ text: `${isGame ? 'Игроки' : 'Зрители'} жалуются: ${label(fact.f)}`, factIds: [fact.id] });
        break;
      case 'risk_fact':
        risks.push({ text: 'Ранний доступ: игра ещё не закончена', factIds: [fact.id] });
        break;
      case 'risk_quality':
        risks.push({ text: `Оценка ${fact.desc ?? `${Math.round(fact.ratio * 100)}%`}: ниже, чем у большинства в каталоге`, factIds: [fact.id] });
        break;
      case 'gap':
        risks.push({ text: `Нет данных: ${fact.what}`, factIds: [fact.id] });
        break;
      case 'fact':
        if (fact.total != null) {
          info.push({
            text: isGame
              ? `${Math.round(fact.ratio * 100)}% положительных из ${fact.total.toLocaleString('ru-RU')} отзывов Steam`
              : `${fact.desc} из 10, ${fact.total.toLocaleString('ru-RU')} оценок`,
            factIds: [fact.id],
          });
        }
        if (fact.hours != null) info.push({ text: `Авторы отзывов к моменту отзыва наиграли в среднем (медиана) ${fact.hours} ч`, factIds: [fact.id] });
        if (fact.deck) info.push({ text: DECK_RU[fact.deck], factIds: [fact.id] });
        if (fact.runtime) info.push({ text: `${fact.runtime} мин`, factIds: [fact.id] });
        if (fact.seasons || fact.episodes) {
          const parts = [fact.seasons && `${fact.seasons} сез.`, fact.episodes && episodesRu(fact.episodes), STATUS_RU[fact.status]].filter(Boolean);
          info.push({ text: parts.join(', '), factIds: [fact.id] });
        }
        break;
    }
  }
  for (const [i, x] of reasons.entries()) {
    if (!x.inferred) continue;
    reasons[i] = { text: `${titles([...new Set(x.sources)])}: ещё ${list(x.inferred)}. Это ты не отмечал, вес слабый`, factIds: x.factIds, weak: true };
  }
  return { reasons, risks, info };
}

/** Every claim must point to at least one fact that exists for this title. */
export function validateExplanation(explanation, facts) {
  const ids = new Set(facts.map((f) => f.id));
  const errors = [];
  for (const group of ['reasons', 'risks', 'info']) {
    for (const item of explanation[group] ?? []) {
      if (!item.factIds?.length) errors.push(`${group}: "${item.text}" has no facts`);
      for (const id of item.factIds ?? []) if (!ids.has(id)) errors.push(`${group}: unknown fact ${id}`);
    }
  }
  // Risks are mandatory when risk facts exist (research raw/04, 6.2 item 5).
  const riskFacts = facts.filter((f) => f.type.startsWith('risk') || f.type === 'gap');
  if (riskFacts.length && !(explanation.risks ?? []).length) errors.push('risk facts exist but no risks shown');
  return { ok: errors.length === 0, errors };
}
