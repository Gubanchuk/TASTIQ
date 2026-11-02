# Adaptive Media Implementation Plan

Goal: три media-domain получают работающий адаптивный разговор, совместимый с библиотекой/вечерами и без регрессии игр.
Spec: docs/superpowers/specs/2026-11-02-adaptive-media-design.md
Architecture: отдельные media core/AI/service, общий существующий transport с параметрами scope, новая media view в выбранной Conversation оболочке. Существующие catalog/recommend/aiPick/feedback остаются источником данных и выдачи.
Stack: vanilla JS/Node, текущий Responses model/provider; no dependency migration.

## Global Constraints

- Никаких commit/push/publish/reset/catalog changes. Unborn main и staged файлы владельца сохраняются; авторизация продолжить существующий checkout дана текущим поручением.
- Game state/API/storage contract сохраняется по умолчанию. Media storage изолирован по domain; legacy не мигрируется молча.
- Выбранный Conversation и frozen верх сохраняются; тема не выбирается заново.
- Бесплатные тесты сначала; live≤$0.60 из действующего разрешения, receipts/lock/отдельный journal обязательны.
- Источник facts — точный активный source/quote, domain mismatch reject; cached restore free.

## Review Focus

- Cross-domain ID/state/storage не попадают в другой подбор, даже при одинаковом title/id.
- Back/correction/retraction/reload не возвращают старые условия и не теряют собственный черновик.
- Movie runtime vs episode runtime vs whole-series commitment не смешиваются; неизвестное не становится guaranteed.
- Child age спрашивается только по детскому совместному просмотру; cartoons не означают children.
- Replacement failure/partial/undo сохраняют непомеченные карточки и отзывы, familiar не значит disliked/blocked.

## Shared protocol

Core exports из src/core/media-conversation.js:
newMediaConversation({id,domain,mode}), normalizeMediaConversation(input,expectedDomain?), answerMediaConversation(input,action), applyMediaConversationProposal(state,proposal,dict,revision), mediaConversationScreen(state), mediaConversationToLegacy(state,dict,catalog), mediaFallbackQuestion(state).

State version1, domain film|series|cartoon, id/revision/mode/phase/turns/facts/question/summary/uncertainties/retractions/result/provisional/needsPlan/failedAction. Familiar protocol mirrors game: {marked,keep,hidden,excluded,undo}, replacement metadata; factRemovalUndo optional. facts use titleId/exposure/titleIntent (not gameId), all tied to active source. screen type question/review/result, question {id,title,why,options,multiple,controls,allowText?}; screen context {company,childAge,minutes,timeMode,commitment,onlyEnded,format}, sessionTime evidence if available, turns/facts/uncertainties/canBack/canUndoFactRemoval. Context nullable, no inferred default.

Actions answer {selected:[ids],text,kind}, review, confirm, correct {text}, remove_fact {key}, undo_fact_removal, back, restart, set_context {context}, retry, familiar_mark/unmark/keep {id}, replace_familiar, undo_replacement. Apply returns {state,error?}; reducer validation failures status400. Proposal schema exact details owned by core/AI; service treats it opaque except facts title binding. Agree additions via root before cross-owner edits.

AI export aiMediaConversation(catalog,state,{api?,knownTitles?})→{proposal?,error?,retryable?,model?,usage?,ms?}. Same transport/config/reserve accounting as ai/conversation. knownTitles locally bound identity-only records, evidence sourceId/quote; no inferred taste.

Service export createMediaConversationService({domain,catalogs,plan?,pick?,api?,access?,spend?,journal?,now?})→async(body,who) response {state,screen,feedbackState? ,feedbackCarry?,error?,retryable?}. Projection follows existing legacy profile/session and recommendIds. New POST/api/media-conversation requires body.domain whitelist, selects scoped service, rejects mismatched state. Game endpoint unchanged.

Client createConversationClient gains optional domain='game', storageKey=CONVERSATION_KEY, endpoint='/api/conversation'; media adds body.domain on every request, excludes opposite snapshots, restart/restore free semantics unchanged. New route /pick/watch/?domain=...

### Task 1 — media core/AI (worker media_core)

Ownership: src/core/media-conversation.js, src/ai/media-conversation.js, own test/media-conversation.test.js and test/media-conversation-ai.test.js. No edits game core/AI/shared service/UI.
- [x] RED for3domains, evidence/source/retraction/correction/back, explicit context/age/time semantics, familiar/undo/projection, malicious/invalid snapshots.
- [x] Implement domain-aware adaptive state/proposal and structured AI planner; reuse existing patterns, keep modules focused.
- [x] GREEN targeted tests and handoff exact schema/context/projection limitations to root/service worker.

### Task 2 — scoped service/identity/API (worker media_service)

Ownership: src/server/media-conversation-service.js, src/server/conversation-media-identity.js, src/server/server.js integration only, test/media-conversation-service.test.js, test/media-identity.test.js; test/server-smoke.mjs media additions if needed. No core/AI/client edits.
- [x] RED identity same-name/sequel/cross-source; service cache/dedupe/access/error/replace/feedbackCarry/domain mismatch.
- [x] Wire core exports via shared protocol, domain-scoped identity binding and recommendation/receipts. Preserve game route and all API guards.
- [x] GREEN targeted and HTTP stub scenarios, communicate integration contract. No running production/paid calls.

### Task 3 — media UI/storage/routes (root)

Ownership: public/shared/conversation-client.js + new media history/views, public/pick/watch/*, public navigation/root lower copy/legacy entry only, tests client/history/route/view. Existing game code remains unless scoped regression requires.
- [x] RED scoped transport/snapshots/history and route/renderer behavior. Implement shared client options compatible with game.
- [x] Real Conversation media question/review/results, context editing/Back/drafts/search/familiar/replace/undo/save/evenings/focus/pending/error.
- [x] Nav3media to new entry; preserve old /pick/ state behind explicit previous-route link; root hero unchanged.
- [x] Full npm test, HTTPstub, browser3domains+mobile and failure/recovery fixtures. Bounded fix+confirmation.
- [x] Live bounded test (if guards permit), two independent reviews; material fixes one scoped batch and re-review.
- [x] Restart main5177 safely, close QA/reset viewport, update docs/CODEX_CONTEXT/memory/DESIGN brief if behavior changes require, report actual cost and limitations.

Ledger: research-vault/adaptive-media-2026-11-02/PROGRESS.md. No task completed before evidence. Use current checkout; no new worktree or deletion of archives.
