# Task2 — библиотека и общий select

Код готов к интеграционной проверке root. Браузер и платные модели этим worker не использовались. Нет коммита, push, deploy или изменений схемы хранения. Файлы соседних задач не откатывались.

## Что изменено

- Библиотека показывает один выбранный список во всех размерах. Рядом доступны три списка и точные counts по текущим фильтрам; пустые соседние колонки убраны.
- Поиск, раздел, отношение, порядок и сброс видны сразу, включая mobile. Новый запрос/фильтр/список возвращает размер порции к24. Reset возвращает также исходный порядок.
- Первые24 записи, затем «Показать ещё» порциями24. Подпись отображаемого/общего числа относится к активному списку; общий count включает сохранённые планы и самостоятельное знакомство, как фактически делает records().
- Планы, оценка и знакомство объяснены отдельно. Существующие move/rate/remove/forget/blocked/undo/history/evenings и несохранённые feedback drafts сохранены. Вечера используют modern:true; legacy default не менялся.
- Обложки библиотеки показывают полное изображение, имеют честный fallback. Ссылки проходят прежний safeLibraryUrl.
- shared/custom-select.js/css: динамическое улучшение одиночных select только в product-page, DOM popover в body вне clipping; native select сохраняет value/name/form/required/data-act, fallback остаётся без JS.
- Menu: click, ArrowUp/Down, Home/End, русский typeahead, Enter/Space, Escape, Tab, внешний pointer/focus. Disabled controls/options/optgroup пропускаются; native invalid переводит фокус на proxy. MutationObserver отражает disabled/required/options и не наблюдает свои visual attributes.
- Выбор отправляет bubbling input, затем change; после синхронного redraw фокус возвращается по стабильному data-focus/data-fk/id. Proxy не получает data-act=move.

## Интеграция

Root подключает custom-select.css после shared/product.css/workspace.css и results.css последним на game/watch/library. Library уже импортирует initCustomSelects/focusCustomSelect и вызывает их при render. Для root game/watch: синхронно вызвать initCustomSelects(document) после innerHTML до поиска восстанавливаемого фокуса; focusCustomSelect(target,{preventScroll:true}) вместо target.focus.

Оригинальный id остаётся у select, proxy имеет id + `--trigger`. data-focus/data-fk переносятся на proxy; у source хранятся как data-select-focus/data-select-fk, поэтому нет двух одинаковых focus keys. Значения и формы читаются по настоящему select. Root получил напоминание удалить прежний второй primary CTA у H1 в library/index.html, который находится вне ownership worker.

## Проверка

RED: node --test test/workspace-library.test.js →2fail/1pass: до фикса126 вместо24 DOMкарточек; после фильтра32 вместо24. Новые custom-select tests сначала падают ERR_MODULE_NOT_FOUND — модуль отсутствовал; затем исполняют реальную логику navigation/commit.

GREEN: focused library/custom-select/evening/media suite26/26; затем добавлен RED/GREENслучай disabledfieldset. Финальный полный npm test525/525, exit0; focused library/custom-select/store22/22. Тесты закрепляют: chunking и отсутствие записи при просмотре, filter/reset, отдельность вкуса/знакомства/плана и undo, keyboard disabled traversal/typeahead, input-before-change с синхронной заменой DOM и возвратом фокуса, отсутствие фиктивных изменений при disabled/samevalue и nativefieldsetdisabled. Старые VMtests получили реальные новые exports; два ожидания старого UI заменены принятым контрактом одного списка и видимых mobileфильтров. Data/queue/draft assertions сохранены.

Автоматические тесты не подтверждают screenreader/touch/геометрию браузера. Для root остаются nativeCUA: меню у края viewport, клавиатура/фокус после rerender,320/390/1024/1280/1440 и короткая высота,120+контент, invalid/disabled и imageerror. API0calls/$0.

## QA seed

Готов helper `test/helpers/workspace-library-seed.mjs`, export workspaceLibrarySeed(catalogs,{run,count:128}). catalogs — `{game:[realcards],film:[realcards],series:[realcards],cartoon:[realcards]}`; берутся настоящие id/title/ru/name/year/poster/image/link. Возвращает `{run,entries,counts}`, ничего не записывает. Только namespaced entries `tastiq.qa.<run>:`:128планов при достаточных каталогах,96want/16tonight/16known,15отметок знакомства и4архивных записи. Идентификаторы и метаданные остаются реальными; taste labels и даты — синтетическая QAфикстура. Подключать только на отдельной QAстранице/route, открываемой с `?qa_run=<run>`, и не копировать entries в обычные пользовательские ключи.

Схемы исходных ключей после QAпрефикса:

- `tastiq.site.library`: `{version:1,items:[{id,domain,title,year,poster,image,kind,link,status:'want'|'known'|'liked'|'disliked',lane:'want'|'tonight'|'known',addedAt,updatedAt}],history:[{domain,topId,title,at,alternatives:[]}]}`.
- `tastiq.game-history.v1:<id>`: `{version:1,id,title,exposure:'played'|'started'|'finished'|'paused',blocked:boolean,updatedAt:ISO}`.
- `tastiq.media-history.<domain>.v1:<id>`: `{version:1,id,title,domain,exposure:'seen'|'started'|'finished'|'dropped'|'paused',blocked:boolean,updatedAt:ISO,poster,image,year,kind,link}`.

## Действия для ACTION_MATRIX

Виды: Списки/Архив/Вечера; списки: На потом/На этот вечер/Уже знакомо. Поиск; раздел4+Все; отношение4; порядок3; Сбросить; Показать ещё. Карточка: перемещение в3списка; убрать/забыть; details; Зашло/Не зашло/Убрать оценку; blocked checkbox; Забыть знакомство; исходная ссылка. Undo Вернуть. Empty/noresults: Найти вариант/Сбросить. Archive: Открыть вечера/На потом. Evening: details run; все modern feedback действия, раскрытие причин, reason select, note, submit, draft сохранность при другом действии. Skiplink. Customselect: открыть/выбрать; ArrowUp/Down/Home/End/typeahead/Enter/Space/Escape/Tab/outside; disabled/native invalid/после redraw.

## Адресная поправка после native QA root

Root обнаружил в настоящем AXsnapshot дубли: native combobox и labelled proxy. Прежних aria-hidden=true/tabindex-1 было недостаточно в наблюдаемом браузере. Усилено только после enhancement: тот же source получает hidden с display:none!important; name/value/form/required/disabled и native validation остаются на прежнем узле. Предотвращённый invalid фокусирует видимый proxy. Добавлен disposeCustomSelects(root): снимает listeners и wrapper, восстанавливает исходные hidden/aria-hidden/tabindex/datafocus/datafk и включает явный nativefallback через data-native-select=true. Отсоединённые controls также очищаются, не удерживая прежние forms/listeners.

Два новых focusedtests сначала RED (hidden=false и отсутствующий dispose), затем GREEN: enhancement/invalid сохраняет реальную formсвязь и фокусирует proxy; disposal возвращает исходную семантику и identity. Финальные24/24 focused и полный npm test527/527,exit0. Подтверждение исправления повторным browserAXsnapshot выполняет root.

## Восстановление несохранённого отзыва после reload

Native QA root обнаружил потерю текста после reload: feedbackDrafts был Map только в памяти. Новый `shared/feedback-drafts.js` экспортирует `createFeedbackDrafts({storage,key='tastiq.feedback-drafts.v1'})` и `FEEDBACK_DRAFTS_KEY`. На game/watch root заменяет Map этим helper, библиотека уже интегрирована. Передавать существующий storage после qaStorage; общего rawlocalStorage helper сам не открывает.

Maplike контракт: get/set/delete/has/size/keys/values/entries/iterator; set возвращает тот же api, delete — boolean, get/iterator возвращают копии. CarryFeedbackView работает без изменений. Каждый доступ читает свежий envelope, поэтому отдельные страницы/экземпляры сохраняют чужие run:id и не воскрешают удаление при следующей записи. Пустой reason/note сохраняется как явный черновик, чтобы пустые слова не заменялись старым отправленным текстом. reason допускает только существующий REASONS, прочее становится ''; note ограничен300символами с сохранением точных пробелов и переносов. Повреждённые записи игнорируются, SyntaxError даёт пустой безопасный snapshot; ошибка storage переключает текущий экземпляр в память, сохраняя его последние правки/удаления. Чтение не пишет в storage; helper не вызывает сеть/модели и не меняет журнал отправленного отзыва.

Формат общего ключа: `{version:1,entries:[['<run>:<card>',{reason:'mood'|'taste'|'time'|'company'|'availability'|'seen'|'other'|'',note:'...'}]]}`. С QAхранилищем ключ автоматически `tastiq.qa.<run>:tastiq.feedback-drafts.v1`. В библиотеке показываются также вечера/карточки только с черновиком, даже до первой отправленной оценки: виден «Продолжить отзыв» и count. Просмотр такого вечера ничего не отправляет.

RED: эквивалент прежнего in-memoryMap не восстанавливал note после повторного создания и провалил6новых сценариев; отдельный реальный librarycontroller скрывал draftonlyвечер. GREEN:34/34focused (helper/library/view/carry) и полный npm test536/536,exit0 в совместном checkout. Сценарии: reload, точные слова, run/card независимость, disjointinstances/deletion, normalize/corrupt/storagefailure, blankdraft/carry, QAизоляция, draftonlyLibrary. Root выполняет повторный native reload/openLibrary.

## Finish F1 — первый экран библиотеки

Основание: свежий FINISH_REVIEW.md целиком прочитан. Review обнаружил, что на1280×720 одна карточка/содержательное empty-state начинаются ниже viewport; на320/390 изначально видны преимущественно controls. Это отдельное подтверждённое замечание к плотности, а не отмена прошлой проверки поведения. Craftfloor прочитан непосредственно перед UIправкой.

Изменения ограничены library/app.js/style.css и targetedtests; library/index.html и sharedфайлы не менялись. Удалено повторное .library-intro: назначение уже объясняет существующий subtitle у H1. Уменьшены верхний padding и вертикальные интервалы между heading, views, search/count/lane/контентом. Три mobileсписка стоят в одной gridстроке, с прежними названиями, counts и минимум44px hitarea. Текст, данные, разделение plan/taste/familiarity и десктопный бренд сохранены.

На<=760px вторичные раздел/отношение/порядок раскрываются явной кнопкой «Фильтры и порядок». Поиск, сброс, counts и списки доступны при закрытом состоянии. Кнопка имеет aria-expanded, aria-controls=library-filter-options и стабильный data-focus; изменения/select/search/view rerender сохраняют состояние. Badge учитывает также нестандартную сортировку. Desktopoptions всегда отображаются независимо от mobileflag: это обычный div с mobileCSS по data-filter-open, без закрытого native details и без общего hidden, который мог бы скрыть controls на desktop. Сброс очищает фильтры/поиск/порядок/размер порции и переводит фокус в поиск; текущий выбранный список сохраняется.

RED: новый сценарий realcontroller не находил раскрытие (expanded undefined вместо false). GREEN:32/32 targeted library/store/customselect/persistentdrafts; node--check library/app.js и targeted gitdiffcheck Pass. Сценарий подтверждает togglefocus, сохранность значений и выдачи при open/close/re-render/viewchange, reset и возврат в поиск. Прежние tests очереди/черновиков/доменных отметок остаются зелёными. Fullsuite не запускался по указанию root до интеграции F2; browser/Responses0/$0.

Rootpending: реальные captures0/1/130 на1280×720,320×740,390×844 и остальных согласованных размерах; проверить первое содержание, открытое/закрытое раскрытие, reset, customselectfocus и отсутствие overflow. По CSSбез нового nativecapture достижение viewportкритерия не заявляется.
