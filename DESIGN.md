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
  workspace-soft: "#e9eefb"
  workspace-line: "#d8e0f0"
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
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.035em"
  result-headline:
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
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
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
  request-fact:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.65
  result-meta:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.65
  result-caveat:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.7
  select-value:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
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
  product-control: "12px"
  product-primary: "13px"
  product-chip: "9px"
  product-field: "16px"
  product-choice: "14px"
  product-direction: "12px"
  product-shell: "20px"
  product-request: "24px"
  product-request-phone: "18px"
  product-editor: "20px"
  product-editor-phone: "16px"
  product-question: "26px"
  product-question-tablet: "26px"
  product-question-phone: "22px"
  product-featured: "28px"
  product-featured-phone: "24px"
  product-alternative: "24px"
  product-poster: "14px"
  product-poster-phone: "12px"
  product-library-card: "22px"
  product-library-field: "14px"
  product-library-cover: "12px"
  product-library-button: "999px"
  product-step: "50%"
  product-popover: "14px"
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
    rounded: "{rounded.product-control}"
    typography: "{typography.label-primary}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-game-next:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.product-primary}"
    padding: "12px 21px"
    height: "48px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.product-control}"
    padding: "10px 17px"
    height: "44px"
  choice-game:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-choice}"
    padding: "14px 17px"
    height: "58px"
  choice-game-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.primary}"
  context-chip:
    backgroundColor: "{colors.workspace-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-chip}"
    padding: "6px 9px"
  field-game:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-field}"
    padding: "16px 18px"
    height: "122px"
  question-board:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-question}"
    padding: "26px 32px 30px"
  result-featured:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-featured}"
    padding: "30px"
  result-alternative:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-alternative}"
    padding: "24px"
  library-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.product-library-card}"
    padding: "18px"
  product-nav-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.product-control}"
    padding: "10px 16px"
    height: "44px"
  custom-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.select-value}"
    rounded: "{rounded.product-control}"
    padding: "11px 13px"
    height: "46px"
  library-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.product-library-button}"
    padding: "10px 17px"
    height: "46px"
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

Владелец выбрал Conversation 02.11.2026 и 03.11.2026 утвердил знак 5B, прописное написание 02 и палитру 02 «Кобальт». Прохладное светлое поле, точный SVG, белые рабочие поверхности, кобальтовые действия и Unbounded/Golos сохранены. Иерархию задают запрос, один вопрос, исправление понимания и предложение с причиной и оговорками.

После отклонения предыдущего product UI владелец поручил существенную автономную переработку. Эта запись описывает её построенный код и свежие captures после F1/F2; новое оформление ещё не одобрено владельцем. Четыре файла одобренной главной в этом этапе byte-identical. Старые тёплая палитра, seed 537787fa и receipts — история.

Система действует на главной, /pick/game/, /pick/watch/, /library/ и legacy /pick/. Утверждённые SVG из src/server/public/assets/brand/ сохраняют контуры и пропорции; kit — research-vault/logo-symbols-2026-11-03/brand-cobalt-v1/. Бренд задаёт brand.css, современную форму — product.css, затем workspace.css/custom-select.css/results.css. Порядок подключения существенен; legacy сохраняет собственную композицию.

**Key Characteristics:**

- Один выбранный кобальтовый бренд; рабочая композиция не копирует веера главной.
- Точный SVG; Unbounded для заголовков, Golos для содержания.
- Состояние выражено словами и формой вместе с цветом.
- Плавающая desktop-шапка, сгруппированный запрос и центральный редактор.
- Полная обложка, собственная высота карточки и один выбранный список библиотеки.

## Colors

Шесть утверждённых цветов сохранены. Значения frontmatter нормативны; workspace-soft/workspace-line извлечены из рабочего CSS, новый бренд не вводится.

### Primary

- **Кобальт** (primary) — логотип на светлом фоне, продолжение, выбор на вечер, текущий этап и focus; primary-hover/primary-press — существующие состояния.
- **Светлый синий** (accent) — поддержка тёмного финала главной, не второй primary.

### Neutral

- **Чернила** (ink), **вторичный текст** (muted) — содержание и пояснения.
- **Прохладная бумага** (paper), **белая поверхность** (surface) — поле и рабочие поверхности. Context/fill/workspace-soft разделяют группы и подписанные состояния; workspace-line — локальная граница шапки.
- **Тёмный синий** (dark), **обратный свет** (inverse) — финал/footer/подложки главной и legacy rail. Modern shell белый.
- **Линия / сильная линия** (line/strong-line) — поля и локальные границы; selected — выбранные состояния. Горизонтальные линии не служат каркасом новой работы.
- **Ошибка** (error/error-bg/error-line) имеет явное восстановление. Known-line/liked-text — локальные унаследованные статусы, не новые акценты.

**The State Has Words Rule.** Цвет поддерживает подпись, check, underline, границу или текущий шаг; он не заменяет смысл состояния.

## Typography

**Display Font:** Unbounded с Golos/sans-serif fallback. **Body Font:** Golos с Arial/sans-serif fallback. Локальные variable TTF: font-display:swap, SIL OFL рядом. Логотип состоит из SVG-контуров. Onest объявлен в нижнем CSS, но не является production display.

### Hierarchy

- **Hero:** сохранённая главная; ≤1050px35px, phone fluid29–40px, tiny28px. Landing-headline/landing-finale сохраняют отдельные роли: phone34px и29–40px, tiny30px и28px.
- **Display:** библиотека32px/1.3, phone28px. **Headline:** вопрос28px/1.35/max28ch, phone24px/1.4/tiny22px. **Result-headline:** отдельные30px/1.35, phone25px.
- **Featured title:** Golos60030px/1.25, tablet27px, phone26px/tiny24px. **Title:** альтернатива22px/1.3; групповой заголовок22px/1.4, phone21px.
- **Library title:** Golos60017px/1.45, ≤600px16px, ≤350px15px.
- **Body:**14px/1.7; featured reason16px/1.75, phone15px; alternative14px/1.75. Reason/help до65ch. Главная сохраняет15–17px/1.8–1.85 и14px/1.8 в механизме.
- **Local roles:** request-fact13px/1.65, result-meta13px/1.65, caveat13px/1.7, select-value50013px/1.5. Это фактические компонентные роли, не утверждение об общей кратной шкале. Controls12–14px; desktop domain55014px/1.5. Круг этапа12px, phone label11px/1.5; counts tabular-nums.

**The Logo Is an Asset Rule.** Использовать утверждённый SVG целиком и масштабировать пропорционально; не заменять знак и надпись наборным текстом или новым рисунком.

## Layout

Главная сохраняет max1440px/gutter clamp(20px,5vw,80px); четыре веера в ряд, phone две колонки. Подписи на бумаге. Механизм/финал две колонки, phone одна, gaps сужаются при1050px. Четыре конечных входа одной колонкой. Главная не читает личные планы и не превращается в библиотечное промо.

Desktop shell sticky top12px/z60/max1380px (от1500px1440px)/min76px/margin16px auto28px/padding14px24px. ≤1450px поля24px, ≤1100px padding12px18px/gap14px. SVG140px, видимые «Подбор»/«Библиотека», domain/restart/restore. Phone top0/radius0/no shadow/padding10px16px/logo120px (tiny105px): nav в первой строке, короткое имя раздела/restart во второй, restore при наличии в третьей. Library вместо домена имеет «Подобрать новое». Scroll-padding112px/phone146px.

Workspace max1380/1440px: request280px + работа/gap28px/margin0 auto64px; ≤1100px request250px/gap22px. Phone одна колонка/gap16px/поля14px/tiny10px/низ40px. Request — белая самостоятельная поверхность с группами фактов и условий. Phone preview сохраняет свои слова и «Уточнить один момент», полный запрос раскрывается. Редактор желания/неясности находится в центре с контекстом, draft и apply/cancel.

Вопрос padding26px32px30px, ≤1100px24px, phone20px18px, tiny18px14px. Ответы2колонки/phone1; направления3/2/2. Next после ответов, min48px/min-width145px. Четыре некликабельных этапа: круг27px/номер/check/label12px, текущий aria-current=step. ≤1100px отдельная строка, phone круг25px/label11px/4колонки. На mobile result back44×44 и четыре подписанных этапа делят ряд; accessible name back сохранён. Этапы не требуют четырёх вопросов.

Выдача снимает stage surface. Featured во всю ширину; alternatives3/2/1 при >1150/761–1150/≤760px/gap20px (tablet16/phone18). У каждой своя естественная высота. Phone title/meta перед полной art, затем причина, caveat и действия.

Библиотека max1440px/padding24px clamp(20px,4vw,64px)70px; phone18px20px50px. Один выбранный список на всех ширинах; card-grid2/1 при900px/gap16px. Search виден всегда. Desktop domain/reaction/order видимы, ≤1050px переходят во второй ряд; phone явный filter disclosure с count и отдельным reset. Три plan-переключателя — компактный phone-ряд. Вывод по24, «Показать ещё» добавляет до24. Empty и no-results различны; проверены0/1/130.

Mobile actions min44px. Desktop локальное удаление факта28×28 и neutral40px не выдаются за общую44px-норму. Component heights — наблюдаемые минимумы, текст может увеличить элемент.

**The Answer and Action Rule.** Продолжение остаётся в потоке сразу после ответов; оно не отделяется в footer окна.

## Elevation & Depth

Работа/карточки плоские: прежние question/featured shadows перекрыты. Белые поверхности и интервалы создают иерархию. Тень выделяет desktop shell и меню; phone shell без тени.

### Shadow Vocabulary

- **App shell:**0 4px24px #15213d08.
- **Domain menu:**0 16px48px #15213d20.
- **Custom select:**0 14px40px #15213d24, fixed/z2000.
- **Library active view:**0 2px6px #15213d08.
- **Library notice:**0 10px30px #15213d25, ink/white/z2100.
- **Landing cover/open/arrow:** сохранены0 12px24px #15213d24 /0 18px30px #15213d30 /0 5px14px #15213d12.
- **Shared pop:**0 8px24px #22222220 — унаследованное локальное устройство.

Motion/shadows в sidecar. Старые product-menu/game-pop/progress-line-mask относятся к нижнему/legacy CSS, не задают современную работу.

## Shapes

Рабочие controls — мягкие прямоугольники product-control/product-primary, ответы product-choice, направления product-direction. Shell/request/editor/question/cards имеют отдельные роли frontmatter. Круги stepper передают последовательность. Featured больше не имеет асимметричного угла; result-art не имеет фиксированного crop-ratio.

Library-button сохраняет локальный pill («Фильтры и порядок», reset, empty CTA) из позднего product.css; tabs/list/select прямоугольные. Library-card итогово22px/cover12px/gap16px/padding18px (phone16px): поздний product.css перекрывает одноимённые18/8px declarations library/style.css. Документ описывает cascade, не первый match.

Главная сохраняет арки/веера/pill-действия/округлый верх финала; landing-* локальны. Компактные poster/card/control/game-control — legacy. Иконки authored SVG18–22px/stroke1.5–1.7; CSS chevron/check обозначают действительное состояние.

## Components

### Buttons

Primary cobalt/white, secondary с границей или paper, plain без рамки. Stage44px/padding10px17px; next48px/12px21px/radius13px; card actions44px/10px13px. Hover меняет фон/границу, focus видим, disabled снижает opacity. Library pill не становится общей формой. Главная сохраняет action48px (header phone44px) и final-choice68px/phone62px.

### Chips

Условия запроса — статичные workspace-soft/padding6px9px/product-chip; факты13px/1.65 сгруппированы по смыслу с отдельным удалением. Это содержательные группы, не декоративные kickers. Legacy reason/complaint chips локальны.

### Cards / Containers

Featured desktop grid minmax(220px,.8fr)+minmax(0,1.5fr)/gap30px/padding30px; tablet180px/.85fr+1.35fr/gap24px/padding24px. Alternative padding24px. Phone обе block/padding22px20px, tiny20px16px; title/meta первыми, art следующей. Desktop featured art слева.

Art natural width/height/max-width100%/object-fit:contain, max-height featured420px/alternative220px desktop,320/280px phone. Нет modern16:9/2:3/4:3-контейнера. До load/error виден title fallback/min132px; success скрывает fallback и снимает минимум. Причины/caveats/actions доступны без картинки.

Library cover76px desktop, ≤900px80px, ≤600px62px, ≤350px46px; natural height/contain. Plan-select/remove/details независимы. Меньшее число предложений не дополняется ради сетки.

### Inputs / Fields

Stage textarea paper/strong-line/cobalt caret/product-field: min122px/font15px/1.7/padding16px18px; phone125px/14px/padding14px. Central editor workspace-soft/radius20px/padding24px, phone16px/18px16px, independent draft/apply/cancel. Более специфичный stage textarea сохраняет фон/размер внутри editor; перекрытые136px/white не являются нормой. Feedback textarea min80px/font14px/padding11px12px/radius12px.

Custom select сохраняет native fallback до JS и native value. Trigger46px/radius12px/padding11px13px/value13px; fixed listbox/radius14px/shadow/options44px/selected check. Arrow/Home/End/Enter/Escape/outside click и возврат фокуса сохранены. Search использует focus-within; многострочный текст не ограничен фиксированной высотой.

### Navigation

Cobalt SVG, видимые «Подбор»/«Библиотека», текущий домен и отдельные restart/restore. Domain menu ведёт в четыре адаптивных раздела, Library в новый подбор. Progress не tabs. Legacy сохраняет тёмный rail/inverse SVG.

### Independent feedback

Сразу видны «Подходит / С оговоркой / Не подходит / Пока не знаю». «Добавить уточнение — Необязательно» открывает reason/note только своей card. Choose/start/outcome, fit, save и familiarity независимы. Shared browser-local key tastiq.feedback-drafts.v1, запись runId:cardId: неотправленный текст не создаёт отправленный feedback и доступен в Library Evenings даже без response. Draft переживает error/reload; успешная доставка очищает совпавший текст, не новый ввод.

**The Card Owns Its Feedback Rule.** Карточка владеет высотой своего отзыва; открытие формы не выравнивает соседей по её высоте.

### Processing, recovery and motion

Planning/picking/replacement min360px/phone300px/bars7×28px/1.25s ease-in-out/delays.15/.3s. Live focus вне busy main, текст сохранён, Retry повторяет действие. Checkpoint возвращает прежний request/cards/feedback/drafts без модели. Локальная запись не имитирует ожидание, процента/ETA нет.

Stage/shared focus3px/4px, library2px/4px, search/select2px/3px; главная3px/7px и accent на dark. Stage buttons.18s ease, library.18s cubic-bezier(.16,1,.3,1), choice.16s ease-out. Reduced-motion отключает animation/transitions/smooth scroll. Главная сохраняет fan.48s cubic-bezier(.16,1,.3,1), reduced-motion исходные углы; entrance animation нет.

### Входы главной

Одна ссылка, три настоящих обложки2:3/object-fit:cover, арка, круглая SVG-стрелка и подпись на бумаге. Hover/focus раскрывают только art. Все12 eager. Title/year fallback до принятого portrait; error/landscape source заменяется следующим. Четыре ссылки остаются в HTML при недоступных данных.

## Do's and Don'ts

### Do:

- **Do** использовать утверждённые cobalt/inverse SVG и общие роли бренда.
- **Do** показывать состояние словами и формой вместе с цветом.
- **Do** оставлять вопрос, ответы и продолжение в одной рабочей колонке.
- **Do** сохранять слова человека, явное уточнение и раскрытие полного запроса на телефоне.
- **Do** показывать title перед полной обложкой на телефоне, сохранять причину, caveat и fallback.
- **Do** сохранять независимые высоту карточки и черновик отзыва.

### Don't:

- **Don't** возвращать старую медную палитру или считать старый seed основанием новой формы.
- **Don't** перерисовывать утверждённый знак, растягивать логотип или заменять его текстом.
- **Don't** смешивать план, вкус и знакомство одним статусом.
- **Don't** обрезать modern result art или растягивать соседей ради открытого feedback.
- **Don't** подменять SVG-иконки Unicode-глифами или добавлять декоративные надписи над заголовками.
- **Don't** выдавать synthetic QA за human fit, ожидание за процент/ETA или новый UI за одобренный.

## Уточнение пути — 03.11.2026

Общие CTA ведут на /pick/start/: статическая Operate-страница с прежними Golos/Unbounded/кобальтом, четырьмя текстовыми входами2×2/на телефоне1колонка. Новый первый вопрос:5 вариантов желания в прежних game-option, раскрытия жанра/ограничений/своих слов. Summary раскрытия14px/500/1.6, min44px, кобальт; группы разделены14px. Нейтральные ответы ниже вариантов, верхняя линия1px/brand-line, отступ22px+padding16px. More/уточнение/undo после выдачи; успешное продолжение переводит фокус к заголовку. Геометрия/обложки/бренд прежние. Это функциональная коррекция после обратной связи, не повторный выбор визуального направления.

После полного пользовательского прохода: первый вопрос desktop группирует три необязательных раскрытия в3колонки/gap16px/margin8px; открытое занимает всю ширину. При≤760px1колонка/gap8px. Нейтральные ответы margin-top16px. В1280×720 Next bottom714.6px, без горизонтального overflow. Возврат к своим словам и вставка примера раскрывают details и фокусируют textarea. Прежние вертикальные14/22px выше относятся к первой реализации этого этапа.
