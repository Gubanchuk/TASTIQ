# Документирование кобальтового бренда — 03.11.2026

## Основание и граница

Владелец выбрал знак 5B, прописное написание 02 и палитру 02 «Кобальт», затем разрешил перенос на весь настоящий сайт. Это обновление существующей системы с сохранением подтверждённых продуктовых правил. Старый warm/copper/frozen scope относится к истории 02.11; он больше не ограничивает текущие поверхности. Исторические receipts и исходный brand kit не изменялись.

Документер владел только DESIGN.md, .impeccable/design.json, PRODUCT.md, пятью production surface briefs и этим отчётом. UI, server, API, каталоги, пользовательские stores, оплаченные журналы и Git-коммиты не изменялись документером. Обновление не является его собственным finish approval.

## Записанные файлы

- DESIGN.md — текущий normative frontmatter и восемь canonical sections; исторический статус прежней палитры/логотипа/границы сохранён как история.
- .impeccable/design.json — schemaVersion2, расширения без дублирующих primitive arrays; девять standalone HTML/CSS snippets.
- PRODUCT.md — выбранные brand assets и шесть цветов, единый сайт, уточнение/черновики/возврат к предыдущим вариантам. Продуктовые ограничения сохранены.
- .impeccable/surfaces/src-server-public-index-html.md
- .impeccable/surfaces/src-server-public-library-index-html.md
- .impeccable/surfaces/src-server-public-pick-game-index-html.md
- .impeccable/surfaces/src-server-public-pick-watch-index-html.md
- .impeccable/surfaces/src-server-public-pick-index-html.md
- research-vault/brand-ui-2026-11-03/DOCUMENTATION.md

Prototype briefs /design/ и /design-v2/ не изменялись: они описывают исторические варианты, а не выбранный production brand.

## Источники

Operating spec прочитан целиком: C:/Users/Dusik/.codex/skills/impeccable/reference/document.md. Действующее направление — DIRECTION.md рядом с этим отчётом; продуктовый контекст — PRODUCT.md и docs/CODEX_CONTEXT.md.

Проверены src/server/public/shared/{brand,selection,conversation}.css, корневой style.css и landing-bottom.css, pick/game/conversation.css, library/style.css; выборочно legacy pick/conversation.css. Сопоставлены пять production HTML entry points, game/watch app.js, shared/clarification-view.js и approved SVG. Документер не запускал новый браузер, сервер, detector, приложение или тестовый API.

## Сопоставление токенов

|Проверка|Результат и способ|
|---|---|
|Цвета|20 frontmatter colors:18 точно соответствуют --brand-* с учётом aliases hover/press,2 сохранённых semantic colors библиотеки найдены в текущем CSS; регистр hex не меняет значение. Расхождений 0.|
|Типографика|9 roles извлечены из действующих источников; source fonts — локальные Golos/Unbounded. Onest не повышен до production voice.|
|Component tokens|11 записей, только 8 разрешённых properties. Все ссылки {group.token} разрешаются.|
|Sidecar|schemaVersion2,20 colorMeta с 8 шагами ramp,9 typeMeta,9 компонентов. Ramp — производные swatch previews по spec, не дополнительные CSS-палитры.|
|Snippets|Scoped ds-классы, literal CSS+live --brand-*; без Tailwind/runtime, script, внешних image/icon packages. У interactive snippets есть focus-visible.|
|Narrative|North Star, overview, characteristics, named rules, Do/Don't дословно сопоставлены с DESIGN.md.|
|Формат|8canonical sections в нужном порядке; git diff --check целевых файлов без ошибок. Предупреждение Git о LF→CRLF касается настройки line endings.|

Уточнение каскада в процессе: selection.css получил body prefix и теперь действительно задаёт context 290/230/310px. Это внесено родителем в UI и отражено в документации; прежние 300/245/320 не записаны как текущая норма. Mobile request preview/полный context и 4 текстовых этапа также описывают последний слой. Родитель выровнял landing muted/hover с общими tokens, увеличил узкие door counts и последнюю узкую ссылку selection-header до 12px.

Не повышены до общих правил: локальные dimensions миниатюр; узкая служебная ссылка selection-header; унаследованные мягкие menu/notice shadows как универсальный новый материал. Они не легитимизируют дефекты или запрет других нативных средств этого мира. Нет запрета белого featured card или мягкой тени, которые текущий мир реально использует.

## Доказательства и пределы

Родитель сообщил и зафиксировал в docs/BRAND_UI_2026-11-03.md:509/509 unit, HTTP stub Pass, production build Pass. Unit source — tests.txt рядом с этим отчётом. Документер проверял только документацию и источник и не выдаёт повтор этих проверок за собственный запуск.

Native IAB родителя: desktop 1280, mobile 390/320; уточнение одним нажатием, независимые drafts, cancel/error/retry/reload, переход к новому пониманию и выдаче, восстановление прежних вариантов без модели, save→library. Канонические captures — .impeccable/review/brand-ui-2026-11-03/final-main.png, game-question-320.png, result-mobile-top.png, result-mobile.png, library-mobile.png, clarification-error-mobile.png и clarification-error-recovery-mobile.png. Некорректные full-page captures не используются как pixel evidence.

Material review ранее потребовал компактный mobile context, устранение просвечивания poster fallback и актуализацию системы. Первые два исправлены родителем и адресно сняты заново; этот patch записывает текущую систему. На момент завершения документации родитель повторяет передачу 320px capture reviewer после сбоя отображения. Окончательный verdict принадлежит отдельному re-review, не этому отчёту.

Расход текущего этапа 0 платных API-вызовов/$0, генераций изображений 0. Новая работа реальной модели с человеком, human fit, физический touch и screen reader неизвестны. Публикации не было. Синтетические QA записи не являются человеческими оценками.

## Пять строк системы

Палитра: выбранные шесть цветов «Кобальт», производные рабочие состояния из brand.css.
Типографика: Unbounded hero/display/headline, Golos content/actions, 9 наблюдаемых roles.
State Has Words: состояние выражается словами и формой вместе с цветом.
Logo Is an Asset: неизменные утверждённые SVG-контуры и пропорциональное масштабирование.
Answer and Action: ответ и продолжение остаются в одной рабочей колонке.

Не канонизировано и не исправлялось документером: локальные унаследованные стили и непроверенные пользовательские сценарии; они требуют собственного основания и не превращены в будущие общие правила.

Последующее подтверждение родителя: корректный320кадр `game-question-320-verified.png` передан отдельному reviewer. Его verdictpass закрыл все3materialfix (`resolved`, `remaining:clear`, `disposition:ship` в пределах трёх исправлений); см. REVIEW.md. ScreenshotJPEG перекодированы в настоящийPNG без изменения декодированных пикселей. QA5180 остановлен, временный viewport сброшен, основной5177 открыт отдельной вкладкой6.
