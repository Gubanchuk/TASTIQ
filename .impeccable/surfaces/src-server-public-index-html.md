---
version: 1
slug: "src-server-public-index-html"
primary_target: "src/server/public/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/style.css","src/server/public/landing-bottom.css","src/server/public/app.js","src/server/public/assets/brand/"]
---

Mode: Persuade. Главная помогает начать подбор в одном из четырёх разделов. Владелец 03.11.2026 разрешил менять композицию, отверг квадратные входы и потребовал направить все действия к подбору. Отдельно отклонены текст «с разговора» и сцена реплик, создающие впечатление универсального чата. Это ограничение представления на главной; выбранный Conversation внутри приложения сохраняется.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: выбранные знак 5B, прописное 02 и палитра 02 «Кобальт»; прохладная бумага, тёмный синий, кобальтовые действия, Unbounded/Golos и настоящие обложки. Контуры production SVG и общие brand-токены сохранены; исходный kit — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/.
STORY: сегодняшний выбор → четыре веера разделов → понятная последовательность подбора → четыре прямых входа на вечер.
FIRST VIEWPORT: cobalt SVG в header, Unbounded headline, четыре равноправных веера по три реальные обложки, арочные подложки и подписи на бумаге. Изображения помогают выбрать раздел; название и ссылка не зависят от их загрузки.
FORM: «Раскрывающийся выбор», ограниченное расширение утверждённого кобальтового мира. Один выразительный motion — раскрытие веера на hover/focus; при reduced-motion исходные углы статичны. Механизм объяснён упорядоченными шагами без реплик, говорящих и псевдополей. Округлый верх тёмного финала продолжается в footer.

Текущий direction: research-vault/landing-unfold-2026-11-03/DIRECTION.md. История: code-led Conversation выбран 02.11.2026, seed 537787fa/deal 6/4/5; полный бренд перенесён 03.11.2026. Прежняя frozen-граница, квадратные двери, сцена реплик и библиотечное промо описывали прошлые этапы. Исторические receipts не перезаписываются и не задают текущую композицию.

## Shipped composition

- Общая ширина 1440px и gutter clamp(20px,5vw,80px); header min-height 96px, logo 164px. Hero h1 clamp(34px,3.6vw,52px)/1.27/500, max-width 17ch; intro 1.15fr/1fr, gap 70px. Кобальтовые CTA имеют pill-radius 999px и min-height 48px.
- Четыре двери стоят в ряд с gap 26px. Высота art clamp(230px,24vw,306px), при ≥1600px — 326px. Арочная подложка начинается на 24px ниже верхнего края; radius 160px 160px 38px 38px. Три portrait cover 2:3 имеют radius 12px и мягкую тень; исходные углы −16°/−3°/15°. Средняя обложка шире (52%). Подписи вынесены на бумагу: 24px/1.35/600 и counts 13px. Counts берутся из данных каталога, а не обозначают число рекомендаций.
- На hover/focus боковые обложки раскрываются до −22°/21°, средняя поднимается на 12px и выпрямляется. Transform и shadow: .48s cubic-bezier(.16,1,.3,1). В reduced-motion сохраняются исходные углы, переходы и smooth scroll отключены. Целая дверь остаётся одной ссылкой, SVG-стрелка декоративна.
- Механизм: 1fr/1.08fr, gap 110px, padding 76px 0 90px и верхняя hairline. Заголовок clamp(34px,3.5vw,50px)/1.3/500. Четыре пункта ol обозначают желание, детали, проверку понимания и варианты; номера 30px Unbounded, названия 20px Golos, пояснения 14px/1.8. Это порядок действий, не фиксированное количество вопросов и не статистика продукта.
- Тёмный финал находится вне main, до footer, и имеет radius 76px 76px 0 0. Внутри 1.1fr/1fr, gap 95px, padding 72px 0 66px; heading clamp(34px,3.7vw,54px)/1.28/500. Четыре прямых ссылки стоят одной колонкой с gap 10px, min-height 68px, padding 16px 22px, radius 24px и border #abc9ed55. Hover заполняет ссылку кобальтом. Footer продолжает тот же dark-фон.
- При ≤1050px gaps сужаются, hero 35px, art 242px, подписи дверей 21px. При ≤760px intro, механизм и финал становятся одной колонкой; двери — 2×2 с art clamp(176px,47vw,270px), gap 27px 20px и арками 120px 120px 28px 28px. Cover radius 9px; подпись 20px. Header min-height 82px, logo 128px, header CTA min-height 44px. Финал получает radius 42px 42px 0 0; ссылки min-height 62px, radius 20px, текст 21px. При ≤360px hero/finale 28px, method 30px, logo 110px, art 165px, подписи дверей 18px.
- Focus ссылок: primary 3px с offset 7px; в тёмном финале и footer — accent. Программный переход #doors фокусирует nav, отдельный outline контейнера скрыт; сами ссылки сохраняют видимый focus. Логотипы cobalt/inverse масштабируются пропорционально.

## Data and routes

В HTML 13 ссылок: пять #doors, по два прямых входа в /pick/game/ и /pick/watch/?domain=film|series|cartoon. Нет перехода в библиотеку и нет чтения library-store/localStorage/IndexedDB. Статические маршруты доступны даже при failed fetch.

app.js читает только /data/example-evenings.json: counts и до трёх уникальных реальных записей на раздел, всего до 12 eagerly loaded обложек. Сначала используются существующие COVER_IDS, затем доступные записи. HTTP(S)-источники проверяются; горизонтальное изображение и ошибка переводят к следующему источнику. Название и год видны до принятого load, затем текстовый fallback скрывается. Новые изображения, каталожные записи, отзывы или пользовательские планы не создаются.

## Evidence boundary

Текущий отчёт родителя: docs/LANDING_UNFOLD_2026-11-03.md. Проверка родителя: syntax, media-view 6/6, VM с настоящими данными/ошибкой fetch/небезопасным image URL, четыре настоящих AI-off маршрута до собственного первого вопроса, viewport 1440/390/320 без overflow, production build и diff check. Документер сверил исходные index/style/landing-bottom/app.js и shared/brand.css; браузер, сервер, API и тесты не запускал, собственного finish verdict не присваивает. Независимый material review записывается отдельно.

Канонические captures: .impeccable/review/landing-unfold-2026-11-03/desktop-verified.png, desktop-full.png, mobile-top.png, tiny-top.png, desktop-finale.png, mobile-finale.png, tiny-finale.png. desktop-top.png не использовать как доказательство. Визуальное «вау» оценивает владелец; тесты и документирование его не доказывают.

Responses 0 / $0, imagegen 0. Human fit, physical touch и screen reader не измерены. Публикации/коммита нет; ядро, внутренний Conversation, каталог, ranking, платные guards, пользовательские состояния и исторические receipts не изменялись в этом scope.

## Одобрение владельца

Владелец одобрил новый лендинг 03.11.2026: «вооо охуенно». Утверждён текущий визуальный вариант: веера обложек, арочные подложки, этапы подбора без чат-сценки и финальные входы в подбор. Это одобрение оформления, а не замер качества рекомендаций. Не переоткрывать выбор направления без нового поручения.

## Коррекция по обратной связи 03.11.2026

Общие входы теперь /pick/start/; внешний мир и бренд прежние. Первый вопрос shared/conversation-entry.js создаётся без API. В shared/question-form.js желания выше раскрываемых жанров/ограничений/своих слов, нейтральные ответы ниже. В выдаче доступны more/уточнение/undo без перезапуска анкеты. Текущий проверенный scope и ограничения: docs/PICKER_FEEDBACK_2026-11-03.md; прежнее landing byte-identical относится к предыдущей переработке.
