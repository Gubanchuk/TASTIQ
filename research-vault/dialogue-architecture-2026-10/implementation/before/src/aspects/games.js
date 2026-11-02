// Aspect dictionary for games, version-tagged. Source of the aspects: research SUMMARY, question 1
// (general layer + games layer, 21 aspects). Each aspect is split into features: concrete values a
// person can confirm as "the reason I liked it" and a tagger can find evidence for in texts.
//
// risk: a feature that most people count as a flaw (grind, clunky controls). It is never offered as a
// "why I liked it" chip and is always shown as a risk unless the person said they like it.
// category: a kind of game rather than a quality of it (shooting, fantasy, open world). Only these make
// sense as "I don't like this in games at all"; nobody dislikes a game "because of the living world".
// like: false — not offered as a "why I liked it" chip.
// infer: false — never inferred as a taste from a liked game ("loved The Witcher" says nothing about
// liking nudity or playing solo); it counts only when the person names it.

export const DICTIONARY_VERSION = 'games-2026-10-20.2';

export const ASPECTS = [
  { id: 'tone', ru: 'Тон и настроение' },
  { id: 'tension', ru: 'Напряжение' },
  { id: 'pace', ru: 'Темп' },
  { id: 'story', ru: 'Сюжет' },
  { id: 'ending', ru: 'Финал' },
  { id: 'characters', ru: 'Персонажи' },
  { id: 'world', ru: 'Мир и сеттинг' },
  { id: 'aesthetic', ru: 'Эстетика' },
  { id: 'content', ru: 'Интенсивность контента' },
  { id: 'humor', ru: 'Юмор' },
  { id: 'cognitive', ru: 'Когнитивная нагрузка' },
  { id: 'length', ru: 'Длина и обязательство' },
  { id: 'completeness', ru: 'Законченность' },
  { id: 'stability', ru: 'Стабильность по ходу' },
  { id: 'loop', ru: 'Основная петля' },
  { id: 'combat', ru: 'Бой и управление' },
  { id: 'progression', ru: 'Прогрессия' },
  { id: 'difficulty', ru: 'Сложность исполнения' },
  { id: 'social', ru: 'С кем играть' },
  { id: 'freedom', ru: 'Свобода или линейность' },
  { id: 'session', ru: 'Длина одного захода' },
];

const F = (id, label, def, extra = {}) => ({ id, aspect: id.split('.')[0], label, def, risk: false, category: false, like: true, infer: true, keywords: [], ...extra });

export const FEATURES = [
  F('tone.cozy', 'уютная атмосфера', 'Warm, comforting, safe mood; the game feels like a cozy place to be.', { keywords: ['уют', 'тёпл', 'тепл', 'cozy', 'wholesome', 'лампов'] }),
  F('tone.dark', 'мрачная атмосфера', 'Grim, oppressive or bleak world and mood.', { keywords: ['мрачн', 'тёмн', 'темн', 'гнетущ', 'dark', 'grim', 'bleak'] }),
  F('tone.melancholic', 'грусть и меланхолия', 'Sad, wistful or emotionally heavy moments the game is remembered for.', { keywords: ['грус', 'печал', 'меланхол', 'трогательн', 'плакал', 'sad', 'emotional'] }),
  F('tone.creepy', 'жуть и страх', 'Horror, dread, the game is scary.', { keywords: ['страш', 'жут', 'хоррор', 'ужастик', 'пуга', 'horror', 'scary'] }),
  F('tone.lighthearted', 'лёгкое весёлое настроение', 'Upbeat, cheerful, not taking itself seriously.', { keywords: ['лёгк', 'легк', 'весёл', 'весел', 'позитив', 'беззабот', 'cheerful'] }),
  F('tone.epic', 'эпичность и размах', 'Grand stakes, heroic spectacle, a sense of scale.', { keywords: ['эпик', 'эпичн', 'размах', 'масштаб', 'epic'] }),
  F('tone.whimsical', 'странное и причудливое', 'Surreal, quirky or offbeat; the game is weird in a deliberate way.', { keywords: ['странн', 'причудл', 'сюрр', 'необычн', 'weird', 'surreal', 'quirky'] }),
  F('tone.gritty', 'суровый реализм', 'Grounded, harsh, unglamorous; life in the game is hard and dirty.', { keywords: ['суров', 'жёстк', 'грязн', 'приземлён', 'gritty'] }),
  F('tone.serene', 'спокойствие и медитативность', 'Calm, meditative, the game lets you unwind.', { keywords: ['спокой', 'медитат', 'умиротвор', 'расслаб', 'calm', 'relaxing', 'chill'] }),

  F('tension.high', 'держит в напряжении', 'Sustained tension or stress: danger, suspense, high stakes in the moment.', { keywords: ['напряж', 'стресс', 'адренал', 'нерв', 'держит в тонусе', 'tense', 'intense'] }),
  F('tension.low', 'без стресса', 'Low stress; you can play without pressure or fear of losing.', { keywords: ['без стресс', 'без напряж', 'расслабл', 'не напряга', 'stress-free'] }),

  F('pace.fast', 'быстрый темп', 'Things happen quickly, little downtime.', { keywords: ['быстр', 'динамичн', 'fast-paced', 'fast paced'] }),
  F('pace.slow', 'неторопливый темп', 'Deliberately slow, contemplative pacing that reviewers present as part of the appeal.', { keywords: ['неторопл', 'размерен', 'медленн', 'slow-paced', 'slow paced'] }),
  F('pace.repetitive', 'однообразно', 'Reviewers complain the game repeats the same activities without variety.', { risk: true, keywords: ['однообраз', 'одно и то же', 'монотон', 'repetitive'] }),
  F('pace.draggy', 'затянуто, провисает', 'Reviewers complain about padding, boring stretches, filler.', { risk: true, kin: 'pace.slow', keywords: ['затянут', 'скучн', 'нудн', 'провис', 'padding', 'boring', 'filler'] }),

  F('story.central', 'сильный сюжет', 'The story is a main reason people play and praise it.', { keywords: ['сюжет', 'история', 'историю', 'истории', 'сценар', 'нарратив', 'story', 'narrative', 'plot'] }),
  F('story.choices', 'выборы влияют на историю', 'Choices change the story, quests or ending.', { keywords: ['выбор', 'решени', 'последств', 'концовк', 'choices'] }),
  F('story.mystery', 'загадка и расследование', 'Mystery, investigation, uncovering what happened.', { keywords: ['загад', 'тайн', 'расслед', 'детектив', 'mystery', 'detective'] }),
  F('story.lore', 'история через мир и лор', 'Story told through the world, notes, environment; deep lore.', { keywords: ['лор', 'вселенн', 'lore'] }),
  F('story.minimal', 'сюжета почти нет', 'Little or no story; the game is about the mechanics.', { like: false, infer: false, keywords: ['без сюжета', 'сюжета нет', 'сюжет не важен', 'no story'] }),

  F('ending.strong', 'сильный финал', 'Reviewers single out the ending as memorable or satisfying.', { keywords: ['финал', 'концовка', 'ending'] }),
  F('ending.bittersweet', 'горький финал', 'Sad, bittersweet or tragic ending.', { keywords: ['горьк', 'трагич', 'грустн финал', 'bittersweet'] }),
  F('ending.weak', 'слабый финал', 'Reviewers say the ending is rushed, disappointing or missing.', { risk: true, keywords: ['слит', 'слабый финал', 'скомкан', 'rushed ending'] }),

  F('characters.memorable', 'живые персонажи', 'Well-written, memorable characters people talk about.', { keywords: ['персонаж', 'героев', 'характер', 'characters'] }),
  F('characters.companions', 'команда и спутники', 'Party, companions or crew; relationships inside the group matter.', { keywords: ['спутник', 'команд', 'отряд', 'компаньон', 'companions', 'party'] }),
  F('characters.lone_hero', 'герой-одиночка', 'You play one defined protagonist who mostly acts alone.', { keywords: ['одиночк', 'один против', 'lone'] }),
  F('characters.custom_hero', 'свой герой', 'You create or shape your own character (appearance, background, role).', { keywords: ['создани персонаж', 'своего персонаж', 'кастомиз', 'отыгрыш', 'roleplay', 'character creation'] }),
  F('characters.romance', 'романтические линии', 'Romance options or love stories are a notable part of the game.', { category: true, keywords: ['роман', 'любов', 'romance'] }),

  F('world.living', 'живой мир', 'The world feels alive and reacts: NPC routines, consequences, dense detail.', { keywords: ['живой мир', 'живого мира', 'мир живёт', 'мир живет', 'living world', 'immersive'] }),
  F('world.realistic', 'реалистичный мир', 'Grounded setting without magic or sci-fi; plausibility matters.', { category: true, keywords: ['реалист', 'реализм', 'realistic', 'realism'] }),
  F('world.fantasy', 'фэнтези', 'Fantasy setting: magic, monsters, invented worlds.', { category: true, keywords: ['фэнтез', 'фентез', 'магия', 'fantasy'] }),
  F('world.scifi', 'фантастика и космос', 'Science fiction: space, future, cyberpunk, robots.', { category: true, keywords: ['космос', 'фантаст', 'киберпанк', 'будущ', 'sci-fi', 'space', 'cyberpunk'] }),
  F('world.historical', 'историческая эпоха', 'A recognizable historical period or historically inspired setting.', { category: true, keywords: ['историческ', 'средневек', 'эпох', 'historical', 'medieval'] }),
  F('world.postapoc', 'постапокалипсис', 'After the collapse: wasteland, ruins, zombies.', { category: true, keywords: ['постапок', 'зомби', 'апокалип', 'post-apocalyptic', 'zombie'] }),
  F('world.empty', 'пустой мир', 'Reviewers complain the world is empty or lifeless: a big map with little to do.', { risk: true, keywords: ['пустой мир', 'пустого мира', 'мёртвый мир', 'мертвый мир', 'empty world'] }),
  F('world.modern', 'современный мир', 'Present-day setting: cities, crime, military.', { category: true, keywords: ['современн', 'город', 'криминал', 'modern'] }),

  F('aesthetic.beautiful', 'красивая картинка', 'Visuals and vistas are a frequent point of praise.', { keywords: ['красив', 'графи', 'картинк', 'виды', 'beautiful', 'gorgeous', 'graphics'] }),
  F('aesthetic.stylized', 'стилизованный визуал', 'Hand-drawn, cartoon or strongly stylized art direction.', { category: true, keywords: ['рисован', 'стилиз', 'арт-стил', 'мульт', 'hand-drawn', 'stylized', 'art style'] }),
  F('aesthetic.pixel', 'пиксель-арт', 'Pixel art graphics.', { category: true, keywords: ['пиксел', 'pixel'] }),
  F('aesthetic.soundtrack', 'сильная музыка', 'Music or sound design is a frequent point of praise.', { keywords: ['музык', 'саундтрек', 'ost', 'soundtrack', 'music'] }),

  F('content.gore', 'жестокость и кровь', 'Graphic violence, gore, brutality.', { infer: false, keywords: ['жесток', 'кров', 'расчлен', 'gore', 'brutal', 'violent'] }),
  F('content.sexual', 'откровенные сцены', 'Sexual content, nudity or fanservice.', { like: false, infer: false, keywords: ['секс', 'обнаж', 'эрот', 'фансерв', 'nudity', 'sexual'] }),
  F('content.family', 'без жести, подходит всем', 'Mild content suitable for all ages.', { infer: false, keywords: ['для всей семьи', 'детям', 'с детьми', 'без жести', 'family friendly'] }),

  F('humor.funny', 'много юмора', 'Jokes and comedy are a notable part of the experience.', { keywords: ['смешн', 'юмор', 'шутк', 'угар', 'funny', 'hilarious'] }),
  F('humor.dark', 'чёрный юмор', 'Dark or cynical humor.', { keywords: ['чёрный юмор', 'черный юмор', 'циничн', 'dark humor'] }),

  F('cognitive.low', 'можно не напрягать голову', 'Easy to pick up and play without deep thinking.', { keywords: ['не напрягать', 'мозг отдыха', 'без мозг', 'расслабить мозг', 'mindless', 'easy to pick up'] }),
  F('cognitive.high', 'надо думать и планировать', 'Requires planning, systems mastery, theorycrafting, attention.', { keywords: ['думать', 'подумать', 'планир', 'стратег', 'глубок', 'complex', 'strategic', 'depth'] }),

  F('length.short', 'короткая, на пару вечеров', 'Can be finished in a few evenings (roughly under 10 hours).', { keywords: ['коротк', 'на пару вечеров', 'на вечер', 'short'] }),
  F('length.long', 'большая, на десятки часов', 'Long campaign or content for dozens of hours.', { keywords: ['длинн', 'большая', 'на сотни час', 'десятки час', 'long'] }),
  F('length.endless', 'можно играть годами', 'No real end: replayable, live service, sandbox people play for hundreds of hours.', { keywords: ['бесконечн', 'годами', 'реиграб', 'тысяч час', 'replayab', 'endless'] }),

  F('completeness.unfinished', 'недоделана', 'Early access, abandoned, missing content or cut story according to reviewers.', { risk: true, keywords: ['недодел', 'ранний доступ', 'сырая', 'early access', 'unfinished'] }),

  F('stability.falls_off', 'проседает к концу', 'Reviewers say the second half or late game gets worse.', { risk: true, keywords: ['проседа', 'вторая половина', 'к концу', 'late game', 'falls off'] }),
  F('stability.slow_start', 'цепляет не сразу', 'Reviewers say the beginning is slow and it gets good only after some hours.', { risk: true, keywords: ['раскачива', 'не сразу', 'первые час', 'slow start', 'gets good after'] }),

  F('loop.shooting', 'стрельба', 'Shooting is the main thing you do.', { category: true, keywords: ['стрел', 'шутер', 'пострел', 'shooter', 'shooting', 'gunplay'] }),
  F('loop.melee', 'ближний бой', 'Melee combat: swords, fists, hack and slash.', { category: true, keywords: ['мечи', 'мечом', 'ближн', 'рубил', 'слэшер', 'melee', 'swordplay'] }),
  F('loop.exploration', 'исследование мира', 'Exploring, discovering places and secrets.', { category: true, keywords: ['исследов', 'изуча', 'открыва', 'exploration', 'explore'] }),
  F('loop.building', 'строительство и крафт', 'Building, crafting, base construction.', { category: true, keywords: ['строи', 'крафт', 'базу', 'building', 'crafting'] }),
  F('loop.management', 'управление и экономика', 'Managing a city, colony, business, economy.', { category: true, keywords: ['управлен', 'экономик', 'колони', 'менедж', 'management', 'city builder'] }),
  F('loop.tactics', 'тактические бои', 'Tactical or turn-based combat where you plan moves.', { category: true, keywords: ['пошагов', 'тактическ', 'turn-based', 'tactical'] }),
  F('loop.stealth', 'стелс', 'Sneaking and avoiding detection.', { category: true, keywords: ['стелс', 'скрытн', 'stealth'] }),
  F('loop.driving', 'езда и гонки', 'Driving, racing, vehicles.', { category: true, keywords: ['гонк', 'езд', 'машин', 'racing', 'driving'] }),
  F('loop.platforming', 'платформинг', 'Jumping and precise movement through levels.', { category: true, keywords: ['платформер', 'прыжк', 'platformer'] }),
  F('loop.dialogue', 'разговоры и решения', 'Talking to characters and choosing replies is a big part of play.', { category: true, keywords: ['диалог', 'разговор', 'dialogue'] }),
  F('loop.looting', 'лут и снаряжение', 'Collecting loot and upgrading gear.', { category: true, keywords: ['лут', 'шмот', 'снаряж', 'loot', 'gear'] }),
  F('loop.survival', 'выживание', 'Survival mechanics: hunger, resources, staying alive.', { category: true, keywords: ['выжив', 'голод', 'survival'] }),
  F('loop.life_sim', 'быт и ферма', 'Everyday life simulation: farming, relationships, routines.', { category: true, keywords: ['ферм', 'бытов', 'огород', 'симулятор жизни', 'farming', 'life sim'] }),
  F('loop.cards', 'карты и колоды', 'Card games and deckbuilding.', { category: true, keywords: ['карточн', 'колод', 'deckbuild', 'card game', 'карты'] }),
  F('loop.puzzles', 'головоломки', 'Solving puzzles is a main activity.', { category: true, keywords: ['головолом', 'пазл', 'puzzle'] }),

  F('combat.weighty', 'весомый бой', 'Combat feels heavy, physical, impactful.', { category: true, keywords: ['весом', 'тяжёл', 'тяжел', 'импакт', 'weighty', 'impactful'] }),
  F('combat.fast', 'быстрый зрелищный бой', 'Fast, flashy, combo-driven combat.', { category: true, keywords: ['зрелищ', 'комбо', 'динамичный бой', 'flashy', 'combo'] }),
  F('combat.precise', 'отзывчивое управление', 'Tight, responsive controls praised by reviewers.', { keywords: ['отзывчив', 'точное управл', 'tight controls', 'responsive'] }),
  F('combat.clunky', 'деревянное управление', 'Reviewers complain about clunky, stiff or unresponsive controls or combat.', { risk: true, keywords: ['деревянн', 'кривое управл', 'неудобн', 'clunky', 'janky'] }),

  F('progression.power', 'растёшь в силе', 'Strong feeling of getting more powerful over time.', { keywords: ['прокач', 'сильнее', 'имб', 'power fantasy', 'progression'] }),
  F('progression.builds', 'разные билды', 'Many builds or ways to develop a character or team.', { keywords: ['билд', 'build'] }),
  F('progression.collection', 'собирать и коллекционировать', 'Collecting items, creatures, completion lists.', { keywords: ['собира', 'коллекц', 'collect'] }),
  F('progression.grind', 'гринд', 'Repetitive grinding is needed to progress.', { risk: true, keywords: ['гринд', 'фарм', 'дроч', 'grind'] }),

  F('difficulty.hard', 'сложно, наказывает за ошибки', 'Challenging, punishing; mastery is the point.', { keywords: ['сложн', 'хардкор', 'умира', 'наказыва', 'souls', 'difficult', 'challenging'] }),
  F('difficulty.forgiving', 'щадящая сложность', 'Forgiving, accessible difficulty.', { keywords: ['щадящ', 'несложн', 'казуал', 'casual', 'forgiving'] }),

  F('social.solo', 'одиночная игра', 'Single-player experience.', { like: false, infer: false, keywords: ['одиночн', 'соло', 'singleplayer', 'solo'] }),
  F('social.coop', 'кооператив', 'Cooperative play with friends.', { infer: false, category: true, keywords: ['кооп', 'с друг', 'с друз', 'вместе', 'co-op', 'coop'] }),
  F('social.pvp', 'соревнование с людьми', 'Competitive play against other people.', { infer: false, category: true, keywords: ['pvp', 'пвп', 'против людей', 'соревнов', 'рейтинг', 'competitive'] }),

  F('freedom.open_world', 'открытый мир', 'Large open world you move through freely.', { category: true, keywords: ['открытый мир', 'открытого мира', 'open world'] }),
  F('freedom.sandbox', 'песочница: цели ставишь сам', 'Sandbox: no fixed path, you set your own goals.', { category: true, keywords: ['песочниц', 'свобод', 'делай что хочешь', 'sandbox'] }),
  F('freedom.linear', 'линейная, ведут по истории', 'Linear structure; the game guides you along a path.', { category: true, keywords: ['линейн', 'коридор', 'linear'] }),

  F('session.short', 'короткие заходы', 'Natural sessions of 20–40 minutes: runs, matches, levels.', { keywords: ['забег', 'матч', 'на полчаса', 'на 20 минут', 'короткие сесси', 'runs'] }),
  F('session.long', 'садиться надолго', 'Needs long sessions to get into; hard to play in short bursts.', { keywords: ['надолго', 'залип', 'долгие сесси', 'one more turn'] }),
];

export const FEATURE_BY_ID = new Map(FEATURES.map((f) => [f.id, f]));

// Sieve 5 ("does it suit today"). Session-only, never written to the permanent profile.
// boost/penalty values are feature weights for this session; requires is a hard session filter.
export const MOODS = [
  { id: 'relax', label: 'Хочу расслабиться', boost: { 'tension.low': 1, 'tone.cozy': 0.6, 'tone.serene': 0.6, 'cognitive.low': 0.5 }, penalty: { 'tension.high': 1, 'difficulty.hard': 0.8 } },
  { id: 'adrenaline', label: 'Хочу адреналина', boost: { 'tension.high': 1, 'pace.fast': 0.8, 'combat.fast': 0.5 }, penalty: { 'pace.slow': 0.6, 'tension.low': 0.5 } },
  { id: 'story', label: 'Хочу историю', boost: { 'story.central': 1, 'characters.memorable': 0.7 }, penalty: { 'story.minimal': 1 } },
  { id: 'no_thinking', label: 'Не хочу думать', boost: { 'cognitive.low': 1 }, penalty: { 'cognitive.high': 1 } },
  { id: 'brain', label: 'Хочу пошевелить мозгами', boost: { 'cognitive.high': 1, 'loop.puzzles': 0.5 }, penalty: { 'cognitive.low': 0.5 } },
  { id: 'short_session', label: 'Есть час, не больше', boost: { 'session.short': 1 }, penalty: { 'session.long': 1, 'stability.slow_start': 0.6 } },
  { id: 'long_haul', label: 'Хочу залипнуть надолго', boost: { 'length.long': 0.8, 'length.endless': 0.8, 'session.long': 0.5 }, penalty: { 'length.short': 0.6 } },
  { id: 'finishable', label: 'Хочу пройти до конца', boost: { 'length.short': 0.8, 'story.central': 0.4 }, penalty: { 'length.endless': 0.8, 'length.long': 0.4 } },
  { id: 'friend', label: 'Играю с другом', requires: ['social.coop'], boost: { 'social.coop': 1 }, penalty: {} },
  { id: 'party', label: 'Играем компанией', requiresAny: ['social.coop', 'social.pvp'], boost: { 'social.coop': 0.5, 'social.pvp': 0.5 }, penalty: {} },
];

// "Это или то?" asked after the fixed screens when the answer splits the leaders (plan, category Г).
export const PAIRS = [
  { a: 'tension.high', b: 'tension.low', text: 'Адреналин или расслабиться?', labels: ['адреналин', 'расслабиться'] },
  { a: 'cognitive.high', b: 'cognitive.low', text: 'Подумать или отключить голову?', labels: ['подумать', 'отключить голову'] },
  { a: 'pace.fast', b: 'pace.slow', text: 'Быстрый темп или неторопливо?', labels: ['быстрый темп', 'неторопливо'] },
  { a: 'difficulty.hard', b: 'difficulty.forgiving', text: 'Чтобы было сложно или щадяще?', labels: ['сложно, с вызовом', 'щадяще'] },
  { a: 'freedom.open_world', b: 'freedom.linear', text: 'Открытый мир или чтобы вели по истории?', labels: ['открытый мир', 'по истории'] },
  { a: 'session.short', b: 'session.long', text: 'Короткие заходы или засесть надолго?', labels: ['короткие заходы', 'засесть надолго'] },
  // Length is known from Wikipedia articles of the tail since 2026-10-28 (01d-games-wikipedia.js); asked only when
  // enough leaders carry each side, like every pair.
  { a: 'length.short', b: 'length.long', text: 'Пройти за пару вечеров или на десятки часов?', labels: ['за пару вечеров', 'на десятки часов'] },
  { a: 'humor.funny', b: 'tone.dark', text: 'Посмеяться или что-то мрачное?', labels: ['посмеяться', 'мрачное'] },
];

// "С кем играешь?": a fact about tonight. mood: the session mood the answer turns on (requires go to sieve 5).
export const COMPANY = [
  { id: 'solo', label: 'один' },
  { id: 'friend', label: 'с другом', mood: 'friend' },
  { id: 'group', label: 'компанией', mood: 'party' },
];

// "Что точно не надо?": hard stops (sieve 4), one tap each. Kept to features with real coverage (plan, section 2).
export const STOPS = [
  { f: 'content.gore', label: 'кровь и жестокость' },
  { f: 'tone.creepy', label: 'страшное' },
  { f: 'content.sexual', label: 'откровенное' },
  { f: 'social.pvp', label: 'против других людей' },
  { f: 'progression.grind', label: 'гринд' },
];

export const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));

// "What I don't want today": session-only soft penalties.
export const AVOID_TODAY = [
  { id: 'dark', label: 'Ничего мрачного', features: ['tone.dark', 'tone.creepy', 'content.gore'] },
  { id: 'hard', label: 'Ничего сложного', features: ['difficulty.hard', 'cognitive.high'] },
  { id: 'long', label: 'Ничего длинного', features: ['length.long', 'length.endless', 'session.long'] },
  { id: 'scary', label: 'Ничего страшного', features: ['tone.creepy', 'tension.high'] },
  { id: 'online', label: 'Без других людей', features: ['social.pvp'] },
];

export const AVOID_BY_ID = new Map(AVOID_TODAY.map((a) => [a.id, a]));

// Answers to "что не понравилось?" and "почему бросил?". Phrased as complaints, each tied to the feature
// it penalizes. shown: 'if_present' means only for games that have the feature; 'always' fits any game.
// A complaint is a statement about taste (sieve 4); "плохо сделана" is about quality (sieve 3) and is a
// separate checkbox, so it never changes taste.
export const COMPLAINTS = [
  { f: 'pace.draggy', label: 'затянуто, скучно', shown: 'always', tried: true },
  { f: 'pace.repetitive', label: 'одно и то же по кругу', shown: 'always', tried: true },
  { f: 'stability.slow_start', label: 'долго не мог втянуться', shown: 'always', tried: true },
  { f: 'combat.clunky', label: 'управление неудобное', shown: 'always', tried: true },
  { f: 'progression.grind', label: 'заставляет гриндить', shown: 'if_present', tried: true },
  { f: 'difficulty.hard', label: 'постоянно умирал, бесило', shown: 'if_present', tried: true },
  { f: 'difficulty.forgiving', label: 'никакого вызова', shown: 'if_present' },
  { f: 'cognitive.high', label: 'голова пухнет', shown: 'if_present', tried: true },
  { f: 'cognitive.low', label: 'думать вообще не надо, скучно', shown: 'if_present' },
  { f: 'pace.slow', label: 'всё происходит медленно', shown: 'if_present', tried: true },
  { f: 'tension.high', label: 'постоянно на нервах', shown: 'if_present' },
  { f: 'tone.dark', label: 'тяжёлое, мрачное настроение', shown: 'if_present' },
  { f: 'tone.melancholic', label: 'грустно, давит', shown: 'if_present' },
  { f: 'tone.creepy', label: 'страшно, не люблю пугаться', shown: 'if_present', tried: true },
  { f: 'content.gore', label: 'много крови и жестокости', shown: 'if_present' },
  { f: 'content.sexual', label: 'много откровенного', shown: 'if_present' },
  { f: 'world.empty', label: 'мир пустой, делать нечего', shown: 'if_present' },
  { f: 'story.minimal', label: 'нет нормального сюжета', shown: 'if_present' },
  { f: 'loop.dialogue', label: 'много болтовни, мало игры', shown: 'if_present' },
  { f: 'freedom.linear', label: 'водят за ручку', shown: 'if_present' },
  { f: 'freedom.sandbox', label: 'непонятно, куда идти и зачем', shown: 'if_present', tried: true },
  { f: 'length.long', label: 'огромная, не осилил', shown: 'if_present', tried: true },
  { f: 'length.short', label: 'быстро закончилась', shown: 'if_present' },
  { f: 'session.long', label: 'надо садиться на несколько часов', shown: 'if_present', tried: true },
  { f: 'social.pvp', label: 'надо играть против людей', shown: 'if_present', tried: true },
  { f: 'stability.falls_off', label: 'под конец испортилась', shown: 'always' },
  { f: 'ending.weak', label: 'слили концовку', shown: 'if_present' },
  { f: 'completeness.unfinished', label: 'сырая, недоделанная', shown: 'if_present' },
];

export const COMPLAINT_BY_FEATURE = new Map(COMPLAINTS.map((c) => [c.f, c]));
