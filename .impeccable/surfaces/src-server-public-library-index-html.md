---
version: 1
slug: "src-server-public-library-index-html"
primary_target: "src/server/public/library/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/shared/product.css","src/server/public/shared/conversation.css","src/server/public/library/style.css","src/server/public/library/app.js","src/server/public/shared/library-store.js","src/server/public/pick/game/familiarity-store.js"]
---

Mode: Operate. /library/ — настоящее место планов, истории и вечеров для всех четырёх разделов. Перенос выбранного кобальтового бренда 03.11.2026 сохраняет смысл данных.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: выбранные знак 5B, прописное 02 и палитра 02 «Кобальт»; прохладная бумага, светлая горизонтальная шапка с точным cobalt SVG, белые округлые поверхности, кобальтовые действия, Unbounded/Golos и настоящие обложки.
FORM: code-led продолжение одобренного бренда в рабочем Conversation. Источники текущего направления — research-vault/product-style-2026-11-03/DIRECTION.md и shared/product.css; утверждённая главная служит identity reference, её веера и маркетинговая композиция не копируются в формы. Контуры production SVG сохранены; исходный kit — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. Новая айдентика, workshop и raster comp не требовались.
История: Conversation выбран 02.11.2026; seed 537787fa относится к прежнему site-design-reset и не обосновывает нынешнюю форму. Прежние тёплая система и frozen-граница описывали тот этап. Одобренные четыре файла главной не менялись в текущем продолжении продукта; исторические receipts сохранены.

STORY: сохранить/выбрать → найти → перенести/удалить+undo → отдельно оценить или открыть вечер.
FIRST VIEWPORT: heading/CTA, «Списки / Архив / Вечера», постоянный поиск и desktop-три списка. Phone сохраняет поиск, раскрывает фильтры, показывает один выбранный список.

## Shipped composition

- Светлая горизонтальная sticky-шапка top0/z50/max1440px/min88px с точным cobalt SVG148px слева и кобальтовым pill «Новый подбор» справа; на телефоне logo122px, ≤360px108px. Строки домена у библиотеки нет. Прежний rail164px/inverse logo остаётся только в legacy.
- Content max1440px, padding38px clamp(20px,4vw,64px)70px; phone28px20px50px. Heading Unbounded32px/1.3/500/-.035em, phone28px. Три lane/gap23px, tablet761–1100px gap14px; header17px/tablet15px, counts12px. На телефоне виден один выбранный список. План на вечер поддержан кобальтовой линией, знакомое — сохранённой зелёной; названия объясняют смысл.
- Белая card с line border/radius22px/padding18px/gap16px, phone padding16px, без resting shadow. Cover68px/2:3/radius12px; title Golos14px/1.45/650, meta12px. Tablet761–1100px cover48px/title13px; от1500px cover76px/title15px. Phone cover72px, ≤350px60px. Поля/поиск/перенос плана radius14px, library buttons pill999px/min46px/padding10px17px; compact native move select min44px. Старые компактные controls во «Вечерах» сохраняются локально и не задают общий product pill.
- Phone «Фильтры и порядок» имеет chevron/count; поиск всегда видим. «Архив» хранит прежние предложения и ведёт к новым выборам/отзывам во «Вечерах», без молчаливой миграции. Remove hitarea44px; отношение и знакомство раскрываются отдельно.
- Focus2px primary/offset4px, search focus-within2px/offset3px; button transition.18s cubic-bezier(.16,1,.3,1), reduced-motion отключает переходы. Уведомление имеет сохранённую локальную мягкую тень; доска остаётся плоской. Это унаследованное локальное отличие, не новая тень бренда.

## Data and interaction boundaries

Lane означает план и независима от вкуса, истории и familiarity. Знакомство не является запретом, прохождением или dislike. Поиск, фильтры и sort не переписывают записи; undo не затирает повторное сохранение. Отзывы идут отдельной очередью, чтение вечеров не отправляет observe/flush. Прототипные demo records не импортируются.

## Evidence boundary

Текущий этап — docs/PRODUCT_STYLE_2026-11-03.md; пакет — research-vault/product-style-2026-11-03/REVIEW_PACKET.md, review и замечания — FINISH_REVIEW.md рядом. Проверка родителя: 509/509 unit, HTTP stub и production build; native IAB на изолированном 5180 с настоящими контроллерами/каталогом и stub plan/pick. CSS viewport: 1440×1000, 1280×720, 1024×900, 390×844 и 320×740. Канонические captures и DOM-замеры — .impeccable/review/product-style-2026-11-03/. Исправление progress при ≤360px записано по последнему исходнику; родитель сообщил о пересъёмке и визуальной проверке tiny/mobile/desktop по тем же canonical paths. Итоговый re-review фиксируется отдельно.

Размер native PNG местами меньше CSS viewport: в первом review отмечены 380×822 при CSS 390×844 и 310×717 при CSS 320×740. JPEG→PNG сохранён без resize/crop; документер не устанавливал причину различия. Размеры растров не выдаются за размеры CSS. Этот проход сверяет код и документы; браузер, сервер, API и тесты документер не запускал, finish verdict не присваивал.

Платных API-вызовов 0 / $0, генераций изображений 0 в текущем этапе по отчёту родителя; этот проход тоже не выполнял вызовов. Stub не доказывает качество реальной модели или human fit. Физический touch и screen reader не проверялись. Публикации нет; пользовательские состояния и оплаченные журналы не использованы. Старые evidence и бюджеты не перезаписаны.

Текущие captures: library-mobile-final.png и library-desktop-final.png. Отдельный QA profile не доказывает состояние библиотеки владельца.
