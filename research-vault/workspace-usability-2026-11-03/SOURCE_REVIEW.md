# Независимый source review — 03.11.2026

Проверены все изменённые и новые production-файлы в `pick/game`, `pick/watch`, `library`, `shared` относительно `12d9254d80822ffc9357e496c32eb631c34ad1b0`. Основания: текущие AGENTS, spec/plan workspace-usability, PREFLIGHT, RESULTS_REPORT, LIBRARY_REPORT и ACTION_MATRIX. Исторические замечания не перенесены автоматически. Проверка только исходников и бесплатной локальной логики: браузер и платные модели не использовались.

## Вердикты

| Задача | Вердикт | Подтверждение и граница |
|---|---|---|
| Task1: оболочка, этапы, запрос | Pass по исходникам после исправления | Действия shell, transport, draft keys, перенос/возврат форм, pending и correction checkpoint сохранены. Единственный подтверждённый P2 исправлен root и перепроверен reviewer. Геометрия, экранная клавиатура и доступность требуют native QA root. |
| Task2: библиотека и custom select | Pass по исходникам | Один выбранный список, порции24, поиск/фильтры/порядок/reset/counts, separate taste/familiarity/plan, archive/evenings и undo сохраняют прежние storage API. Select хранит настоящий узел формы, отправляет input до change, учитывает disabled/fieldset/options, invalid фокусирует proxy; fallback/disposal восстанавливает native. Высокоуверенных существенных ошибок не найдено. |
| Task3: результаты и отзыв | Pass по исходникам | Изображения contain с естественными пропорциями, необходимые overrides старого CSS, независимые align-self/height/footer. Оценка видна, optional explanation локален, payload/action hooks сохранены. modern:true включён в game/watch/library, default legacy не изменён. Высокоуверенных существенных ошибок не найдено. |

## Исправленное замечание — P2, уверенность95

**После успешной общей поправки повторный редактор показывает уже отправленный текст.**

Места: `src/server/public/pick/game/app.js:268`, `src/server/public/pick/watch/app.js:284`; повторное открытие — game `:347`, watch `:363`; `shared/workspace-ui.js:2–16` меняет расположение и hidden, но не value полей.

Воспроизведение: открыть «Изменить», ввести общую поправку, успешно применить; затем снова нажать «Изменить» без reload. В новом редакторе остаётся предыдущая отправленная поправка. Её можно снова отправить без нового ввода.

Причина: `client.send()` вызывает `onChange:render` из finally до возврата в navigate. Новый DOM создаётся из ещё не очищенного draft. После await код очищает draft и закрывает форму, но удалён прежний сброс `#correction-text.value=''`. Следующее открытие перемещает ту же форму, не сверяя textarea с очищенным draft.

Исправление: после подтверждённого успеха очищать также DOM textarea либо синхронизировать поле из `client.draft('__correction')` при каждом открытии. Сохранить ввод при ошибке и отмене. Добавить проверку success → reopen, отдельно от reload.

**Resolved:** root вернул `const input=$('#correction-text');if(input)input.value=''` внутрь уже существующего условия успешной общей поправки в обоих controllers. В ветки error/cancel этот сброс не добавлен. Reviewer заново прочитал обе изменённые строки и исполнил тот же regression test: game/watch **2/2 GREEN**.

Локальная воспроизводимая проверка исполнила настоящий `createConversationClient` и извлечённую production-функцию `navigate` с DOM boundary вместо браузера, без HTTP:

```json
{"savedDraftAfterSuccess":"","domTextOnReopen":"Хочу спокойнее и без PvP","hidden":false}
```

## Проверка

Свежая команда reviewer:

```text
node --test test/correction-success.test.js test/request-overview.test.js test/workspace-custom-select.test.js test/workspace-feedback-drafts.test.js test/workspace-library.test.js test/evening-view.test.js test/game-card-view.test.js test/media-view.test.js test/library-store.test.js
```

Окончательный свежий результат reviewer после production fix: **52 tests, 52 pass, 0 fail**, exit0. Это проверки новых pure helpers, поведения custom select и storage/controller contracts, не браузерной геометрии. Полный suite reviewer повторно не запускал; числа полного прогона root относятся к его отдельным логам.

### Последняя адресная перепроверка после native inspection root

Дополнительно просмотрены `requestPreviewHtml` в `shared/request-overview.js:12`, его импорты/вызовы в game/watch и счётчик `library/app.js:94`. Новый preview оставляет текущую сводку/собственные слова через прежний `requestSummaryText`, а не выводит текст uncertainty вместо желания. Неясность даёт отдельную кнопку `preview-clarify` «Уточнить один момент»; существующий handler продолжает открывать первую соответствующую центральную форму. Busy передаётся из client и отключает кнопку. Экранирование summary сохранено. Счётчик теперь показывает «В списках и отметках знакомства: N» либо «Найдено N из M» с прежними источниками `records()/filtered()`; фильтрация, counts списков и порции не менялись.

Свежий адресный прогон `node --test test/request-overview.test.js test/workspace-library.test.js test/correction-success.test.js` — **11/11**, exit0; в нём request-overview **6/6**, библиотека **3/3** и исправленная поправка **2/2**. Дополнительные прямые вызовы production helper подтвердили escape, busy-disabled, empty и отсутствие кнопки без uncertainty. Syntax checks request-overview/game/watch/library и `git diff --check` — exit0. Новых существенных findings нет; итоговый Pass Task1/2/3 сохраняется. Это проверка финального delta после предыдущего прогона52/52, а не повтор полного suite или самостоятельная браузерная проверка.

### Адресная перепроверка material finish F1/F2

Просмотрен текущий `FINISH_REVIEW.md` и только связанные финальные изменения, без нового полного review или браузера.

- **F1, library/app.js/style.css — Pass по исходникам.** Удалено повторное вступление, сокращены интервалы, три мобильных списка помещены в одну grid-строку. `filtersOpen` меняет лишь представление вторичных controls; query/domain/reaction/sort/lane сохраняются при открытии, закрытии и смене вида. Поиск, Reset и counts остаются вне скрываемой области. `aria-expanded` и `aria-controls=library-filter-options` согласованы с mobile `data-filter-open`/`display:none`; на desktop панель показывается независимо от мобильного флага. Badge включает изменённый порядок. Toggle имеет стабильный `data-focus`, render находит новый button перед enhancement и передаёт его в `focusCustomSelect`; Reset явно фокусирует поиск. Существующее сохранение selection поискового поля и commit-focus custom-select не менялись. Тест realcontroller закрепляет значения, выдачу, toggle, view switch и reset. Его DOM boundary не доказывает реальную selection/AX/reflow: эти свойства остаются в native evidence root.
- **F2, shared/results.css:97–123 — Pass по исходникам.** Только mobile result state получает одну строку back/четыре подписанных этапа; у back сохранён текст «Назад», визуально скрытый font-size0, и44px control. Card layout остаётся одноколоночным grid: heading/metadata явно row1, весь poster — row2; остальные причины, оговорки и feasibility идут следующими строками. `display:contents` применён к generic copy div без собственной семантики; heading/reason DOM не удаляются, poster уже aria-hidden. Новые selectors перекрывают прежние grid positions с нужной специфичностью и более поздним порядком загрузки. Height/aspect-ratio остаются auto, img contain и max-height сохранены. Desktop, pending markup, payload/actions и legacy не меняются. Реальную читаемость первого viewport и поведение конкретного screenreader исходники не подтверждают.

Свежая команда reviewer: `node --test test/workspace-library.test.js test/library-store.test.js test/workspace-custom-select.test.js test/workspace-feedback-drafts.test.js test/game-card-view.test.js test/media-view.test.js test/evening-view.test.js` — **46/46**, exit0. Среди них текущие4 librarytests, включая новое раскрытие, и прежние storage/queue/draft/select/card contracts. `node --check library/app.js`, `git diff --check` и пустой diff frozen4/legacy — подтверждены. Production/tests reviewer в этом продолжении не менял. **F1/F2 source Pass; новых существенных findings нет, общий Pass Task1/2/3 сохраняется.** Закрытие визуальных критериев FINISH_REVIEW, свежие captures и синхронизация design docs остаются отдельной работой root/finish reviewer/documenter.

По дополнительному поручению root создан только `test/correction-success.test.js`: настоящие client/navigate/open/close и click-ветка повторного открытия с заменой DOM boundary. Подтверждённый исторический **RED: 2 tests, 0 pass, 2 fail**, оба по сохранённому старому тексту вместо пустого поля; затем после production fix root тот же тест дал **GREEN: 2/2** у reviewer и вошёл в общий адресный прогон52/52.

`git diff --check` — exit0. HEAD совпал с базой. Завершающий diff всех четырёх landing-файлов (`index.html`, `style.css`, `landing-bottom.css`, `app.js`), legacy pick app/index/style и `shared/product.css` пуст. Syntax check новых helper modules, трёх app controllers и нового regression test — exit0. В shared/evening-view прежняя ветка default сохранена, новая вызывается только opt-in.

Paid API: **0 вызовов / $0**. Production reviewer не менял; по ownership поручению root записаны этот отчёт и новый regression test. **Окончательный source verdict: Pass для Task1, Task2 и Task3; открытых существенных findings с уверенностью≥80 нет.** Допускается продолжение native интеграционной и визуальной проверки. Это не оценка human fit, screenreader/touch или одобрение интерфейса владельцем.
