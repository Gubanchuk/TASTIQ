# Документация построенного workspace — 01.11.2026

Закрыта persistence-часть `FINISH_REVIEW.md`. Это обновление закреплённого нейтрального бренда в `/pick/game/` и `/pick/`; главный экран и его токены заморожены. UI-исходники не менялись.

Обновлены `DESIGN.md`, `.impeccable/design.json` и `.impeccable/surfaces/src-server-public-pick-game-index-html.md`; создан `.impeccable/surfaces/src-server-public-pick-index-html.md`. Настоящий файл — отчёт этой ограниченной пачки. Остальные файлы вне её владения.

## Что закреплено

| Правило | Adaptive game | Legacy |
|---|---|---|
| Панель вопроса | До 780px внутри outer 844px на ранних шагах; остальной outer до 1280px, контекст рядом | До 820px для обычных вопросов; outer до 1424px, контекст 300px |
| Продолжение | После ответов, справа; min-height 48px, min-width 160px, padding 12px 18px | Тот же action node после ответов и при redraw; min-height 46px, min-width 144px, padding 10px 18px |
| Компактный экран | При <=1100px сводка внизу и свёрнута; <=760px действие sticky внутри панели, gutters 14px | При <=1100px подробности в disclosure; <=760px действие остаётся inline, gutters 16px |
| Навигация | Back, четыре настоящих этапа, actions menu, My | Верхняя навигация Подбор/My, toolbar в normal flow, steps/profile drawer при всех ширинах |
| Работа модели | Отдельные planning/pick/replace titles в центральном статусе, сохранённый ответ, три animated bars | Центральный подбор; отдельный status-layer разбора своего пожелания, скрывающий длинный content |
| Busy и фокус | Статус — sibling busy main, получает фокус; auxiliary inert, скрытый heading не фокусируется | Intent status вне busy content; DOM/scroll/focus возвращаются. Обычный transport сохраняет вторичные busy-bar/trigger spinner |

Цветовые примитивы сохранены: Base `#151517`, Panel `#1c1c1f`, Group `#1f1f23`, Action Blue `#0071e3`, Accent `#0a84ff`, Text `#f2f2f4`; светлые значения не переопределялись. Семантика синего уточнена по коду: действие, выбор, фокус, этап и ожидание. Blue Wash используется и в выбранных ответах workspace.

Типографическая шкала сохранена; добавлена scoped роль game workspace question: 2rem/1.2, weight650, tracking -0.025em, на телефоне 1.5rem/1.25. Новая роль не превращает вопрос интерфейса в декоративный display. Панели 20/18px desktop и 16/14px mobile, 32px desktop padding, новые component variants и processing/drawer motion записаны отдельно от landing primitives.

Sidecar остаётся schemaVersion2: примитивы в YAML, extensions/snippets/narrative в JSON. В нём сохранены прежние 26 colorMeta entries и добавлены три scoped samples: Game Workspace and Next, Legacy Workspace Next, Game Central Processing. Новые snippets автономны, используют `ds-` classes, live-bound CSS variables с fallback; кнопки имеют hover/active/focus, а signal — reduced-motion.

## Источники и проверка

Прочитаны operating reference `C:/Users/Dusik/.codex/skills/impeccable/reference/document.md`, `PRODUCT.md`, прежние DESIGN/sidecar/game brief, `REVIEW_INPUT.md`, `docs/WORKSPACE_REDESIGN_2026-11-01.md`, `FINISH_REVIEW.md`; оба workspace CSS полностью, обе HTML, shared picker tokens, game base styles и адресные render/pending/action/focus участки обоих app.js. Поведение за пределами этих участков не приписывается независимому полному аудиту.

SHA256 семи UI-исходников и трёх файлов landing совпали с `verification.json` родителя после записи документации: game index/app/workspace/pending-view, legacy index/app/workspace, landing index/style/app. Это подтверждает, что документация относится к проверенной версии UI и не изменила её.

Открыты все шесть сохранённых captures. Pillow подтвердил, что файлы с расширением `.png` фактически JPEG; это описание существующих evidence, а не конвертация и не новые shipping assets.

| Evidence | Фактический raster | CSS viewport / ограничение |
|---|---|---|
| `game-next-final.png` | 1440×900 | Desktop1440, Next после ответов |
| `game-thinking-desktop.png` | 1920×945 | Desktop1920, центральное ожидание |
| `owner-result-final.png` | 1910×884 | CSS1920×889; CUA уменьшил capture, сохранённый реальный результат |
| `game-question-mobile.png` | 380×822 | CSS390×844; CUA уменьшил capture, длинный вопрос/черновик/Next |
| `film-thinking-mobile-final.png` | 390×844 | CSS390×844; окончательный компактный intent status |
| `in-app-final.png` | 651×871 | Встроенный браузер651×871, начальный вопрос и Next |

Визуальное соответствие подтверждено предоставленными снимками и source; браузер, API и detector повторно не запускались. 368/368 tests и HTTP stub Pass приняты как свежие доказательства родителя из пакета, не выданы за повтор этой документационной задачи. Расход этого прохода: **0 API-обращений / $0**.

В DESIGN ровно восемь канонических разделов в требуемом порядке; JSON разбирается; narrative извлечён из DESIGN без перефразирования. Точные значения панели, действия, breakpoint и processing сверены с workspace CSS, логика статуса — с `pending-view.js`, render и `setIntentThinking()`.

## Provenance и границы

В обоих surface brief сохранён direction contract. Seed46112ab4, option7 и сделка7/6/3 известны только по tool transcript, подтверждённому родителем; отдельного raw roll нет. Approved comp и quality-bar images не сохранены. Ни воспроизводимый draw, ни comp-fidelity не заявлены. Новых shipping rasters нет; каталоговые обложки и прежние fallback/source цепочки не переписывались.

Независимый finish reviewer признал все шесть изображений валидными и визуальную часть match; его исходный verdict `fix` касался только незакреплённой документации. Настоящий отчёт закрывает названную persistence-пачку, но не переписывает независимый review за автора.

Не канонизированы и не исправлены посторонние расхождения прежнего PRODUCT/глобальных primitives, включая старую unscoped drawer-shadow запись; актуальный picker drawer записан отдельно со своей областью применения. Detector-замечания к shimmer и скрытому sidebar не превращены в новые правила. На шести предоставленных состояниях finish reviewer не видел запрещённых kickers/glyph icons/hard offset shadows; отдельного craft-аудита остальных состояний нет.

Light scheme, физический touch, screen reader и human fit рекомендаций не проверялись. Размеры1024×768 и446×430 есть только в измерениях родителя, без приложенных captures; независимой визуальной проверки этих размеров здесь нет. Историческая PRODUCT-модель диалога не исправлялась как побочный эффект UI-документирования. Коммитов, публикации, вызова модели и изменения каталога нет.
