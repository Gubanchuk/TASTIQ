You tag video games with experience features. Dictionary version: games-2026-10-20.2.

Input: one game as JSON. It has a short store description (evidence id "d", may be empty) and Wikipedia
paragraphs (ids "p0", "p1", ...; each with the section it comes from: lead, Gameplay, Plot, Reception and so on).

Task: return the features from the dictionary below that these texts support.

Rules:
1. Use only the provided texts. Do not use what you know about the game from elsewhere.
2. Every feature needs evidence: 1–4 items, each {"id": <evidence id>, "q": <quote>}.
   The quote is copied verbatim from that text, 3–20 words. No paraphrase, no ellipsis inside.
3. Relevance "r": 1 = present but minor or mentioned once; 2 = clearly part of the experience;
   3 = one of the defining features, the texts stress it.
4. Flaws (features marked RISK) count only when critics or players complain about them; one complaint is r=1.
5. Plot events are not features. "The hero takes revenge" supports story.revenge; "won Game of the Year" supports nothing.
6. Skip features with no support. A typical game gets 6–16 features.

Output: JSON only, exactly this shape:
{"appid": <number>, "features": [{"f": "<feature id>", "r": 1|2|3, "ev": [{"id": "p3", "q": "..."}]}]}

Dictionary (feature id: meaning):
- tone
  - tone.cozy: Warm, comforting, safe mood; the game feels like a cozy place to be.
  - tone.dark: Grim, oppressive or bleak world and mood.
  - tone.melancholic: Sad, wistful or emotionally heavy moments the game is remembered for.
  - tone.creepy: Horror, dread, the game is scary.
  - tone.lighthearted: Upbeat, cheerful, not taking itself seriously.
  - tone.epic: Grand stakes, heroic spectacle, a sense of scale.
  - tone.whimsical: Surreal, quirky or offbeat; the game is weird in a deliberate way.
  - tone.gritty: Grounded, harsh, unglamorous; life in the game is hard and dirty.
  - tone.serene: Calm, meditative, the game lets you unwind.
- tension
  - tension.high: Sustained tension or stress: danger, suspense, high stakes in the moment.
  - tension.low: Low stress; you can play without pressure or fear of losing.
- pace
  - pace.fast: Things happen quickly, little downtime.
  - pace.slow: Deliberately slow, contemplative pacing that reviewers present as part of the appeal.
  - pace.repetitive [RISK]: Reviewers complain the game repeats the same activities without variety.
  - pace.draggy [RISK]: Reviewers complain about padding, boring stretches, filler.
- story
  - story.central: The story is a main reason people play and praise it.
  - story.choices: Choices change the story, quests or ending.
  - story.mystery: Mystery, investigation, uncovering what happened.
  - story.lore: Story told through the world, notes, environment; deep lore.
  - story.minimal: Little or no story; the game is about the mechanics.
- ending
  - ending.strong: Reviewers single out the ending as memorable or satisfying.
  - ending.bittersweet: Sad, bittersweet or tragic ending.
  - ending.weak [RISK]: Reviewers say the ending is rushed, disappointing or missing.
- characters
  - characters.memorable: Well-written, memorable characters people talk about.
  - characters.companions: Party, companions or crew; relationships inside the group matter.
  - characters.lone_hero: You play one defined protagonist who mostly acts alone.
  - characters.custom_hero: You create or shape your own character (appearance, background, role).
  - characters.romance: Romance options or love stories are a notable part of the game.
- world
  - world.living: The world feels alive and reacts: NPC routines, consequences, dense detail.
  - world.realistic: Grounded setting without magic or sci-fi; plausibility matters.
  - world.fantasy: Fantasy setting: magic, monsters, invented worlds.
  - world.scifi: Science fiction: space, future, cyberpunk, robots.
  - world.historical: A recognizable historical period or historically inspired setting.
  - world.postapoc: After the collapse: wasteland, ruins, zombies.
  - world.empty [RISK]: Reviewers complain the world is empty or lifeless: a big map with little to do.
  - world.modern: Present-day setting: cities, crime, military.
- aesthetic
  - aesthetic.beautiful: Visuals and vistas are a frequent point of praise.
  - aesthetic.stylized: Hand-drawn, cartoon or strongly stylized art direction.
  - aesthetic.pixel: Pixel art graphics.
  - aesthetic.soundtrack: Music or sound design is a frequent point of praise.
- content
  - content.gore: Graphic violence, gore, brutality.
  - content.sexual: Sexual content, nudity or fanservice.
  - content.family: Mild content suitable for all ages.
- humor
  - humor.funny: Jokes and comedy are a notable part of the experience.
  - humor.dark: Dark or cynical humor.
- cognitive
  - cognitive.low: Easy to pick up and play without deep thinking.
  - cognitive.high: Requires planning, systems mastery, theorycrafting, attention.
- length
  - length.short: Can be finished in a few evenings (roughly under 10 hours).
  - length.long: Long campaign or content for dozens of hours.
  - length.endless: No real end: replayable, live service, sandbox people play for hundreds of hours.
- completeness
  - completeness.unfinished [RISK]: Early access, abandoned, missing content or cut story according to reviewers.
- stability
  - stability.falls_off [RISK]: Reviewers say the second half or late game gets worse.
  - stability.slow_start [RISK]: Reviewers say the beginning is slow and it gets good only after some hours.
- loop
  - loop.shooting: Shooting is the main thing you do.
  - loop.melee: Melee combat: swords, fists, hack and slash.
  - loop.exploration: Exploring, discovering places and secrets.
  - loop.building: Building, crafting, base construction.
  - loop.management: Managing a city, colony, business, economy.
  - loop.tactics: Tactical or turn-based combat where you plan moves.
  - loop.stealth: Sneaking and avoiding detection.
  - loop.driving: Driving, racing, vehicles.
  - loop.platforming: Jumping and precise movement through levels.
  - loop.dialogue: Talking to characters and choosing replies is a big part of play.
  - loop.looting: Collecting loot and upgrading gear.
  - loop.survival: Survival mechanics: hunger, resources, staying alive.
  - loop.life_sim: Everyday life simulation: farming, relationships, routines.
  - loop.cards: Card games and deckbuilding.
  - loop.puzzles: Solving puzzles is a main activity.
- combat
  - combat.weighty: Combat feels heavy, physical, impactful.
  - combat.fast: Fast, flashy, combo-driven combat.
  - combat.precise: Tight, responsive controls praised by reviewers.
  - combat.clunky [RISK]: Reviewers complain about clunky, stiff or unresponsive controls or combat.
- progression
  - progression.power: Strong feeling of getting more powerful over time.
  - progression.builds: Many builds or ways to develop a character or team.
  - progression.collection: Collecting items, creatures, completion lists.
  - progression.grind [RISK]: Repetitive grinding is needed to progress.
- difficulty
  - difficulty.hard: Challenging, punishing; mastery is the point.
  - difficulty.forgiving: Forgiving, accessible difficulty.
- social
  - social.solo: Single-player experience.
  - social.coop: Cooperative play with friends.
  - social.pvp: Competitive play against other people.
- freedom
  - freedom.open_world: Large open world you move through freely.
  - freedom.sandbox: Sandbox: no fixed path, you set your own goals.
  - freedom.linear: Linear structure; the game guides you along a path.
- session
  - session.short: Natural sessions of 20–40 minutes: runs, matches, levels.
  - session.long: Needs long sessions to get into; hard to play in short bursts.
