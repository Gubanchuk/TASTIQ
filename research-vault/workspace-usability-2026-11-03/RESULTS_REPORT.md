# Карточки и отзыв — Task3

Реализованы исходники для U10–U13; проверка реального изображения и геометрии в браузере остаётся общей Task4. Новых платных вызовов нет.

## Что изменено

- `shared/results.css` отменяет принудительные `aspect-ratio`, абсолютное размещение `picture`, crop, `align-self:stretch` и footer `margin-top:auto`. Изображение сохраняет исходные пропорции и показывается целиком; высоту ограничивает `max-height`, `object-fit:contain` сохраняет всю картинку. Название работает как прежняя заглушка загрузки/ошибки. В первом предложении изображение крупнее, на телефоне — отдельной строкой перед текстом. Альтернативы имеют собственную высоту.
- В `eveningControls(...,{modern:true})` четыре оценки доступны сразу. Только причина и текст находятся в локальном раскрытии. Форму можно открыть, закрыть и продолжить; сохранённая оценка видна через `aria-pressed`. Выбор на сегодня, начало и итог вечера остаются отдельными действиями. Старый default helper не меняет разметку legacy.
- Game/watch показывают источник причины: мнение модели или данные каталога. Оговорки и непроверенные условия остаются видимы до выбора. Сохранение названо «Сохранить», знакомство — «Знакомо — заменить». Сохранённое состояние и все pending/keep/undo/exclusion hooks оставлены.

## Интеграция root / библиотеки

1. Подключить `/shared/results.css` последним после product/rework/custom-select CSS на game/watch/library. Это необходимо из-за старых правил `body.product-page #stage`, включая media/mobile.
2. Game/watch `refreshFeedback` и library `eveningsView` передают `modern:true`. Default остаётся legacy.
3. Сохранены `data-act`, `data-run`, `data-id`, `data-v`, `data-fk`, `[data-feedback-details]`, `[data-form=evening-reason]`, `reason`, `note`, `.game-poster`, `data-title`, `.is-loaded`, `.game-poster-fallback`. Summary уточнения получает `data-fk=evening-note:run:id`; root умеет восстановить такой фокус.
4. Select остаётся настоящим полем формы; custom-select enhancement необязателен для работы. Reason draft требует bubbling `input` при выборе, затем `change` по preflight.

## Действия для ACTION_MATRIX

|Элемент|Контракт и ожидаемый исход|
|--|--|
|«Выбираю на сегодня» / «Отменить»|`evening-choose`, `on/off`; существующий tonight-save и отмена выбора|
|Четыре видимые оценки|`evening-fit`, `accept/conditional/reject/unknown`; меняется только оценка указанного `run:id`|
|«Добавить/Изменить уточнение», «Продолжить отзыв»|Локальный `details[data-feedback-details]`, открывает только свою форму; устойчивый `data-fk`|
|Причина / «Своими словами»|Те же поля `reason`/`note`, локальный draft и экранирование текста|
|«Сохранить отзыв»|Тот же `data-form=evening-reason`; в payload входит только явно отправленный отзыв|
|«Уже начал» / «Уже начал ✓»|`evening-start`, `on/off`; выбранный вариант, без изменения fit|
|«Как прошло?» + четыре исхода|Локальное раскрытие результата; `evening-outcome`, прежние значения|
|«Сохранить» / «Сохранено»|`library-save`, прежний `data-focus`, состояние `aria-pressed` и подпись списка|
|«Знакомо — заменить»|`familiar-mark`; прежний промежуточный выбор замены|
|«Отменить» / «Оставить — хочу вернуться/пересмотреть»|`familiar-unmark` / `familiar-keep`, прежние focus tokens|
|«Не предлагать в следующих подборах»|Прежний `[data-history-block]`, явный checkbox без скрытого исключения|
|«Открыть игру/страницу»|Проверенный http/https URL, внешний переход с `noopener noreferrer`|

## Проверка

RED: новые renderer-проверки упали по отсутствующим видимым оценкам, summary уточнения, source-label и явному названию замены. После реализации — **59/59 focused**: evening-view, game-card-view, media-view, game-library-action, feedback-view-state, evening-feedback, media-feedback, media-client, conversation-client. Это проверка разметки/контрактов и существующего хранения, не браузерной геометрии.

`node --check` всех трёх изменённых JS и `git diff --check` прошли. Full `npm test` в параллельном checkout: **524 tests / 517 pass / 7 fail**; лог `results-full-tests.log`. Все семь находятся в `library-store.test.js:126,138,155,171,197,212,225`: VM controller не содержит нового `initCustomSelects`, ReferenceError в render. Сообщено root для интеграции библиотечного worker; чужие исходники/fixtures Task3 не менял. После их исправления full suite повторяет root.

Осталось root: source load/error/fallback, landscape и portrait, 1440/1280/1024/390/320, открытие одного alternative feedback с замером неизменных соседних actions/heights; draft/focus после fit/save/reload/replace/undo; modern история библиотеки и native select fallback. Исходный `feedback-baseline.json` фиксирует 680.28125 → 1211.0625 у всех альтернатив при одном `open=true`; этот результат не выдаётся за проверку исправленного CSS.

Controllers, библиотеки, ядро/AI/данные/guards/legacy markup не редактировались. Без браузера, commit/push/deploy. Responses **0/$0**.

## Поправка плотности после native inspection root

Root передал замер при1280px: Portal2 1115px = изображение320 + текст263 + footer368 + интервалы; plan-actions96px занимают два ряда. Независимые высоты1115/1152/1115 подтвердили устранение общего растяжения, но сравнение альтернатив оставалось неудобно высоким.

По ruling root только desktop-изображения альтернатив ограничены220px с прежним contain и исходными пропорциями; featured остаётся420px, мобильные ограничения320/280px сохранены. Подписи действий сокращены до «Сохранить» и «Знакомо — заменить». Видимые четыре оценки, поля, payload и reversibility не менялись. Exact-copy assertions обновлены сначала: два RED, затем **59/59 focused GREEN**, diffcheck Pass. Полный свежий `npm test` после поправки: **529/529**, лог `results-density-tests.log`; прежние VM failures остаются историческим snapshot. Новый native замер выполняет root; уменьшение итоговой высоты и один ряд действий пока не заявлены как проверенные.
