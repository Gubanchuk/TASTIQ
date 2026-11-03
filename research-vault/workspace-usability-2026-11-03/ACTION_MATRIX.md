# Проверка действий — workspace usability03.11

Проверяется отдельный QA5180/runusability20261103; реальные контроллеры/каталог, stubplan/pick, платныеcalls0. Галочка означает собственный nativeCUA проход, а не только unit-тест.

## Подтверждено

- [x] Базовый дефект: открытие Portal2feedback растягивало всех3соседей680→1211px приopen=false у2; baselineJSON сохранён.
- [x] Центральное уточнение: открыть из неясности, ввод своих слов, reload с текстом, отмена, повторное открытие с тем же текстом.
- [x] Общий редактор через видимое «Изменить», отдельная форма и focus.
- [x] Сбой разбора при исправлении результата: ответ сохранён, editor остаётся, прежние варианты возвращаемы; reload не теряетtext/error; кнопкаПовторить запускает stubretry.
- [x] Библиотека128:24карточки из96на потом; «Показать ещё24»→48.
- [x] Отношение мышью: Зашло→19из128, counts14/2/3.
- [x] Раздел клавиатурой: ArrowDown/End/Enter→мультфильмы32/128, counts24/4/4.
- [x] Поиск безсовпадений→0, отдельное объяснение/сброс; «Сброситьфильтры» возвращает24.
- [x] Вкус: НеЗашло и Убратьоценку, pressed/state отражаются.
- [x] Перенос сохранения в «Наэтотвечер», переключение кцелевомусписку иtoast.
- [x] Убрать сохранение→явныйблок «Вернуть»→восстановить.
- [x] Знакомство/вкус: blockedcheck/uncheck; забытьзнакомство сохранилоплан/оценку, «Вернуть» восстанавливает.
- [x] Архив4, Открытьвечера→пустойэкран с понятнымпереходом.

## Дополнительно выполнено root в native IAB

- [x] Domain:4 ссылки film→series→cartoon→game, игровая сессия восстановилась. Escape возвращает focus; ArrowDown/End переводят к первой/последней ссылке, внешний клик закрывает. Restart→новое желание, restore→прежний результат.
- [x] Полный game journey: своё пожелание+Стратегия→Windows→Компанией→Четверо→адаптивный вопрос→пример CivilizationVI через поиск→Ctrl+Enter→review→4 результата. Back сохраняет текст/выбор. Context editor сменил company на Один и снял partySize.
- [x] Все12 направлений лично выбраны и сняты, у каждой кнопки подтверждён aria-pressed=true. Все4 платформы,3 company и4 partySize нажаты. Все3 neutral и «Вернуться к своему ответу» проверены. Раннее «Проверить запрос» работает; при неотправленном ответе disabled с объяснением.
- [x] Review/remove fact/undo: условие удалено и восстановлено. Два найденных дефекта сводки (жанр скрывал свои слова; снятый source возвращался в fallback) исправлены с native reload и RED/GREEN.
- [x] Clarification: собственный draft, cancel/reopen/reload/apply, серия с «Нобранец»→поправка→новый review. Generic correction после успеха открывается пустым (native film + game/watch regression2/2). Restore checkpoint возвращает результат с закрытым editor, текст остаётся отдельным черновиком.
- [x] Injected failure: текст и error переживают reload без автоматического retry; retry→review, прежние результаты возвращаются. Busy отключает editor и изменяющие controls, статус находится в рабочей области.
- [x] Feedback Portal2: все4 fit, choose/cancel, start, все4 outcome; reason «Не то настроение»+свой текст→save. Значения видны после reload и в библиотеке. Draft-only Portal пережил reload, открылся теми же словами во «Вечерах», там сохранён.
- [x] Independent geometry: note Portal2 изменил1298.875→1618.4375, соседи678/1052.6875/1015.5 не изменились; JSON сохранён. Повтор на длинном strategy fixture: форма Stellaris не изменила высоту Dune. Это layout evidence, не human fit.
- [x] Familiar: mark/cancel; mark/keep; blocked check/uncheck; replace→новый VampireSurvivors при трёх прежних; undo→Portal с сохранённым отзывом. Save→Сохранено→библиотека. Sidebar history раскрыт, «Удалить из списка» уменьшило QA-знакомые5→4.
- [x] Library sort: new/old/title, Escape/outside, relation liked/unrated, domain cartoons/games, no-results/reset. Native ввод P→ortal дал Portal, focus=true/selection6. Playwright pressSequentially останавливался из-за замены DOM input; обычный native ввод подтверждён.
- [x] Archive: убрать CounterStrike2→в архиве «На потом»→сохранено. Plans/taste/familiarity остались раздельными. Populated evenings показывают Portal2 и draft-only Portal; cancel choice возвращает «Выбираю на сегодня».
- [x] Custom select AX после reload: один labelled combobox на поле вместо native+proxy дублей. Context form и library проверены; End/Enter выбирает, Escape/outside закрывают. Required/disabled/disposal дополнительно покрыты focused tests.
- [x] Final F1 disclosure: «Фильтры и порядок» раскрывается; Без оценки+По названию сохраняются после close/open, badge2 виден. Reset доступен при свёрнутом блоке. Focus и controls сохраняются после rerender.
- [x] Library0/1/130: отдельные QA namespaces,24→48 paging, все empty состояния. Повторные1280×720/390×844/320×740: selected list и начало записи/empty видны; на desktop1280 видна запись либо объяснение пустого состояния.
- [x] Covers load/fail:300×450→280×420 featured и146.656×220 alternatives, contain. Четыре broken film URLs дали title fallback. Landscape cartoon art загрузилась. После F2 mobile title перед art: Victoria3 y641–671 при320×740, y621–654 при390×844.
- [x] Размеры320/390/1024×600/1280/1440/1680 без горизонтального overflow;21 финальный native capture. Mobile result Back44×44, доступное имя «Назад», все4 labelled этапа. Desktop/mobile editor Apply/Cancel видны и нажаты.
- [x] Header/library CTA→landing#doors→game route. Library skiplink Tab→Enter: hash#library-content, focus library-content. Четыре landing-файла byte-identical.
- [x] External: «Открыть игру Victoria3» создала вкладку16 с https://store.steampowered.com/app/529340/Victoria_3/ и title «Victoria3 в Steam». Прямой повтор17 подтвердил страницу; обе проверочные вкладки закрыты.
- [x] Time: отдельный fixture40мин с точной цитатой; «Откуда ограничение времени» показал источник, «Убрать ограничение времени» снял scalar и вернул review без40мин. Без платной модели.

## Граница проверки

Проверены перечисленные действия и общие семейства контролов, а не все сочетания данных или все каталоговые записи. Planner/picker injected offline; это не human-fit оценка и не новая live-модельная цепочка. Physical touch/real screen reader не измерялись. Native console после прохода: errors0. Responses0/$0, imagegen0; QA storage/journal изолированы. Основной5177 и пользовательская сессия не нажимались.
