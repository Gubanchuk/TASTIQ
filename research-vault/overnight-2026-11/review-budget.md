# Проверка типизированных бюджетных ошибок — 01.11.2026

**Pass в проверенном объёме.** Существенных дефектов нового бюджетного патча не найдено. Проверены budget-error.js, publicApiError в openai.js, stand/paid-budget.js, budget-transport.js, catch в ai/pick.js и адресные тесты. Собственную интеграцию aiConversation/service рецензент проверил только как выходной контракт, не выдавая её за независимый аудит собственного кода. Браузер и платные API не использовались.

Подтверждено:

- Known cap/reserve refusal создаёт BudgetError с notRequested:true и retryable:false до добавления receipt и до transport. Существующие лимиты, сумма допуска, формат receipt и учёт baseline не меняются.
- Перед реальным dispatch по-прежнему сохраняется pending с полным reserve. Потеря transport или отсутствие определимой usage оставляет uncertain; резерв не освобождается и последующие отправки блокируются, включая восстановленный ledger.
- Превышение уже зарезервированной суммы сохраняет фактическую стоимость как settled и ставит haltReason. Типизированная ошибка сообщает notRequested:false; нет попытки пересчитать прошлый расход как нулевой либо разрешить новый запрос. Прежний settled replay возвращает сохранённый ответ до проверки halt, не отправляя запрос повторно.
- BudgetError.publicMessage выбирается из фиксированных русских сообщений. Внутренние англоязычные диагностические строки остаются в message для прежних тестов; publicApiError отдаёт безопасное publicMessage. Произвольные Error/transport details не экспортируются. HTTP-коды OpenAI по-прежнему переводятся в заранее определённые безопасные сообщения, сырой response body не показывается.
- Публичные retryable/notRequested/code переносятся только из OpenAIError-подклассов. Picker/planner не добавляют автоматический повтор. Controller сохраняет retryable:false; UI скрывает «Повторить», когда сохранённая ошибка явно запрещает его. Исходный разговор/результат сохраняется для иных бесплатных действий.

Независимо выполнено:

`node --test test/paid-budget.test.js test/budget-transport.test.js test/overnight-budget-errors.test.js test/openai.test.js test/ai.test.js`

**33/33 PASS**, exit0. Все transport заменены локальными функциями; временные ledger создаются тестами в собственных workspace-каталогах и удаляются их teardown. Рабочий ledger, receipts и production process не изменялись; API-расход рецензента **0/$0**.

Граница вывода: браузерное отображение небюджетных ошибок здесь заново не проходилось. Тесты и чтение кода подтверждают сохранность бухгалтерских ограничений и доставку флага запрета повтора, не качество подбора и не сетевую доступность настоящего API.

Дополнение: проверено расширение того же publicApiError на legacy `src/ai/intent.js`. Catch использует общий безопасный mapping; новые сообщения из provider/ledger не экспортируются, guard/receipts здесь не меняются. Независимый адресный прогон `test/overnight-budget-errors.test.js` + `test/intent-ai.test.js`: **8/8 PASS**, exit0, API0. Вердикт Pass сохраняется.
