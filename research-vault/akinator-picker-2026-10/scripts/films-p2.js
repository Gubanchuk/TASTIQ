// Persona 2: a cinephile. Loves auteur cinema (Lynch, Tarkovsky, Wong Kar-wai), hates loud franchise blockbusters.
import { runCareful, runLazy, printSummary } from './films-driver.js';
import { search } from './films-lib.js';

async function idOf(q, year) {
  const r = await search(q);
  const hit = r.find((x) => x.name.toLowerCase() === q.toLowerCase() && (!year || x.year === year)) ?? r[0];
  return hit?.id;
}

const RANK = ['aesthetic.stylized', 'pace.slow', 'tone.atmospheric', 'tone.whimsical', 'cognitive.high', 'story.complex', 'aesthetic.beautiful', 'tone.melancholic', 'tone.dark', 'story.mystery', 'story.nonlinear', 'aesthetic.soundtrack', 'characters.memorable', 'characters.acting', 'story.dialogue', 'tone.gritty', 'tone.creepy', 'ending.sad', 'characters.romance', 'world.historical'];
const BAD = new Set(['aesthetic.effects', 'pace.fast', 'tone.epic', 'humor.silly', 'world.superhero', 'tone.lighthearted', 'cognitive.low', 'tone.feelgood', 'ending.happy']);
const prefer = (fork) => {
  const score = (f) => (BAD.has(f) ? 99 : RANK.indexOf(f) < 0 ? 50 : RANK.indexOf(f));
  const [a, b] = fork.options;
  return score(a.f) <= score(b.f) ? a.f : b.f;
};

const lazyKnownNames = ['Pulp Fiction', 'Fight Club', 'The Shining', 'Taxi Driver', 'Apocalypse Now', '2001: A Space Odyssey', 'Blade Runner', 'Seven Samurai', 'There Will Be Blood', 'No Country for Old Men', 'Drive', 'The Lighthouse', 'Parasite', 'Oldboy', 'Memories of Murder', 'Amélie', 'Eyes Wide Shut', 'The Godfather', 'Chinatown', 'Vertigo', 'Psycho', 'Lost Highway', 'Eraserhead', 'Twin Peaks: Fire Walk with Me', 'Mulholland Drive', 'Stalker', 'In the Mood for Love', 'Chungking Express', 'Persona', 'Paris, Texas', 'The Tree of Life', 'Blue Velvet', 'The Mirror', '2046', 'Solaris', 'Andrei Rublev', 'Nostalgia', 'The Sacrifice', 'Ivan\'s Childhood', 'Happy Together', 'Fallen Angels', 'Days of Being Wild', 'Rashomon', 'Tokyo Story', 'Wild Strawberries', 'The Seventh Seal', '8½', 'La Dolce Vita', 'Breathless', 'The 400 Blows', 'Wings of Desire', 'Three Colors: Blue', 'The Double Life of Véronique', 'Dogville', 'Melancholia', 'Synecdoche, New York', 'Punch-Drunk Love', 'The Master', 'Phantom Thread', 'Portrait of a Lady on Fire', 'Cold War', 'Ida', 'Roma', 'Moonlight', 'A Ghost Story', 'Enter the Void', 'Upstream Color', 'Primer', 'Pi', 'Requiem for a Dream', 'Brazil', 'Barry Lyndon', 'A Clockwork Orange', 'Once Upon a Time in America', 'Léon: The Professional', 'The Big Lebowski', 'Fargo', 'Inherent Vice', 'Goodfellas', 'Memento', 'Inception', 'Interstellar', 'The Dark Knight', 'Schindler\'s List', 'The Matrix', 'Se7en', 'Forrest Gump', 'The Shawshank Redemption', 'Gladiator', 'Spirited Away'];

const persona = {
  name: 'Персона 2: синефил (Линч, Тарковский, Вонг Карвай; ненавидит громкие франшизы)',
  file: 'films-p2',
  seed: 202,
  genres: ['genre:Drama', 'genre:Mystery'],
  genresNote: 'Нажал «драмы», «детективы». Хотел бы «авторское / арт-хаус / азиатское» — нет такой кнопки',
  liked: [
    { id: 'tt0166924', name: 'Mulholland Drive', love: true, wanted: ['tone.whimsical', 'story.complex', 'tone.atmospheric', 'aesthetic.stylized', 'story.nonlinear', 'tone.dark', 'tone.creepy', 'cognitive.high', 'story.mystery'], words: '«сон, который не надо разгадывать, а надо прожить; жуть под глянцем»', freeText: 'сюрреалистично, атмосферно, стильно снято, загадка без ответа' },
    { id: 'tt0079944', name: 'Stalker', love: true, wanted: ['pace.slow', 'cognitive.high', 'tone.atmospheric', 'aesthetic.beautiful', 'aesthetic.stylized', 'story.dialogue', 'tone.melancholic', 'world.scifi'], words: '«три часа тишины, каждый кадр — картина, разговоры о вере»', freeText: 'неторопливое, созерцательное, философское, каждый кадр красив' },
    { id: 'tt0118694', name: 'In the Mood for Love', love: true, wanted: ['aesthetic.beautiful', 'aesthetic.stylized', 'aesthetic.soundtrack', 'tone.melancholic', 'pace.slow', 'characters.romance', 'tone.atmospheric', 'world.historical'], words: '«ничего не происходит, а сердце рвётся; цвет, музыка, платья»', freeText: 'красиво, музыка, медленно, грустно, стильно' },
    { id: 'tt0109424', name: 'Chungking Express', words: 'лёгкость, камера, Фэй Вонг' },
    { id: 'tt0060827', name: 'Persona', words: 'лицо крупным планом говорит больше сценария' },
    { id: 'tt0087884', name: 'Paris, Texas', words: 'Ry Cooder и пустыня' },
    { id: 'tt0478304', name: 'The Tree of Life', words: 'кино как молитва' },
    { id: 'tt0090756', name: 'Blue Velvet', words: 'жуть под газоном' },
    { id: 'tt0072443', name: 'The Mirror', words: 'воспоминания без сюжета' },
    { id: 'tt0212712', name: '2046', words: 'продолжение Любовного настроения, те же цвета' },
  ],
  likedNote: 'Нашёл через поиск: Малхолланд Драйв, Сталкер, Любовное настроение, Чунгкингский экспресс, Персона, Париж Техас, Древо жизни, Синий бархат, Зеркало, 2046',
  alsoLiked: [],
  disliked: [
    { id: 'tt4154796', name: 'Avengers: Endgame', complaints: ['aesthetic.effects', 'humor.silly', 'story.weak'], categories: [{ f: 'world.superhero', hard: true }], words: '«три часа CGI-драки и шуточек; супергероев — никогда»' },
    { id: 'tt2109248', name: 'Transformers: Age of Extinction', complaints: ['aesthetic.effects', 'story.weak', 'humor.silly', 'characters.unlikeable'], categories: [], words: '«шум, взрывы, сюжета нет»' },
    { id: 'tt2820852', name: 'Furious 7', words: 'глупо' },
    { id: 'tt0369610', name: 'Jurassic World', words: 'франшиза ради франшизы' },
    { id: 'tt2527338', name: 'Star Wars: The Rise of Skywalker', words: 'фан-сервис вместо кино' },
  ],
  dislikedNote: 'Нашёл через поиск: Мстители: Финал, Трансформеры: Эпоха истребления, Форсаж 7, Мир Юрского периода, Скайуокер. Восход',
  today: { moods: ['think'], avoid: [] },
  todayNote: '«Хочу подумать». Хотел бы сказать «медленное, малоизвестное, чего не видел, без франшиз» — такого нет',
  forkAnswer: prefer,
  lazyKnown: [],
  lazyWhy: (id, options) => options.map((o) => o.value).find((f) => RANK.includes(f)),
  targets: [
    { id: 'tt7282468', name: 'Burning / Пылающий (2018)' },
    { id: 'tt1441395', name: 'Under the Skin / Побудь в моей шкуре (2013)' },
    { id: 'tt14039582', name: 'Drive My Car / Сядь за руль моей машины (2021)' },
  ],
};

persona.lazyKnown = (await Promise.all(lazyKnownNames.map((n) => idOf(n)))).filter(Boolean);

const careful = await runCareful(persona);
printSummary('P2 careful', careful);
const lazy = await runLazy(persona);
printSummary('P2 lazy', lazy);
