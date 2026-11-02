# Знакомые игры и удобство — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. No commits or pushes in this task.

**Goal:** Заменять знакомые игры без повторного разговора и сохранять оставшиеся варианты и отзывы.
**Architecture:** Структурированные result-actions хранят пометки и один undo в conversation snapshot. Client хранит отдельную явную память знакомства/исключений, feedback переносит ответы только неизменённых ID между версиями того же результата.
**Tech Stack:** существующие Node ES modules, vanilla browser UI, node:test, native Chrome automation.
**Spec:** docs/superpowers/specs/2026-11-01-familiar-games-design.md.

## Ограничения

Никаких коммитов/публикаций/изменений каталога. Модель/поиск прежние; spares/discovery остаются выключены. Платных тестов0. История знакомства не добавляет веса вкуса и не запрещает серию. Исходные staged-файлы не трогать. Production5177 и пользовательский journal не использовать для синтетических проходов.

## Review focus

Нельзя потерять выбранную нетронутую игру и её отзыв. Нельзя вернуть издание исключённой игры. Нельзя молча исключить начатое навсегда. Нельзя оплачивать reload/undo. Нельзя показывать объяснение старой игры у новой. Старые v1 snapshots должны восстановиться.

## 1. Core/service (history_trace)

- [x] RED: batch replacement/undo, keep intent, retry/error/no candidates, editions, existing v1, no planner.
- [x] Extend src/core/conversation.js and src/server/conversation-service.js; exact action/response contract send to parent before UI integration.
- [x] GREEN: targeted core/service tests with injected plan/pick; preserve unaffected cards and validate IDs.

## 2. Отзывы (played_logic)

- [x] RED: replacement snapshot inherits only matching cards within same dialogue/context; chosen/start/outcome never move to new ID.
- [x] Extend observe optional source run in src/server/public/shared/evening-feedback.js with tests; defaults/legacy unchanged.
- [x] GREEN: feedback tests including duplicate observe and stale source/context mismatch.

## 3. UI/storage (root)

- [x] Separate game familiarity store with explicit persistent exclusion; tests for malformed storage, undo/error, no taste inference.
- [x] Mark/keep/replace/undo UI using core contract; maintain feedback carry and drafts.
- [x] Compact summary/result hierarchy; one editor/restart, clear busy/error, touch/focus/scroll.
- [x] Test client/storage logic. Use real engine with injected model on isolated5178 for click-through; no production statistics.

## 4. Интеграция

- [x] Full npm test and test:server, then one desktop/mobile browser batch; fix material findings together and confirm once.
- [x] Independent review (reuse ux_audit), mechanical Impeccable scan once after UI is finished.
- [x] Restart production Node outside network sandbox with unchanged budget; verify free GETs. Stop test server/tabs.
- [x] Update CODEX_CONTEXT, result note and project memory with human-feedback boundary, evidence, API cost and next step.
