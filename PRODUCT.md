# Product

<!-- impeccable:product-schema 1 -->

Source of these facts: the owner's Note Pad note and messages, the research in `research-vault/taste-recommender-logic-2026-10/SUMMARY.md`, and the working prototype. The owner delegated the interview ("сам всё выберешь"); lines marked *(inferred)* are conclusions from those sources, not confirmed answers.

## Platform

web

## Users

People who want to pick something to play or watch tonight and are tired of searching. The founder's own case: looking for a PC game for the evening and not finding one through lists and genre filters. Russian-speaking audience; the interface is in Russian. *(inferred)* They come with a concrete moment in mind ("что поиграть сегодня"), not to browse a catalog for its own sake.

## Product Purpose

A picker that asks a few questions step by step and returns one choice plus a few alternatives, each with the reason it fits this person and the risks. Domains in this version: games, films, series, cartoons. Anime and books are planned later. Success is that the person accepts a pick and it fits; the prototype logs every answer, pick and correction to measure that.

## Positioning

It picks by why a title worked for this person, not by genre. Taste is tied only to reasons the person confirmed ("за живой мир", "за неожиданные повороты"), dislikes are asked as complaints ("всё понятно заранее", "постоянно умирал"), and every stated reason in a pick is backed by a fact with a source: a quote from a review or article, a player or viewer tag, a catalog fact. The catalog and the hard limits belong to code; since 2026-10-28 an AI layer (OpenAI since 2026-10-31; historically Claude) chooses the final four from the shortlist the code leaves and adds one sentence per pick, marked on screen as the model's opinion. It never adds a title outside the catalog or past a sieve. Today it is open to everyone; later only to people who paid or were granted access by hand (`src/ai/access.js`).

## Operating Context

As implemented 2026-11-03: choose games / films / series / cartoons → describe today's wish in your own words or choose directions → useful adaptive questions, one per screen → check and correct the understanding → up to four catalog suggestions with reasons and caveats → save, choose for tonight or mark familiar and replace. Questions have neutral answers; the person can review early, go back, remove a condition or correct the wish. There is no fixed required number of questions. An unclear point has its own full-answer correction form; adding to the request is a separate action. Independent drafts survive cancellation, errors and reload. After a correction, the previous request and suggestions can be restored without the model. Games also ask platform/company. Viewing separates movie runtime, episode length, today's available time and commitment to a whole series. Cartoons do not imply children; child age is relevant only for viewing with children. A finished story does not automatically mean the entire series has ended. Used on a phone or laptop in the evening. The previous title-by-title path remains explicitly accessible, with its stored data preserved.

The Conversation interface retains the owner-approved 5B / uppercase 02 / Cobalt 02 identity and Golos/Unbounded. After the owner rejected the preceding product UI on 2026-11-03, the modern picker and Library received a substantial code-led usability redesign; the new UI has not yet been approved by the owner. A floating light desktop shell has visible Picker/Library navigation, a current-domain selector and direct restart/restore actions. On mobile it becomes a compact two-row header, with restore on another row when available. The request has grouped facts, conditions and an explicit clarification; wish/uncertainty editing happens in the central workspace with independent drafts. Four numbered/check stages show sequence and state without requiring four questions.

The first suggestion has its own surface; alternatives have independent heights and full natural-proportion images. Mobile shows title and metadata before art. Four fit ratings are visible; optional reason/text opens only on its card. Shared browser-local drafts survive reload and can be resumed in Library Evenings without becoming submitted feedback. The Library shows one selected list at every width, two card columns above 900px and one below, persistent search, domain/reaction/order, counts and batches of 24. Mobile secondary filters have an explicit disclosure with count and reset; the three plan lists share a compact row. Empty Library and no search results differ. Plan, taste, familiarity, choice and outcome are independent. Legacy keeps its old dark rail. The four approved landing files stayed byte-identical during this redesign; no new identity or catalog/ranking/policy change was introduced.

The landing introduces the four adaptive pickers and explains the sequence from today's wish through useful details and checking the understanding to suggestions. Every landing link leads to choosing a domain or entering its picker. It presents the selection process without a chat scene, simulated messages or fake input fields. The Library remains part of the application; the landing does not read personal plans or promote a separate Library destination. This landing correction does not rename or replace the selected Conversation interface inside the product.

## Capabilities and Constraints

- Current04.11 implementation: every modern result has one inline selection verdict with optional reason/text and explicit submit. A submitted review includes that selection's request and visible cards; unsent drafts stay local. Existing IndexedDB queue preserves revisions, offline delivery and newer edits. Up to six opted-in same-domain own-browser reviews become historical data in the existing pick call, subordinate to today's request. This is contextual memory, not weight training or automatic global rules. Family hosts only tastiq_ feedback objects with RLS/private grants; real isolated write/readback is verified. A scoped ingestion token reaches the dedicated Edge function; the broad Family key is never given to TASTIQ. Production11d6466 is live; authenticated isolated cloud ACK/readback is verified. See docs/DURABLE_FEEDBACK_2026-11-03.md.

- Modern recommendation roles are explicit: the first card is the main suggestion and the rest are alternatives. The same-request continuation explains that up to four suggestions are shown per batch. Media conditions use one canonical visible row per supported condition; duplicate format facts share the existing removal/undo control. Independent goals and source facts remain intact. See docs/REQUEST_CLARITY_2026-11-03.md.

- Modern results can copy the sent dialogue, current understanding/conditions and exactly the visible suggestions as plain text. This uses no model request or public share URL. Library plans, rating notes and unsent drafts are omitted; removed sources stay removed. See docs/SELECTION_COPY_2026-11-03.md.

- Modern result titles copy the displayed name and year with an inline confirmation and manual fallback. The same-request continuation is available above and below the cards. An ambiguous mood reference may remain unbound when its desired properties are explicit; exact identity is required only for decisions that depend on it. This local03.11 iteration has not yet been published; see docs/TESTER_FEEDBACK_ROUND2_2026-11-03.md.

- Catalogs: 4 952 Steam games, 32 126 films, 9 771 series, 1 916 cartoons; Russian names for most titles.
- Images: Steam header images for games, TVmaze images for some series; Wikipedia poster thumbnails for the ~6 100 most popular films, series and cartoons (prototype only; a public launch needs a source licensed for display). Designs must work well without images.
- Evidence types shown to people: review quote with thumbs and hours played, Steam player tag with vote count, MovieLens viewer tag with relevance %, Wikipedia quote, catalog fact (runtime, seasons, status).
- Confidence labels set by code: "Сильное попадание", "Вероятно подойдёт", "Попробуй: мало данных о твоём вкусе".
- Front end today: vanilla JS, no build step, `src/server/public` served by Node. Adaptive game state uses `/api/conversation`; domain-scoped film/series/cartoon state uses `/api/media-conversation`. Legacy `/api/dialogue` remains available. Resuming saved results does not call the model.
- Adaptive free-text interpretation uses structured model proposals checked against exact active source quotes, explicit context and catalog identities. The person sees the understanding before picking. Unknown data stays unknown; reasons are labelled as the model's opinion. Legacy keyword parsing describes the previous path only.
- AI picker on the result screen: OpenAI Responses API since 2026-10-31, configurable model (default gpt-6.1-sol, low effort). Falls back to the engine's picks on failure; «Не то? Скажи словами» asks again with a wish. Cost is estimated from usage, with per-browser and daily request limits. First live persona comparison: 10/36 fixed targets versus the engine's 3/36, 12 successful requests at an estimated $0.1929, API time about 9 s. This is not real-user validation or a guaranteed per-request price.

## Brand Commitments

Name: TASTIQ (backup name PICKORA). On 2026-11-03 the owner selected symbol 5B, uppercase wordmark 02 and palette 02 «Кобальт», then authorized their transfer to the whole site. The approved SVG contours are used unchanged in src/server/public/assets/brand/; the source kit is research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. The six approved colors are #3154D6, #1C2945, #F1F4FC, #15213D, #DFE8FF and #ABC9ED. The cobalt lockup belongs on light surfaces and the inverse lockup on dark surfaces, scaled proportionally. The earlier absence of assets and temporary palette were historical pre-selection facts. Voice: direct, plain Russian, talks to the person on "ты"; no marketing tone.

## Evidence on Hand

Real catalog data and real quotes in `data/catalog.json` and `data/catalog-screen.json`; offline stand results in README.md. No users, testimonials, ratings of the product or press exist yet; nothing of that kind may be shown.

## Product Principles

1. One question at a time; never dump everything on one screen.
2. Ask why, not which genre; genre only helps choose what to ask about.
3. Every claim in a pick points to a fact the person can check; the AI sentence is labelled as the model's opinion, not a fact.
4. Show risks, not only reasons; never fake confidence.
5. Corrections are instant and visible: the person can always see and edit what the system believes about them.

## Picker feedback correction — 2026-11-03

General entry actions now open /pick/start/ to choose the domain. The first question is shared with the server and rendered locally without an API request. Explicit wish buttons precede optional genre, avoidance and own-word details. Neutral controls follow the choices; the none control is absent from text-only questions. More continues the same request with unseen works, retains reasons/caveats and supports recovery/undo. Shown works are separate from familiarity and taste. The catalog is finite; fewer new cards and exhaustion are stated honestly. The landing's visual world remains approved; only general navigation targets changed in this correction. No new human-fit claim or paid model validation.

## Уточнение04.11.2026

Современные подборы автоматически сохраняют запрос и все варианты в локальный архив «Библиотека → Подборы»; открытие не генерирует новый результат. Списки и оценки остаются отдельными. На отмеченной карточке доступна адресная замена с сохранением других слотов/отметок; групповая кнопка остаётся отдельной. Кнопки/summary получили явные состояния, header прикреплён к верху. Устранена неявная колонка мобильных альтернатив, сжимавшая текст; компактные метаданные/сетка оценок/библиотечные формы проверены на native IAB320/390/446/820/1024/1440. Проверка не измеряет human fit. Отчёт: docs/CONTROLS_HISTORY_MOBILE_2026-11-04.md.
