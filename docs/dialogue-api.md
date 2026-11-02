# Dialogue API for prototype pages

Every page talks to the same engine through `src/server/public/shared/dialogue-client.js`. The page renders the `screen` it receives and answers with one action. Example payloads for every step: `docs/dialogue-screens.example.json`.

## Steps and their screens

| `screen.step` | What the screen carries | Actions the page sends |
|---|---|---|
| `domain` | `title`, `options[{value,label}]` (game, film, series, cartoon), `later[]` (labels shown disabled: «Почитать», «Аниме») | `{type:'choose', value}` |
| `platform` (games only) | `title`, `options[{value,label}]` | `{type:'choose', value}` |
| `genres` | `title`, `hint`, `options[{value,label}]`, `multi`, `canSkip` | `{type:'genres', values:[...]}` or `{type:'skip'}` |
| `liked` | `title`, `hint`, `items[card]` (8 titles), `search`, `more` | `{type:'pick', ids:[...], shownIds:[ids on screen]}`; another page of titles: `{type:'more', ids:[ids on screen]}` |
| `why` (per liked title, up to 3) | `title`, `hint`, `item: card`, `options[{value,label}]` (reasons), `love` (show «Обожаю» toggle), `freeText`, `canSkip`, `progress` («1 из 2») | `{type:'reasons', values:[featureIds], love:bool, issues:[{f,hard}]}` or `{type:'skip'}` |
| `disliked` | like `liked`, plus `canSkip` | `{type:'pick', ids:[...]}` or `{type:'skip'}` |
| `why_not` (per disliked title, up to 2) | `title`, `hint`, `item`, `options[{value,label}]` (complaints), `categories[{value,label}]` («не люблю такое вообще»), `badQuality`, `freeText`, `canSkip`, `progress` | `{type:'issues', issues:[{f, hard}], badQuality:bool}` or `{type:'skip'}`. A chip cycles: off → «не нравится» (`hard:false`) → «никогда» (`hard:true`) → off |
| `today` | `title`, `hint`, `options[{value,label}]` (moods), `avoid[{value,label}]`, `canSkip` | `{type:'today', values:[moodIds], avoid:[avoidIds]}` or `{type:'skip'}` |
| `playback` | `title` («Вот как я тебя вижу»), `lines[]` (sentences), `taste{confirmed[], inferred[], dislikes[], hardNo[], consumed}` (each row: `f, label, sources[], ids[]`), `today[]`, `options` (`confirm`, `more_liked`) | `{type:'choose', value:'confirm'}` → result; `{type:'choose', value:'more_liked'}` → back to liked; remove a line: `{type:'remove', kind:'reason'|'issue', f}` |
| `result` | `result{top, alternatives[3], fork, sieves[], considered, taste}` | `{type:'played', id, reaction:'like'|'dislike'|undefined}`, `{type:'not_now', id}`, `{type:'not_mine', id, issues}`, `{type:'fork', f|null}`; all recompute the pick at once |

Any step: `client.back()`, `client.restart()`.

## Card (a title on a pick screen)

`{ id, name, ru, original, year, image, poster, kind, genres[], rating }`. Show `ru ?? name`. `poster` is a portrait image (Steam library capsule for games, Wikipedia poster for popular films and series) and may be missing or 404: fall back to `image` (Steam header, landscape) and then to a typographic tile. Never leave an empty grey box.

## Pick (top and alternatives)

`{ id, domain, name, ru, year, poster, image, kind, genres[], runtime, seasons, episodes, status, rating, link, price, label, labelText, score, explanation{reasons[], risks[], info[]}, facts[] }`.

- `label`: `strong` | `likely` | `try`; `labelText` is the words to show.
- `explanation.reasons[]`: `{text, factIds[], weak?}`; `weak` marks unconfirmed reasons (show quieter).
- `explanation.risks[]`: `{text, factIds[]}` — always show when present («Учти»).
- Evidence for a reason or risk: `facts.find(f => f.id === factId).evidence[]`, each `{kind, q, ...}`:
  - `review`: Steam review quote, `thumb` 'up'|'down', `hours`;
  - `tag`: Steam player tag, `votes`;
  - `genome`: MovieLens viewer tag, `rel` (0..1, show as %);
  - `usertag`: MovieLens user tag, `n` (times used);
  - `wiki`: Wikipedia quote, `section`, `url`;
  - `summary`, `description`, `genre`, `fact`: short texts.
- `fork`: `{text, options[{f,label}]}` or null.

## Other calls

`client.search(q)` → cards of the current domain (for «найди своё»). `client.parse(text)` → `{positive[{f,label}], negative[{f,label,hard}], understood}`: show as chips to confirm, never apply silently. `client.whyNot(id)` → `{removedBy:{sieve,reason}, sieveName}` or `{rank, of, score, leaderScore, matches[], penalties[]}`.
