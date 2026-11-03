---
version: 1
slug: "src-server-public-pick-watch-index-html"
primary_target: "src/server/public/pick/watch/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/shared/product.css","src/server/public/shared/selection.css","src/server/public/shared/conversation.css","src/server/public/pick/game/conversation.css","src/server/public/pick/watch/app.js","src/server/public/pick/watch/card-view.js","src/server/public/pick/watch/view-state.js","src/server/public/shared/clarification-view.js","src/server/public/shared/conversation-client.js","src/server/public/shared/media-history.js"]
---

Mode: Operate. Адаптивный просмотр film/series/cartoon продолжает игровой Conversation;03.11.2026 получает выбранный кобальтовый бренд, ясное уточнение и иерархию выдачи.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: выбранные знак 5B, прописное 02 и палитра 02 «Кобальт»; прохладная бумага, светлая горизонтальная шапка с точным cobalt SVG, белые округлые поверхности, кобальтовые действия, Unbounded/Golos и настоящие обложки.
FORM: code-led продолжение одобренного бренда в рабочем Conversation. Источники текущего направления — research-vault/product-style-2026-11-03/DIRECTION.md и shared/product.css; утверждённая главная служит identity reference, её веера и маркетинговая композиция не копируются в формы. Контуры production SVG сохранены; исходный kit — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. Новая айдентика, workshop и raster comp не требовались.
История: Conversation выбран 02.11.2026; seed 537787fa относится к прежнему site-design-reset и не обосновывает нынешнюю форму. Прежние тёплая система и frozen-граница описывали тот этап. Одобренные четыре файла главной не менялись в текущем продолжении продукта; исторические receipts сохранены.

STORY: сегодняшнее желание → полезный вопрос → проверка понимания → до 4 допустимых предложений → план/вечер/знакомство.
FIRST VIEWPORT: выбранный раздел явно назван «Подбираем фильм / сериал / мультфильм»; header сохраняется на вопросе/review/pending/error/result. На телефоне короткий запрос и текущая работа, полный context раскрывается.

## Shipped composition and behavior

Наследует текущую композицию game brief и shared/product.css: светлая sticky-шапка max1440px/min88px с точным cobalt SVG148px, постоянным доменом и библиотекой; phone logo122px/≤360px108px, домен отдельной второй строкой. Workspace context252px/gap32px, tablet218px/gap24px, phone одна колонка/gap16px. Scroll-padding112px/phone140px. Вопрос на белой поверхности radius32px/tablet28px/phone26px/tiny24px; H1 Unbounded30px/phone25px/tiny23px. Textarea min116px; ответы18px radius, phone16px; действия/pills999px и inline Next min48px.

На телефоне обычный request preview≤2строк; первая неясность целиком с «Уточнить», полный запрос по «Показать / Свернуть». До модельной сводки остаются отправленные «Твои слова». Progress — четыре text steps12px без цифр/соединителей; current650/aria-current=step. При ≤360px сетка2×2/gap4px12px. Это этапы, а не число обязательных вопросов.

Первая белая card занимает всю сетку: radius32px56px32px32px, padding30px, poster190px и title30px. Tablet radius28px/poster130px/title26px; phone radius26px42px26px26px/poster80px/title23px/tiny22px, причина/оговорки/actions во всю ширину. Альтернативы под отдельным заголовком21px/phone20px: сетка3/2/1, radius24px/padding22px, phone20px18px/cover72px. Featured viewing poster2:3; контейнеры альтернатив4:3 на всех ширинах по более специфичному media selector. Изображения object-fit:contain. Непрозрачная подложка успешного picture исключает просвечивание titlefallback; ошибка загрузки сохраняет текст. Причины, оговорки, известная длительность/сезоны/эпизоды и внешняя ссылка остаются; неизвестное не обещается проверенным.

У неясного пункта собственная форма полного самостоятельного ответа и draft, в correct.text только слова человека. Дополнение запроса отдельно. Error/cancel/reload сохраняют drafts; предыдущие запрос и выдача восстанавливаются локально из correctioncheckpoint. Условия зависят от раздела: film без serial controls, episode/session/whole-story различаются, cartoon не означает детей; age только при children. Локальный onlyEnded сохраняется без model spinner. Planning/picking/replacement status min360px/phone300px, три bars7×28px/1.25s; reduced-motion отключает движение.

## Data and evidence

Media state/history domain-scoped, игровые defaults прежние. Библиотека получает все 4 раздела; familiarity не равна вкусу/плану/прохождению. Legacy не импортируется молча. Каталоги и policy не менялись.

## Evidence boundary

Текущий этап — docs/PRODUCT_STYLE_2026-11-03.md; пакет — research-vault/product-style-2026-11-03/REVIEW_PACKET.md, review и замечания — FINISH_REVIEW.md рядом. Проверка родителя: 509/509 unit, HTTP stub и production build; native IAB на изолированном 5180 с настоящими контроллерами/каталогом и stub plan/pick. CSS viewport: 1440×1000, 1280×720, 1024×900, 390×844 и 320×740. Канонические captures и DOM-замеры — .impeccable/review/product-style-2026-11-03/. Исправление progress при ≤360px записано по последнему исходнику; родитель сообщил о пересъёмке и визуальной проверке tiny/mobile/desktop по тем же canonical paths. Итоговый re-review фиксируется отдельно.

Размер native PNG местами меньше CSS viewport: в первом review отмечены 380×822 при CSS 390×844 и 310×717 при CSS 320×740. JPEG→PNG сохранён без resize/crop; документер не устанавливал причину различия. Размеры растров не выдаются за размеры CSS. Этот проход сверяет код и документы; браузер, сервер, API и тесты документер не запускал, finish verdict не присваивал.

Платных API-вызовов 0 / $0, генераций изображений 0 в текущем этапе по отчёту родителя; этот проход тоже не выполнял вызовов. Stub не доказывает качество реальной модели или human fit. Физический touch и screen reader не проверялись. Публикации нет; пользовательские состояния и оплаченные журналы не использованы. Старые evidence и бюджеты не перезаписаны.

Предыдущий adaptive-media этап02.11 имел4 real-modelchains/12calls/$0.1772022: неизменяемая история research-vault/adaptive-media-2026-11-02/, не новые доказательства нынешнего UI.
