# Проверка интерфейса после главной — 01.11.2026

Запрос владельца: полностью переработать интерфейс после лендинга. Главную не трогать. «Дальше» было оторвано от вопроса и прижато к левому краю окна. Ожидание нейросети было спрятано внизу; нужно заметное понятное состояние обдумывания ответа. Ранее узкую доработку владелец отклонил как недостаточную. Нейтральный стиль уже выбран владельцем; тематические стилизации и статичные раскадровки отклонены. Реальный движок и работающие маршруты обязательны.

## Direction contract

THESIS: вопрос, ответы и продолжение составляют одну рабочую область. Статус модели занимает эту же область и сразу объясняет, что происходит.

OWN-WORLD: нейтральная тёмная палитра проекта, системный шрифт, синий для выбора/главного действия, ограниченный по ширине рабочий блок, тихая сводка рядом или под ним. Лендинг и его токены заморожены.

STORY: сформулировать сегодняшнее желание, задать условия, уточнить понимание, увидеть варианты; известную игру можно оставить или заменить. В киношном движке сохраняются реакции/причины/необязательное пожелание. «Моё» остаётся доступным.

FIRST VIEWPORT: ранние игровые вопросы в панели до780px; кнопка сразу под ответами по их правому краю. До760px кнопка удерживается внутри панели. При модельном запросе вместо редактируемой области — крупный статус с движением и понятным названием; введённый ответ сохраняется. Сводка на широком экране справа, на узком раскрывается отдельно.

FORM: рабочая область вопроса и отдельный контекст; вариант7 из локального списка, seed46112ab4, сделка7/6/3. Code-led по ранее делегированному владельцем выбору. Пул и roll не заменяют выбранную владельцем нейтральную эстетику. Approved comp и quality-bar картинок для этого изменения нет; не считать их существующими и не оценивать fidelity к отсутствующему comp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Реализация и граница

Корень E:/project/TASTIQ. Adaptive: src/server/public/pick/game/{index.html,app.js,workspace.css,pending-view.js}. Legacy: src/server/public/pick/{index.html,app.js,workspace-legacy.css}. Существующий shared pick/style.css не менялся. Новых shipping raster нет, прежние каталожные обложки используются как раньше.

Проверка родителем в настоящем Chrome с отдельным localhost5180, реальными каталогами/controller/reducer и модельной подменой5s, global fetch в fixture запрещён. Проверено: game direction/platform/company/talk/review/result, Back с сохранением собственного текста, replacement error/retry/retained cards; film time/company/anchors/why/why_not/stops/ask/result, свой intent/error, My и меню/Escape. Source-review нашёл и закрыл stage aria-busy, focus на скрытыйh2, auxiliary во времяbusy. Legacy исправлен пустой длинный overlay и status-focus. Это техническая проверка UI, не новая оценка попадания игр человеку и не screen-reader audit.

368/368 node tests, HTTP stub Pass, paid requests0. Однократный detector: impeccable-detect.json. Общий ledger может расти от реальных действий владельца; наши тесты не используют OpenAI.

## Обязательные скриншоты (открыты и проверены родителем)

- desktop1440: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/game-next-final.png — выбран Windows, Next под вопросом.
- desktop1920: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/game-thinking-desktop.png — ожидание ответа.
- actual user CSS1920x889, сохранённое изображение1910x884: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/owner-result-final.png — сохранённые реальные Far Cry5/Just Cause3/Fallout4/Wildlands, обновлена только оболочка.
- mobile CSS390x844, сохранённое изображение380x822: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/game-question-mobile.png — длинный вопрос/черновик/Next.
- mobile390x844: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/film-thinking-mobile-final.png — окончательный компактный intent-loading, stage332px, focus наstatus, contentdisplaynone.
- actual in-app651x871: E:/project/TASTIQ/research-vault/workspace-redesign-2026-11/in-app-final.png — начальный вопрос и видимая Next.

Другие измеренные размеры1024x768 и446x430: overflowfalse, контекст свёрнут на1024, Next внутри ширины панели на коротком446. Скриншоты этих размеров не приложены к verdict, не заявлять их независимую визуальную проверку. Light scheme/физический touch/экранный диктор не проверялись.

Происхождение изображений: сохранены байты CUA screenshot({fullPage:false}) без редактирования. CUA вернул JPEG при выбранных именах.png. В двух указанных случаях физические размеры меньше измеренного CSSviewport с сохранением пропорций. Фактические размеры подтверждены .NET System.Drawing.Image.FromFile; viewport владельца1920x889/dpr1 повторно считан из DOM. Имена файлов не являются утверждением о PNG-формате. Снимки состояния и текста валидны, pixel-perfect comparison к отсутствующемуcomp не заявляется.

Происхождение seed: concept-seed --scope surface --mode operate дал seed46112ab4/deal7,6,3/catalogc3b204a1eed6. Один успешный GET после sandboxfailure отражён в tooltranscript текущей беседы. Rawstdout не сохранён в отдельном файле; реконструированную запись не выдавать за rawroll или QUALITY BAR.

Ревью: только материальные дефекты против запроса/контракта. Не предлагать смену бренда, новый функциональный диалог, стилизацию или декоративный polish. При возможности ship дай scopedвердикт и точные ограничения.
