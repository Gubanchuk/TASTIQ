# Ограниченный source review QA-режима — 02.11.2026

Проверены незакоммиченный diff относительно `4999b6a44e59c5050d7ddc86b045bd0e320f6385`, новые `qa-observation.js`, `qa-session.js`, их тесты и непосредственно связанные пути клиента/отзывов. Рубрика: requesting-code-review; только существенные замечания с уверенностью ≥80. Исходники, индекс и ветка не изменялись.

## Что подтверждено

- AsyncLocalStorage ограничивает маркер, резерв и receipt текущим HTTP-запросом. Обычный вызов передаётся исходному transport; существующий PaidBudget остаётся внутри обёртки. Все места записи normal NDJSON в handler используют общий guard.
- Обычный localStorage и имя обычной IndexedDB сохранены. В новых game/watch/library QA-ключи имеют отдельный prefix, а отзывы — отдельную базу на каждый run.
- Receipt содержит usage/model/responseId/hash/reserve/cost; prompt и output из результата в него не копируются. Неопределённое usage блокирует последующий dispatch внутри текущего запроса.
- Самостоятельно выполнены **21/21** тестов: `node --test test/qa-observation.test.js test/qa-session.test.js test/library-store.test.js`. Дополнительная offline-проверка подтвердила interleaved ordinary/QA ALS isolation и имена открываемых IndexedDB `tastiq-qa-alpha` / `tastiq-qa-beta`. Сетевых и модельных запросов: **0**.

## Critical

Нет.

## Important

Открытых замечаний нет. Единственная scored-находка закрыта адресной правкой и повторно проверена ниже.

### Закрыто: видимый переход в прежний подбор выходит из QA-изоляции — первоначальная уверенность 95/100

Место новой границы: `src/server/public/shared/qa-session.js:26`; подключение только нового media-контроллера: `src/server/public/pick/watch/app.js:1`. Конкретный доступный переход: `src/server/public/pick/watch/index.html:34`, ссылка «Прежний подбор» → `/pick/?legacy=1`.

До исправления в активном QA-сеансе эта ссылка загружала прежний `pick/app.js`, который не использовал QA helpers. Он читал raw owner localStorage (прежние строки `:184`, `:400`), создавал обычный feedback store (`:404`) с базой `tastiq-evenings`, затем автоматически вызывал `feedback.flush()` при старте (`:2165`). Legacy dialogue client сохранял raw owner `tastiq.site` (`shared/dialogue-client.js:50`) и использовал native fetch (`:16`), поэтому его log/feedback/AI-запросы не получали QA-заголовка. Переход мог автоматически отправить pending owner feedback, а продолжение сценария — менять owner state/NDJSON и обходить QA receipt/reserve.

Это нарушение новой гарантии QA-изоляции при обычной доступной навигации; прежнее normal-поведение самого legacy-пути не объявляется новым дефектом.

Исправление root: `qa-session.js:31` экспортирует QA-only target `/library/`; `pick/app.js:16` проверяет его до первой строки bootstrap и помещает весь прежний код в `else`. Normal legacy-код внутри не менялся. При активном QA переход теперь направляет в изолированную библиотеку до создания owner stores и до startup flush.

Повторная проверка ограничена этой находкой: `node --check` обоих изменённых модулей — Pass. Дополнительное offline-исполнение настоящего legacy source в VM с активным QA target, native-fetch trap и бросающими исключение getters `localStorage`/`indexedDB`/`document` дало ровно один redirect `/library/`, ни один trap не достигнут. Сетевых/модельных запросов: **0**. Таким образом owner bootstrap, включая автоматическую отправку pending feedback, не исполняется.

## Declined to judge

- Фактический cloud UI, сетевые задержки, usage реального OpenAI и денежное settlement: review по поручению выполняется без browser/server/network/model. Это должен подтвердить отдельный ограниченный live-протокол.
- Постоянный общий бюджет всех serverless-инстансов: явно вне scope. Обёртка даёт только ceiling одного запроса. Ruling root: внешний observer резервирует **$0.25** до каждого потенциально платного UI-действия, соблюдает этап **≤$0.45 / максимум12** и не продолжает до settlement receipt; observer и его фактические live receipts принадлежат root.
- Автообновление QA-интерфейса между несколькими одновременно открытыми вкладками: prefixed native `storage` events не преобразуются к ключам, которые ожидают текущие listeners. Ruling root: исключено из одновкладочного live-протокола; normal-режим не меняется, существующий visibility refresh сохраняется. Не является открытой scored-находкой этого scope.
- Авторизация публичного opt-in маркера и новый механизм долговременной аналитики: не входят в требования этого bounded изменения.
- Human fit и визуальное/assistive качество: source review их не доказывает.

## Вердикт

**Pass в проверенном source scope.** Единственная Important-находка исправлена; ранний QA guard предотвращает выполнение owner legacy-bootstrap. Открытых material-находок нет. Вердикт допускает отдельную одновкладочную live-проверку с внешним observer; не подтверждает фактическое cloud/model-качество или завершение live-этапа.
