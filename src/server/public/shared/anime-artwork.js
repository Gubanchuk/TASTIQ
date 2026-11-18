import { tvmazeAnimePosters } from '../data/anime-tvmaze-posters.js';

// Official still galleries, https://www.ghibli.jp/mail/ (non-commercial use).
const ghibliStills = new Map([
  ['tt0087544', 'nausicaa'],
  ['tt0092067', 'laputa'],
  ['tt0096283', 'totoro'],
  ['tt0097814', 'majo'],
  ['tt0104652', 'porco'],
  ['tt0110008', 'tanuki'],
  ['tt0113824', 'mimi'],
  ['tt0119698', 'mononoke'],
  ['tt0206013', 'yamada'],
  ['tt0245429', 'chihiro'],
  ['tt0347149', 'howl'],
  ['tt0347618', 'baron'],
  ['tt0495596', 'ged'],
  ['tt0876563', 'ponyo'],
  ['tt1568921', 'karigurashi'],
  ['tt1798188', 'kokurikozaka'],
  ['tt2013293', 'kazetachinu'],
  ['tt2576852', 'kaguyahime'],
  ['tt3398268', 'marnie'],
  ['tt3666024', 'redturtle'],
  ['tt6587046', 'kimitachi'],
]);

export function animeArtwork(id) {
  const still = ghibliStills.get(id);
  if (still) return {
    url: `https://www.ghibli.jp/gallery/thumb-${still}001.png`,
    source: 'Кадр Studio Ghibli',
    sourceUrl: `https://www.ghibli.jp/works/${still === 'redturtle' ? 'red-turtle' : still}/`,
  };
  if (!Object.hasOwn(tvmazeAnimePosters, id)) return null;
  const [showId, path] = tvmazeAnimePosters[id];
  return {
    url: `https://static.tvmaze.com/uploads/images/medium_portrait/${path}`,
    source: 'Постер TVmaze',
    sourceUrl: `https://www.tvmaze.com/shows/${showId}`,
  };
}
