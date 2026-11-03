# Отзыв в конце подбора — Family подключён04.11.2026

Владелец отклонил готовые сообщения тестировщикам и поручил спрашивать об опыте прямо после каждого подбора, сохранять feedback в базу и использовать его для улучшения рекомендаций и собственного анализа. [Прежнее предложение](REAL_FEEDBACK_ROUND_2026-11-03.md) отмечено как отклонённая история.

## Что реализовано

Во всех4modern-разделах после карточек есть «Как тебе подбор?»: «Нашёл своё / Есть близкие варианты / Ничего не подошло», необязательные причина и текст, явная отправка. Включённый флажок разрешает учитывать этот конкретный отзыв в следующих подборах этого браузера. Подпись объясняет сохранение запроса и показанных вариантов вместе с отзывом без имени.

Расширен существующий feedback-run необязательным selectionReview; старые карточные оценки совместимы. Повторная отрисовка/reload не создают новый список. More получает отдельную общую оценку, undo восстанавливает прежнюю. Черновики отделены от отправленных данных. Используются прежние IndexedDB-транзакции, ревизии и очередь: сбой отправки остаётся pending, поздний ACK не затирает новую правку. При недоступном browser storage форма работает в памяти окна. Из отзыва не копируются библиотека и несохранённые черновики других форм. Длинная явная копия ограничена48000символов с пометкой сокращения.

Серверный адаптер Supabase подключён через выделенную Edge Function tastiq-feedback. Миграция `supabase/migrations/20261103193819_durable_selection_feedback.sql` создаёт append-only revisions с ключом(namespace,run_id,revision), RLS, RPC security-invoker и закрытыми правами anon/authenticated. Secret используется только сервером; новых runtime SDK нет. Один и тот же повтор idempotent, другой payload той же ревизии даёт409, старая доставка не перезаписывает новую. Vercel без настроенной БД возвращает503 без ложного ACK; локальная разработка может писать прежний постоянный локальный файл.

Обычный QA не пишет в базу. Для будущей проверки настоящего cloud-path предусмотрен HMAC-подписанный владельцем probe: он пишет только в отдельный qa:run namespace. Аналитические SQL исключают эти записи. Подпись вычисляется серверным ключом, сам ключ в API-запрос не передаётся.

## Как учитываются отзывы

До6 последних явно отправленных и разрешённых отзывов того же раздела из этого браузера идут как исторические данные в существующий pick-вызов. ID и названия сверяются с каталогом. Сегодняшнее желание и строгие ограничения сильнее старого отзыва. Отзывы не превращаются в hard stops, завершённые произведения или общий системный промпт; чужие отзывы не читаются. Отправка не вызывает нейросеть. Cache различает новую редакцию feedback-контекста.

Это дополнительный контекст модели, а не автоматическое изменение её весов и не доказанный рост качества. Общие изменения правил/данных требуют анализа. Для владельца подготовлены [SQL-сводки](FEEDBACK_ANALYSIS_QUERIES.sql): последняя ревизия каждого списка, общая оценка, заявленные причины, отдельно выбор/фактическое начало/впечатление. Источник анонимных отзывов не удостоверяет уникального человека. «Не начал», сохранение и знакомство не считаются отрицательным вкусом.

## Проверка

- **624/624** unit tests. Новый contract/privacy/drafts/lateACK/own-context/production503/probe, legacy/card regressions. Подтверждённые no-storage/game-domain/потеря нового draft во время сохранения закрыты RED→GREEN.
- HTTPstub Pass/paid0. Прежний точный ACK wire format сохранён после обнаруженной регрессии дополнительного поля.
- Реальный локальный PostgreSQL через закреплённый dev-only PGlite0.5.15:3SQL-теста выполнили миграцию, права ролей, invoker, idempotence/conflict/out-of-order/namespace/size и owner analysis queries. Отдельный удалённый roundtrip подтверждён ниже.
- Нативный IAB:4раздела, явная отправка, черновик/reload,503→pending/reload→retry→ACK, more→новая форма/undo→старый отзыв, opt-out. Desktop390/320, overflow0, verdict controls44px, неожиданных console errors0. Два bounded visual passes; удалено остававшееся после успешного ACK действие повтора.
- Один свежий reviewer GPT‑6 Astra:1Important (терялся новый черновик во время ожидания локальной транзакции), исправлен отдельной воспроизводимой регрессией.19targeted tests в review. Других material findings и deferred minors нет. Ревью не подтверждало удалённую БД, настоящие credentials, native UI и поведение реальной модели на инъекциях.
- Build Pass:85static/11critical runtime source matches/6runtime JSON/Node24/300s. Тестовый Postgres/dev dependencies/SQL/секреты не упакованы в function.

Пакет: `research-vault/durable-feedback-2026-11-03/verification.json` и nativeJPEG.10строк/13HTTPотправок/0conflicts только в QA in-memory database, все synthetic; удалённые проверки учтены отдельно ниже. Платных вызовов OpenAI0/$0. Новый mainruntime5177/PID62976; бесплатные QA POST/4GET200, qaBilling.calls[], в пользовательский журнал проверка не попала. QA5180stopped/38closed/viewportreset, пользовательские состояния нетронуты.

## Family: размещение и права

Владелец явно разрешил существующий Family и названия с брендом. Проект pbipnjlsxkbhdyfebdeo; public.tastiq_feedback_events, public.tastiq_feedback_latest, public.tastiq_record_feedback. Миграция применена; Edge tastiq-feedback version1 ACTIVE. Остальные таблицы и функции Family не менялись. Прежний отдельный Primary не создан из-за квоты, это больше не текущий план.

FEEDBACK_DATABASE_SECRET — отдельный случайный ingestion token только для TASTIQ. Vercel не получает широкий ключ Family. Edge проверяет SHA256 Bearer до чтения тела, принимает bounded payload и вызывает только фиксированный RPC штатным внутренним серверным ключом Supabase. verify_jwt:false сопровождается обязательной собственной авторизацией. При Edge deployment надо подставить digest вместо __TASTIQ_FEEDBACK_TOKEN_HASH__ и включить локальные JS imports; plaintext токен в исходники/bundle не входит. Ротация требует обновить token в Vercel и digest в Edge вместе. FEEDBACK_DATABASE_URL — базовый URL проекта. Неправильный/пустой token401, GET405; RPC/table/view закрыты для anon/authenticated. Ошибки DB дают503, конфликт409 через HTTP API, а не общий500.

Supabase INFO о RLS без policies ожидаем для server-only таблицы: [описание](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Отсутствие публичных прав подтверждено SQL. INFO о свежем unused индексе времени: [описание](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); индекс оставлен для анализа. Остальные Family объекты не исправлялись по этим подсказкам.

Hosted service→Edge→RPC→Postgres проверил новую/повторную/старую версии,409/401/405; SQL2QArows/latest1. Local HTTP→БД:1QArow, повтор без дубля, ordinaryQAexcluded0. Productionrows0 на момент проверки. Все проверки synthetic, namespaces qa:..., owner queries их исключают. Evidence: hosted-family-verification.json, local-hosted-verification.json, hosted-security-verification.json. Дополнительный review только нового Family trust boundary:1GPT6Astra/11targeted/material0. Его ограничения: deployed digest и realDB проверял родительский агент, real model semantics не проверялись.

Обнаруженные HTTP503/409→500 и зависимость HTTP-stub от новой локальной БД исправлены; actual handler RED→GREEN и624/624+HTTPstub+build. Новых платных AI0/$0, платных ресурсов не создано.

## Доставка

Опубликовано main11d6466→READY dpl_8Mm4Y3EdxMejhhP2Bwcvp8NEbjx6,04.11.2026 00:42:21МСК. Cloud authenticatedQA ACK/readback подтверждён;1QArow/repeatбез дубля/productionrows0/0AI. Main5177/PID62976 обновлён. [Реквизиты и границы](DURABLE_FEEDBACK_DEPLOY_2026-11-04.md). Реальный эффект на humanfit не измерен.
