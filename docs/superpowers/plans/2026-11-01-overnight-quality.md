# Ночной цикл качества TASTIQ

> **For agentic workers:** Use the existing subagent-driven-development/TDD/review workflow. No commits or publishing.

**Goal:** По прямому поручению владельца продолжать ночью исправление логики и UX, не завершать работу после одиночного прогона.
**Architecture:** Точечные изменения поверх действующего conversation/controller; отдельный проверяемый resolver identity, явное намерение вернуться, сохранность вводимых ответов и понятные отказы ресурса. Каталоги и основной поиск не заменяются.
**Tech Stack:** текущие Node ES modules, vanilla browser UI, node:test, реальный Chrome, Responses gpt-6.1-sol/low.
**Spec:** исходные требования владельца в docs/FAMILIAR_GAMES_2026-11-01.md плюс настоящее поручение продолжать всю ночь; этот план фиксирует новые обнаруженные случаи, а не новый визуальный мир.

## Ограничения

- API-grant: ещё$10 от baseline$1.5782519/154; уже$0.0506206, оставалось$9.9493794 на начало ночного продолжения. Общий ledger$1.6288725/157, uncertain0. Не складывать старый остаток сверху. Каждый платный опыт имеет цель/cap/frozen сценарии; старые runner не повторять.
- В текущем checkout unborn main/staged-файлы владельца сохраняются; без worktree/commit/publish. Исходные каталоги, spares/discovery и спорные правила импорта не менять.
- Одна активная запись ledger, живого server owner проверять; ночью сохранять рабочий5177 после платных стендов. Synthetic journals/origins отдельно. Никаких скрытых платных повторов.
- Имя и модель трёх продолжающих агентов GPT-6.1 Sol объявлены. Parent владеет браузером, API-runner и shared budget/client.

## Проверяемые входы

Короткие/полные названия и части серии; неоднозначный alias; gameId из чужой реплики; finished+explicit replay vs reference; ответ после actionless restore pendingstate; написанный ответ перед ранним review; neutral после текста; контекстный черновик при локальной перерисовке; пустой/недостаточный бюджет; неоднозначное сегодняшнее время.

## Фаза1

- [x] history_trace: воспроизвести текущий Skyrim + RDR2→RDR1 substring bug на реальном каталоге; TDD resolver src/server/conversation-game-identity.js, service integration, knownGames identity-only evidence в ai/conversation.js. Не угадывать по популярности, source-scoped, longest-span и явные canonical targets.
- [x] played_logic: RED для finished+replay и pendingrestore; владение core/conversation.js и новым test/overnight-journey-regressions.test.js. gameIntent return/replay/reference явно, oldfacts совместимы, reference не возвращает consumed. Service restore исправляет его владелец.
- [x] ux_audit: RED→GREEN neutral/ignored draft/keyboard/contextdraft; local Моё, touch targets. Только подтверждённые препятствия, прежний стиль. Parent подтверждает реальным браузером на отдельном стенде.
- [x] root: typed budget failure с безопасным текстом/неповторяемостью; отказы до dispatch не выглядят как загадочный сетевой сбой. Сохранить conservative uncertain reserve и отсутствие retry.
- [x] Independent scoped review между исполнителями, общий npm test/HTTP smoke после согласованных изменений.

## Фаза2: не останавливаться после первой исправленной границы

- [x] Бесплатный frozen journey-набор: разные желания, компания, история/возврат, поправки, neutral/unknown и контроль источников. Отделить catalogue/filter/rank/model причины; synthetic ответы не human labels.
- [x] Адресный live subset после бесплатных проверок: объявить конкретные сценарии, calls/cap; исключить повторы прежнего платного опыта. Изучить реальные вопросы/понимание и выдачу, не только HTTP200.
- [x] По найденным причинам исправить ядро/данные контракта/UI, затем адресно повторить сопоставимый случай. Время сеанса — отдельный evidence-backed мост только после описания семантики; любую цифру минутами не считать.
- [x] Реальный пользовательский проход desktop/mobile/keyboard, включая error/recovery. Один пакет существенных исправлений и одна подтверждающая визуальная проверка на подэтап; не бесконечная полировка.
- [x] Итоговые исходники+тесты+независимый review, восстановленный runtime, точный расход и remaininggrant, обновлённые CODEX_CONTEXT/AGENTS/memory. Утренний отчёт с реальными ограничениями; тесты не объявлять human fit.

Ruling: владелец явно отменил прежнюю остановку и поручил автономное ночное продолжение; новые технические/платные проверки внутри цели разрешены, решения пользователя о каталогах/публикации не подменяются.
