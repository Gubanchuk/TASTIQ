# Новый полный finish review

Владелец отверг ВСЕ прошлые макеты: почти одинаковые и меняют верх лендинга, хотя разрешён только низ. Используй RESET_REVIEW.md как исходный диагноз. Это новый full review после rebuild, не verdict по SVG и не снижение планки до разных цветов.

Объём: кликабельное сравнение трёх самостоятельных UI моделей. Владелец ещё не выбрал. Code-led prototypes, approved comp и выбранного визуального мира нет. Не выдавать это за production-готовность или измеренный human fit. QUALITY BAR для выбора — на основании topology/чтения/действий различать три результата и три библиотеки после мысленного удаления цвета, в том числе на mobile; исходный верх сохраняется; реальные изображения; явно обозначенный пример; один вопрос и inline Next, не кликабельные этапы. Эти критерии не понижают craft-floor.

Artifact: E:/project/TASTIQ/src/server/public/design-v2/
URL: http://localhost:5177/design-v2/
Direction contract: E:/project/TASTIQ/docs/superpowers/specs/2026-11-02-site-design-reset.md
PRODUCT: E:/project/TASTIQ/PRODUCT.md
Baseline originals: src/server/public/index.html, style.css, app.js. SOURCE_VERIFICATION.json подтверждает совпадение SHA256 с baseline и точные header/first фрагменты.
Skill craft floor: C:/Users/Dusik/.codex/skills/impeccable/reference/craft-floor.md
Detector: DETECTOR.md — единственный run; механические shadow findings исправлены, три намеренные palette/type/radius differences не перезаписывают production DESIGN.
Seed: structure-seed.txt, 537787fa, deal6/4/5. Пользователь подтвердил смешанные светлые/тёмные поверхности; выбора кандидата нет.

Обязательная fidelity-матрица: frozen верх; разные модели выдачи; разные модели библиотеки; сохранение различий mobile; разный новый низ; изоляция данных/API; прогресс не кнопки. Не считать сам факт трёх render функций доказательством различимости: судить по снятому результату.

Снимки: 1440x900 desktop, 390x844 mobile. Результат/библиотека/вопрос — full document explicit clip, видимый верх в каждом. Новый низ — full document route lower=1, именно обновляемая часть. Frozen верх — native viewport capture из full landing; он мягче из-за IAB viewport upscale, не годится для типографического pixel diff. Его соответствие проверять с исходным DOM, hash proof и original-landing-{desktop,mobile}.png. Исходный верх отделён iframe с исходными CSS/app. Элементы исходного верха ещё содержат оригинальное «Моё» из-за закреплённой границы. Остальные новые интерфейсы используют «Библиотека».

Capture incident: advanced screenshot API меняет inline height встроенных iframe на965px, даже при clip viewport. Это отсутствует в native getScreenshot: landing-native-stability.json даёт before==after900desktop/891mobile для всех трёх. Поэтому invalid-capture-*.png, initial-landing и landing-metrics.json НЕ являются evidence и НЕ переданы как required. Новый пакет landing-top + landing-lower покрывает обе области без изменения рамки. Если нужны дополнительные конкретные crops/sections, дай recapture list; не оценивай ошибочные снимки.

User width319: user-inapp.png — native actual viewport, без overflow. На этой ширине служебное меню сравнения плотное; проверь, мешает ли оно выбору. comparison-desktop.png/comparison-mobile.png дают страницу «рядом» с живыми миниатюрами.

INTERACTIONS.json: выполнены реальные клики/ввод/выбор в IAB. Catalogue detail, search, move, delete+undo restoring status, sort+type filter; conversation move+lane; showcase media/status+expanded controls; each question→answer→result; progress buttons0; frozen game link перехвачен в prototype question. Dev errors0, broken images0, overflows0 в final-metrics. Приложение API endpoints не вызываются; данные в memory, опциональная запись только выбранного design-choice.v2.

Разрешено записать только FINISH_REVIEW.md в этот evidence folder. Исходники не менять. Нужны disposition и пять contract sections persistence/fidelity/ceiling/material_fixes/keep. Открой required screenshots сам, контакты confirmed-* — только дополнение; не заменяй ими личную проверку файлов. Никаких browser/server/API запусков и повторных detector.

## Required screenshots

- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-result-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-library-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-question-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-landing-top-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-landing-lower-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-result-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-library-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-question-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-landing-top-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-conversation-landing-lower-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-result-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-library-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-question-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-landing-top-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-landing-lower-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-result-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-library-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-question-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-landing-top-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-showcase-landing-lower-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-result-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-library-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-question-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-landing-top-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-landing-lower-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-result-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-library-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-question-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-landing-top-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\final-catalogue-landing-lower-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\original-landing-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\original-landing-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\comparison-desktop.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\comparison-mobile.png
- E:\project\TASTIQ\research-vault\site-design-reset-2026-11-02\user-inapp.png
