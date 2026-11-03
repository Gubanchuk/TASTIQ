---
name: TASTIQ — Кобальтовый разговор
description: Выбранный кобальтовый бренд на единой главной, адаптивном подборе и библиотеке.
colors:
  primary: "#3154d6"
  ink: "#1c2945"
  paper: "#f1f4fc"
  dark: "#15213d"
  inverse: "#dfe8ff"
  accent: "#abc9ed"
  surface: "#fff"
  context: "#e7ecf8"
  fill: "#e3e9f7"
  primary-hover: "#2544b8"
  primary-press: "#1e3898"
  muted: "#52617d"
  line: "#c9d3e9"
  strong-line: "#9aaaca"
  selected: "#dce5ff"
  error: "#8c3042"
  error-bg: "#fff0f2"
  error-line: "#d4a0aa"
  known-line: "#6c8070"
  liked-text: "#3e6246"
typography:
  hero:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "clamp(34px, 3.6vw, 52px)"
    fontWeight: 500
    lineHeight: 1.27
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.035em"
  landing-headline:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "clamp(34px, 3.5vw, 50px)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  landing-finale:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "clamp(34px, 3.7vw, 54px)"
    fontWeight: 500
    lineHeight: 1.28
    letterSpacing: "-0.035em"
  featured-title:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  label-primary:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.5
  meta:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  poster: "3px"
  card: "4px"
  control: "5px"
  game-control: "6px"
  product-pill: "999px"
  product-chip: "10px"
  product-field: "20px"
  product-field-phone: "18px"
  product-choice: "18px"
  product-choice-phone: "16px"
  product-question: "32px"
  product-question-tablet: "28px"
  product-question-phone: "26px"
  product-question-tiny: "24px"
  product-featured: "32px 56px 32px 32px"
  product-featured-tablet: "28px"
  product-featured-phone: "26px 42px 26px 26px"
  product-alternative: "24px"
  product-featured-poster: "18px"
  product-alternative-poster: "16px"
  product-library-card: "22px"
  product-library-field: "14px"
  product-library-cover: "12px"
  landing-door: "32px"
  landing-cover: "12px"
  landing-cover-phone: "9px"
  landing-arch: "160px 160px 38px 38px"
  landing-arch-phone: "120px 120px 28px 28px"
  landing-finale: "76px 76px 0 0"
  landing-finale-phone: "42px 42px 0 0"
  landing-pill: "999px"
  landing-final-choice: "24px"
  landing-final-choice-phone: "20px"
spacing:
  sm: "8px"
  control: "12px"
  md: "16px"
  group: "20px"
  lg: "24px"
  card: "28px"
  product-card: "30px"
  product-work: "32px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.product-pill}"
    typography: "{typography.label-primary}"
    padding: "10px 17px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-game-next:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.product-pill}"
    padding: "12px 21px"
    height: "48px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.product-pill}"
    padding: "10px 17px"
    height: "46px"
  choice-game:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-choice}"
    padding: "16px 18px"
    height: "64px"
  choice-game-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
  context-chip:
    backgroundColor: "{colors.context}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-chip}"
    padding: "5px 9px"
  field-game:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-field}"
    padding: "16px 18px"
    height: "116px"
  question-board:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-question}"
    padding: "28px 32px 34px"
  result-featured:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-featured}"
    padding: "30px"
  result-alternative:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-alternative}"
    padding: "22px"
  library-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-library-card}"
    padding: "18px"
  product-nav-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-pill}"
    padding: "10px 16px"
    height: "44px"
  rail-item-current:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "10px 9px"
  landing-action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.landing-pill}"
    padding: "12px 22px"
    height: "48px"
  landing-final-choice:
    textColor: "{colors.inverse}"
    rounded: "{rounded.landing-final-choice}"
    padding: "16px 22px"
    height: "68px"
---

# Design System: TASTIQ — Кобальтовый разговор

## Overview

**Creative North Star: "Разговор"**

Владелец выбрал Conversation 02.11.2026 и 03.11.2026 утвердил его бренд: знак 5B, прописное написание 02 и палитру 02 «Кобальт». Современные подбор и библиотека соединяют прохладное светлое поле, горизонтальную светлую sticky-шапку, кобальтовые действия, округлые рабочие поверхности и геометрические заголовки. Содержание остаётся главным: запрос, один вопрос, проверяемое понимание, предложение с причиной и оговорками.

Система действует на всей главной, /pick/game/, /pick/watch/, /library/ и сохранённом legacy /pick/. Верх главной, двери и footer входят в текущий бренд; одобренная главная не менялась при продолжении оформления продукта. Утверждённые SVG из src/server/public/assets/brand/ сохраняют контуры и пропорции; исходный комплект — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. Цвета и шрифты задаёт shared/brand.css, современную рабочую форму — последний слой shared/product.css под body.product-page. Тёмный rail и прежние компактные прямоугольники относятся к legacy; они не задают форму новых экранов.

История решений: тёплая бумага, медь и отдельный исходный верх описывали Conversation 02.11.2026. Сообщение о временной палитре и отсутствии выбранного логотипа относилось к поиску до выбора 03.11.2026. Нынешнее прямое поручение заменить оформление всей страницы отменило прежнюю границу frozen hero. Старые receipts в research-vault/site-design-reset-2026-11-02/ и research-vault/logo-2026-11-02/ сохраняют историю, но не задают текущую норму.

**Key Characteristics:**

- Одна светлая кобальтовая система на главной, в подборе и библиотеке; тёмные области используют тот же бренд.
- Утверждённый контурный логотип; Unbounded задаёт голос заголовков, Golos — содержание и действия.
- Смысл состояния выражен словами и формой вместе с цветом.
- Первое предложение имеет собственную белую поверхность; альтернативы читаются ниже отдельного заголовка.
- Светлая шапка удерживает текущий раздел; округлая рабочая поверхность сменяется отдельными карточками выдачи.

## Colors

Шесть утверждённых цветов бренда образуют основу; прохладные поверхности и функциональные состояния извлечены из shared/brand.css. Точные значения frontmatter нормативны, имена совпадают с ролями в построенном интерфейсе.

### Primary

- **Кобальт** (primary) — логотип на светлом фоне, продолжение, выбранный ответ, выбор на вечер, активная навигация, ссылки, caret и focus. primary-hover и primary-press — существующие состояния controls.
- **Светлый синий** (accent) — поддерживающий текст и focus на тёмном финале главной; не самостоятельный второй primary.

### Neutral

- **Чернила** (ink) — основное содержание; **вторичный текст** (muted) — пояснения и метаданные.
- **Прохладная бумага** (paper) — основное поле; **белая поверхность** (surface) — ответы, поля, первое предложение и библиотечные карточки. **Контекст** (context) отделяет запрос; fill — небольшие функциональные заливки.
- **Тёмный синий** (dark) — legacy rail, одна из арочных подложек, финал главной и footer; **обратный свет** (inverse) — логотип и основное содержание на тёмном фоне. Современная рабочая шапка использует paper и cobalt SVG. Остальные подложки дверей используют accent, primary и inverse.
- **Линия / сильная линия** (line, strong-line) — разделители, рамки, поля и прогресс; selected поддерживает выбранный ответ и выделение текста.
- **Ошибка** (error, error-bg, error-line) — сообщение с явным действием восстановления. Сохранённые known-line и liked-text служат подписанным статусам библиотеки, а не новым акцентам бренда.

**The State Has Words Rule.** Цвет поддерживает подпись, check, underline, границу или текущий шаг; он не заменяет смысл состояния.

## Typography

**Display Font:** Unbounded с Golos/sans-serif fallback. **Body Font:** Golos с Arial/sans-serif fallback. Локальные variable TTF используют font-display:swap; лицензии SIL OFL лежат рядом. Логотип состоит из утверждённых SVG-контуров и не набирается одним из этих шрифтов. Onest объявлен в унаследованном shared CSS, но не используется как голос production-поверхностей.

### Hierarchy

- **Hero:** заголовок главной из frontmatter; при ≤1050px — 35px, на телефоне fluid 29–40px, при ≤360px — 28px.
- **Display:** библиотека; на телефоне — 28px. Ширина планшета не меняет текущие 32px.
- **Headline:** адаптивный вопрос и результат; 30px/1.35, на телефоне 25px, при ≤360px вопрос 23px, заголовок результата остаётся 25px. Максимум 26ch. Главная использует отдельные landing-headline для механизма и landing-finale для приглашения: на телефоне — 34px и fluid 29–40px соответственно, при ≤360px — 30px и 28px.
- **Featured title:** первое предложение; при 761–1150px — 26px, при ≤760px — 23px, при ≤360px — 22px. Это голос названия, а не второй display-шрифт.
- **Title:** альтернативы; заголовок их группы — Golos 600, 21px/1.4 и 20px на телефоне. Библиотечные названия плотнее: 14px/1.45, вес 650; при 761–1100px — 13px, от 1500px — 15px.
- **Body:** рабочий текст; пояснения и причины 14px/1.8, у первого предложения 16px/1.8 и 15px на телефоне. Текст причины ограничен 62ch, помощь — 65ch. Главная использует 15–17px/1.8–1.85 в пояснениях и 14px/1.8 в шагах механизма.
- **Label / meta:** controls обычно 12–13px, вторичные подписи и этапы 12px. Текущий раздел — Golos 650, 18px/1.4, на телефоне 17px, при ≤360px 16px. Счётчики используют tabular-nums. Локальные размеры миниатюр не образуют шкалу основного текста.

**The Logo Is an Asset Rule.** Использовать утверждённый SVG целиком и масштабировать пропорционально; не заменять знак и надпись наборным текстом или новым рисунком.

## Layout

Точная композиция зависит от поверхности и записана в .impeccable/surfaces/. Главная имеет max-width 1440px и общий gutter clamp(20px,5vw,80px); четыре веера обложек стоят в ряд, при ≤760px — две колонки. Подписи разделов остаются на бумаге под изображениями. Светлые header, первый экран и последовательность шагов продолжают друг друга; тёмный финал с округлым верхом продолжается в footer. Механизм и финал используют две колонки, при ≤760px — одну; gaps дополнительно сужаются при ≤1050px. Четыре конечных действия всегда стоят одной колонкой. Все переходы главной ведут к выбору раздела или напрямую в соответствующий адаптивный подбор; библиотека доступна внутри приложения.

Современный app shell имеет горизонтальную sticky-шапку (top 0, z-index 50), max-width 1440px, минимум 88px, padding 16px clamp(20px,4vw,64px). Слева cobalt SVG шириной 148px, в центре текущий раздел и «Сменить раздел», справа библиотека; её собственная шапка ведёт в «Новый подбор». На телефоне logo 122px и действие стоят первой строкой, раздел второй; у библиотеки строки раздела нет. При ≤360px logo 108px. Scroll-padding-top — 112px, на телефоне 140px. Текущий раздел сохраняется на вопросе, review, ожидании, ошибке и результате.

Адаптивный запрос и работа стоят рядом в контейнере до 1440px: context 252px, gap 32px, поля clamp(20px,4vw,64px), margin 28px auto 70px. При 761–1150px context 218px и gap 24px. Рабочая поверхность вопроса имеет padding 28px 32px 34px; планшет 25px, телефон 20px, при ≤360px 18px 16px. На телефоне контекст и работа идут одной колонкой с gap 16px и внешними полями 16px. Контекст начинается с краткого preview: обычная сводка ограничена двумя строками, исходная неясность показана целиком рядом с «Уточнить». «Показать / Свернуть» раскрывает полный запрос; длинные условия и история не занимают весь первый экран по умолчанию. Четыре текстовых этапа показываются без цифровых кружков и соединителей на всех ширинах. На планшете и телефоне они занимают отдельную строку; при ≤360px — сетку 2×2 с gap 4px 12px и текстом 12px. Текущий этап выделен весом 650 и aria-current=step; это не кликабельные tabs и не обязательное число вопросов.

Выдача снимает внешнюю рамку рабочей поверхности: первое предложение занимает всю ширину сетки, ниже общий заголовок и отдельные альтернативы в трёх колонках. При 761–1150px — две колонки, на телефоне — одна. Широкая сетка имеет gap 20px, планшет 16px. Библиотека использует контейнер до 1440px и padding 38px clamp(20px,4vw,64px) 70px, на телефоне 28px 20px 50px. Три равных списка имеют gap 23px (при 761–1100px 14px); при ≤760px виден один выбранный список, поиск остаётся на месте, фильтры раскрываются. Только legacy /pick/ сохраняет тёмный rail 164px, прежнюю композицию с контекстом и последовательными строками результатов.

Ритм задают небольшие gaps внутри controls и 20–32px между смысловыми группами. Действия современной рабочей поверхности и основные library buttons имеют min-height 46px, действия карточек и шапки — 44px; продолжение вопроса — 48px и ширину от 150px, на телефоне от 125px. Высоты component-токенов означают наблюдаемый минимум, русский текст может увеличить элемент.

**The Answer and Action Rule.** Продолжение остаётся в потоке сразу после ответов; оно не отделяется в footer окна.

## Elevation & Depth

Основа плоская: глубину дают разные поверхности, положение, масштаб названий и тонкие границы. Рабочая поверхность вопроса и первое предложение имеют слабые мягкие тени. Альтернативы и библиотечные карточки имеют собственные светлые поверхности с границей, без resting shadow. На главной мягкие тени разделяют три перекрывающиеся обложки и круглое действие; центральная обложка усиливает тень при раскрытии веера. Мягкие тени также обозначают меню, всплывающие подсказки и временное уведомление. Сохранённая legacy-маска линии desktop-прогресса не используется современными текстовыми этапами.

### Shadow Vocabulary

- **Question board:** 0 10px 32px #15213d05 — рабочая поверхность вопроса; внешняя поверхность снимается на выдаче.
- **Featured result:** 0 10px 30px #15213d06 — белое первое предложение.
- **Shared pop:** 0 8px 24px #22222220 — существующие всплывающие элементы.
- **Product menu:** 0 12px 30px #15213d16 — современное session menu. Прежняя Game pop (0 12px 28px #40302424) остаётся в нижнем слое CSS, но перекрыта product.css.
- **Library notice:** 0 12px 30px #30251a2c — временное фиксированное сообщение.
- **Landing cover:** 0 12px 24px #15213d24 — разделение перекрывающихся обложек.
- **Landing cover open:** 0 18px 30px #15213d30 — центральная обложка при hover/focus.
- **Landing arrow:** 0 5px 14px #15213d12 — круглое действие поверх веера.

Тени и motion живут в sidecar. Не переносить тень featured result на все карточки автоматически.

## Shapes

Современные действия — pills (product-pill); поля и карточки имеют собственные роли product-*. Вопрос использует product-question, на планшете/телефоне/узком телефоне его соответствующие варианты. Первое предложение выделено асимметричным верхним правым углом (product-featured), альтернативы — product-alternative, карточки библиотеки — product-library-card. Контекст лежит прямо на бумаге. Компактные poster/card/control/game-control относятся к унаследованным мелким элементам и legacy, а не к форме новых рабочих экранов. Прежние featured-радиусы 7/9/12px больше не задают актуальные токены. Главная имеет собственную форму: арочные подложки, скруглённые обложки, pill-действия, крупное скругление верхнего края финала и мягкие прямоугольные ссылки в нём. Все rounded.landing-* локальны для главной; её арки и веера не переносятся в рабочую форму подбора. Иконки — authored inline SVG, обычно 18–22px, stroke 1.5–1.7; служебный chevron обозначает раскрытие.

## Components

### Buttons

Кобальтовый primary, прозрачный secondary и тихий plain. Современные stage и library buttons используют pills и padding 10px 17px; продолжение — 12px 21px. Context actions плотнее: 9px 14px, минимум 44px. Hover меняет фон, focus сохраняет видимый outline. Disabled снижает opacity: shared .48, library .55. Несколько карточек могут иметь собственные основные действия — количество primary определяется действием человека, а не квотой акцента. Компактные прямоугольные controls прежних библиотечных «Вечеров» и legacy сохраняются локально.

На главной primary-действия используют landing-pill и min-height 48px; header при ≤760px снижает минимум до 44px. Прямые ссылки тёмного финала используют landing-final-choice, границу accent с прозрачностью и кобальтовую заливку на hover; минимум 68px desktop и 62px phone. Высота в component-токене обозначает наблюдаемый минимум, а не ограничение текста.

### Chips

Небольшие summary chips с заливкой context и radius product-chip показывают подтверждённое желание и условия; padding 5px 9px, на телефоне 3px 7px. Legacy сохраняет интерактивные reason/complaint chips. Цвет и форма дополняют буквальную формулировку, не заменяют её.

### Cards / Containers

Адаптивная выдача содержит до четырёх допустимых предложений. Первое выделено белой поверхностью, размером названия, постером и отступами; ниже стоит отдельный заголовок «Другие варианты». Desktop featured использует колонки 190px + текст, padding 30px и gap 30px. При 761–1150px постер 130px, padding 24px и gap 22px; на телефоне 80px рядом с названием, padding 22px 18px и gap 17px, а причина, оговорки и действия занимают всю ширину. Альтернативы — отдельные карточки padding 22px с обложкой во всю ширину; на телефоне обложка 72px рядом с названием, padding 20px 18px, ниже текст и действия на всю ширину. Меньшее число подходящих предложений не дополняется ради сетки.

В адаптивной выдаче для игр обложка сохраняет 16:9 на широком экране, у телефонной альтернативы контейнер 2:3. Для просмотра featured остаётся 2:3, альтернативы имеют контейнер 4:3 на всех ширинах; сами изображения используют object-fit:contain. Пока изображение не загрузилось, виден текстовый fallback. Picture становится непрозрачным только после успешного load; его непрозрачный фон защищает от просвечивания fallback через прозрачные части изображения. Ошибка загрузки возвращает текст. Библиотечная карточка — белая плитка с границей, padding 18px (телефон 16px), gap 16px, cover radius product-library-cover; перенос между планами и раскрытие отношения независимы.

### Входы главной

Каждый раздел — одна целая ссылка с веером из трёх настоящих обложек (2:3, object-fit:cover), арочной подложкой, круглой SVG-стрелкой и отдельной подписью на бумаге. При hover и focus раскрываются только обложки; подпись не смещается. Все 12 изображений загружаются eager. Название и год остаются текстовым fallback до принятого портретного изображения; после load текст скрывается, ошибочный или горизонтальный источник заменяется следующим. При недоступных данных сами четыре ссылки остаются в HTML и работают.

### Inputs / Fields

Поле основного ответа лежит на прохладной бумаге, имеет тонкую сильную границу, кобальтовый caret и outline. Textarea — минимум 116px, padding 16px 18px, на телефоне 14px 16px. Поля контекста остаются белыми, textarea радиусом 16px; неясный пункт имеет соседнюю кнопку «Уточнить», собственный textarea минимум 115px и независимый draft. «Дополнить запрос» — отдельное действие. После принятой поправки предыдущий запрос и варианты можно восстановить без модели. Текст и результат сохраняются при отмене, ошибке и reload.

В legacy search «Почему не показал…» сохраняет padding-left 36px после иконки. В библиотеке поиск обёрнут полем с focus-within; фильтры используют native select. Многострочный текст не ограничен фиксированной высотой.

### Navigation

Светлая горизонтальная шапка использует утверждённый cobalt SVG. Раздел обозначен словами, соседняя ссылка ведёт к четырём входам главной; справа доступна «Библиотека». В библиотеке справа кобальтовое pill-действие «Новый подбор». На телефоне строка раздела идёт после logo и действия. Только legacy сохраняет тёмный rail, inverse SVG, «Подобрать / Библиотека» и список доменов; его навигационный snippet в sidecar явно помечен legacy. Некликабельный прогресс обозначает четыре этапа, не количество обязательных вопросов; aria-current=step остаётся и в сетке 2×2.

### Named processing / recovery

Адаптивный status занимает текущую работу: минимум 360px desktop и 300px mobile. Три кобальтовых bars 7×28px используют scale/opacity (1.25s ease-in-out, delays .15/.3s); заголовок называет планирование, подбор или замену. Live status вне busy editable main получает фокус; ответ сохранён, контекстные действия временно блокируются. Ошибка показывает явный Retry. Локальное сохранение условия не имитирует ожидание модели. Legacy сохраняет собственный central status и spinner.

### Library board

«На потом / На этот вечер / Уже знакомо» — планы; вкус, знакомство и отзывы о вечере независимы. Поиск всегда виден; phone «Фильтры и порядок» имеет подпись, chevron и count. Перенос через select, удаление с undo, архив, вечера и пустые состояния работают с настоящими browser-local записями. Главная не читает личные планы и не показывает библиотечное промо; никаких вымышленных отзывов или статистики продукта.

### Browser surfaces, focus and motion

Общий и адаптивный focus — 3px primary с offset 4px; библиотека — 2px с offset 4px, поиск — 2px с offset 3px, главная — 3px с offset 7px. Более специфичные унаследованные input rules могут дополнять ring. В тёмном финале и footer главной outline использует accent. Library hover — .18s cubic-bezier(.16,1,.3,1), stage buttons — .18s ease; game choice сохраняет .16s ease-out. Обложки главной раскрываются на hover/focus за .48s cubic-bezier(.16,1,.3,1); секции не имеют entrance animation. prefers-reduced-motion отключает переходы, анимацию и smooth scroll в приложении; на главной отключает переходы и smooth scroll, а веер сохраняет исходные углы даже при hover/focus. Процент и ETA ожидания не выдумываются.

## Do's and Don'ts

### Do:

- **Do** использовать утверждённые cobalt/inverse SVG и общие роли кобальтового бренда на всех production-поверхностях.
- **Do** показывать состояние словами и формой вместе с цветом.
- **Do** оставлять вопрос, ответы и продолжение в одной рабочей колонке.
- **Do** показывать краткий запрос на телефоне, исходную неясность целиком и явное раскрытие полного контекста.
- **Do** сохранять причину, оговорку, действия и текстовый fallback при любом состоянии обложки.
- **Do** сохранять независимые черновики и возможность вернуться к предыдущему запросу и вариантам без модели.

### Don't:

- **Don't** возвращать прежнюю медную палитру или frozen-границу главной как действующие ограничения.
- **Don't** перерисовывать утверждённый знак, растягивать логотип или заменять его наборной надписью.
- **Don't** смешивать план, вкусовую оценку и знакомство одним цветным статусом.
- **Don't** подменять SVG-иконки Unicode-глифами или добавлять декоративные надписи над заголовками.
- **Don't** превращать временное ожидание в заявленный процент, ETA или доказательство качества рекомендаций.
- **Don't** считать неизвестное проверенным или тестовые локальные записи человеческими оценками.
