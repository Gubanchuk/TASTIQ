# HTTP smoke — наблюдение исполнителя

В этой итерации выполнен `npm run test:server` с подменой OpenAI. Завершился успешно, платных запросов 0. Вывод инструмента: `PASS: HTTP/static, AI picks + intent, feedback validation/privacy, in-flight sharing, cache, shared limits, isolated usage journal, disabled access.` Полный stdout отдельно не сохранялся; эта заметка не является сырым логом.

Финальная проверка рабочего сервера5177: GET `/pick/game/` →200, нужный HTML получен; GET `/api/ai/status` → enabled:true, model:gpt-6.1-sol. До и после этих GET SHA256 пользовательского data/journal.ndjson одинаков: `81BF1849BAB58E220C5B83CA57164CBA627EC6CF89179B29C4BBF15F40F72B53`.

Настоящий end-to-end нового маршрута проверен браузером на изолированном5179; записи browser-live-step1.json, browser-live-step2.json и browser-live-final.json. Перезагрузка финального результата восстановила4 карточки без нового API-вызова (успешных обращений148 до и после). Тестовые5178/5179 остановлены, рабочий5177 оставлен запущенным (exec62890).
