# Полный Impeccable review: выбранный «Разговор» на настоящем сайте

Оригинальный запрос: оживить сайт, исправить непонятные действия, заменить «Моё» полноценной библиотекой с обложками/фильтрами/типами, этапы показать прогрессом, обновить только нижний лендинг. Первые3макета отвергнуты за сходство и замену верха. Новые /design-v2/ структурно различались. Владелец теперь прямо выбрал: «Разговор давай этот сделаем». Нужен FULL production UI review against выбранного Conversation, не narrow check предыдущих макетов и не пересмотр выбранного мира.

## Inputs

Project E:/project/TASTIQ, artifact src/server/public (root landing, pick/game, pick, library).
Spec/direction contract: docs/superpowers/specs/2026-11-02-conversation-production-design.md
FORM provenance (уточнено по фактическому receipt): code-led перенос выбранного прототипа. Structural seed `537787fa`, deal6/4/5, 6 leads; `research-vault/site-design-reset-2026-11-02/structure-seed.txt`, прежний surface brief `.impeccable/surfaces/src-server-public-design-v2-index-html.md`. Lead card `vernacular-ephemera-boarding-pass-and-gate-board`; primary QUALITY BAR board https://impeccable.style/worlds/cards/vernacular-ephemera-boarding-pass-and-gate-board.webp и hero https://impeccable.style/worlds/cards/vernacular-ephemera-boarding-pass-and-gate-board-hero.webp . Локальных card images нет, их просмотр в прошлом цикле не удостоверяется. Выбран сам Conversation; новый roll и буквальная travel-стилизация не требуются.
Plan: docs/superpowers/plans/2026-11-02-conversation-production.md
PRODUCT.md и прежний root DESIGN.md доступны. Новый выбранный DESIGN ещё пишет documenter после finish. Не ремонтировать tooling/config drift.
Code-led approved reference: src/server/public/design-v2/ conversation renderer и final-conversation-{question,result,library,landing-lower}-{desktop,mobile}.png в research-vault/site-design-reset-2026-11-02/. Это выбранный кликабельный comp-reference; отдельного raster-generated approved comp и state/diff pipeline нет. Selected quality bar: Operate, видимые actions/контекст/один вопрос, читаемая реальная выдача, настоящая библиотека/состояния; lettering/material/motion служат этой модели, не добавлять новый визуальный мир вместо выбранного.
Craft-floor: C:/Users/Dusik/.codex/skills/impeccable/reference/craft-floor.md
Detector: detector.json / DETECTOR.md — единственный статический scan5новых CSS, только design-system-* findings против прежнего neutral DESIGN (14font/52size/156color/20radius); иные0. Это прямо выбранная смена мира; tokens документировать по реализации.
Functional review: CODE_REVIEW.md:3Important (not-now/link, queued feedback local tx, unsent wish/caret/disclosure) исправлены, scoped re-review все3resolved18/18. Full npm390/390, HTTPstubPass0paid. Изображения legacy proposal теперьвнешняяlink/notnow есть. Модель/ранжирование/каталоги/сервер не менялись.

## Scope/fidelity

1. Selected conversation topology: graphite rail + warm paper, context слева/current work справа, 4 sequential proposals; mobile компактная summary/edit и явный details вместо внутреннегоscroll.
2. Library board real legacy items+familiarity; plans lane независим от status/taste; filters/search/sort/move/deleteundo/history/evenings. Mobilesearch always visible, остальныеcontrols в «Фильтры и порядок».
3. Original first exact normalized fragment и root style hash unchanged — FROZEN_PROOF.json. Header только «Моё»→«Библиотека»/href из ранее запрошенного нейминга; на≤360эта ссылкаcompactpaddingиbadgehidden, чтобы полноеимя не создавалоскролл. Никакого redraw hero/doors/soon. Не утверждать whole-header byte-identical. Baseline-header.html/baseline-first.html и прошлые original-landing screenshots показывают incumbent.
4. Новый нижний landing соответствует выбранной модели и честноразличает adaptivegame и прежние movie questions. Верх безiframe.
5. Nonclick progress, inlineNext, meaningfulerror/retry/pending, focus/drafts preserved. All domains shared style, adaptive кино не добавлялся.

## Capture validity / limitations

Основные desktop1440×900, mobile390×844. Каждый required file — отдельный original, top/full document, без ручной дорисовки. Проверь каждый лично; manifest stores realdimensions/hash.
Единственное исключение: full-document screenshot API на early game question при390 давал сжатые columns или blankbottom, хотя native screenshot и DOMrects показывают rail/stage380 приinnerWidth390. Этот файл переименован invalid-camera-game-question-mobile-390 и НЕ передаётся. Полный question phone — final-game-question-mobile-319.png (чёткий валидный полный кадр, именно ширина ранней пользовательскойпанели). game-question-mobile-native.png — дополнительный частичный viewport390, мягкий; не выдавать его за whole-page fidelity. У game result/ошибки/pending phone390 full captures корректны. Файлы invalid-* и initial-* не evidence.
matched-library-319, matched-landing-319: CSS319 соответствует ранее наблюдавшейся панели; root headeroverflow устранён только compactlibrarylink. production-library-native: actual IAB1280×720 послеreset, прочитан основной5177; здесь данных0 в этом browserprofile, demo не импортировались. Пользовательский game-tab/state не перезагружался. В QA-origin5180 есть созданные реальным click-through records (truck/starbound/dave+film), они не данные владельца и не human labels.
Раньше snapshot active tab мог влиять на viewport: перед required recaptures sizes проверены DOM; не брать invalid-hidden-default-user-*. Снимки из разных последовательных действий могут иметь разные selected/familiar/plan состояния — это UI-сценарии, не ложная выдача одного замороженного результата.

Pending/error files: реальный production controller через QA-only loopback latency-fixture.mjs (5181→AIoff5180). Company answer задержан5сек, один503 безstate, затем Retry успешно проходит. Pending скрывает/inert main, сообщение сохранения; после503 Один осталсяaria-pressedtrue, Retry сохранил тотжеподбор. Это проверка lifecycle, не настоящий платный AIответ. На game result «предварительный подбор»/unknown caveats — правильный AIofffallback, не новый обещанный fit.

Интеракции: game answer/platform/company→fallbackquestion→review→4result; save→want, choose→tonight, familiar→keep. Replace atAIoff дал видимуюошибку, cards/marks/selected сохранились; успешная платнаязамена здесь не запускалась. Game save сохраняетfeedbacknote. Library search/mediafilter/move/removeundo restoredlane, realIndexedDBevenings read; film Matrix love/effects→3questions→4result→save/choose; #my compatibility source guard beforebootstrap. Браузерные journal толькоQA; paidAPIэтойработы0.

Write boundary only research-vault/conversation-production-2026-11-02/FINISH_REVIEW.md. Не менятьsource, не запускатьbrowser/server/API/detector. Нужны disposition +5sections persistence/fidelity/ceiling/material_fixes/keep. Послеготовности читать исходный user scope и утверждённый вариант, не ужесточать до чужого style и не понижатьпорог до одной палитры.

## Required screenshots

- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-error-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-error-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-film-question-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-film-question-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-film-result-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-film-result-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-game-question-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-game-question-mobile-319.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-game-result-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-game-result-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-landing-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-landing-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-library-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-library-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-pending-desktop.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\final-pending-mobile.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\game-question-mobile-native.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\matched-library-319.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\matched-landing-319.png
- E:\project\TASTIQ\research-vault\conversation-production-2026-11-02\production-library-native.png
