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
