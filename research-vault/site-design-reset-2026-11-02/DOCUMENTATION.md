# Документация новых структур v5

Записаны [DESIGN.md](DESIGN.md), расширяющий [design.json](design.json) и `.impeccable/surfaces/src-server-public-design-v2-index-html.md`. Все три кандидата **невыбранные**. Владелец отверг все старые `/design/`; их verdict не означает принятия и не перенесён сюда. Основной сайт и его корневые DESIGN-файлы не менялись.

Источники: текущие `src/server/public/design-v2/{index.html,style.css,app.js,frozen-top.html,frozen-top.js}`, `PRODUCT.md`, новый spec, `REVIEW_INPUT.md`, `FIX_INPUT.md`, `FINISH_REVIEW.md`, `SOURCE_VERIFICATION.json`, `CAPTURE_MANIFEST.json`. Токены извлечены из реализации v5; префиксы обозначают отдельные кандидаты. Производные 8-шаговые tonal ramps sidecar нужны только панели просмотра и не добавляют цветов в реализацию.

## Пять строк системы

1. «Разговор»: Golos/Unbounded, тёплое поле, графитовая навигация, медный акцент; transcript, предложения и статусная доска.
2. «Витрина»: Onest/Unbounded, светлая поверхность и синий; раскрытые сравнительные ряды и горизонтальные медиаполки.
3. «Сравнение»: Golos, светлое поле, графитовая шапка и зелёный; list/detail и компактная библиотека.
4. Desktop display — 35/49/45px; названия результатов — 23/39/25px; причины — 14/14/13px, метаданные — 12px.
5. «Структура до цвета»: три единицы выбора; frozen верх, один вопрос/inline Next, прогресс без кнопок и согласованные состояния.

## Проверено и ограничено

Финальный `FINISH_REVIEW.md` прочитан после обновления: три scored fixes **resolved**, восемь recaptures повторно лично открыты reviewer, `disposition: ship`. Закрыты доступ к сводке/правке на mobile, согласованность статусов нижнего лендинга с библиотекой и удаление eyebrows предложений. Narrow verdict закрывает эти исправления после полного review; он не означает production approval, выбор владельца или измеренный human fit.

Документер лично открыл 11 финальных оригиналов: три result desktop, три library mobile, conversation question mobile, три landing-lower mobile и conversation landing-top mobile. Сверены текущий CSS, компоненты и последние overrides. Остальной пакет из 35 required images подтверждён полным review и capture manifest; его не следует выдавать за повторный личный визуальный аудит документера. Новый browser, API, server или detector не запускались.

`final-*-result/library/question/landing-lower-*` — чёткие full-document captures; lower-only показывает только обновляемую часть. Native `landing-top` — мягкий **частичный viewport**, допустимый для topology, не для типографического pixel diff и не как снимок всего frozen верха. Reviewer зафиксировал native размеры 1430×894 / 380×822, user-inapp 309×856 при CSS-ширине 319. Замена original mobile baseline — 390×844. `CAPTURE_MANIFEST.json` хранит фактические размеры и SHA256. `invalid-capture-*`, initial-landing и старые landing-metrics исключены: advanced screenshot менял iframe height; native stability проверен отдельно. Контактные листы — навигация по оригиналам.

SHA256 исходных главных `index.html`, `style.css`, `app.js` совпадают с baseline по source proof и reviewer. Header/first совпадают после CRLF/LF-нормализации; утверждение о raw byte equality фрагментов было бы неточным. Frozen iframe загружает исходные CSS/app: исходное «Моё» сохранено, его счётчик может читать настоящую локальную библиотеку. Новые списки находятся в отдельном Map; записи в реальные данные и AI-запросов нет. Явное обозначение выбора может записать только `tastiq.design-choice.v2`.

Новых растров нет. Обложки — прежние каталожные URL из `/design/content.json`; исходная цепочка происхождения и ограничения публичного отображения не заменены новым разрешением. Self-hosted Golos Text, Unbounded и Onest поставляются с OFL-файлами в `src/server/public/assets/fonts/`. SVG authored в коде.

Не канонизировано: удалённые eyebrows, прежний скрытый mobile-контекст, неверные статусы примеров и ошибочные captures. Они были дефектами/ограничениями проверки, а не правилами мира. Корневые tokens, tooling drift и продакшен-система не исправлялись; выбор владельца ещё впереди.
