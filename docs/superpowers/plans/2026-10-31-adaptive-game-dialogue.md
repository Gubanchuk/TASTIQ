# Adaptive game dialogue implementation plan

**Goal:** Finish a playable game-selection journey in which today's request controls adaptive questions, corrections and recommendations.
**Architecture:** Pure revisioned conversation state in core; OpenAI proposes an evidence-backed brief and next action; controller validates proposals and renders a separate game page. Existing catalog, recommendation facts, budget transport and other domains remain integrated. Default mode C (guided); B (free) is an internal comparison setting, with identical data/model/UI/retrieval.
**Tech stack:** Existing Node ESM, vanilla browser JavaScript/CSS, Node tests, OpenAI Responses.
**Spec:** research-vault/dialogue-architecture-2026-10/SUMMARY.md. User approved the recommended direction and implementation on 31.10.2026 after the research.

## Constraints and rulings

- Work in existing checkout; unborn Git with user-staged files. No commits, reset or new worktree. Keep source snapshots for review.
- No further plan approval needed: current user explicitly chose implementation at our judgment.
- Two isolated implementers (AI and UI) plus one final reviewer, GPT-6.1 Sol; root owns state, integration and acceptance. No nested teams.
- OpenAI model/effort unchanged. Paid app calls share existing total $5 ledger; define bounded live batch only after reading it. Offline tests first, no automatic paid reload/retries.
- Russian, neutral design, visible next/skip/custom-answer paths on desktop/mobile. Do not put experimental mode/model/debug details in ordinary user flow.
- New flow game only, /pick/game/; selecting games in /pick/ opens it. Other domains keep current routes. Existing taste is not silently imported as today's goal.
- Fixes and tests must concern meaningful behavior, not implementation mirrors.

## Review focus

Correction retracts dependent evidence and outdated API response; unknown/indifferent/neither do not become negative preferences; unfinished game may be continued; missing candidate facts are visible; reload/failure/back do not duplicate spending or strand navigation.

## Shared interfaces (binding for workers)

`src/core/conversation.js` exports `newConversation({id,mode}={})`, `answerConversation(state,action)`, `applyConversationProposal(state,proposal,dict)`, `conversationScreen(state)`, `conversationToLegacy(state,dict)`.

Context edits retain old turns with `superseded:true` and record `supersedes` on the new turn; inactive sources cannot support facts. `continue` opens a free addition without discarding evidence or calling the API.

State v1: `{version:1,id,revision,mode:'guided'|'free',phase:'direction'|'platform'|'company'|'party'|'talk'|'review'|'result',context:{platform,company,partySize},turns:[{id,question:{id,title,why,options:[{id,label}],multiple,controls},selected:[{id,label}],text,kind:'answer'|'unknown'|'indifferent'|'none',answer}],facts:[Fact],question:Question|null,summary,uncertainties:[string],retractions:[{key,sourceId}],result:null|Result}`. Source IDs refer to active turns. Each turn stores full question and exact human `answer` (selected labels plus text). User text max1600, max24 active turns. Revisions monotonically advance for accepted actions. The server returns normalized state, never secrets.

Fact: `{key,text,stance:'want'|'avoid'|'require'|'exclude'|'indifferent'|'unknown'|'conditional'|'history',scope:'today'|'history',sourceId,quote,feature:string|null,gameId:string|null,exposure:'unplayed'|'started'|'finished'|'dropped'|null}`. Keys max60, text max240, exact quote max400 within source turn.answer. Max16 facts, full proposed snapshot. A feature must exist in dict; catalog gameId resolved by server. Conditional/unknown/history facts never silently become hard filters. Human confirmation of review precedes final picks.

Question: `{id,title,why,options:[{id,label}],multiple,controls:['unknown','indifferent','none']}`; title<=220, why<=220, max6 distinct options, each label<=100. Free text is always allowed for meaning questions, independent of options. Local platform/company/party questions set `allowText:false` and require a factual selection. `id` is a stable semantic topic; reuse only if prior answer was `none` or an explicit correction changed the topic. Do not require every field or force dichotomies.

Model Proposal: `{summary:string,facts:[Fact],uncertainties:[string],action:'question'|'review',question:Question|null}`. Snapshot does not mutate source turns. Combined interpretation+next action: rejected patch rejects dependent question atomically. C additionally enforces source retractions, question repetition and no immediate ungrounded finish; B uses schema/source/feature/fact validation but model controls sequencing. Controller can offer a review after bounded effort, explicitly provisional.

AI module: `aiConversation(catalog,state,{api=requestResponse,maxCostUsd=Infinity,knownGames=[]}={}) -> {proposal,usage,model,ms}|{error,usage?,model?,ms?,notRequested?}`. No internal retries. `api` compatible with existing budgetTransport/requestResponse. All output goes through core validation at server. Model inputs include raw active turns, context, accepted facts, retractions, mode, known feature dictionary (semantic definitions), current question. No unverified external facts or recommendations in this module. Worker owns schema and prompt; avoid core imports to prevent integration blocking.

HTTP `POST /api/conversation`: `{state?:State,action?:Action,uid?:string}` → `{state,screen,error?:string,retryable?:boolean}`. Initial/resume/back/local context actions free. Meaning-bearing answer/correct or explicit retry calls planner once; confirm invokes final picker once; review/preview itself is free. Screen `{type:'question'|'review'|'result',question?,summary,facts,uncertainties,context,canBack,result?,provisional?}`. Result uses existing `recommendIds` card shape `{top,alternatives,...}` and per-card `ai:{reason,caveat,...}`. API errors return preserved state and visible recovery, no success claim.

Actions: `answer {questionId,selected:[optionId],text,kind}`; `back`; `continue`; `correct {text}`; `remove_fact {key}`; `retry`; `review` (preview understanding, no final automatic call); `confirm` (request recommendations); `restart`; `context {platform,company,partySize}`. Optional game example selection inserts title into text, search via existing `/api/search?domain=game&q=...` (no fake familiarity). `mode` only selected on a new conversation via query `?mode=free`, default guided; no ordinary user-facing architecture toggle.

UI storage separate `tastiq.conversation.game.v1`; drafts survive rerender/reload. No paid POST on reload: send actionless resume or render persisted screen. Async response must match request generation and state id/revision; back/restart/context edits invalidate pending response. Retry identical input joins server in-flight/cache. Buttons remain reachable at390x705. Escape all text, validate external game links. Feedback reuse existing shared feedback store/views with a legacy state projection returned by server on results as `feedbackState`, or use actual existing snapshot shape; preserve chosen/started/outcome separation.

## Tasks

- [x] 1 Root: capture source baseline, core RED tests (source/retraction/stale revisions, neutral meanings, meaningful today objective, started game continuation), implement state and adapter. Files core/conversation.js, test/conversation.test.js, narrow edits core/score.js/sieves.js if needed; record exact adapter contracts.
- [x] 2 AI worker: RED tests for prompt evidence, correct strict schema, free vs guided instructions, malformed/incomplete/refusal/errors, single call/budget refusal. Implement src/ai/conversation.js + test/conversation-ai.test.js. Follow current API transport conventions; no paid calls, other code or commits.
- [x] 3 UI worker: implement /pick/game/index.html, app.js, style.css and shared conversation-client.js (unit-test client race/back/reload/drafts). Hook existing game navigation in pick/app.js only after inspecting entry points. Reuse feedback storage/view where feasible. Root will supply service and review integration. No server/core/AI modifications.
- [x] 4 Root: controller and server route with cache/in-flight/budget/access/journal, candidate and prompt adaptation using same path for B/C. Test local/context transitions, planner failure, stale/retracted evidence, final validation and no paid duplicate requests using injection. No massive retrieval changes.
- [x] 5 Root: full offline suite/server smoke, browser desktop/mobile all recovery/selection/correction flows with API off/stub; a small fixed live batch against actual API inside remaining total budget. Validate expected sets and corrections, record actual costs and limitations.
- [x] 6 Independent final review of before/after snapshot diff and tests, fix material findings with regressions. Walk final changed flows, restart owned server and give usable link. Update project context and memory with current evidence, not human-fit promises.

## Actual completion evidence

31.10.2026: 250/250 tests; HTTP smoke with stub; desktop1440×900/mobile390×705; real browser → HTTP → OpenAI cooperative journey; reviewer Pass after fixes. Live11 calls cost$0.2079572, totalupper$1.4346095/148 of authorized$5. B/C yielded equal recommendations on one rich RPG input, superiority not established. Server5177 restored, test5178/5179 stopped. Full report: docs/ADAPTIVE_DIALOGUE_2026-10-31.md. No commits, catalog changes or deployment.
