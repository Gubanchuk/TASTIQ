# Source review снятия AI-квот и дедлайна — 02.11.2026

**Scope:** текущий unstaged diff относительно `c2c6f8daba6865f48457f3d0600d2469b7577702`: `access.js`, `config.js`, `openai.js`, `build-vercel.mjs` и перечисленные в поручении тесты. Проверка read-only, по requesting-code-review; сообщаются только material-находки с уверенностью ≥80. Снятие пользовательских квот и subscription gate прямо разрешено владельцем.

## Подтверждено

- Удалены hourly/day accounting и list gate; отсутствие ключа и явный `AI_ACCESS=off` сохраняют прежний безопасный offline-путь. `access.js` по-прежнему импортирует `config.js` до инициализации настройки access.
- Удаление AI-import из низкоуровневого `openai.js` не ломает загрузку окружения в production: handler импортирует access/config, а все четыре AI-пути используют модули с явным импортом AI config. Значение ключа читается transport в момент вызова.
- Обычный transport больше не создаёт 45-секундный AbortSignal. Явный `timeoutMs` по-прежнему создаёт сигнал. Повторных платных попыток в transport не появилось; game и film/series/cartoon используют общий transport через те же services.
- Обычные запросы по-прежнему проходят QA wrapper без QA ceiling: маркер нужен явно. Бюджетная история и opt-in QA этим diff не изменяются.
- Build Output формирует `maxDuration:300`; fixture-проверка также сохраняет allowlist runtime data и исключение ключей/журналов из artifact.

Самостоятельная проверка: **26/26** тестов (`node --test test/ai.test.js test/openai.test.js test/vercel-build.test.js`), включая controlled expiry прежнего дедлайна и single-request assertion. Дополнительная offline-проверка с явным `timeoutMs:1234` подтвердила AbortSignal и ровно один stubbed dispatch. Реальная сеть/платный API: **0**.

## Findings

**Critical:** нет. **Important:** нет.

## Declined to judge

- Фактическое состояние Vercel resourceConfig/Fluid, принятие нового deployment и длительный cloud-запрос: отдельная ответственность root; review не обращался к production. Сведения `fluid:true` и Hobby300 переданы root как уже проверенные.
- HTTP smoke, который root отдельно повторяет после sandbox EPERM: не перезапускался вторым reviewer; его результат не подменяется адресным unit suite.
- Отмена явного поручения владельца снять квоты или введение новых денежных ограничений обычным пользователям: вне scope; отсутствие квот является заданным поведением.
- Ограничения провайдера/хостинга, прежний legacy UX и human fit рекомендаций: данный diff их не меняет и source review их не подтверждает.
- Исторический uncertain receipt, его settlement и новая ограниченная live-проверка: остаются у root; reviewer не запускал платные сценарии и не менял receipts.

## Вердикт

**Pass в проверенном source scope.** Существенных регрессий не найдено; обычный доступ, инициализация окружения, отсутствие application deadline и single-request transport соответствуют поручению. Это не verdict о фактическом cloud-прогоне или качестве рекомендаций для человека.

## Адресный follow-up: «На фильм не больше 110 минут»

Проверен только unstaged delta относительно `7a8a54cf370f9c537043895aec644e2cd6d68533`: `media-conversation.js:174` и две новые проверки в `media-conversation.test.js`. Добавлен лишь необязательный предлог `на` перед уже известными существительными в anchored runtime/episode cap grammar; исходные capture groups и их использование не меняются.

Точная цитата действующего source, retraction guard, проверка timeMode/domain, равенство распознанных минут и проверки условий вокруг цитаты остаются на месте. Положительные film/cartoon/episode/series варианты сохраняют точное evidence после normalize и projection; conditional/range/wrong-minute/retracted варианты отвергаются.

Самостоятельно выполнен `node --test test/media-conversation.test.js`: **48/48 Pass**, внешняя сеть/платный API **0**. Source/index/branch не менялись. **Вердикт: Pass в этом узком scope**, material-находок нет. Full suite/build/HTTP smoke и реальное продолжение browser остаются проверкой root; качество live-ответа и денежная история этим review не переоцениваются.

## Второй follow-up: «короткий лёгкий детективный сериал»

Проверен только unstaged delta относительно `0f22ea669cefb5216b1caa68d56239fdae8882c0`: helper/pattern короткой истории в `media-conversation.js` и две новые проверки. Принимать явно короткий описательный сериал соответствует поручению. Самостоятельный target suite: **50/50 Pass**, внешняя сеть/платный API **0**.

**Закрыто: Important — shortStoryPattern принимал существительные за промежуточные прилагательные, первоначальная уверенность95/100.** Место: `src/core/media-conversation.js:112`. Прежний промежуточный шаблон `\p{L}+(?:...|ие|...)` принимал «описание», «содержание», «изложение». До исправления независимо воспроизведены три ошибочных успешных `applyMediaConversationProposal` с точной полной цитатой:

- `Хочу короткое описание длинного сериала` → `commitment:'short'`.
- `Хочу короткое содержание длинного сериала` → `commitment:'short'`.
- `Хочу короткое изложение длинной истории` → `commitment:'short'`.

Все три значения до исправления также сохранялись после `normalizeMediaConversation`. Коротким здесь является пересказ, а сериал/история прямо названы длинными. Прежняя adjacent-noun grammar эти выражения не принимала. Это нарушало заданную границу «короткий обзор ≠ короткий сериал» и могло закрепить неверное понимание вместо уточнения.

Исправление root: generic morphological token заменён конечным списком media descriptor stems; предел0..4, conjunction/comma и exact noun forms сохранены. Negative fixture включает «описание/содержание/изложение/содержимое».

Повторная независимая проверка: **50/50 target tests Pass**; четыре названия пересказа теперь отвергаются. Ещё семь offline positive cases — описательный детектив, короткая законченная/завершённая история, мини-сериал, короткие сериалы, ненадолго, несколько описательных слов — принимаются и сохраняют short после normalize. Новых material-регрессий в этом delta не найдено; сеть/платный API **0**.

**Текущий verdict этого follow-up: Pass в проверенном scope.** Единственная material-находка закрыта; source/index/branch reviewer не менял. Точный scalar из последнего live-предложения не утверждается причиной: предложение не сохранено, а finding отдельно подтверждён offline. Full502/build/HTTP и дальнейший live остаются у root.

## Preflight мультфильма: «один добрый полнометражный мультфильм»

Read-only fixture-проверка текущего `ce7d240cc0dd5aa0160592e7ace3f680408234ac` перед следующим платным действием. Это отдельная проверка естественной формулировки, а не утверждение о содержимом ещё не полученного модельного предложения.

Точный agent-owned source: `Хочу один добрый полнометражный мультфильм для просмотра с ребёнком 7 лет. На фильм не больше 100 минут. Без страшных сцен, жестокости и тяжёлого финала. Хочется смешное приключение.`

Независимые scalar-проверки через настоящий `applyMediaConversationProposal`:

| Проверка | Результат |
| --- | --- |
| children по первому предложению | Pass |
| children + childAge7 по тому же источнику | Pass |
| explicit format movie по первому предложению | Pass |
| runtime100 с точной цитатой `На фильм не больше 100 минут.` | Pass |
| commitment single по всему первому предложению | **Fail: generic context scalar validation** |
| commitment single по `один добрый полнометражный мультфильм` | **Тот же Fail** |

**Important, уверенность100/100:** `src/core/media-conversation.js:135`–`:136` требует adjacent `один → [полнометражный] → мультфильм`, поэтому нормальное определение «добрый» отвергает single при обеих точных допустимых цитатах. Если модель заполняет этот scalar, всё предложение отклоняется атомарно, несмотря на остальные допустимые поля.

Связанный подтверждённый пробел: `movieRequest` в `media-conversation.js:105` имеет ту же adjacency-границу. При hard explicit movie fact (`scope:today`, `stance:require`, `feature/titleId:null`) с полным первым предложением и пропущенным scalar format результат успешен, но `context.format` остаётся null. Контроль с удалённым только словом «добрый» выводит `format:movie`. При bare noun quote формат тоже не выводится; отсутствие request verb — уже существующая граница этой функции, её не следует расширять автоматически.

Узкое исправление: общая bounded movie-phrase grammar с конечными допустимыми media descriptor stems, включая «добрый», между `один`, optional `полнометражный` и точным noun `фильм/мультфильм`; использовать одинаковую структуру для single и verb-qualified movieRequest. Сохранить источник, exact evidence, negation/conditional/retraction и различение альтернатив. Не заменять descriptor span произвольным набором слов.

Необходимые negative fixtures для правки: `Не хочу один добрый полнометражный мультфильм`; условный запрос `Если будет время, хочу…`; `Хочу один добрый обзор полнометражного мультфильма`; `Хочу одно доброе описание полнометражного мультфильма`; `Хочу один добрый полнометражный мультфильм или сериал`; повтор старого hard format evidence после его снятия. Пересказ/обзор не должен становиться single movie request, альтернативы — обязательным movie format.

**Первоначальный preflight verdict: With fixes.** Найдены конкретные отказы до следующего платного клика. Сеть/платный API **0**, исходники и receipts не менялись. Допустимость ещё не полученного actual model proposal и человеческая пригодность выдачи не оценивались.

### Закрытие мультфильм-preflight после общей movie grammar

Root заменил adjacency-проверки общими `mediaDescriptor` / `mediaModifiers` / `moviePhrase`, сохранил explicit request verb для hard fact derivation и exact movie noun forms. Single и request-derived movie используют одинаковую bounded phrase structure; short-story helper продолжает использовать finite descriptors. Source, negation/conditional и retraction guards не изменены.

Повторная независимая проверка: **52/52 media tests Pass**. Дополнительно настоящий полный исходный cartoon draft с children/age7/runtime100/format movie/single проходит для обеих обсуждавшихся цитат single и сохраняет поля после normalize. Hard fact с полным первым предложением выводит пропущенный `format:movie`; отдельные hard facts с отрицанием, условием и альтернативой «или сериал» отвергаются и без explicit format scalar. Отрицательные synopsis/retracted fixtures проходят в target suite.

**Текущий финальный verdict этого review: Pass в проверенном source/preflight scope.** Обе связанные adjacency-находки закрыты; новых material-регрессий не найдено. Reviewer не менял исходники/receipts, сеть и платный API **0**. Actual cartoon model proposal, deployment/live/browser и human fit остаются отдельной проверкой root.
