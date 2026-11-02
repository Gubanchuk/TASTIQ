// Hard filters: sieves 1–3 fully, the hard parts of 4 and 5. Soft parts of 4 and 5 live in scoring.
// Every removed title records the first sieve that removed it, so "why not X?" has an answer.
import { plural } from '../lib/text.js';
import { playerFeasibility } from './feasibility.js';

export const HARD_MIN_R = 0.67;
// Short episodes are up to 35 minutes, long ones from 40: 1 940 and 4 475 of the 8 368 series above the quality floor.
export const EPISODE = { short: 35, long: 40 };

export const PLATFORMS = {
  windows: { label: 'ПК (Windows)', test: (g) => g.platforms?.windows },
  mac: { label: 'Mac', test: (g) => g.platforms?.mac },
  linux: { label: 'Linux', test: (g) => g.platforms?.linux },
  deck: { label: 'Steam Deck', test: (g) => g.deck === 'verified' || g.deck === 'playable' },
};

export const SIEVES = [
  { id: 1, name: 'Можно ли' },
  { id: 2, name: 'Было ли' },
  { id: 3, name: 'Сделано ли нормально' },
  { id: 4, name: 'Моё ли (жёсткие стопы)' },
  { id: 5, name: 'Подходит ли сегодня (обязательное)' },
];

/** Returns null when the title passes, or {sieve, reason} for the first sieve that removes it. */
export function checkSieves(item, taste, session = {}, catalog) {
  const { domain, dict } = catalog;
  const label = (f) => dict.featureById.get(f)?.label ?? f;
  if (!item.released) return { sieve: 1, reason: 'ещё не вышла' };
  if (domain.id === 'game') {
    const platform = PLATFORMS[session.platform ?? 'windows'] ?? PLATFORMS.windows;
    if (!platform.test(item)) return { sieve: 1, reason: `нет на платформе «${platform.label}»` };
  }

  if (taste.consumed.has(item.id)) return { sieve: 2, reason: domain.id === 'game' ? 'уже играл (или другое издание)' : 'уже смотрел' };
  // A part of a series the person already knows is not a discovery (Left 4 Dead for a Left 4 Dead 2 fan).
  const series = (item.series ?? []).find((s) => taste.playedSeries?.has(s));
  if (series && session.excludeSeries !== false) return { sieve: 2, reason: `из серии «${series}», ${domain.id === 'game' ? 'в которую ты уже играл' : 'которую ты уже смотрел'}` };
  if (taste.rejected.has(item.id)) return { sieve: 2, reason: 'ты отметил «не моё»' };
  if ((session.notNow ?? []).includes(item.id)) return { sieve: 2, reason: 'скрыто на эту сессию («не сейчас»)' };

  const floor = session.qualityFloor ?? domain.qualityFloor;
  if (item.reviews.total < domain.minVotes) return { sieve: 3, reason: `меньше ${domain.minVotes} ${domain.votesLabel}` };
  if (item.quality < floor) return { sieve: 3, reason: `оценка ${Math.round(item.quality * 100)}% ниже порога ${Math.round(floor * 100)}%` };

  // "Никогда" filters titles where the feature is defining (r ≥ HARD_MIN_R). Where it is a side part
  // (an optional PvP arena in an RPG), scoring gives a double penalty instead.
  for (const f of taste.hardNo.keys()) {
    const v = item.features[f];
    if (v && v.r >= HARD_MIN_R && v.c >= 0.5) return { sieve: 4, reason: `есть «${label(f)}», а это стоп в любом виде`, feature: f };
  }

  // Time is a fact about tonight, not a taste: a known length over the limit removes the title, an unknown one does not.
  const players = playerFeasibility(item, session);
  if (players?.status === 'no') return { sieve: 5, reason: players.text, source: players.source };
  if (session.maxRuntime && item.runtime != null && item.runtime > session.maxRuntime) return { sieve: 5, reason: `идёт ${item.runtime} мин, а сегодня есть ${session.maxRuntime}` };
  if (session.maxEpisodes && item.episodes != null && item.episodes > session.maxEpisodes) return { sieve: 5, reason: `${item.episodes} серий, а сегодня нужно до ${session.maxEpisodes}` };
  if (session.maxSeasons && item.seasons != null && item.seasons > session.maxSeasons) {
    return { sieve: 5, reason: `${item.seasons} ${plural(item.seasons, 'сезон', 'сезона', 'сезонов')}, а сегодня нужно до ${session.maxSeasons}` };
  }

  if (session.onlyEnded && item.status && item.status !== 'Ended') return { sieve: 5, reason: 'ещё выходит, а нужны законченные' };
  // Episode length of a series (IMDb runtime): sitcoms run 20–30 minutes, dramas about an hour.
  if (session.episodeLength && item.kind === 'series' && item.runtime != null) {
    if (session.episodeLength === 'short' && item.runtime > EPISODE.short) return { sieve: 5, reason: `серии по ${item.runtime} мин, а нужны короткие` };
    if (session.episodeLength === 'long' && item.runtime < EPISODE.long) return { sieve: 5, reason: `серии по ${item.runtime} мин, а нужны по часу` };
  }

  const has = (f) => item.features[f] && item.features[f].r >= 0.5;
  for (const x of session.goalRequires ?? []) {
    if (!has(x.f) || item.features[x.f].c < 0.5) return {sieve:5,reason:`не подтверждено обязательное «${label(x.f)}»`,feature:x.f};
  }
  for (const x of session.goalExcludes ?? []) {
    if (item.features[x.f]?.r > 0 && item.features[x.f]?.c >= 0.5) return {sieve:5,reason:`есть исключённое сегодня «${label(x.f)}»`,feature:x.f};
  }
  for (const moodId of session.moods ?? []) {
    const mood = dict.moodById.get(moodId);
    for (const f of mood?.requires ?? []) {
      if (!has(f)) return { sieve: 5, reason: `нет «${label(f)}», а сегодня это обязательно`, feature: f };
    }
    if (mood?.requiresAny && !mood.requiresAny.some(has)) {
      return { sieve: 5, reason: `нет ни «${mood.requiresAny.map(label).join('», ни «')}», а сегодня нужно что-то одно` };
    }
  }
  return null;
}

export function applySieves(catalog, taste, session) {
  const passed = [];
  const removed = Object.fromEntries(SIEVES.map((s) => [s.id, 0]));
  for (const item of catalog.items) {
    const out = checkSieves(item, taste, session, catalog);
    if (out) removed[out.sieve]++;
    else passed.push(item);
  }
  return { passed, removed };
}
