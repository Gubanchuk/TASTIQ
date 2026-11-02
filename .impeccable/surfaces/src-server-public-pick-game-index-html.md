---
version: 1
slug: "src-server-public-pick-game-index-html"
primary_target: "src/server/public/pick/game/index.html"
related_targets: ["src/server/public/shared/conversation.css", "src/server/public/pick/game/conversation.css", "src/server/public/pick/game/app.js", "src/server/public/pick/game/card-view.js", "src/server/public/pick/game/pending-view.js", "src/server/public/pick/game/style.css", "src/server/public/pick/game/workspace.css"]
---

Mode: Operate. Настоящий адаптивный игровой подбор /pick/game/. Прямой выбор владельца «Разговор давай этот сделаем» 02.11.2026 разрешил замену прежней нейтральной workspace-композиции в этом scope. Каталоги, ранжирование, API guards и действующий controller/reducer сохранены.

## Direction contract and provenance

THESIS: контекст разговора помогает принять решение, библиотека возвращает к своим планам.
OWN-WORLD: графитовый rail, тёплая плоская бумага, медный акцент, Unbounded/Golos, настоящие обложки.
STORY: ответ → проверяемое понимание → четыре последовательных предложения → явное сохранение/выбор/знакомство.
FIRST VIEWPORT: контекст слева, вопрос справа; phone показывает краткую сводку и «Поправить» до работы, история/подробности раскрываются отдельно. Четыре этапа — прогресс, не tabs и не обещанное число вопросов. Next следует за ответами.
FORM: code-led выбранный /design-v2/?concept=conversation. Structural seed 537787fa, deal 6/4/5, 6 leads; receipt research-vault/site-design-reset-2026-11-02/structure-seed.txt. Lead vernacular-ephemera-boarding-pass-and-gate-board — provenance структуры, не travel theme. Raster-generated comp не создавался; локальных QUALITY BAR board/hero нет, внешний ceiling не подтверждён.
FINISH: production FINISH_REVIEW.md — полный review 28 originals и адресный повтор 3 captures после 2 material кино-fixes; disposition: ship covers scored fixes. DESIGN/sidecar фиксируют построенное.

## Shipped composition

- Общий rail 164px. Game context 300px, работа max950px, padding 30px 40px 64px. Контекст отдельный, с прямыми краями; прежних больших rounded workspace panels нет.
- 761–1150px: context 245px, поля работы 25px. От 1600px context 320px и поля 55px. ≤760px rail/сводка в потоке; работа padding 20px 20px 40px. Прежний collapse-at-1100 не действует.
- Unbounded headline 31px/1.3, 500, tracking-.035em; tablet 28px, phone 27px. Golos body 14px, причины до 65ch; phone 13px/1.8. Choices radius6px, min 64px/60px, selected — медная граница, тёплая заливка/check.
- Next после ответов/hairline: min 48px, width≥150px desktop/125px phone. Action row статический и на результате, без sticky footer. Back/session menu выше некликабельного прогресса.
- Четыре последовательных предложения, разделённых линией. Cover 90px desktop/70px tablet/65px phone, 2:3; title 23px/21px. Причины/оговорки видны, actions и внешняя ссылка следуют в текстовой колонке.
- Save ведёт в настоящую /library/. Plan, taste и familiarity независимы; знакомство не равно прохождению/запрету серии. Replace/keep/undo сохраняют нетронутые cards и черновики.

## Processing, error and focus

Именованные planning/picking/replacement status: min 430px desktop/330px phone, три медных bars 7×28px, 1.25s ease-in-out с delays .15/.3s. Status — focusable live sibling вне busy main; main/actions скрыты, context controls блокируются. Ошибка сохраняет ответ и Retry повторяет исходную операцию. Reduced motion останавливает animation. Game focus 3px / offset 4px; session menu использует game-pop shadow. Черновики, caret, disclosures и фокус сохраняются при redraw.

## Evidence boundary

Документация лично открыла final-game-question-desktop.png, final-game-question-mobile-319.png, final-game-result-{desktop,mobile}.png, final-pending-mobile.png, final-error-mobile.png из production evidence. Question whole-page phone подтверждён на 319px; native 390 — только supplementary partial, неверная full-camera 390 исключена. invalid-* и initial-* не evidence.

Родитель: 390/390 unit, HTTP stub Pass, paid 0, AI-off journeys и loopback 5s/503/retry с настоящим controller. Новая успешная платная замена/human fit, физический touch / screen-reader не подтверждены. Документация не запускала browser/server/API/detector. Локальные Golos/Unbounded+OFL; existing catalog poster/image URLs, текстовый fallback, без новых растров.
