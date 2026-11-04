# Кнопки, сохранение и мобильный финал — 04.11.2026

Владелец прислал семь скриншотов и поручил исправить кнопки, раскрытия, сохранение подборов, замену одной карточки и отступ sticky-хедера. Дополнительно потребовал большой ручной проход телефона/ПК с новыми навыками UI, разрешил самостоятельные commit/push/deploy. Работа выполнена в одном чате, без независимого ревьюера.

## Что изменено

- Современные game/film/series/cartoon и Library используют последний слой controls.css: явная граница/фон, selected/hover/focus/disabled. У summary одна стрелка, optional-подпись отдельной строкой. Раскрытия первого вопроса сохраняют ширину и порядок.
- Header top:0 без верхней щели. При761–1000px доступный restore вынесен вместе с restart на отдельный ряд: нет кнопок с подписью в три строки.
- В мобильных альтернативах устранён inherited grid-column:2 с большей специфичностью. На390px две причины имели ширину0px, третья78.56px при карточке352px; после исправления все четыре —312px. На320px все16 карточек четырёх разделов имели258px. Это browser DOM measurements, не оценка вкуса.
- Мобильные fit/outcome2×2, полная ширина основных действий, читаемые размеры причин/оговорок, смысловые единицы метаданных и русские подписи известных жанров. Catalog/ranking/модель не менялись. Длинные названия не обрезаются.
- Library: select/remove отдельной полной строкой; фильтры≤420px одной колонкой. Устранён21px overflow «Вечеров» из-за optional-подписи, попадавшей в18px колонку стрелки.
- Результаты автоматически сохраняются отдельно от планов/оценок в localStorage `tastiq.selections.v1`. Вкладка «Подборы» открывает полный запрос/набор без новой генерации. Доступные старые current/previous/checkpoint modern-сохранения подхватываются; уже утраченные состояния не восстанавливаются из ничего. Старый legacy archive сохранён. Ограничение своего envelope:30 batches/1.5M символов; quota fallback сообщает, что результат останется в окне.
- На отмеченной карточке есть «Заменить только этот вариант». Сервер принимает адресный target, сохраняет другие слоты/отметки, переносит target через ошибку/reload/retry. Групповая замена и undo остаются отдельными. Индивидуальная загрузка остаётся среди карточек, фокус после успеха — на заголовке замены.

## Проверка

Свежие633/633 (`tests.log`), HTTP smoke со stub-моделью (`http.log`, paid0), production build (`build.log`). Новые регрессии: local archive/reopen/old saves/quota/bounds, адресный retry/undo всех4domains, вывод/экранирование metadata и malformed old genre values. Полная упаковка фиксируется в `packaging.json`.

Native IAB, реальные HTML/движок/каталоги, модель подменена на сервере; любые непредусмотренные внешние запросы сервера блокировались. UI-статистика/feedback изолированы `qa_run`, реальные отзывы/пользовательские черновики не использовались. Responses API: **0 вызовов / $0**. Генерация иллюстраций:0.

| Путь / действие | Проверенное состояние |
|---|---|
| Четыре полных пути × телефон390 и ПК1440 | Все начальные варианты on/off, три disclosure, свои слова, три neutral, resume, reload; шесть длинных dynamic options, textarea, guard раннего review, review→result |
| Игровые условия | Все4platform/3company/4party, Back из party→solo; mobile/desktop |
| Итог всех4domains на320 | Все4fit, save каждой карточки, mark/cancel/keep, copy длинной альтернативы; одна/групповая замена, retained mark, more без повторов, undo |
| Ошибка замены | Искусственная ошибка→сохранённые4карточки/2отметки→reload→адресный retry→заменён только target |
| Правка и восстановление | Cancel/reopen draft/apply/restore correction, restart→reload→restore; прежние4id сохранены |
| Library320 и ПК1440 | Filters/domain/reaction/sort/search/collapse/reset; move/rate/clear/remove/undo; known/block/forget/undo; evenings draft→reload; saved selections/reopen |
| Формы и клавиатура | Search знакомого длинного названия→добавление в свои слова; Ctrl+Enter; domain Enter/Escape/focus; company children/age/time/movie↔episodic/commitment/completion/save; remove time/undo |
| Общий отзыв320 | Три verdict, reason/note/opt-out→reload draft→explicit submit; copy selection |
| Дополнительные ширины | Все4results446×705, header820×700/1024×768; overflow0 в измеренных состояниях, видимые controls≥44px в контрольном446px snapshot |

Подробности — [manual-actions.json](../research-vault/controls-history-2026-11-04/manual-actions.json), [mobile-card-layout.json](../research-vault/controls-history-2026-11-04/mobile-card-layout.json), PNG в том же каталоге. Это проход описанных состояний и видов действий; он не перебирает все32тыс. фильмов и все возможные тексты модели. В одном адресном опыте абсолютный scrollY менялся вслед за высотой содержимого; обещание фиксировать пиксельный scroll не вводилось.

## Разбор навыками

Impeccable bolder/polish/craft-floor, UI/UX Pro Max (локальная база: input affordance, sticky navigation, focus), ux-review и новые web-quality-audit/review-task. Проверка и исправления в этом чате; независимого подтверждения не заявляем.

| Находка | Правило / доказательство | Итог |
|---|---|---|
| Действия выглядели неактивными | UX F1/F2, скриншоты владельца | Явные поверхности/границы/состояния; contrast.json: primary/white6.232, border/white3.597 |
| При раскрытии менялась композиция | UX F3/M1; geometry.json | Постоянные строки/ширина, одна стрелка |
| Текст альтернатив сжимался в неявную колонку | UX B2/M1; DOM0→312px | Исправлена специфичность, полная ширина всех16mobilecards |
| Библиотека обрезала выбранный порядок и расширяла страницу | UX M1/F1; native320 | Полная ширина, overflow0 после исправления |
| В архиве не было modern результатов | UX A1/F3 | Автосохранение и явный переход «Все подборы», бесплатное повторное открытие |
| Замена одной требовала искать нижнее действие | UX A3/F3 | Адресная кнопка на карточке, retry/undo/сохранение других отметок |

Механический detector запущен один раз:6warnings/5advisories (`detector.json`). Progress border, legacy skeleton/dark styles проверены в контексте реально светлой modern-страницы; это не11доказанных дефектов. Новые цвета/радиусы записаны в DESIGN.md. Sidecar пересоздан в корректном UTF-8 по текущим примитивам; старые испорченные подписи/фрагменты не перенесены. PRODUCT/DESIGN/3surface briefs синхронизированы.

Полевые CWV/Lighthouse score, физическое касание и реальный screen reader не измерялись. Синтетические тексты/выборы не human labels; качество реальных рекомендаций этим этапом не подтверждается. Главная, знак/шрифты, каталоги, ranking, финансовые guards и Family schema не менялись.

## Доставка

Commit/push main и ручной prebuilt production разрешены владельцем. Точные SHA/deployment/HTTP/source checks после публикации — `research-vault/controls-history-2026-11-04/deployment.json` и `production-verification.json`. Коннектор Vercel вернул403 выбранной команды; используется ранее настроенный CLI, права/тарифы не расширяются.
