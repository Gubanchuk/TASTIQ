// Persona definitions for the games persona test. Reasons and complaints are feature ids from
// src/aspects/games.js; the driver only sends those the screen actually offers (plus /api/parse output).

const fork = (prefs) => (f) => {
  const opts = f.options.map((o) => o.f);
  for (const p of prefs) if (opts.includes(p)) return p;
  return null;
};

export const PERSONAS = {
  p1: {
    platform: 'windows',
    loved: [
      { id: 'steam:632470', name: 'Disco Elysium', reasons: ['story.central', 'characters.memorable', 'loop.dialogue', 'story.choices', 'humor.funny'], love: true, text: 'за текст и персонажей, голоса в голове как отдельные герои, и что выборы что-то меняют' },
      { id: 'steam:292030', name: 'The Witcher 3', reasons: ['story.central', 'characters.memorable', 'story.choices', 'world.living'], love: true, text: 'за Геральта и побочные квесты, каждый как отдельная драма, живой мир' },
      { id: 'steam:1328670', name: 'Mass Effect LE', reasons: ['characters.companions', 'story.choices', 'story.central', 'characters.memorable'], love: true, text: 'за команду и Гарруса, и что выборы переносятся между частями' },
      { id: 'steam:383870', name: 'Firewatch', reasons: ['story.central', 'length.short', 'loop.dialogue', 'characters.memorable'], love: false, text: 'короткая, на один вечер, разговоры по рации' },
      { id: 'steam:501300', name: 'What Remains of Edith Finch', reasons: ['story.central', 'length.short'], love: false, text: 'два часа, а помню годами' },
      { id: 'steam:1174180', name: 'Red Dead Redemption 2', reasons: ['characters.memorable', 'story.central', 'world.living'], love: true, text: 'Артур Морган, лучший персонаж в играх' },
      { id: 'steam:620', name: 'Portal 2', reasons: ['humor.funny', 'characters.memorable', 'story.central'], love: false, text: 'смешно, Уитли и ГЛаДОС, голова работает, но не напрягает' },
      { id: 'steam:1222140', name: 'Detroit: Become Human', reasons: ['story.choices', 'story.central'], love: false, text: 'кино, в котором сам решаешь' },
      { id: 'steam:1086940', name: "Baldur's Gate 3", reasons: ['characters.companions', 'characters.memorable', 'story.choices'], love: true, text: 'компаньоны, каждый диалог событие' },
      { id: 'steam:319630', name: 'Life is Strange', reasons: ['characters.memorable', 'story.central', 'tone.melancholic'], love: false, text: 'за Макс и Хлою, рыдал' },
    ],
    disliked: [
      { id: 'steam:1245620', name: 'Elden Ring', issues: [{ f: 'difficulty.hard', hard: true }], text: 'умирал сорок раз на первом боссе, это не отдых после работы, никогда больше' },
      { id: 'steam:374320', name: 'Dark Souls III', issues: [{ f: 'difficulty.hard', hard: true }], text: 'постоянно умирал, бесило' },
      { id: 'steam:2344520', name: 'Diablo IV', issues: [{ f: 'progression.grind', hard: false }, { f: 'pace.repetitive', hard: false }], text: 'гринд ради гринда, сюжет кончился, дальше одно и то же' },
      { id: 'steam:1085660', name: 'Destiny 2', issues: [{ f: 'progression.grind', hard: false }, { f: 'pace.repetitive', hard: false }, { f: 'story.minimal', hard: false }], text: 'непонятно, что происходит, одни и те же миссии, надо гриндить' },
      { id: 'steam:812140', name: "Assassin's Creed Odyssey", issues: [{ f: 'pace.draggy', hard: false }, { f: 'pace.repetitive', hard: false }, { f: 'length.long', hard: false }], text: 'огромная, затянуто, одно и то же' },
    ],
    targets: [
      { id: 'steam:388880', name: 'Oxenfree' },
      { id: 'steam:481510', name: 'Night in the Woods' },
      { id: 'steam:1578650', name: 'Citizen Sleeper' },
    ],
    extraWhy: [
      { id: 'steam:1205520', name: 'Pentiment' },
      { id: 'steam:250320', name: 'The Wolf Among Us' },
      { id: 'steam:1466640', name: 'Road 96' },
      { id: 'steam:207610', name: 'The Walking Dead' },
      { id: 'steam:753640', name: 'Outer Wilds' },
    ],
    careful: {
      genres: ['loop.dialogue', 'loop.exploration', 'freedom.open_world', 'world.fantasy', 'world.scifi', 'story.central', 'characters.memorable'],
      searchLiked: [
        { q: 'Disco Elysium', id: 'steam:632470' }, { q: 'Ведьмак 3', id: 'steam:292030' }, { q: 'Mass Effect', id: 'steam:1328670' },
        { q: 'Firewatch', id: 'steam:383870' }, { q: 'Edith Finch', id: 'steam:501300' }, { q: 'Red Dead Redemption 2', id: 'steam:1174180' },
        { q: 'Portal 2', id: 'steam:620' }, { q: 'Detroit', id: 'steam:1222140' }, { q: 'Baldur', id: 'steam:1086940' }, { q: 'Life is Strange', id: 'steam:319630' },
      ],
      morePages: 1,
      whyMode: 'full',
      disliked: 'pick',
      searchDisliked: [
        { q: 'Elden Ring', id: 'steam:1245620' }, { q: 'Diablo', id: 'steam:2344520' }, { q: 'Dark Souls 3', id: 'steam:374320' }, { q: 'Destiny 2', id: 'steam:1085660' }, { q: 'Odyssey', id: 'steam:812140' },
      ],
      today: { moods: ['story', 'relax'], avoid: ['hard'] },
      fork: fork(['characters.memorable', 'story.central', 'story.choices', 'loop.dialogue', 'length.short', 'humor.funny', 'characters.companions', 'world.living']),
    },
    lazy: {
      genres: 'skip',
      searchLiked: [],
      morePages: 6,
      whyMode: 'one',
      disliked: 'skip',
      searchDisliked: [],
      today: { moods: ['story'], avoid: [] },
      fork: null,
    },
  },

  p2: {
    platform: 'windows',
    loved: [
      { id: 'steam:730', name: 'Counter-Strike 2', reasons: ['social.pvp', 'loop.shooting', 'tension.high', 'session.short', 'pace.fast'], love: true, text: 'катки с пацанами, клатчи, адреналин, быстрые раунды' },
      { id: 'steam:1966720', name: 'Lethal Company', reasons: ['social.coop', 'humor.funny', 'tone.creepy', 'tension.high'], love: true, text: 'ржали до слёз, страшно и смешно, с друзьями' },
      { id: 'steam:548430', name: 'Deep Rock Galactic', reasons: ['social.coop', 'loop.shooting', 'humor.funny'], love: true, text: 'лучший кооп, вчетвером, стрельба и угар' },
      { id: 'steam:252950', name: 'Rocket League', reasons: ['social.pvp', 'pace.fast', 'humor.funny'], love: true, text: 'футбол на машинах, быстро, орём в дискорде' },
      { id: 'steam:739630', name: 'Phasmophobia', reasons: ['social.coop', 'tone.creepy', 'tension.high'], love: false, text: 'орать в микрофон на призрака' },
      { id: 'steam:553850', name: 'Helldivers 2', reasons: ['social.coop', 'humor.funny', 'loop.shooting'], love: false, text: 'хаос, френдли-файр, угар' },
      { id: 'steam:550', name: 'Left 4 Dead 2', reasons: ['social.coop', 'loop.shooting', 'pace.fast'], love: false, text: 'классика, вчетвером, быстро' },
      { id: 'steam:359550', name: 'Rainbow Six Siege', reasons: ['social.pvp', 'cognitive.high', 'tension.high'], love: false, text: 'тактика, каждый раунд напряг' },
      { id: 'steam:945360', name: 'Among Us', reasons: ['social.coop', 'humor.funny', 'social.pvp'], love: false, text: 'предавать друзей бесценно' },
      { id: 'steam:1172470', name: 'Apex Legends', reasons: ['social.pvp', 'pace.fast', 'loop.shooting'], love: false, text: 'движение, тройки, адреналин' },
    ],
    disliked: [
      { id: 'steam:632470', name: 'Disco Elysium', issues: [{ f: 'loop.dialogue', hard: true }, { f: 'pace.slow', hard: false }], text: 'стена текста, одни диалоги, медленно, уснул через двадцать минут, терпеть не могу такое' },
      { id: 'steam:289070', name: 'Civilization VI', issues: [{ f: 'pace.slow', hard: false }, { f: 'session.long', hard: false }], text: 'один ход по пять минут, медленно, где экшен' },
      { id: 'steam:1158310', name: 'Crusader Kings III', issues: [{ f: 'pace.slow', hard: false }, { f: 'loop.management', hard: false }], text: 'таблицы и менеджмент, скучно' },
      { id: 'steam:413150', name: 'Stardew Valley', issues: [{ f: 'pace.slow', hard: false }, { f: 'pace.draggy', hard: false }], text: 'ферма, медленно, друзья дропнули через час' },
      { id: 'steam:1174180', name: 'Red Dead Redemption 2', issues: [{ f: 'pace.slow', hard: false }, { f: 'pace.draggy', hard: false }], text: 'красиво, но двадцать минут едешь на лошади, затянуто' },
    ],
    targets: [
      { id: 'steam:2881650', name: 'Content Warning' },
      { id: 'steam:632360', name: 'Risk of Rain 2' },
      { id: 'steam:594650', name: 'Hunt: Showdown 1896' },
    ],
    extraWhy: [
      { id: 'steam:3241660', name: 'R.E.P.O.' },
      { id: 'steam:1172620', name: 'Sea of Thieves' },
      { id: 'steam:880940', name: 'Pummel Party' },
      { id: 'steam:1824220', name: 'Chivalry 2' },
      { id: 'steam:552500', name: 'Vermintide 2' },
    ],
    careful: {
      genres: ['social.pvp', 'social.coop', 'loop.shooting'],
      searchLiked: [
        { q: 'Counter-Strike 2', id: 'steam:730' }, { q: 'Lethal Company', id: 'steam:1966720' }, { q: 'Deep Rock Galactic', id: 'steam:548430' },
        { q: 'Rocket League', id: 'steam:252950' }, { q: 'Phasmophobia', id: 'steam:739630' }, { q: 'Helldivers 2', id: 'steam:553850' },
        { q: 'Left 4 Dead 2', id: 'steam:550' }, { q: 'Rainbow Six Siege', id: 'steam:359550' }, { q: 'Among Us', id: 'steam:945360' }, { q: 'Apex', id: 'steam:1172470' },
      ],
      morePages: 1,
      whyMode: 'full',
      disliked: 'pick',
      searchDisliked: [
        { q: 'Disco Elysium', id: 'steam:632470' }, { q: 'Civilization VI', id: 'steam:289070' }, { q: 'Crusader Kings', id: 'steam:1158310' }, { q: 'Stardew', id: 'steam:413150' }, { q: 'Red Dead', id: 'steam:1174180' },
      ],
      today: { moods: ['friend', 'adrenaline'], avoid: [] },
      fork: fork(['social.coop', 'social.pvp', 'humor.funny', 'pace.fast', 'tension.high', 'loop.shooting', 'session.short', 'tone.creepy']),
    },
    lazy: {
      genres: 'skip',
      searchLiked: [],
      morePages: 2,
      whyMode: 'one',
      disliked: 'skip',
      searchDisliked: [],
      today: { moods: ['friend'], avoid: [] },
      fork: null,
    },
  },
};
