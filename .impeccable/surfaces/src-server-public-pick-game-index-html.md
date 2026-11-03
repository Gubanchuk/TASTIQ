---
version: 1
slug: "src-server-public-pick-game-index-html"
primary_target: "src/server/public/pick/game/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/shared/product.css","src/server/public/shared/selection.css","src/server/public/shared/conversation.css","src/server/public/pick/game/conversation.css","src/server/public/pick/game/app.js","src/server/public/pick/game/card-view.js","src/server/public/shared/clarification-view.js","src/server/public/shared/conversation-client.js"]
---

Mode: Operate. Настоящий адаптивный подбор игры; текущий кобальтовый бренд и ясность исправления запроса 03.11.2026. Каталоги, ranking, controller/reducer и платные guards не менялись.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: выбранные знак 5B, прописное 02 и палитра 02 «Кобальт»; прохладная бумага, светлая горизонтальная шапка с точным cobalt SVG, белые округлые поверхности, кобальтовые действия, Unbounded/Golos и настоящие обложки.
FORM: code-led продолжение одобренного бренда в рабочем Conversation. Источники текущего направления — research-vault/product-style-2026-11-03/DIRECTION.md и shared/product.css; утверждённая главная служит identity reference, её веера и маркетинговая композиция не копируются в формы. Контуры production SVG сохранены; исходный kit — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. Новая айдентика, workshop и raster comp не требовались.
История: Conversation выбран 02.11.2026; seed 537787fa относится к прежнему site-design-reset и не обосновывает нынешнюю форму. Прежние тёплая система и frozen-граница описывали тот этап. Одобренные четыре файла главной не менялись в текущем продолжении продукта; исторические receipts сохранены.

STORY: желание → полезное уточнение → проверяемое понимание → первое предложение и альтернативы → сохранение/вечер/знакомство.
FIRST VIEWPORT: явное имя игрового раздела, компактный mobile request, текущий вопрос и inline Next. Четыре этапа обозначают прогресс, не tabs и не обязательное число вопросов.

## Shipped composition

- Светлая sticky-шапка top0/z50/max1440px/min88px: cobalt SVG148px слева, «Подбираем игру / Сменить раздел» в центре, «Библиотека» справа. Padding16px clamp(20px,4vw,64px); на телефоне logo122px и library action первой строкой, домен второй. При ≤360px logo108px. Scroll-padding112px/phone140px. Rail164px остаётся только у legacy.
- Workspace max1440px: context252px + работа, gap32px, внешние поля clamp(20px,4vw,64px), margin28px auto70px. Планшет761–1150px: context218px/gap24px. Phone: одна колонка/gap16px/поля16px. Вопрос — белая рабочая поверхность radius32px/padding28px32px34px; tablet28px/25px, phone26px/20px, ≤360px24px/18px16px. На выдаче внешняя поверхность/рамка/тень снимаются.
- H1 Unbounded30px/1.35/500/-.035em/max26ch, phone25px, ≤360px вопрос23px. Body/help Golos14px/1.8. Ответы min64px/padding16px18px/radius18px; phone58px/14px16px/radius16px. Выбор отмечен aria-pressed, check, заливкой selected и cobalt border. Основной textarea116px/radius20px/padding16px18px; phone radius18px/font14px/padding14px16px. Направления и действия — pills999px.
- Phone request лежит на бумаге: обычный preview максимум2строки; первая неясность целиком с «Уточнить», полный context по «Показать / Свернуть». До модельной сводки видны активные отправленные «Твои слова»; несданный draft не выдаётся за принятый запрос. Progress — четыре text steps12px без цифр/соединителей на всех ширинах, текущий650/aria-current=step. При ≤360px сетка2×2/gap4px12px, без уменьшения текста. Next сразу после ответов, pill/min48px/width150px/phone125px.
- Первое предложение: белая card radius32px56px32px32px/padding30px/poster190px/gap30px/title30px/1.25/reason16px/1.8, тень0 10px30px #15213d06. Планшет: radius28px/padding24px/poster130px/title26px. Phone: radius26px42px26px26px/padding22px18px/poster80px/title23px; причина/оговорки/actions во всю ширину, ≤360px title22px/padding20px16px.
- Отдельный заголовок альтернатив21px/phone20px; сетка3/2/1 при >1150/761–1150/≤760px. Альтернативы radius24px/padding22px, desktop cover во всю ширину16:9/radius16px; phone padding20px18px/cover72px/radius12px/container2:3 рядом с title21px, текст/actions ниже. Featured game cover остаётся16:9. Меньшее число предложений не дополняется ради сетки.
- Picture скрыт opacity0 до успешного load; затем opacity1 и непрозрачная подложка line. Текстовый fallback не просвечивает через прозрачный art; при error остаётся текст.

## Correction, processing and preservation

Неясный пункт раскрывает собственную форму полного ответа; в correct.text идут только слова человека. «Дополнить запрос» отдельно; drafts независимы. Revision/id защищают от устаревшего submit. Принятое понимание остаётся результатом прежнего проверяемого planner. Отмена/error/reload сохраняют текст. Correction checkpoint возвращает прежний запрос, cards, feedbackState и drafts без модели; restart previous — отдельный механизм.

Именованные planning/picking/replacement status min 360px/phone 300px, три bars7×28px/1.25s. Live focus вне busy main, retry повторяет исходное действие; reduced motion отключает animation. Save ведёт в настоящую библиотеку; plan/taste/familiarity независимы.

## Evidence boundary

Текущий этап — docs/PRODUCT_STYLE_2026-11-03.md; пакет — research-vault/product-style-2026-11-03/REVIEW_PACKET.md, review и замечания — FINISH_REVIEW.md рядом. Проверка родителя: 509/509 unit, HTTP stub и production build; native IAB на изолированном 5180 с настоящими контроллерами/каталогом и stub plan/pick. CSS viewport: 1440×1000, 1280×720, 1024×900, 390×844 и 320×740. Канонические captures и DOM-замеры — .impeccable/review/product-style-2026-11-03/. Исправление progress при ≤360px записано по последнему исходнику; родитель сообщил о пересъёмке и визуальной проверке tiny/mobile/desktop по тем же canonical paths. Итоговый re-review фиксируется отдельно.

Размер native PNG местами меньше CSS viewport: в первом review отмечены 380×822 при CSS 390×844 и 310×717 при CSS 320×740. JPEG→PNG сохранён без resize/crop; документер не устанавливал причину различия. Размеры растров не выдаются за размеры CSS. Этот проход сверяет код и документы; браузер, сервер, API и тесты документер не запускал, finish verdict не присваивал.

Платных API-вызовов 0 / $0, генераций изображений 0 в текущем этапе по отчёту родителя; этот проход тоже не выполнял вызовов. Stub не доказывает качество реальной модели или human fit. Физический touch и screen reader не проверялись. Публикации нет; пользовательские состояния и оплаченные журналы не использованы. Старые evidence и бюджеты не перезаписаны.
