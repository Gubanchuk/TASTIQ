// Domains and their dictionaries. The engine (sieves, scoring, questions, explanations) is shared;
// what differs per domain is the dictionary, the quality scale and which facts exist.
import * as games from './games.js';
import * as screen from './screen.js';

function dictionary({ version, aspects, features, complaints, moods, avoid, company, stops, pairs }) {
  return {
    version,
    aspects,
    features,
    featureById: new Map(features.map((f) => [f.id, f])),
    complaints,
    complaintByFeature: new Map(complaints.map((c) => [c.f, c])),
    moods,
    moodById: new Map(moods.map((m) => [m.id, m])),
    avoid,
    avoidById: new Map(avoid.map((a) => [a.id, a])),
    company,
    stops,
    pairs,
  };
}

export const GAMES_DICT = dictionary({
  version: games.DICTIONARY_VERSION,
  aspects: games.ASPECTS,
  features: games.FEATURES,
  complaints: games.COMPLAINTS,
  moods: games.MOODS,
  avoid: games.AVOID_TODAY,
  company: games.COMPANY,
  stops: games.STOPS,
  pairs: games.PAIRS,
});

export const SCREEN_DICT = dictionary({
  version: screen.SCREEN_DICTIONARY_VERSION,
  aspects: screen.SCREEN_ASPECTS,
  features: screen.SCREEN_FEATURES,
  complaints: screen.SCREEN_COMPLAINTS,
  moods: screen.SCREEN_MOODS,
  avoid: screen.SCREEN_AVOID,
  company: screen.SCREEN_COMPANY,
  stops: screen.SCREEN_STOPS,
  pairs: screen.SCREEN_PAIRS,
});

// minVotes: sieve 3 count floor; qualityFloor: default sieve 3 floor on the 0..1 quality scale;
// qualityWarn: below this a "rated lower than most" risk is shown.
// defining: categories every title of the domain has; they are never offered as a complaint ("анимация" about a cartoon).
// time: the "how much time" question; games have none until the game tail has playtime (plan, data item 4).
export const DOMAINS = {
  game: { id: 'game', label: 'Поиграть', noun: 'игру', dict: GAMES_DICT, minVotes: 300, qualityFloor: 0.7, qualityWarn: 0.8, votesLabel: 'отзывов Steam' },
  film: { id: 'film', label: 'Посмотреть фильм', noun: 'фильм', dict: SCREEN_DICT, minVotes: 0, qualityFloor: 0.62, qualityWarn: 0.68, votesLabel: 'оценок IMDb', time: screen.FILM_TIME },
  series: { id: 'series', label: 'Посмотреть сериал', noun: 'сериал', dict: SCREEN_DICT, minVotes: 0, qualityFloor: 0.65, qualityWarn: 0.72, votesLabel: 'оценок IMDb', time: screen.SERIES_TIME },
  cartoon: { id: 'cartoon', label: 'Посмотреть мультфильм', noun: 'мультфильм', dict: SCREEN_DICT, minVotes: 0, qualityFloor: 0.62, qualityWarn: 0.68, votesLabel: 'оценок IMDb', defining: ['format.animation'], time: screen.FILM_TIME },
};
