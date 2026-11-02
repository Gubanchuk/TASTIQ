---
version: 1
slug: "src-server-public-pick-index-html"
primary_target: "src/server/public/pick/index.html"
related_targets: ["src/server/public/pick/app.js", "src/server/public/shared/conversation.css", "src/server/public/pick/conversation.css", "src/server/public/pick/style.css", "src/server/public/pick/workspace-legacy.css", "src/server/public/shared/result-view-state.js"]
---

Mode: Operate. /pick/ сохраняет прежний маршрут и его данные. После адаптивного media-этапа02.11 новые start=film|series|cartoon ведут в /pick/watch/; legacy=1 явно оставляет прежний путь. Ниже документируется legacy-оформление выбранного Conversation, новый media brief — src-server-public-pick-watch-index-html.md.

## Direction contract and provenance

THESIS: контекст помогает принять решение, библиотека возвращает к планам.
OWN-WORLD: графитовая навигация, тёплое поле, медные действия, Unbounded/Golos, реальные обложки.
STORY: действующие вопросы/подтверждённые причины → четыре последовательных предложения → save/choose/familiarity/facts/внешняя ссылка.
FIRST VIEWPORT: rail/context/work; phone — видимая сводка и явные «Подробнее / Свернуть» с chevron. Прогресс некликабельный, Next рядом с ответом.
FORM: code-led выбранный /design-v2/?concept=conversation; seed 537787fa, deal 6/4/5, 6 leads; receipt research-vault/site-design-reset-2026-11-02/structure-seed.txt. Raster comp не создавался; QUALITY BAR board/hero локально нет, внешний ceiling не проверен. Новый roll/traveltheme не требуется.
FINISH: production FINISH_REVIEW.md и scoped re-review дали ship covers scored fixes; CODE_REVIEW.md — 3/3 resolved.

## Shipped composition

- Desktop grid 164px rail+270px context+work max960px, padding 27px clamp(24px,3vw,52px) 64px. Rail/context sticky; context со своим viewport overflow. 761–1150px:148/220px, поля работы 25px.
- ≤760px всё в потоке: nav, context summary, toolbar/progress, work. Disclosure имеет текст действия/chevron. Поля работы 24px 20px 45px; ≤360px по 16px.
- Unbounded headline clamp(27px,2.6vw,35px)/1.28, 500; phone 28px/1.3, ≤360px25px. Golos body 14px/1.8. Светлые answer rows min 62px/radius5px; inline actionbar/primary≥140px.
- Четыре предложения последовательно. Cover 91px desktop/70px tablet/64px phone/53px≤360; title 24/21px. Reasons/caveats видны, facts раскрываются локально. «Не сейчас» и безопасная настоящая внешняя ссылка сохранены отдельно от остальных controls.
- /pick/#my перенаправляет в /library/ до bootstrap. Старые status/answer/history не меняют смысл: lane — отдельный план.

## Input, processing and recovery

Кино сохраняет центральный разбор пожелания, live status вне busy content, прежний DOM/scroll/focus после завершения/ошибки. Scoped layer min 410px desktop/400px phone; spinner.7s linear, reduced-motion stop. Обычный transport feedback вторичен. Общий focus 3px / offset 4px; старое более специфичное input правило может давать inset ring.

Search «Почему не показал…» имеет padding-left36px после лупы — восстановлено после material finding; общий shorthand не должен перекрывать его. Unsent result-wish, caret/disclosures сохраняются при redraw; отправленная ai.wish отдельна.

## Evidence boundary

Лично открыты актуальные final-reviewfix-film-result-{desktop,mobile}.png и final-reviewfix-film-context-open-mobile.png. Они заменяют pre-fix final-film-result как финальное evidence: mobile disclosure явно, placeholder начинается правее лупы. JPEG bytes под .png — camera encoding без правки растра; реальные размеры/encoding/SHA256 в CAPTURE_MANIFEST.json.

Родитель: 390/390 tests, HTTP stub Pass, paid 0, реальный film AI-off journey/save/choose/library. Для series/cartoon новых отдельных полных браузерных journeys нет; общие renderer/actions проверены offline. Humanfit/новая платная генерация/физический touch / screen-reader не измерены. Документация browser/server/API/detector не запускала. Existing image chain и fallback, локальные Golos/Unbounded+OFL сохранены.
