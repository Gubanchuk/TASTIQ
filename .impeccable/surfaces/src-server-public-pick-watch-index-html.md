---
version: 1
slug: "src-server-public-pick-watch-index-html"
primary_target: "src/server/public/pick/watch/index.html"
related_targets: ["src/server/public/pick/watch/app.js", "src/server/public/pick/watch/card-view.js", "src/server/public/pick/watch/view-state.js", "src/server/public/shared/conversation.css", "src/server/public/pick/game/conversation.css", "src/server/public/shared/conversation-client.js", "src/server/public/shared/media-history.js"]
---

Mode: Operate. Адаптивный просмотр film/series/cartoon, прямое поручение владельца перенести игровой разговор и самостоятельно проверить все4 раздела. Это продолжение выбранного Conversation; новых визуальных токенов/растров нет.

## Direction contract and provenance

THESIS: свои слова превращаются в проверяемое понимание сегодняшнего просмотра.
OWN-WORLD: действующие графитовый rail, тёплая бумага, медь, Unbounded/Golos и настоящие обложки.
STORY: желание → полезное уточнение → проверка понимания → до4 предложений → сохранение/вечер/явное знакомство отдельно от вкуса.
FIRST VIEWPORT: контекст и работа разделены на desktop; краткая сводка и disclosure на phone, вопрос/варианты/свой ответ/Next в одной колонке. Этапы обозначают прогресс, не число вопросов и не tabs.
FORM: наследует выбранный code-led Conversation /design-v2/ и production game brief. Seed537787fa, receipt research-vault/site-design-reset-2026-11-02/structure-seed.txt. Новый deal/style workshop не запускался. Raster comp и локальные QUALITY BAR изображения отсутствуют, внешний ceiling не подтверждён.
FINISH: проверка поведения и фактических ответов — research-vault/adaptive-media-2026-11-02/; disposition читать в FINISH_REVIEW.md. Визуальные размеры наследуются production game CSS, старое кино-оформление остаётся только для legacy.

## Behavioral composition

Один model question с собственным ответом и нейтральными controls; можно раньше перейти к пониманию, исправить текст/снять факт/время/отменить снятие/вернуться. Draft, disclosures, focus и принятый контекст сохраняются. Контекстные поля зависят от раздела: фильмы без сериальных вопросов; эпизод/общая история/статус различаются; cartoons не означают детей. Явный movie формат скрывает сериальные controls, age появляется только при children.

Review перед подбором, в выдаче настоящая причина и оговорка, хронометраж/сезоны/эпизоды если известны, «Условия просмотра», «Уже смотрел», «Сохранить», «Выбираю на сегодня», внешняя страница. Неизвестное не обещается проверенным. Допустимые2 предложения не дополняются неподходящими ради сетки.

Planning/pick/replace занимают существующий центральный status с сохранённым ответом. Локальный ответ на only_ended показывает локальное сохранение, без model spinner/платного запроса. Provider5xx имеет понятное сообщение/Retry; остальные actionable ошибки бюджета/доступа сохраняются.

## Data and evidence

Media state/history изолированы domain; game defaults прежние. Библиотека получает все4 раздела, знакомство != вкус/план/прохождение. Legacy данные не импортируются молча. Каталоги и спорные продуктовые policy не менялись. Unit486, HTTPstub, 4 real-model chains/12calls/$0.1772022 и native browser replay; детали/границы в QA_JOURNEYS.md и artifact-manifest.json. Независимый source Pass, UX ship covers4scored fixes; нативные partialviewport не удостоверяют full-document/pixel fidelity или физический touch/screen reader/human fit.
