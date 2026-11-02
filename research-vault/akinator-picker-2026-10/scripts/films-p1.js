// Persona 1: a couple picking one film for tonight. She: smart romantic dramas. He: science fiction.
import { runCareful, runLazy, printSummary } from './films-driver.js';
import { search } from './films-lib.js';

async function idOf(q, year) {
  const r = await search(q);
  const hit = r.find((x) => x.name.toLowerCase() === q.toLowerCase() && (!year || x.year === year)) ?? r[0];
  return hit?.id;
}

const RANK = ['characters.romance', 'cognitive.high', 'world.scifi', 'tone.melancholic', 'story.twist', 'story.complex', 'tone.atmospheric', 'aesthetic.beautiful', 'story.dialogue', 'story.nonlinear', 'aesthetic.soundtrack', 'tone.whimsical', 'characters.memorable', 'characters.acting', 'ending.strong', 'world.space', 'world.timetravel', 'tone.feelgood', 'humor.funny'];
const BAD = new Set(['aesthetic.effects', 'pace.fast', 'tone.epic', 'tone.cheesy', 'humor.silly', 'world.superhero', 'content.violence']);
const prefer = (fork) => {
  const score = (f) => (BAD.has(f) ? 99 : RANK.indexOf(f) < 0 ? 50 : RANK.indexOf(f));
  const [a, b] = fork.options;
  return score(a.f) <= score(b.f) ? a.f : b.f;
};

const lazyKnownNames = ['Inception', 'The Matrix', 'Forrest Gump', 'Titanic', 'Amélie', 'The Truman Show', 'Gravity', 'Ex Machina', 'Back to the Future', 'Good Will Hunting', 'The Shawshank Redemption', 'The Prestige', 'Interstellar', 'Her', 'Eternal Sunshine of the Spotless Mind', 'Arrival', 'The Martian', 'La La Land', 'Pride & Prejudice', 'Lost in Translation', 'Before Sunrise', 'Blade Runner 2049', 'The Social Network', 'Slumdog Millionaire', 'Edge of Tomorrow', 'Groundhog Day', 'Up', 'Inside Out', 'The Grand Budapest Hotel', 'Little Miss Sunshine', 'Silver Linings Playbook', '500 Days of Summer', 'Django Unchained', 'Gone Girl', 'Whiplash', 'Memento', 'The Sixth Sense', 'Children of Men', 'District 9', 'Moon', 'Minority Report', 'The Imitation Game', 'A Beautiful Mind', 'Dune', 'Avatar', 'Midnight in Paris', 'The Theory of Everything', 'Brooklyn', 'Atonement', 'Notting Hill', 'Love Actually', 'About a Boy', 'The Lobster', 'Ruby Sparks', 'Submarine'];

const persona = {
  name: 'Персона 1: пара (она — умные мелодрамы, он — фантастика)',
  file: 'films-p1',
  seed: 101,
  genres: ['genre:Drama', 'genre:Romance', 'genre:Sci-Fi'],
  genresNote: 'Она: драмы, мелодрамы. Он: фантастика. Нажали все три',
  liked: [
    { id: 'tt1798709', name: 'Her', love: true, wanted: ['characters.romance', 'tone.melancholic', 'world.scifi', 'cognitive.high', 'tone.atmospheric', 'aesthetic.beautiful', 'aesthetic.soundtrack', 'story.dialogue'], words: 'Она: «любовь, которая про одиночество, и веришь». Он: «фантастика про ИИ без единого взрыва»', freeText: 'про любовь и одиночество, умная фантастика про искусственный интеллект' },
    { id: 'tt0338013', name: 'Eternal Sunshine of the Spotless Mind', love: true, wanted: ['characters.romance', 'story.nonlinear', 'story.complex', 'tone.melancholic', 'tone.whimsical', 'world.scifi', 'cognitive.high', 'story.twist'], words: 'Оба: «про любовь, но странно и умно, нелинейно; пересматривали дважды»', freeText: 'странно, нелинейно, про память и любовь' },
    { id: 'tt2543164', name: 'Arrival', love: false, wanted: ['cognitive.high', 'world.scifi', 'story.twist', 'tone.melancholic', 'characters.female_lead', 'tone.atmospheric', 'aesthetic.soundtrack', 'pace.slow'], words: 'Он: «фантастика, где думают, а не стреляют». Она: «про материнство и потерю, ревела»', freeText: 'заставляет думать, фантастика без стрельбы, пробирает' },
    { id: 'tt0112471', name: 'Before Sunrise', words: 'Она: один разговор на всю ночь, и веришь' },
    { id: 'tt0816692', name: 'Interstellar', words: 'Он: космос и отец с дочерью' },
    { id: 'tt0414387', name: 'Pride & Prejudice', words: 'Она: классика, остроумные диалоги' },
    { id: 'tt3783958', name: 'La La Land', words: 'Она: красиво и горько' },
    { id: 'tt0335266', name: 'Lost in Translation', words: 'Она: тихая, про двух одиноких людей' },
    { id: 'tt3659388', name: 'The Martian', words: 'Он: весёлая фантастика, наука' },
  ],
  likedNote: 'Нашли через поиск: Она, Вечное сияние, Прибытие, Перед рассветом, Интерстеллар, Гордость и предубеждение, Ла-Ла Ленд, Трудности перевода, Марсианин, Бегущий по лезвию 2049',
  alsoLiked: [],
  disliked: [
    { id: 'tt0418279', name: 'Transformers', complaints: ['story.weak', 'aesthetic.effects', 'humor.silly', 'characters.unlikeable'], categories: [], words: 'Он: «грохот и тупой сюжет». Она: «ушла через полчаса»' },
    { id: 'tt0332280', name: 'The Notebook', complaints: ['tone.cheesy', 'story.predictable'], categories: [], words: 'Он: «сопли». Она: «слишком сладко, всё понятно заранее»' },
    { id: 'tt2322441', name: 'Fifty Shades of Grey', words: 'Она: пошло и глупо' },
    { id: 'tt2820852', name: 'Furious 7', words: 'Оба: тупой экшен' },
    { id: 'tt1099212', name: 'Twilight', words: 'Она: наивно' },
  ],
  dislikedNote: 'Нашли через поиск: Трансформеры, Дневник памяти, 50 оттенков серого, Форсаж 7, Сумерки',
  today: { moods: ['cry', 'think'], avoid: [] },
  todayNote: 'Она: «хочу, чтобы пробрало». Он: «хочу подумать». Хотели бы сказать «смотрим вдвоём, часа на два» — такого нет',
  forkAnswer: prefer,
  lazyKnown: [],
  lazyWhy: (id, options) => options.map((o) => o.value).find((f) => RANK.includes(f)),
  targets: [
    { id: 'tt2194499', name: 'About Time / Бойфренд из будущего (2013)' },
    { id: 'tt0119177', name: 'Gattaca / Гаттака (1997)' },
    { id: 'tt0118884', name: 'Contact / Контакт (1997)' },
  ],
};

const br = await idOf('Blade Runner 2049');
persona.liked.push({ id: br, name: 'Blade Runner 2049', words: 'Он: медленная, красивая, атмосферная' });
persona.lazyKnown = (await Promise.all(lazyKnownNames.map((n) => idOf(n)))).filter(Boolean);

const careful = await runCareful(persona);
printSummary('P1 careful', careful);
const lazy = await runLazy(persona);
printSummary('P1 lazy', lazy);
