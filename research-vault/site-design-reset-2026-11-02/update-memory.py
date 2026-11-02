from pathlib import Path

root = Path('C:/Users/Dusik/.codex/claude-import/projects/E--project-TASTIQ/memory')
note = '''# Новые структуры TASTIQ после отказа — 02.11.2026

Владелец отверг ВСЕ три прежних /design/: почти одинаковые, верх лендинга изменён вопреки границе «только низ». Старый narrow review не является одобрением. Код пишет основной агент с Impeccable; новый независимый reviewer обязан судить по самой претензии, не только по совпадению с авторским brief.

Новое кликабельное сравнение http://localhost:5177/design-v2/ . Три самостоятельных устройства: «Разговор» — контекст и предложения, библиотека-доска состояний; «Витрина» — все варианты раскрыты рядами, полки по типам медиа; «Сравнение» — строки/detail, компактный список с фильтрами/поиском/сортировкой. На телефоне сохраняются различия. Прогресс не содержит кнопок, вопрос один, Next inline. Новый низ показывает соответствующую модель. Исходный header + вся first (h1/sub/двери/счётчики/скоро) переиспользованы в изолированном оригинале с исходными CSS/JS. Три production-файла SHA256 прежние, оба HTML-фрагмента совпадают. Исходное «Моё» в frozen header сохранено из-за границы; остальные новые экраны называют раздел «Библиотека».

Проверка: syntax, IAB1440/390 и фактический319, overflow0, broken images0, dev errors0 в пройденных сценариях. Клики detail/search/filter/sort/move/remove+undo со статусом, mobile lane, shelves, все три answer→result, frozen-link остаётся внутри макета. API не вызывается, данные только в памяти; опциональная отметка пишет отдельный tastiq.design-choice.v2. Настоящие сохранения/знакомство/вечера не менялись. Проверки UI не означают human fit.

Evidence E:/project/TASTIQ/research-vault/site-design-reset-2026-11-02/ . Полный FINISH_REVIEW.md и DOCUMENTATION.md читать перед продолжением; не переносить прежний verdict. Advanced screenshot ошибочно меняет heights iframe; invalid-capture исключены. Переданы native landing-top + full lower-only и оригинальный baseline; native before/after900desktop/891mobile совпадает. Baseline mobile390×1030 с пустым полем отдельно переснят390×844 по recapture reviewer. Полный packet в REVIEW_INPUT.md. Production DESIGN.md/.impeccable/design.json не заменяются до выбора.

Итог E:/project/TASTIQ/docs/SITE_DESIGN_RESET_2026-11-02.md, текущий контекст docs/CODEX_CONTEXT.md. Направление ещё не выбрано. Основной сайт не переносили. Следующее — реакция на структуру, затем перенос на настоящие хранилища без demo data. Не приступать вместо UI к ядру или адаптивному пути для кино/сериалов/мультфильмов: он остаётся отдельным этапом.

Новых платных генераций0/$0. Текущий ledger upper$2.0484624/181, uncertain0, technicalRemaining$2.9515376; дополнительный остаток гранта≥$9.5297895. Production5177 уже работал, backend не перезапускали. Viewport reset, отдельный новый preview сохранён. Без коммитов/публикации/удаления архивов.
'''
(root / 'site-design-reset-2026-11-02.md').write_text(note, encoding='utf-8')
memory = root / 'MEMORY.md'
prefix = '''> Актуально02.11, после отказа: ВСЕ /design/ отклонены как слишком похожие и меняющие верх лендинга. Новая тройка http://localhost:5177/design-v2/ : разговор/доска, раскрытые варианты/полки, список/detail. [Тема](site-design-reset-2026-11-02.md), E:/project/TASTIQ/docs/SITE_DESIGN_RESET_2026-11-02.md. Исходный header+first изолирован и сохранён, production hashes прежние. Направление не выбрано, перенос не выполнялся. Полный новый review/documentation читать в site-design-reset-2026-11-02, старый narrow ship не использовать как одобрение.
> API0/$0, ledger по-прежнему upper$2.0484624/181, uncertain0, грант≥$9.5297895, technicalRemaining$2.9515376. IAB1440/390/319 и функциональные действия проверены. Advanced captures iframe искажены и исключены; native верх+отдельный низ — действующий packet. Следующее — реакция владельца, затем перенос выбранного UI с сохранением данных. Ниже исторический первый этап и более ранние срезы.

'''
existing = memory.read_text(encoding='utf-8-sig')
if not existing.startswith('> Актуально02.11, после отказа:'):
    memory.write_text(prefix + existing, encoding='utf-8')
old = root / 'site-design-comparison-2026-11-02.md'
old_text = old.read_text(encoding='utf-8-sig')
warning = '> История: все эти макеты отклонены владельцем02.11. Причины и новое сравнение — site-design-reset-2026-11-02.md. Прежний narrow review не является одобрением.\n\n'
if not old_text.startswith('> История:'):
    old.write_text(warning + old_text, encoding='utf-8')
print('Updated project memory only: reset topic, MEMORY, historical comparison notice.')
