# Проверка реализации адаптивного медиадиалога — 02.11.2026

Проверена полная новая реализация по `docs/superpowers/specs/2026-11-02-adaptive-media-design.md` и `docs/superpowers/plans/2026-11-02-adaptive-media.md`: media core/AI/service/identity, серверный маршрут, общий transport, scoped history, новый `/pick/watch/`, ранний вход legacy и интеграция библиотеки/вечеров. Проверка исходников и адресные offline reproductions; браузер, сервер, внешние сервисы и платный API не использовались. Исходники не изменялись. Это review нового feature целиком, а не сравнение с отсутствующим исходным commit.

Критических замечаний не найдено. Первичная проверка выявила четыре важные ошибки и дополнительный принятый владельцем задачи source gap — пятый пункт ниже. **Все пять исходных находок и последующее ограниченное live-derived дополнение (a)/(b)/(c) закрыты. Текущий source-вердикт: Pass в проверенном объёме.** Человеческая пригодность рекомендаций и визуальное качество этим review не измерялись. Описание исходных ошибок и промежуточные вердикты ниже сохранены как история; актуальный статус — в последнем разделе.

## Важные

### 1. P1 — указанный возраст ребёнка отключает все действия вечера

**Уверенность: 100/100.**

Место: `src/core/media-conversation.js:354`; несовместимый потребитель — `src/server/public/shared/evening-feedback.js:42` и `:122`, вызываемый из `src/server/public/pick/watch/app.js:240`.

Media context хранит `childAge` как integer, и projection передаёт его в `legacy.situation.childAge` числом. `observe()` копирует число в context, но `normalizeFeedback()` принимает `childAge` только строкой. Он возвращает `null`, поэтому `observe()` не создаёт run. `eveningControls(null, id)` возвращает пустую строку: на карточках исчезают выбор на сегодня, оценка пригодности, начало и отзыв о результате; запись не появляется в «Вечерах». «Сохранить» через library-store остаётся доступным, что маскирует потерю остальных действий.

Воспроизведение для каждого `film|series|cartoon`:

1. `newMediaConversation({domain})` → `set_context` с `{company:'children',childAge:7}`.
2. `mediaConversationToLegacy(state, screenFixture(domain).dict)`.
3. `createFeedbackStore().observe(state.id, projection, {top:{id:'t1',name:'Title'},alternatives:[]})`.
4. Фактически `run === null`, `eveningControls(run,'t1') === ''`. С `childAge:null` тот же путь создаёт run.

Исправление: согласовать тип возраста на границе projection/feedback, сохранив прежний контракт legacy/game и значения `0..17`. Нужен regression test через настоящий `observe()` для всех трёх разделов, включая возраст 0 и reload сохранённого run; проверка только `feedbackState.domain` этот сбой не ловит.

### 2. P2 — минуты и смысл медиаконтекста теряются в истории вечера

**Уверенность: 100/100.**

Место: `src/server/public/shared/evening-feedback.js:18`, `:41`, `:123`; источник нового контракта — `src/core/media-conversation.js:358` и `:359`.

Projection правильно передаёт `session.minutes` и `maxRuntime`. Однако `conversationMinutes()` явно разрешает только `domain==='game'`, поэтому все три media-domain получают `run.context.minutes === null`. `observe()` также не переносит `timeMode`, `format`, `commitment`, `onlyEnded`, а `normalizeFeedback()` удалит их при чтении даже после добавления только в `observe()`.

Воспроизведение: создать media state через `set_context` с `{company:'solo',minutes:45,timeMode:'runtime'}` для фильма/полнометражной анимации или `timeMode:'episode'` для сериала. До `observe()` `sessionOf(projection).maxRuntime === 45`; после него `run.domain` корректен, но `run.context.minutes === null`, `run.context.timeMode === undefined`. Подтверждено отдельно для всех трёх domain. Эти потери не являются ошибкой фильтра runtime: фильтр до выдачи получает 45 правильно.

Практический эффект: сохранённый вечер и отправленная аналитика не содержат реального ограничения. Ограничение всего фильма, одного эпизода и доступное время сегодня становятся неразличимы. Контекст входит в ключ дедупликации и проверку переноса отзывов (`:125`, `:130`), поэтому разные условия могут считаться одним контекстом при одинаковой сводке и карточках.

Исправление: расширить typed feedback context для проверенного media time и нужных media conditions, реализовать его чтение/нормализацию/публичную сериализацию; не включать исходные цитаты или private note в отправляемый payload. Проверить round trip и отсутствие переноса отзывов между разными временными условиями. Старые run без новых полей должны читаться с явными null defaults.

### 3. P2 — запрос полнометражной анимации допускает сериал и подтверждает лимит по длине эпизода

**Уверенность: 100/100.**

Место: `src/core/media-conversation.js:357`; окончательная проверка — `src/server/media-conversation-service.js:153`, путь замены — `:72` и `:85`.

`context.format` и `timeMode` остаются только внутри `legacy.conversation`; правила допуска получают один `maxRuntime`. В мультфильмах это существенно: текущий `data/catalog-screen.json` содержит **762 film и 1105 series** в cartoon-domain, подсчитано по `item.domain==='cartoon'` и `item.kind`. При явном `format:'movie',timeMode:'runtime'` сериал проверяется по runtime одного эпизода и проходит как подходящий полнометражный просмотр.

Адресное воспроизведение с двумя валидными cartoon-карточками: фильм 110 минут и сериал с эпизодом 20 минут, 100 сериями, 8 сезонами. State: `set_context({format:'movie',minutes:120,timeMode:'runtime'})` → `review` → `confirm`. Подменённый selector возвращает сериал. Service принимает его как `result.top`; `feasibility.minutes` имеет `status:'yes'` и текст «Серия идёт 20 мин; сегодня есть 120 мин.». Никакой ошибки/оговорки о несовпавшем формате нет.

Спецификация отделяет полный runtime фильма от эпизода; выбранный пользователем формат не может молча менять смысл ограничения. Исправление: передать явный формат в правила допуска и применять его в initial pick и replacement; известный конфликт kind отсеивать до модели и повторно при приёме её picks. Не вычислять суммарную длину сериала умножением эпизодов. Неизвестные поля оставить неизвестными. Добавить mixed-cartoon test в обе стороны (`movie`/`episodic`), плюс replacement и AI-off.

### 4. P2 — отсутствующее продолжение со словесным подзаголовком становится исходным фильмом

**Уверенность: 100/100.**

Место: `src/server/conversation-media-identity.js:32` и `:35`; окончательная привязка принимает такое совпадение в `:79`.

Защита от короткого parent проверяет число, roman numeral, `part/chapter/часть/глава` и двоеточие. Словесный суффикс продолжения без этих маркеров остаётся за пределами совпадения. `resolveText()` считает родительское название точной identity, а повторный разбор полного quote в `bindFacts()` воспроизводит ту же ошибку.

Проверка на текущем cartoon-каталоге, без изменения данных:

- `Смотрел Tangled Ever After` → `tt0398286`, **Tangled (2010)**; точного `Tangled Ever After` в текущем каталоге нет.
- `Смотрел Frozen Fever` → `tt2294629`, **Frozen (2013)**; точного `Frozen Fever` нет.
- `Смотрел How to Train Your Dragon Homecoming` → `tt0892769`, **How to Train Your Dragon (2010)**.

Отдельный end-to-end offline assertion: при каталоге с одним `Frozen` источник `Смотрел Frozen Fever` создаёт `knownTitles:[Frozen]`; fact с полным исходным quote, `titleId:Frozen`, `exposure:'finished'` проходит и `bindFacts()`, и core proposal validation. В projection скрывается исходный полнометражный фильм, хотя человек называл другую работу.

Это нарушает требование spec «sequel не связывается с коротким parent» и политику, по которой знакомство относится к конкретному произведению. Исправление: учитывать границы полного явно названного title span, консервативно оставлять identity неизвестной при нераспознанном продолжении/подзаголовке и запрашивать уточнение. Не включать отсутствующие short/discovery в каталог ради исправления resolver. Добавить regression tests с указанными существующими parent и отсутствующими verbal suffixes, а также обычным текстом после корректного полного названия, чтобы не сломать `Смотрел Frozen вчера`.

### 5. P2 — снятый свободный вывод возвращается из того же источника с другим key и quote

**Уверенность: 100/100.**

Место первоначальной ошибки: `src/core/media-conversation.js:149` в первой версии review, действие удаления — прежняя ветка `remove_fact`. В исправленной версии защита дополнена `untyped_source` и точным списком `allowedFacts`.

Исходный ответ: `Хочу детектив: именно расследование, без спешки`. Принят fact `{key:'genre',text:'Детектив',quote:'Хочу детектив',feature:null,titleId:null,stance:'want',scope:'today'}` из этого source. После `remove_fact('genre')` proposal с `{key:'investigation',text:'История с расследованием',quote:'именно расследование'}` из того же source проходил проверку. Совпадение проверялось только по старому key, равному quote или non-null feature, поэтому удалённое нетипизированное предположение возвращалось под новым названием и другим точным фрагментом старого ответа.

Это нарушает требование spec, что снятое предположение не восстанавливается. Требуется консервативная политика для free-form фактов без feature/title identity: сохранять независимо принятые факты, а новый смысл из закрытого старого source разрешать после нового явного ответа человека. Исполнитель реализовал такую политику через точные accepted survivors. Исходное воспроизведение после удаления и `normalizeMediaConversation()` теперь получает ошибку и сохраняет пустой facts; связанные tests отдельно проверяют independent survivors и новое явное уточнение.

## Повторная проверка первого пакета исправлений

Лично выполнена команда:

```text
node --test test/media-conversation.test.js test/media-conversation-ai.test.js test/media-conversation-service.test.js test/media-identity.test.js test/media-feedback.test.js test/evening-feedback.test.js
```

Результат: **79/79 pass**, fail/cancelled/skipped 0. Дополнительно повторены исходные воспроизведения inline Node с assert: 6 age/time случаев (3 domain × возраст 0/7), mixed-format initial pick, 2 исходных verbal-sequel case и fieldless retraction после normalization — **10 проверок исправленного поведения**. Платных вызовов 0.

| Пункт | Статус | Подтверждение |
|---|---|---|
| 1 — возраст/вечер | Pass | Все 3 domain, возраст 0 и 7: run создан, `evening-choose` есть, string age читается после reload, выбор сохранён. |
| 2 — время/контекст | Pass | `maxRuntime=45` сохранён, `minutes/timeMode/format/commitment/onlyEnded` проходят observe → normalize → public → reload; новые поля ограничены media-domain и валидируются. |
| 3 — формат | Pass | Модель получает отфильтрованный catalog, конфликтующий pick не принимается; связанные tests покрывают оба направления, AI-off, replacement и nested restore. |
| 4 — продолжение/parent | **Частично, Fix-and-resend** | TitleCase исходные случаи исправлены, но нижний регистр/тире всё ещё возвращают parent; см. ниже. |
| 5 — свободный снятый вывод | Pass | Alternate key+quote из старого source отклонён после reload/normalization; exact independent survivors и новый явный ответ сохранены. |

Остаток **того же пункта 4**, проверен лично на локальном каталоге с parent `Frozen` и `Tangled`:

```text
resolveText('Смотрел frozen fever')          → Frozen
resolveText('Смотрел tangled ever after')    → Tangled
resolveText('Смотрел «frozen fever»')        → Frozen
resolveText('Смотрел Tangled — Ever After')  → Tangled
```

`unknownContinuation()` проверяет лишь `\p{Lu}` сразу после пробела. Регистронезависимый tokenizer находит parent, но новая проверка игнорирует lowercase продолжение и тире; даже явная closing quote полного отсутствующего title не защищает identity. Следовательно, один и тот же названный sequel меняет допустимую identity при изменении регистра. Требуется адресно довести границу полного названия, включая явно quoted lowercase titles, словесный suffix и dash subtitle; при этом сохранить корректный `Смотрел Frozen вчера`. После этой поправки повторить identity cases и связанные tests. Остальные четыре замечания не требуют нового общего обхода.

## Повторная проверка второго адресного identity fix

Лично выполнено `node --test test/media-identity.test.js test/media-conversation-service.test.js`: **27/27 pass**, fail/cancelled/skipped 0. Четыре оставшихся lower/quoted/dash воспроизведения теперь возвращают пустые matches; привязать parent через укороченный quote также нельзя. Полные известные `tangled ever after`/`«tangled ever after»` распознаются как продолжение, а не parent. Обычные `Frozen понравился`, `Frozen смотрел, но не помню`, `Tangled — понравился` и quoted `Смотрел «frozen» вчера` сохраняют правильную identity.

Однако новый guard отбрасывает заранее заявленный normal boundary case и текущий replay:

```text
resolveText('Смотрел Frozen вчера')             → []
resolveText('Хочу пересмотреть Frozen сегодня') → []
resolveText('Смотрел Disney Frozen вчера')      → []
```

Известное полное название с обычным временным наречием становилось неразрешённым. Причина: `unknownContinuation()` разрешал только перечисленные predicate/conjunction, а `вчера/сегодня` трактовал как продолжение названия. На этом промежуточном шаге сохранялся **Fix-and-resend** для нормальных полных упоминаний; пункты 1/2/3/5 оставались Pass. Этот остаток исправлен и проверен в следующем разделе.

## Финальная адресная проверка пункта 4

После ограниченной поддержки полной временной части лично повторена команда `node --test test/media-identity.test.js test/media-conversation-service.test.js`: **28/28 pass**, fail/cancelled/skipped 0.

Отдельные inline assertions подтвердили:

- Три оставшихся обычных случая снова находят правильный полный parent: `Смотрел Frozen вчера`, `Хочу пересмотреть Frozen сегодня`, `Смотрел Disney Frozen вчера`.
- Четыре исходных неизвестных продолжения (`frozen fever`, `tangled ever after`, quoted lowercase и dash subtitle) остаются без identity; привязать parent через `bindFacts()` также нельзя.
- Шесть положительных контрольных случаев с полным известным продолжением, кавычками, обычным predicate и полным alias сохраняют правильную identity.
- `Смотрел Frozen вчера Fever` и `Смотрел Frozen на выходных Ever After` не проходят как parent: временные слова не открыли прежний обход защиты.

Всего **15 адресных текстовых случаев**, дополнительно проверена привязка фактов для четырёх отклонённых случаев. Исходники вне report не менялись. Общий suite не перезапускался, API/браузер/сервер не использовались, **0 платных вызовов / $0**.

Итог по тому же согласованному пакету: **1 Pass, 2 Pass, 3 Pass, 4 Pass, 5 Pass.** Незакрытых материальных source-находок в проверенном объёме нет. Это закрывает данный code review; общий end-to-end и UI verdict остаются отдельной проверкой основного исполнителя.

## Подтверждённые границы проверки

Сопоставлены endpoint/domain/state/storage guards, scoped familiarity, явный keep/replay, atomic proposal validation, partial replacement/error/undo и сохранение legacy `/pick/`/`#my`. Новых высокоуверенных регрессий игрового transport по исходникам не выявлено. Это не заменяет уже запущенный исполнителем общий suite и HTTP/browser проверку.

Адресные inline Node reproductions подтвердили child-age failure в 3 domain, потерю времени в 3 domain, mixed-format acceptance и parent binding. Все использовали локальные fixtures/подменённый selector; **платных вызовов 0, расход $0**. Общий suite намеренно повторно не запускался параллельно с исполнителем.

Source review закрыт с вердиктом **Pass в проверенном объёме**. Общий suite/HTTP и browser path children→results→choose→library/evening плюс mixed-cartoon replacement выполняет основной исполнитель; результаты этих проверок не приписываются этому отчёту.

## Ограниченное дополнение после живых проходов

Проверены только изменения core/AI, внесённые после предыдущего Pass по результатам сохранённых Responses receipts: (a) явный один взрослый; (b) короткая законченная история и локальное уточнение статуса сериала; (c) один полнометражный мультфильм и производная связь format с require fact. UI, общий retrieval и прочие исходники повторно не обходились.

Лично выполнено `node --test test/media-conversation.test.js test/media-conversation-ai.test.js`: **47/47 pass**, fail/cancelled/skipped 0. Три точных receipt повторно применены к state из соответствующих immutable live report, через `applyMediaConversationProposal()` с проверкой неизменности входа и последующей normalization:

| Срез | Receipt ID | Подтверждение |
|---|---|---|
| (a) film / round 1 | `resp_0299223206d53dc9016ae7dc2e491c87d28ca081ce84b11c82` | `solo`, childAge null, 100 минут и 6 исходных facts сохранены; review читается после normalization. |
| (b) series / round 2 | `resp_0527ef1b4e250236016ae7dcf8e33887d28cf1f3f36e95e6d9` | Короткая история, 45 минут на эпизод и 4 независимых goal facts сохранены; неподтверждённый ended filter снят, задан `only_ended`. |
| (c) cartoon / round 3 | `resp_09d7535b2763b685016ae7de401cec87d2a5b67ca333f084af` | Дети, возраст 7, `single`, `movie`, 100 минут и 5 facts сохранены. |

Дополнительные адресные проверки: реальный service обрабатывает фиксированные `only_ended yes/any` до review с **planCalls=0/spends=0**, сохраняет все 4 facts и episode time; Back снимает выбранный статус и сохраняет прежние facts/время. Для производного movie format удаление `format_movie` и `context:format` снимает обе связи, старый proposal не восстанавливает их после normalization, undo восстанавливает movie/facts/100 минут. Поэтому **(a) Pass, (c) Pass**. Receipt-форма (b) тоже исправлена, но проверка её непосредственной смысловой границы выявила следующий остаток.

### P2 — слово «сериал» в полном quote превращает завершённость истории в статус всего сериала

**Уверенность: 100/100.** Место: `src/core/media-conversation.js:87`, `:117`, `:393` в проверенном live-derived срезе.

Для активного собственного ответа `Хочу сериал с короткой законченной историей` proposal с точным полным quote, `context.onlyEnded:true` и require fact `feature:'completeness.ended'` принимается без ошибки. Фактически остаются `context.onlyEnded === true` и `session.goalRequires:[{f:'completeness.ended',…}]`, вопрос `only_ended` не появляется. Тот же результат подтверждён для `Хочу законченную историю в сериале`.

Причина: подтверждение onlyEnded использует co-occurrence `сериал` и `закончен|завершен`; обработчик ambiguous completedStory специально отключается при любом `сериал` в quote. Хотя признак завершённости грамматически относится к истории, добавление названия раздела в точную цитату делает его ложным жёстким статусом всей работы. Это тот же boundary, для которого внесена live-правка, и он способен отсеять подходящий продолжающийся сериал с законченным сюжетом.

Исправление: различать объект признака завершённости; обе приведённые story-формулировки должны сохранять остальные facts/время, снимать context/typed ended inference и задавать локальное уточнение. Явные положительные формулировки о полностью законченном сериале должны сохранять onlyEnded. Нужны только адресные tests этих двух scope variants, прежнего raw receipt и имеющихся source/negation/retraction guards.

Файлы `live-round-1..4/report.json` прочитаны без изменений. Их `stageCalls=[2,3,6,1]`, `stageUsd=[0.025392,0.036254,0.0961762,0.01938]`; финальный report содержит `passed:true`, `totalDiagnosticCalls:12`, `totalDiagnosticUsd:0.1772022`. Это расход основного исполнителя, прочитанный из сохранённых отчётов, **новых платных вызовов в данном review 0/$0**. Общий 480-test suite и HTTP не повторялись и не приписываются этой адресной проверке.

Первый addendum verdict был **Fix-and-resend только по (b)**. Все пять прежних находок оставались закрытыми; (a)/(c) повторной переработки не требовали. Остаток (b) закрыт проверкой ниже.

## Закрытие live-derived дополнения

Лично выполнено `node --test test/media-conversation.test.js test/media-conversation-ai.test.js` после последней адресной поправки: **50/50 pass**, fail/cancelled/skipped 0. В проверенных изменениях признак статуса теперь связывается с существительным «сериал» или его статусным сказуемым; завершённость истории, сюжета и арки не становится признаком окончания производства всей работы.

Отдельные inline assertions повторили именно оставшийся scope:

- `Хочу сериал с короткой законченной историей` и `Хочу законченную историю в сериале` → onlyEnded null, локальный `only_ended`, никакого hard `completeness.ended`.
- `Нужен полностью законченный сериал` и `Хочу сериал, который уже полностью закончен` → onlyEnded true с допустимым structural fact.
- Проверенные отрицания, условная цитата и `Хочу сериал с незаконченной историей` отклонены; ложное положительное ended condition не появляется.
- Исходный receipt `resp_0527ef1b4e250236016ae7dcf8e33887d28cf1f3f36e95e6d9` повторно применён без изменения входного state: все 4 независимых goal facts, commitment short и **45 минут на эпизод** сохранены; неподтверждённый status снят, вопрос остаётся `only_ended`, состояние нормализуется после сохранения.

Итог дополнения: **(a) Pass, (b) Pass, (c) Pass**. Все пять исходных source-находок также остаются закрытыми. Материальных незакрытых замечаний в согласованном объёме нет. **Source review: Pass в проверенном объёме.** Дополнительных платных вызовов 0/$0; исходные 12 вызовов/$0.1772022 не повторялись. Общий suite, HTTP и браузер на этом адресном шаге не запускались.
