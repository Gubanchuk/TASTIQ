// Aspect dictionary for films, series and cartoons (one dictionary: the same aspects of experience apply,
// research SUMMARY, question 1). Series-only features are marked series: true. Flags as in games.js:
// risk (a flaw), category (a kind of title one may dislike in general), like (offered as "за что"),
// infer (may be inferred from a liked title without confirmation).

export const SCREEN_DICTIONARY_VERSION = 'screen-2026-10-20.1';

export const SCREEN_ASPECTS = [
  { id: 'tone', ru: 'Тон и настроение' },
  { id: 'tension', ru: 'Напряжение' },
  { id: 'pace', ru: 'Темп' },
  { id: 'story', ru: 'Сюжет' },
  { id: 'ending', ru: 'Финал' },
  { id: 'characters', ru: 'Персонажи' },
  { id: 'world', ru: 'Мир и тема' },
  { id: 'aesthetic', ru: 'Картинка и звук' },
  { id: 'content', ru: 'Интенсивность контента' },
  { id: 'humor', ru: 'Юмор' },
  { id: 'cognitive', ru: 'Когнитивная нагрузка' },
  { id: 'length', ru: 'Длина' },
  { id: 'completeness', ru: 'Законченность' },
  { id: 'stability', ru: 'Стабильность по ходу' },
  { id: 'structure', ru: 'Устройство сериала' },
  { id: 'audience', ru: 'Для кого' },
  { id: 'format', ru: 'Формат' },
];

const F = (id, label, def, extra = {}) => ({ id, aspect: id.split('.')[0], label, def, risk: false, category: false, like: true, infer: true, series: false, keywords: [], ...extra });

export const SCREEN_FEATURES = [
  F('tone.feelgood', 'тёплое, доброе', 'Warm, kind, leaves you feeling good.', { keywords: ['тёпл', 'тепл', 'добр', 'уютн', 'светл', 'feel-good', 'heartwarming'] }),
  F('tone.dark', 'мрачная атмосфера', 'Dark, bleak, grim mood.', { keywords: ['мрачн', 'тёмн', 'гнетущ', 'dark', 'bleak'] }),
  F('tone.melancholic', 'грустное, пробирает', 'Sad, moving, makes people cry.', { keywords: ['грус', 'печал', 'трогательн', 'плакал', 'слёз', 'слез', 'пробира', 'sad', 'tearjerker'] }),
  F('tone.creepy', 'жуть и страх', 'Scary, creepy, horror.', { keywords: ['страш', 'жут', 'ужастик', 'хоррор', 'пуга', 'scary', 'creepy'] }),
  F('tone.lighthearted', 'лёгкое, весёлое', 'Light, fun, easygoing.', { keywords: ['лёгк', 'легк', 'весёл', 'весел', 'позитив'] }),
  F('tone.epic', 'эпичность и размах', 'Grand scale, epic stakes.', { keywords: ['эпик', 'эпичн', 'размах', 'масштаб', 'epic'] }),
  F('tone.whimsical', 'странное, причудливое', 'Quirky, bizarre, surreal, dreamlike.', { keywords: ['странн', 'причудл', 'сюрр', 'необычн', 'бредов', 'quirky', 'surreal', 'weird'] }),
  F('tone.gritty', 'суровый реализм', 'Gritty, raw, realistic.', { keywords: ['суров', 'жёстк', 'реалист', 'приземлён', 'gritty', 'realistic'] }),
  F('tone.inspiring', 'вдохновляет', 'Inspiring, uplifting, underdog stories.', { keywords: ['вдохнов', 'мотивир', 'заряжа', 'inspiring'] }),
  F('tone.atmospheric', 'атмосферное', 'Strong atmosphere people talk about.', { keywords: ['атмосфер', 'atmospheric'] }),
  F('tone.cheesy', 'наивно, слащаво', 'Cheesy, corny, sappy.', { risk: true, keywords: ['наивн', 'слащав', 'сопл', 'cheesy', 'corny'] }),

  F('tension.high', 'держит в напряжении', 'Tense, suspenseful, thrilling.', { keywords: ['напряж', 'нервы', 'саспенс', 'держит', 'tense', 'suspense'] }),
  F('tension.low', 'спокойное, без нервов', 'Calm, low stakes, no stress.', { keywords: ['спокойн', 'без нерв', 'без напряж', 'расслабл', 'calm'] }),

  F('pace.fast', 'быстрый темп', 'Fast-paced, action-packed.', { keywords: ['быстр', 'динамичн', 'экшен', 'fast-paced'] }),
  F('pace.slow', 'неторопливое', 'Slow, contemplative pacing presented as part of the appeal.', { keywords: ['неторопл', 'размерен', 'медленн', 'созерцат', 'slow'] }),
  F('pace.draggy', 'затянуто, скучно', 'Boring, too long, drags.', { risk: true, kin: 'pace.slow', keywords: ['затянут', 'скучн', 'нудн', 'boring'] }),

  F('story.twist', 'неожиданные повороты', 'Twists, surprise ending.', { keywords: ['поворот', 'твист', 'неожидан', 'twist'] }),
  F('story.nonlinear', 'нелинейный сюжет', 'Non-linear structure, flashbacks, several storylines.', { keywords: ['нелинейн', 'флешбек', 'nonlinear'] }),
  F('story.complex', 'сложный, надо вникать', 'Complex, mind-bending plot that needs attention.', { keywords: ['сложн', 'запутан', 'вынос мозг', 'mindfuck', 'complex'] }),
  F('story.mystery', 'загадка и расследование', 'Mystery, detective, investigation.', { keywords: ['загад', 'тайн', 'расслед', 'детектив', 'mystery'] }),
  F('story.true', 'по реальным событиям', 'Based on a true story, biography.', { keywords: ['реальн событ', 'реальной истор', 'биограф', 'true story'] }),
  F('story.dialogue', 'держится на диалогах', 'Dialogue-driven, witty, quotable.', { keywords: ['диалог', 'разговор', 'цитат', 'dialogue'] }),
  F('story.revenge', 'месть', 'Revenge story.', { category: true, keywords: ['месть', 'мести', 'отомст', 'revenge'] }),
  F('story.weak', 'слабый сюжет, дыры', 'Bad plot, plot holes, bad script.', { risk: true, keywords: ['дыры', 'слабый сюжет', 'тупой сюжет', 'plot holes'] }),
  F('story.predictable', 'предсказуемо', 'Predictable.', { risk: true, keywords: ['предсказуем', 'predictable'] }),

  F('ending.happy', 'счастливый финал', 'Happy ending.', { keywords: ['счастлив', 'хэппи', 'happy end'] }),
  F('ending.sad', 'горький финал', 'Bittersweet or tragic ending.', { keywords: ['горьк', 'трагич', 'грустн конц', 'bittersweet'] }),
  F('ending.strong', 'сильный финал', 'Great, powerful ending.', { keywords: ['финал', 'концовк', 'ending'] }),
  F('ending.weak', 'слабый финал', 'Bad or disappointing ending.', { risk: true, keywords: ['слит', 'слабый финал', 'скомкан'] }),

  F('characters.acting', 'сильная актёрская игра', 'Great acting singled out by viewers.', { keywords: ['актёр', 'актер', 'игра акт', 'сыграл', 'acting'] }),
  F('characters.memorable', 'живые, сложные персонажи', 'Complex, memorable characters; character study.', { keywords: ['персонаж', 'героев', 'характер', 'characters'] }),
  F('characters.ensemble', 'много героев, ансамбль', 'Ensemble cast, several storylines.', { keywords: ['ансамбл', 'много героев', 'ensemble'] }),
  F('characters.lone_hero', 'герой-одиночка', 'Lone hero, vigilante.', { keywords: ['одиночк', 'lone hero'] }),
  F('characters.antihero', 'антигерой', 'Anti-hero, morally ambiguous lead.', { keywords: ['антигеро', 'anti-hero'] }),
  F('characters.female_lead', 'сильная героиня', 'Strong female lead.', { keywords: ['героин', 'сильная женщ', 'female lead'] }),
  F('characters.romance', 'любовная линия', 'Romance, love story.', { category: true, keywords: ['роман', 'любов', 'romance'] }),
  F('characters.friendship', 'дружба', 'Friendship, buddy story.', { keywords: ['дружб', 'друзь', 'friendship'] }),
  F('characters.family', 'семья и отношения', 'Family relationships, family drama.', { keywords: ['семь', 'отец', 'мать', 'family'] }),
  F('characters.coming_of_age', 'взросление', 'Coming of age.', { keywords: ['взросл', 'coming of age'] }),
  F('characters.unlikeable', 'раздражающие персонажи', 'Unlikeable characters or bad acting according to viewers.', { risk: true, keywords: ['раздража', 'бесят', 'бесил', 'плохая игра'] }),

  F('world.scifi', 'фантастика', 'Science fiction: future, aliens, robots, AI.', { category: true, keywords: ['фантаст', 'будущ', 'робот', 'инопланет', 'sci-fi'] }),
  F('world.space', 'космос', 'Space, space travel.', { category: true, keywords: ['космос', 'космич', 'space'] }),
  F('world.fantasy', 'фэнтези и магия', 'Fantasy worlds, magic, fairy tales.', { category: true, keywords: ['фэнтез', 'фентез', 'магия', 'волшеб', 'сказк', 'fantasy'] }),
  F('world.supernatural', 'мистика', 'Supernatural: ghosts, demons, vampires, witches.', { category: true, keywords: ['мистик', 'призрак', 'вампир', 'демон', 'ведьм', 'supernatural'] }),
  F('world.dystopia', 'антиутопия', 'Dystopia, fighting the system.', { category: true, keywords: ['антиутоп', 'дистоп', 'dystopia'] }),
  F('world.postapoc', 'постапокалипсис', 'Post-apocalypse, end of the world, zombies.', { category: true, keywords: ['постапок', 'апокалип', 'зомби', 'post-apocalyptic'] }),
  F('world.historical', 'историческая эпоха', 'Historical setting, period piece.', { category: true, keywords: ['историческ', 'эпох', 'средневек', 'historical'] }),
  F('world.war', 'война', 'War.', { category: true, keywords: ['войн', 'военн', 'war'] }),
  F('world.crime', 'криминал', 'Crime, gangsters, heists, mafia.', { category: true, keywords: ['криминал', 'гангстер', 'мафи', 'ограблен', 'бандит', 'crime'] }),
  F('world.school', 'школа и подростки', 'High school, teens, college.', { category: true, keywords: ['школ', 'подрост', 'студент', 'high school'] }),
  F('world.smalltown', 'маленький город', 'Small town, suburbia.', { category: true, keywords: ['маленьк город', 'городок', 'small town'] }),
  F('world.timetravel', 'путешествия во времени', 'Time travel, time loops.', { category: true, keywords: ['во времени', 'петля времени', 'time travel'] }),
  F('world.superhero', 'супергерои', 'Superheroes, comic book adaptations.', { category: true, keywords: ['супергер', 'марвел', 'комикс', 'superhero'] }),
  F('world.western', 'вестерн', 'Western.', { category: true, keywords: ['вестерн', 'ковбо', 'western'] }),
  F('world.sports', 'спорт', 'Sports.', { category: true, keywords: ['спорт', 'бокс', 'футбол', 'sports'] }),
  F('world.music', 'музыка и мюзикл', 'Music, musical, dance.', { category: true, keywords: ['мюзикл', 'музыкальн', 'песн', 'musical'] }),

  F('aesthetic.beautiful', 'красивая картинка', 'Visually stunning, great cinematography.', { keywords: ['красив', 'картинк', 'операторск', 'визуал', 'beautiful'] }),
  F('aesthetic.stylized', 'стильно и необычно снято', 'Stylized, stylish, artistic form.', { keywords: ['стильн', 'стилиз', 'авторск', 'stylish'] }),
  F('aesthetic.soundtrack', 'сильная музыка', 'Great soundtrack or score.', { keywords: ['музык', 'саундтрек', 'soundtrack'] }),
  F('aesthetic.effects', 'зрелищные спецэффекты', 'Special effects, big-budget spectacle.', { keywords: ['спецэффект', 'зрелищ', 'графика', 'effects'] }),

  F('content.violence', 'жестокость и кровь', 'Graphic violence, gore, brutality.', { infer: false, keywords: ['жесток', 'кров', 'насили', 'gore', 'violent'] }),
  F('content.sexual', 'откровенные сцены', 'Sex scenes, nudity, erotic content.', { like: false, infer: false, keywords: ['секс', 'постельн', 'обнаж', 'эрот', 'nudity'] }),
  F('content.profanity', 'много мата', 'Lots of foul language.', { like: false, infer: false, keywords: ['мат ', 'матер', 'foul language'] }),
  F('content.family', 'для всей семьи', 'Family-friendly, suitable for kids.', { infer: false, keywords: ['для всей семьи', 'с детьми', 'семейн', 'детям', 'family'] }),
  F('content.disturbing', 'тяжёлые темы', 'Disturbing, hard to watch: abuse, torture, suicide.', { like: false, infer: false, keywords: ['тяжёл', 'тяжел', 'жутко смотреть', 'disturbing'] }),

  F('humor.funny', 'смешно', 'Funny, comedy.', { keywords: ['смешн', 'юмор', 'шутк', 'угар', 'ржал', 'funny'] }),
  F('humor.dark', 'чёрный юмор', 'Dark comedy, black humor.', { keywords: ['чёрный юмор', 'черный юмор', 'dark comedy'] }),
  F('humor.satire', 'сатира и ирония', 'Satire, parody, irony.', { keywords: ['сатир', 'пароди', 'ирони', 'satire'] }),
  F('humor.silly', 'дурашливый юмор', 'Silly, slapstick, dumb but funny.', { keywords: ['дурашл', 'тупой юмор', 'глупый юмор', 'туалетн', 'slapstick'] }),
  F('humor.deadpan', 'сухой, британский юмор', 'Deadpan, dry, British humor.', { keywords: ['сухой юмор', 'британск юмор', 'deadpan'] }),

  F('cognitive.low', 'можно смотреть не напрягаясь', 'Easy to watch, entertaining, no attention needed.', { keywords: ['не напряга', 'фоном', 'расслабить мозг', 'на вечер', 'попкорн'] }),
  F('cognitive.high', 'заставляет думать', 'Thought-provoking, philosophical.', { keywords: ['подумать', 'думать', 'философ', 'смысл', 'thought-provoking'] }),

  F('length.short', 'короткий', 'Short: film up to about 95 minutes, series up to about 10 episodes.', { like: false, keywords: ['коротк', 'short'] }),
  F('length.long', 'длинный', 'Long: film over 2.5 hours, series over about 60 episodes.', { like: false, keywords: ['длинн', 'долгий', 'long'] }),

  F('completeness.running', 'ещё выходит', 'The series is still running.', { series: true, like: false, infer: false }),
  F('completeness.ended', 'закончен', 'The series has ended.', { series: true, like: false, infer: false, keywords: ['закончен', 'завершён', 'завершен'] }),
  F('completeness.unfinished', 'оборван, не закончен', 'Cancelled or ends on a cliffhanger that was never resolved.', { series: true, risk: true, keywords: ['закрыли', 'оборва', 'не доснят', 'отменили'] }),
  F('stability.falls_off', 'портится к концу', 'Viewers say later seasons get worse.', { series: true, risk: true, keywords: ['испортил', 'скатил', 'последние сезон', 'сдулся'] }),

  F('structure.procedural', 'каждая серия — отдельная история', 'Case-of-the-week, episodic.', { series: true, keywords: ['отдельн', 'каждая серия', 'эпизодичн', 'процедурал'] }),
  F('structure.serialized', 'одна большая история', 'Serialized, one continuous story.', { series: true, keywords: ['одна история', 'сквозн', 'не оторваться', 'запоем'] }),
  F('structure.slow_start', 'раскачивается несколько серий', 'Viewers say it gets good only after several episodes.', { series: true, risk: true, keywords: ['раскачива', 'первые серии', 'не сразу'] }),

  F('audience.kids', 'детское', 'Made for children.', { category: true, infer: false, keywords: ['детск', 'для детей', 'малыш'] }),
  F('audience.adult', 'для взрослых', 'Animation aimed at adults.', { category: true, keywords: ['для взрослых', 'взрослая анимац'] }),

  F('format.documentary', 'документальное', 'Documentary.', { category: true, keywords: ['документальн', 'документалк', 'documentary'] }),
  F('format.animation', 'анимация', 'Animated.', { category: true, like: false, infer: false, keywords: ['мульт', 'анимац', 'animation'] }),
];

export const SCREEN_FEATURE_BY_ID = new Map(SCREEN_FEATURES.map((f) => [f.id, f]));

export const SCREEN_COMPLAINTS = [
  { f: 'pace.draggy', label: 'затянуто, скучал', shown: 'always', tried: true },
  { f: 'story.predictable', label: 'всё понятно заранее', shown: 'always', tried: true },
  { f: 'story.weak', label: 'сюжет с дырами', shown: 'always' },
  { f: 'characters.unlikeable', label: 'герои бесили', shown: 'always', tried: true },
  { f: 'ending.weak', label: 'слили концовку', shown: 'always' },
  { f: 'structure.slow_start', label: 'долго не мог втянуться', shown: 'always', tried: true, series: true },
  { f: 'stability.falls_off', label: 'под конец скатился', shown: 'always', series: true },
  { f: 'completeness.unfinished', label: 'закрыли, так и не досняв', shown: 'if_present', series: true },
  { f: 'tone.dark', label: 'тяжёлое, мрачное настроение', shown: 'if_present', tried: true },
  { f: 'tone.melancholic', label: 'грустно, остался осадок', shown: 'if_present', tried: true },
  { f: 'content.disturbing', label: 'неприятно смотреть', shown: 'if_present', tried: true },
  { f: 'tone.creepy', label: 'страшно, не люблю пугаться', shown: 'if_present', tried: true },
  { f: 'content.violence', label: 'много крови и жестокости', shown: 'if_present', tried: true },
  { f: 'content.sexual', label: 'много постельных сцен', shown: 'if_present' },
  { f: 'story.complex', label: 'запутался, не понял, что происходит', shown: 'if_present', tried: true },
  { f: 'pace.slow', label: 'медленно, ничего не происходит', shown: 'if_present', tried: true },
  { f: 'tension.high', label: 'всё время на нервах', shown: 'if_present' },
  { f: 'tone.cheesy', label: 'сопливо и наивно', shown: 'if_present' },
  { f: 'humor.silly', label: 'тупые шутки', shown: 'if_present' },
  { f: 'story.dialogue', label: 'одни разговоры', shown: 'if_present', tried: true },
  { f: 'length.long', label: 'длинно, устал смотреть', shown: 'if_present', tried: true },
  { f: 'content.profanity', label: 'много мата', shown: 'if_present' },
  { f: 'audience.kids', label: 'это для детей', shown: 'if_present' },
  { f: 'aesthetic.effects', label: 'одни спецэффекты, а смотреть нечего', shown: 'if_present' },
];

export const SCREEN_COMPLAINT_BY_FEATURE = new Map(SCREEN_COMPLAINTS.map((c) => [c.f, c]));

export const SCREEN_MOODS = [
  { id: 'relax', label: 'Хочу расслабиться', boost: { 'tone.feelgood': 0.8, 'tone.lighthearted': 0.8, 'cognitive.low': 0.6 }, penalty: { 'tension.high': 0.8, 'content.disturbing': 1, 'tone.dark': 0.6 } },
  { id: 'laugh', label: 'Хочу посмеяться', boost: { 'humor.funny': 1, 'tone.lighthearted': 0.5 }, penalty: { 'tone.melancholic': 0.6 } },
  { id: 'thrill', label: 'Хочу пощекотать нервы', boost: { 'tension.high': 1, 'tone.creepy': 0.5 }, penalty: { 'tension.low': 0.5 } },
  { id: 'cry', label: 'Хочу, чтобы пробрало', boost: { 'tone.melancholic': 1, 'characters.acting': 0.4 }, penalty: {} },
  { id: 'think', label: 'Хочу подумать', boost: { 'cognitive.high': 1, 'story.complex': 0.6 }, penalty: { 'cognitive.low': 0.4 } },
  { id: 'background', label: 'Фоном, не вникая', boost: { 'cognitive.low': 1, 'structure.procedural': 0.5 }, penalty: { 'story.complex': 1, 'cognitive.high': 0.8 } },
  { id: 'family', label: 'Смотрю с детьми', requires: ['content.family'], boost: { 'content.family': 1 }, penalty: { 'content.sexual': 2, 'content.violence': 1.5 } },
  { id: 'short', label: 'Коротко, на один вечер', boost: { 'length.short': 1 }, penalty: { 'length.long': 1 } },
  { id: 'binge', label: 'Хочу засесть надолго', boost: { 'length.long': 0.8, 'structure.serialized': 0.8 }, penalty: { 'length.short': 0.5 } },
];

// "Сколько есть времени?" / "На сколько влезть?": facts about tonight. session: hard limits for sieve 5,
// mood: a soft session mood. Up to 2.5 hours (the plan's option) would cut only 5.8 % of films, so the middle
// option is "about two hours", the limit people actually name.
export const FILM_TIME = [
  { id: 'short', label: 'до полутора часов', session: { maxRuntime: 95 } },
  { id: 'two', label: 'часа два', session: { maxRuntime: 130 } },
  { id: 'any', label: 'сколько угодно' },
];
export const SERIES_TIME = [
  { id: 'mini', label: 'мини-сериал, до 10 серий', session: { maxEpisodes: 10 } },
  { id: 'season', label: 'сезон-другой', session: { maxSeasons: 2 } },
  { id: 'long', label: 'надолго', mood: 'binge' },
];

// "Это или то?" asked after the fixed screens when the answer splits the leaders (plan, category Г).
export const SCREEN_PAIRS = [
  { a: 'humor.funny', b: 'tone.melancholic', text: 'Поржать или чтобы пробрало?', labels: ['поржать', 'чтобы пробрало'] },
  { a: 'cognitive.high', b: 'cognitive.low', text: 'Чтобы подумать или не напрягаться?', labels: ['подумать', 'не напрягаться'] },
  { a: 'tension.high', b: 'tension.low', text: 'Держит в напряжении или спокойное?', labels: ['в напряжении', 'спокойное'] },
  { a: 'tone.feelgood', b: 'tone.dark', text: 'Тёплое или мрачное?', labels: ['тёплое', 'мрачное'] },
  { a: 'pace.fast', b: 'pace.slow', text: 'Динамичное или неторопливое?', labels: ['динамичное', 'неторопливое'] },
  { a: 'structure.serialized', b: 'structure.procedural', text: 'Одна большая история или каждая серия отдельно?', labels: ['одна история', 'серии отдельно'] },
];

// "Один или с кем-то?". Watching as a couple changes nothing yet: one profile cannot speak for two people.
export const SCREEN_COMPANY = [
  { id: 'solo', label: 'один' },
  { id: 'pair', label: 'вдвоём' },
  { id: 'kids', label: 'с детьми', mood: 'family' },
  { id: 'group', label: 'компанией' },
];

// "Что точно не надо?": hard stops (sieve 4). Series rarely carry content tags, but IMDb Horror sets «жуть и страх».
export const SCREEN_STOPS = [
  { f: 'content.violence', label: 'кровь и жестокость' },
  { f: 'tone.creepy', label: 'страшное' },
  { f: 'content.sexual', label: 'откровенные сцены' },
  { f: 'content.disturbing', label: 'тяжёлые темы' },
  { f: 'content.profanity', label: 'мат' },
  { f: 'length.long', label: 'длинное' },
];

export const SCREEN_AVOID = [
  { id: 'dark', label: 'Ничего мрачного', features: ['tone.dark', 'content.disturbing'] },
  { id: 'scary', label: 'Ничего страшного', features: ['tone.creepy', 'tension.high'] },
  { id: 'violence', label: 'Без жестокости', features: ['content.violence'] },
  { id: 'sad', label: 'Без слёз', features: ['tone.melancholic', 'ending.sad'] },
  { id: 'long', label: 'Ничего длинного', features: ['length.long'] },
];
