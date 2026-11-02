# Документация выпущенного «Разговора» — 02.11.2026

Обновлены DESIGN.md, .impeccable/design.json и production surface briefs для главной, /pick/game/, /pick/ и /library/. Основание — прямой выбор владельца «Разговор давай этот сделаем», spec docs/superpowers/specs/2026-11-02-conversation-production-design.md и фактически выпущенный код. Прежняя нейтральная система заменена в разрешённой области; её исходный верх главной сохранён отдельной границей.

## Извлечение

Прочитан полный reference/document.md. Нормативные примитивы находятся в YAML frontmatter DESIGN.md; восемь канонических разделов идут в заданном порядке. Sidecar schemaVersion2 содержит только расширения, HTML/CSS-примеры и дословно перенесённый narrative, без отдельного tokens-массива. В component frontmatter только восемь разрешённых типов свойств; размеры controls описаны как минимумы в тексте/snippets, не как фиксированная высота.

Источники: src/server/public/shared/conversation.css, pick/game/conversation.css, pick/conversation.css, library/style.css, landing-bottom.css; выборочно прочитаны унаследованные style/workspace CSS, index.html, card-view, library/app и poster rendering. Учтены реальные различия game/legacy/library: hover, поля, focus, sizes и breakpoints не объявлены одинаковыми. Onest загружен декларацией, но в выбранных production-поверхностях не используется — не включён в типографику.

Система: графитовая навигация, тёплый фон, медные действия; Unbounded для заголовков и Golos для интерфейса. Малые углы, отдельная сводка, последовательные предложения и библиотечные списки. Named rules: Scoped World, State Has Words, Answer and Action. Старые One Blue / Posters Are the Colour / большие workspace panels / hero плюс alternatives не перенесены как нормы нового мира. Зелёная линия знакомого и синий focus не запрещены: они действительно используются.

Tonal ramps sidecar — восемь вычисленных OKLCH preview-ступеней для каждого извлечённого цвета (lightness15/27/39/51/63/75/87/95%, исходные hue/chroma). Это материал панели документации, не новые production-токены и не требование заменить реальные hover/selected значения. CSS-snippets самодостаточны, классы ds-, authored inline SVG, states/focus и reduced motion там, где он нужен. Snippet без обложки демонстрирует реальный текстовый fallback, а не создаёт новую иллюстрацию.

## Лично просмотренное evidence

Открыты 13 отдельных финальных originals в этом каталоге:

- final-game-question-desktop.png и final-game-question-mobile-319.png;
- final-game-result-desktop.png и final-game-result-mobile.png;
- final-library-desktop.png и final-library-mobile.png;
- final-landing-desktop.png и final-landing-mobile.png;
- final-pending-mobile.png и final-error-mobile.png;
- final-reviewfix-film-result-desktop.png, final-reviewfix-film-result-mobile.png и final-reviewfix-film-context-open-mobile.png.

Видимая структура подтверждает стили: desktop context слева/work справа, phone summary перед работой, четыре последовательных результата, три library lane на desktop/одна на phone, тёплый разговор и графитовая библиотека ниже исходных дверей. Последние три film captures показывают явные «Подробнее / Свернуть» и отделённый от лупы текст поиска. Старые final-film-result-* отражают состояние до material fixes и не используются как финальная норма.

CAPTURE_MANIFEST.json хранит размеры, encoding и SHA256. Во время документирования замечены неверно считанные PNG-размеры трёх reviewfix-файлов; родитель исправил их через настоящий JPEG decode, без изменения растров. Актуальные размеры: desktop1440×2737, mobile390×3497, context-open390×3728. Расширение .png не означает PNG encoding.

Полный игровой вопрос телефона подтверждён original319px. Неверный full-camera390 исключён, native390 — только дополнительный частичный viewport. invalid-* и initial-* не открывались и не считаются evidence. Документация не запускала browser, server, API, detector или rebuild.

## Provenance и границы

FORM: code-led перенос выбранного работающего /design-v2/?concept=conversation. Structural seed537787fa, deal6/4/5, 6leads; receipt ../site-design-reset-2026-11-02/structure-seed.txt. Lead vernacular-ephemera-boarding-pass-and-gate-board — происхождение структурного раунда. Он не превращает выбранный Conversation в аэропортовое табло. Отдельного raster-generated comp не было; сравнение с прототипом не объявлено пиксельной fidelity-спецификацией. Локальных QUALITY BAR board/hero нет, внешний ceiling относительно них не подтверждён.

FROZEN_PROOF.json и CODE_REVIEW.md подтверждают неизменность section.first и rootstyle. Header имеет разрешённые «Библиотека»/href и компактную ссылку со скрытым необязательным count при≤360px; whole-header byte identity не заявляется. System display исходного hero сохранён этой границей и не стал display-нормой Conversation. Prototype archives/config/PRODUCT и посторонний tooling drift не менялись.

Сохранены данные и действия настоящего движка; lane не равно вкусу, знакомство не равно запрету. Кино/сериалы/мультфильмы получили оформление прежнего маршрута, адаптивное ядро для них не добавлялось. QA-записи на скриншотах не выдаются за данные владельца или human labels.

## Assets

Новых растров, stock imagery, AI-generated assets и raster comps нет. Обложки используют существующие catalog poster/image URL: Steam, TVmaze и Wikipedia, с прежними правилами источников; библиотека переносит ссылки сохранённой записи и показывает текст при отсутствии/ошибке. Game renderer выбирает safe poster/image и при ошибке оставляет title. Legacy/root renderer сохраняет существующую последовательность источников/типографический fallback. Этот этап не меняет права на публичный показ и не объявляет их заново проверенными.

Шрифты локальные: src/server/public/assets/fonts/GolosText-Variable.ttf и Unbounded-Variable.ttf. Рядом GolosText-OFL.txt и Unbounded-OFL.txt (SIL OFL1.1, project authors и upstream GitHub указаны в файлах). Используются font-display:swap. Иконки — исходные authored inline SVG, не новая внешняя iconfont.

## Проверка и неканонизированный остаток

Parent evidence: unit-tests.log390/390, http-smoke.logPass с model stub/paid0. CODE_REVIEW.md:3material fixes resolved, адресный набор18/18. FINISH_REVIEW.md: полный визуальный review28originals нашёл2material fixes, адресный повтор3originals подтвердил оба; disposition:ship covers scored fixes. Этот документ не подменяет собственным запуском эти результаты и не расширяет их охват.

DETECTOR.md — единственный scan пяти новых CSS:14font/52size/156color/20radius advisory против старого neutral DESIGN, остальные0. Выбранный мир описан по build, повторный detector не запускался и отсутствие новых findings не утверждается. Stage paid API0/$0; общий ledger и cleanup — в docs/CONVERSATION_UI_2026-11-02.md и budget-snapshot.json.

Не канонизированы и не ремонтировались: неиспользуемый Onest, посторонний tooling drift и старые нейтральные правила вне frozen scope. Material visual defects из finish review закрыты; отсутствие QUALITY BAR, физического touch/screen-reader audit, новой успешной платной замены и human fit остаётся границей evidence, а не основанием выдумывать системные значения или объявлять качество выбора доказанным.
