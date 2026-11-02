// TVmaze show index (data CC BY-SA): every series and animated series with status (running / ended),
// network, genres, type, runtime, a popularity weight and the IMDb id used to join with IMDb data.
import { resolve } from 'node:path';
import { RAW, writeJson } from '../../lib/fsx.js';
import { getJson, RateLimiter } from '../../lib/http.js';

const limiter = new RateLimiter(600); // TVmaze allows at least 20 calls per 10 seconds

const shows = [];
for (let page = 0; ; page++) {
  let body;
  try {
    body = await getJson(`https://api.tvmaze.com/shows?page=${page}`, { limiter, retries: 2 });
  } catch (err) {
    if (/HTTP 404/.test(err.message)) break; // past the last page
    throw err;
  }
  if (!Array.isArray(body) || !body.length) break;
  for (const s of body) {
    shows.push({
      tvmaze: s.id,
      imdb: s.externals?.imdb ?? null,
      name: s.name,
      type: s.type,
      language: s.language,
      genres: s.genres,
      status: s.status,
      runtime: s.averageRuntime ?? s.runtime ?? null,
      premiered: s.premiered,
      ended: s.ended,
      rating: s.rating?.average ?? null,
      weight: s.weight,
      network: s.network?.name ?? s.webChannel?.name ?? null,
      country: s.network?.country?.code ?? s.webChannel?.country?.code ?? null,
      summary: s.summary,
      image: s.image?.medium ?? null,
    });
  }
  if (page % 20 === 0) console.log(`  tvmaze page ${page}: ${shows.length} shows`);
}

writeJson(resolve(RAW, 'tvmaze-shows.json'), shows, false);
console.log(`TVmaze: ${shows.length} shows, ${shows.filter((s) => s.imdb).length} with IMDb id`);
