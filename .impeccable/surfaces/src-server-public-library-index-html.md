---
version: 1
slug: "src-server-public-library-index-html"
primary_target: "src/server/public/library/index.html"
related_targets: ["src/server/public/shared/conversation.css", "src/server/public/library/style.css", "src/server/public/library/app.js", "src/server/public/shared/library-store.js", "src/server/public/pick/game/familiarity-store.js"]
---

Mode: Operate. Настоящая /library/ заменяет прежнее «Моё» местом для планов/истории/вечеров. Прямой выбор Conversation 02.11.2026; новые game/film saves используют реальные stores. Демонстрационные записи прототипа не импортировались.

## Direction contract and provenance

THESIS: вернуться к своим планам без новой анкеты.
OWN-WORLD: графитовый rail, тёплое поле, медный CTA/state, Unbounded/Golos, реальные обложки/fallback.
STORY: сохранить/выбрать → найти → перенести/удалить+undo → отдельно оценить/посмотреть историю и вечер.
FIRST VIEWPORT: heading/CTA, «Списки / Архив / Вечера», поиск/фильтры/три lane. Phone сохраняет поиск, фильтры раскрываются явно, lane переключаются.
FORM: code-led выбранный Conversation /design-v2/; seed 537787fa, deal 6/4/5, receipt research-vault/site-design-reset-2026-11-02/structure-seed.txt. Raster comp нет; локальных QUALITY BAR board/hero нет, внешний ceiling не проверен.
FINISH: production FINISH_REVIEW.md ship covers scored fixes; CODE_REVIEW.md подтверждает scoped3/3 resolved.

## Shipped composition

- Rail 164px; content max 1600px,padding 40px 38px 55px. Unbounded 40px/1.23,500,tracking-.035em. CTA справа. Три равных lane,gap 23px, heading17px/count 12px, линия 2px neutral/copper/green с текстовыми названиями.
- Светлые cards radius4px/padding 13px без resting shadow. Cover 68px/2:3/radius3px, Golos title 14px/1.45/650, meta12px. Native select переносит план, remove hit area 44px, disclosure отношения/знакомства ниже hairline.
- 761–1100px плотнее/cover 48px; ≥1500px поля 48px 50px 65px/cover 76px. ≤760px поля 28px 22px 45px, heading 31px/1.3, один active lane, switches/counts; cover 72px. ≤350px поля 16px/heading 28px/cover 60px.
- Search всегда видим. Phone «Фильтры и порядок» с chevron/count раскрывает native media/отношение/sort. «Архив» содержит прежние предложения и явно ведёт к новым выборам/отзывам во «Вечерах», без миграции. Конкретные вечера раскрываются локально. Media familiarity всех3 разделов объединена с игровой через domain-scoped stores; формулировки общие для названий.
- Пустые состояния/storage notice/undo названы. Временный notice фиксируется снизу с мягкой тенью, доска не получает elevation.

## Data and interaction boundaries

Lane — план, независимый от прежних status/answer, history и familiarity. Перенос не меняет вкус/запрет; знакомое можно оставить для возвращения. V1 / дополнительные поля сохраняются. Поиск, фильтры и сортировка данные не переписывают. Undo не затирает повторно сохранённую запись, разные экземпляры store перечитывают store. Отзывы идут очередью; просмотр вечеров не отправляет observe/flush.

Controls min 44px, focus 2px accent / offset 4px, search focus-within 2px / offset 3px. Button transition .18s cubic-bezier(.16,1,.3,1), reduced-motion отключает transition. Skip link ведёт в main. SVG icons, текстовый cover fallback; локальные Golos/Unbounded + OFL.

## Evidence boundary

Лично открыты final-library-{desktop,mobile}.png: три списка desktop, одна lane/видимый поиск phone. Это записи QA click-through, не данные владельца и не human labels. Родитель проверил search/filter/move/removeundo/history/evenings, отдельный основной профиль в режиме чтения, пустое состояние; пустой IAB не доказывает отсутствие записей Chrome.

Родитель: 390/390 tests, HTTP stub Pass, paid 0. Документация browser/server/API/detector не запускала; физический touch / screen-reader не проверены. Существующие poster/image URL, безопасные внешние ссылки и текстовый fallback, новых растров/демоимпорта нет.
