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

const encyclopediaPosters = new Map([
  ['ann:3431', ['max500x600/encyc/A3431-5.jpg', '©KOGADO STUDIO/KUMASAN TEAM ©2004 THE KLOCKWORX']],
  ['ann:2345', ['max500x600/encyc/A2345-5.jpg', '©AIC and Parasite production committee']],
  ['ann:2592', ['max500x600/encyc/A2592-13.jpg', '©KAZUTO OKADA・AKITA SHOTEN / TOEI VIDEO CO., LTD.']],
  ['ann:218', ['max500x600/encyc/A218-1793212315.1508463881.jpg', '© Monkey Punch / Sotsu Agency • TMS']],
  ['ann:687', ['fit200x200/encyc/A687-10.jpg', '©1988 Yasuyuki Kunitomo / FUTABASHA COMPANY • VICTOR ENTERTAINMENT, INC.']],
]);

export function animeArtwork(id) {
  const still = ghibliStills.get(id);
  if (still) return {
    url: `https://www.ghibli.jp/gallery/thumb-${still}001.png`,
    source: 'Кадр Studio Ghibli',
    sourceUrl: `https://www.ghibli.jp/works/${still === 'redturtle' ? 'red-turtle' : still}/`,
  };
  const encyclopedia = encyclopediaPosters.get(id);
  if (encyclopedia) return {
    url: `https://cdn.animenewsnetwork.com/thumbnails/${encyclopedia[0]}`,
    source: 'Постер Anime News Network',
    sourceUrl: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${id.slice(4)}`,
    copyright: encyclopedia[1],
  };
  if (!Object.hasOwn(tvmazeAnimePosters, id)) return null;
  const [showId, path] = tvmazeAnimePosters[id];
  return {
    url: `https://static.tvmaze.com/uploads/images/medium_portrait/${path}`,
    source: 'Постер TVmaze',
    sourceUrl: `https://www.tvmaze.com/shows/${showId}`,
  };
}
