# Conversation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Перенести выбранный «Разговор» на основной интерфейс с настоящими сохранениями.

**Architecture:** Общие scoped стили и три адаптера game/legacy/library. Отдельный совместимый library-store хранит планы без переписывания вкуса, истории и вечеров; /library/ использует настоящие данные. Лендинг сохраняет исходный верх и получает отдельный новый низ.

**Tech Stack:** Existing vanilla JS, CSS, Node test runner; no new package.

**Spec:** docs/superpowers/specs/2026-11-02-conversation-production-design.md

## Global Constraints

- Не менять каталоги/ранжирование/API guards; платных тестов не планируется.
- Не коммитить, не публиковать, не сбрасывать текущие staged/untracked файлы.
- Сохранять tastiq.site.library v1/status/answer/history и отдельные game-history/IndexedDB evenings.
- Header визуально исходный, единственная copy/link правка — Библиотека; section.first полностью сохраняется.
- Проверка на отдельном AI_ACCESS=off стенде с отдельным журналом; production state не использовать как fixture.

## Review Focus

- Старые liked/disliked и answer не превращаются в планы при переносе lane.
- Два экземпляра store не затирают свежие записи; undo не затирает повторно сохранённую запись.
- Знакомые игры/вечера не выводят несуществующие вкусовые предпочтения.
- /pick/#my открывает библиотеку без AI/result bootstrap.
- Узкая ширина/длинные названия/отсутствие poster/ошибка/ожидание не скрывают основное действие.

### Task 1 — совместимое хранилище и библиотека (worker library)

Ownership: shared/library-store.js, library/index.html, library/app.js, library/style.css, test/library-store.test.js. Не редактировать соседние модули.

Interface: export createLibraryStore({storage,now}) with all(), save(card,{lane='want',domain}), move(domain,id,lane), remove(domain,id), restore({item,index}), persistent. lane want/tonight/known отделён от status. Existing v1 extra fields preserved. New cards saved with compatible want/known status; changing lane never removes old taste answer. Read-modify-write fresh snapshot.

- [x] Написать и увидеть RED для сохранения старого status/answer/history, свежих multi-instance writes, domain/id identity, remove/undo collision и storage fallback.
- [x] Реализовать store, получить GREEN.
- [x] Построить доску выбранного conversation-макета на реальных сохранениях/game-history, с search/type/reaction filters, sort, explicit move/remove/undo, history и evenings. Ничего не переносить из fixture /design/.
- [x] Проверить syntax и собственные тесты, передать root список интерфейсов/ограничений.

### Task 2 — игровой путь (worker game)

Ownership: pick/game/index.html, app.js, card-view.js и новый conversation.css. Shared library-store imports only, общий shared/conversation.css пишет root.

- [x] Подключить выбранный мир и rail; разместить существующий реальный контекст слева, main справа. Все ids/forms/controls/drafts/pending/replacement сохраняются.
- [x] Перестроить результат четырьмя последовательными рядами. Явное Сохранить → libraryStore.save(card,{lane:'want',domain:'game'}); existing choose-on → lane tonight после успешного feedback update. Не переписывать знакомство/вкус.
- [x] Проверить существующие game/card/feedback tests; новые значимые проверки только для нового поведения save, не snapshot CSS.
- [x] Передать root изменения и адресные проверки.

### Task 3 — общая оболочка, киноразделы и нижний landing (root)

Ownership: shared/conversation.css, pick/index.html/app.js/conversation.css, index.html/app.js + landing-bottom.css; project docs/tests integration.

- [x] Зафиксировать frozen baseline header/first; создать общие scoped tokens/rail styles из выбранного prototype.
- [x] Пересобрать legacy layout и последовательную выдачу, сохранить прежние forms/controllers/reasons/evenings. Ссылки /library/, early hash redirect без bootstrap.
- [x] Обновить только нижний landing и header library label/link; новые scoped стили не влияют на header/first. Существующие верхние коллажи/счётчики — из original app.
- [x] npm test + HTTP stub, AIoff QA browser journeys desktop/mobile, bounded fix+confirmation.
- [x] Fresh whole-code review с адресными разделами library/game/legacy, Impeccable full visual review и documenter; исправить материальные замечания, обновить выбранный DESIGN и sidecar.
- [x] Проверить ledger без новых вызовов, production URL и данные, обновить CODEX_CONTEXT/memory; открыть сайт владельцу.

Ruling: выбранный текущий checkout используется без нового worktree — unborn main со staged файлами владельца, сохраняем существующую рабочую папку. Нет коммитов и удаления рабочих архивов.

Completion evidence: docs/CONVERSATION_UI_2026-11-02.md and research-vault/conversation-production-2026-11-02/. Unit390/390, HTTPstubpaid0, code3/3 and visual2/2 material findings resolved; selected DESIGN/sidecar/four briefs written and parsed. Main5177 preserved, QA5180/5181 stopped, usertab untouched, memory updated. No commits/publish.
