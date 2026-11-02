---
name: TASTIQ — Разговор
description: Выпущенная система подбора и библиотеки; исходный верх главной сохраняет отдельный нейтральный стиль.
colors:
  accent: "#b84025"
  accent-hover: "#a43620"
  game-accent-hover: "#9d351f"
  game-accent-press: "#872c1a"
  accent-text: "#a4351e"
  game-accent-text: "#96371f"
  on-accent: "#fff9f3"
  paper: "#f5ece2"
  surface: "#fbf4ec"
  context: "#e7dcd1"
  card: "#fffcf6"
  field: "#fffdf8"
  game-field: "#fffaf4"
  ink: "#2b2b2a"
  muted: "#6b655f"
  line: "#d9cec4"
  context-line: "#c9bbae"
  game-separator: "#beac9e"
  game-fill: "#efe3d7"
  game-fill-hover: "#e8dacd"
  game-fill-press: "#deccbb"
  game-choice-selected: "#f5dfd1"
  game-chip: "#fff9f1"
  rail: "#282a2c"
  rail-text: "#d8d1c8"
  rail-hover: "#3c3d3e"
  focus: "#257eaa"
  game-focus: "#a43b23"
  known-line: "#6c8070"
  liked-text: "#3e6246"
  disliked-text: "#a43724"
  frozen-bg: "#151517"
  frozen-ink: "#f2f2f4"
  frozen-action: "#0071e3"
  frozen-light-bg: "#ffffff"
  frozen-light-ink: "#1d1d1f"
typography:
  display:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.23
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "31px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  media-headline:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "clamp(27px, 2.6vw, 35px)"
    fontWeight: 500
    lineHeight: 1.28
    letterSpacing: "-0.035em"
  landing-headline:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "clamp(29px, 3vw, 41px)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
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
  meta:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  poster: "3px"
  card: "4px"
  control: "5px"
  game-control: "6px"
  reply: "8px 8px 0 8px"
spacing:
  "7": "7px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "13": "13px"
  "14": "14px"
  "15": "15px"
  "16": "16px"
  "17": "17px"
  "18": "18px"
  "20": "20px"
  "22": "22px"
  "23": "23px"
  "24": "24px"
  "25": "25px"
  "27": "27px"
  "30": "30px"
  "40": "40px"
  "44": "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-game-next:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.game-control}"
    padding: "12px 17px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  choice-game:
    backgroundColor: "{colors.game-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.game-control}"
    padding: "16px"
  choice-game-selected:
    backgroundColor: "{colors.game-choice-selected}"
  context-chip:
    backgroundColor: "{colors.game-chip}"
    rounded: "{rounded.card}"
    padding: "5px 9px"
  field-game:
    backgroundColor: "{colors.game-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.game-control}"
    padding: "15px"
  library-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "13px"
  rail-item-current:
    backgroundColor: "{colors.accent}"
    textColor: "#fff"
    rounded: "{rounded.card}"
    padding: "10px 9px"
---

# Design System: TASTIQ — Разговор

## Overview

**Creative North Star: "Разговор"**

Владелец выбрал работающий Conversation 02.11.2026: «Разговор давай этот сделаем». Выпущенный мир — графитовая навигация, тёплое светлое поле, широкие геометрические заголовки и медные действия. Понимание запроса доступно рядом с работой; реальные обложки помогают различать предложения. «Бумага» означает цвет плоской поверхности, а не нарисованную фактуру.

Эта система действует на /pick/game/, /pick/, /library/ и двух новых нижних секциях главной. Источник — shared/conversation.css, pick/game/conversation.css, pick/conversation.css, library/style.css и landing-bottom.css относительно src/server/public/. Прежние правила нейтрального приложения заменены только в этой области. section.first, корневой style.css, исходные двери и footer сохраняют свой мир. В header разрешены «Библиотека»/новый href и компактное оформление этой ссылки при ≤360px; весь header не является byte-identical.

**Key Characteristics:**

- Фиксированная светлая рабочая тема с тёмной навигацией; она не переключается вместе с prefers-color-scheme исходной главной.
- Unbounded задаёт голос заголовков, Golos — интерфейс и содержание.
- Небольшие скругления, тональные области и тонкие линии; предложения читаются последовательными строками.
- Состояния названы словами: выбранное, сохранённое, знакомое, ожидание и ошибка различимы без одного лишь цвета.

**The Scoped World Rule.** Новые правила применяются только в своей области; сохранённый верх главной не наследует Conversation.

## Colors

Тёплая светлая основа, графит и медь; точные значения в frontmatter нормативны. Имена описывают употребление в коде, а не обещают единую новую CSS-переменную для каждого literal.

### Primary

- **Медь** (accent) — продолжение, выбор на вечер, активная основная навигация и текущий шаг. Общий hover и игровой hover различаются; игровой press сохраняет существующий alias, а не вводит обязательный новый эффект.
- **Медный текст** (accent-text, game-accent-text) — ссылки и действия на светлом поле. Светлые надписи (on-accent) используются на заполненной меди.

### Secondary

- **Синий фокус** (focus) — общий outline, также у ссылок нижнего лендинга. Game и library имеют собственный медный focus. Второй hue здесь функционален.
- **Спокойный зелёный** (known-line, liked-text) — линия списка знакомого и явная положительная оценка в библиотеке; отрицательная оценка имеет свой disliked-text. Планы и оценки подписаны отдельно.

### Neutral

- **Тёплая бумага** (paper) — рабочий фон; **поверхность** (surface) остаётся общим panel alias. **Контекст** (context) чуть темнее рабочей области и отделён тонкой линией.
- **Светлая карточка** (card) — библиотека; **поля** (field, game-field) — ввод и ответы. Игровые fills и выбранный ответ отражают реальные локальные overrides.
- **Чернила / вторичный текст** (ink, muted) — содержание и пояснения; **линии** (line, context-line, game-separator) — разделение областей и controls.
- **Графит / текст rail** (rail, rail-text) — постоянная навигация; hover меняет тон на rail-hover.
- frozen-* — только оставшийся исходный верх и footer: тёмная основа и её светлый media-query вариант, системный синий CTA. Эти примитивы не распространяют старую тему на приложение; полный frozen набор остаётся в корневом style.css.

**The State Has Words Rule.** Цвет поддерживает подпись, check, underline, границу или текущий шаг; он не заменяет смысл состояния.

## Typography

**Display Font:** Unbounded с Golos/sans-serif fallback. **Body Font:** Golos с Arial/sans-serif fallback. Оба variable TTF размещены локально, font-display:swap; рядом лежат SIL OFL. Onest объявлен в shared CSS, но не используется этими production-поверхностями и не входит в шкалу.

### Hierarchy

- **Display:** заголовок библиотеки из frontmatter; на ≤760px становится 31px/1.3, на ≤350px — 28px. Нижний лендинг использует отдельный clamp из frontmatter.
- **Headline:** адаптивный вопрос/результат игр и просмотра; 28px на 761–1150px и 27px/1.3 на телефоне. Legacy-кино имеет собственный fluid headline, 28px/1.3 на ≤760px и 25px на ≤360px.
- **Title:** предложение адаптивного разговора; legacy-кино — 24px с теми же весом, line-height и tracking. На телефоне оба — 21px/1.25. Библиотечные карточки плотнее: 14px/1.45, вес 650.
- **Body:** основной игровой текст из frontmatter; причины 14px/1.75–1.8 и до 65ch, на телефоне 13px/1.8. Нижний лендинг использует 14–15px/1.85–1.9.
- **Label / meta:** controls обычно 12–13px; подписи, годы и counts — 12px. Служебная метка мнения модели в game — 11px; это локальная подпись, не общий размер body.

Числа счётчиков и шагов используют tabular-nums. Заголовки не предваряются декоративными надписями; названия собеседников в примере разговора обозначают роль реплики. Исходный hero сохраняет системный sans и собственный clamp: он не задаёт display voice новым поверхностям.

## Layout

Композиция зависит от поверхности; точные схемы записаны в surface briefs.

| Область | Desktop | Телефон ≤760px |
| --- | --- | --- |
| Общая навигация | Rail 164px, sticky, высота viewport, собственный overflow | Верхняя навигация в потоке, две строки; домены видны |
| Игра | Контекст 300px + работа; рабочая область до 950px, padding 30px 40px 64px | Краткая сводка с «Поправить» до вопроса; подробности отдельно; padding работы 20px 20px 40px |
| Адаптивный просмотр | Тот же layout, что у игр | Та же краткая сводка, один вопрос, «Подробнее о запросе» |
| Legacy-кино | 164px rail + 270px контекст + работа до 960px | Сводка перед работой; «Подробнее / Свернуть» и chevron; padding работы 24px 20px 45px |
| Библиотека | Три списка, gap 23px, контент до 1600px | Один выбранный список, переключатели и counts; поиск всегда виден, фильтры раскрываются |

На 761–1150px adaptive context — 245px, legacy-кино rail/context — 148/220px; внутренние поля сужаются. От 1600px adaptive context — 320px. Library имеет плотный режим 761–1100px и расширенный от 1500px. Нижний лендинг меняет две колонки при 1000px и складывает содержимое при 640px; это отдельные breakpoints, не общий app shell.

Основной ритм — небольшие gaps внутри control-групп и 20–30px между смысловыми группами. Продолжение идёт после ответов в рабочей колонке; игровой Next имеет минимум 48px и ширину от 150px (125px mobile), обычные controls — минимум 44px. Высоты — минимумы, текст может увеличить элемент. Новые вопросы и результаты не обрамляются прежними большими округлыми панелями.

**The Answer and Action Rule.** Продолжение остаётся в потоке сразу после ответов; оно не отделяется в footer окна.

## Elevation & Depth

Основа плоская: фон, контекст и карточки различаются тоном, границами и положением. Последовательные предложения разделены hairline, без поднятого hero-card. Тени сохраняют конкретное назначение: session menu / suggestions / уведомления. Маска линии за кругом прогресса (0 0 0 5px фоном бумаги) — геометрия соединителя, не декоративное свечение.

### Shadow Vocabulary

- **Shared pop:** 0 8px 24px #22222220 — унаследованные всплывающие элементы общего Conversation.
- **Game pop:** 0 12px 28px #40302424 — игровое session menu.
- **Library notice:** 0 12px 30px #30251a2c — временное фиксированное сообщение.

У старых компонентов legacy могут сохраняться собственные hover/всплывающие тени; они не задают новую норму библиотечных карточек. Тени и motion живут в sidecar, не в token frontmatter.

## Shapes

Небольшие мягкие прямоугольники: карточки и summary chips, controls, игровые controls и постеры используют свои примитивы frontmatter. Main/context имеют прямой край и разделитель. Круг означает номер/состояние шага; он не является формой каждой кнопки. Реплика человека в нижнем лендинге имеет один прямой нижний угол. Иконки — authored inline SVG, обычно 18px со stroke 1.5–1.7; короткий CSS-chevron служит disclosure кино-контекста.

## Components

### Buttons

Медный primary с тонкой границей, прозрачный secondary, тихий plain. Game использует локальные radius/padding/hover из frontmatter; library primary — 10px 14px и hover #9d331e. Disabled снижает opacity (shared .48, library .55); библиотечное ожидание меняет cursor. Итоговые действия могут повторяться у каждого предложения — правило «один медный элемент на весь экран» здесь неверно.

### Chips

Небольшие прямоугольные summary chips показывают подтверждённое желание и условия. Game: padding из frontmatter; mobile — 3px 7px. Legacy сохраняет существующие интерактивные reason/complaint chips, окрашенные scoped palette; они не заменяют живой текст объяснения.

### Cards / Containers

Выдача — последовательность до четырёх допустимых предложений: обложка, title/meta, причина/оговорки, явные действия и внешняя ссылка. Adaptive desktop cover 90px, phone65px; legacy-кино91/64px. Меньшее число подходящих предложений не дополняется неподходящими. На телефоне actions переносятся внутри текстовой колонки. Библиотечная карточка — светлая компактная плитка с обложкой, переносом между списками, удалением и отдельным раскрытием отношения.

### Inputs / Fields

Тёплое светлое поле, тонкая граница и outline. Game textarea — минимум 108px, line-height 1.75. Кино search сохраняет отдельный левый inset 36px после иконки; общий padding не должен его перекрывать. В library поиск обёрнут отдельным полем с focus-within; фильтры используют native select. Не ограничивать многострочный русский текст фиксированной высотой.

### Navigation

Rail соединяет «Подобрать», «Библиотека» и четыре domain links. Активный раздел — медное заполнение, домен — вес/светлый текст. На ≤360px общие nav-иконки скрываются для сохранения полных названий. Прогресс — некликабельная последовательность четырёх реальных этапов, без обещания точного числа вопросов. Назад и меню подбора остаются отдельными controls.

### Named processing / recovery

Game status занимает текущую работу, минимум 430px desktop и 330px mobile. Три bars 7×28px используют 1.25s scale/opacity с задержками .15/.3s. Заголовок называет планирование, подбор или замену; подпись сообщает, что ответ сохранён. Live status находится вне busy editable main и получает фокус; main/actions скрываются, контекстные controls блокируются на время работы. Ошибка возвращает выбранный ответ и явный Retry, который повторяет исходную операцию.

Фильмы, сериалы и мультфильмы в `/pick/watch/` используют тот же адаптивный Conversation layout и именованные состояния обработки. Сериальный статус может уточняться локально без модели: это сохранение изменения, без model spinner. Прежний `/pick/` сохраняет отдельное центральное состояние и scoped слой 410px desktop /400px mobile только для legacy; spinner там .7s linear.

### Library board

Списки «На потом / На этот вечер / Уже знакомо» — планы. Отношение, знакомство каждого domain и вечера сохраняют независимые значения. Архив содержит прежние подборы; новые выборы и отзывы всех4 разделов находятся во «Вечерах», с явным переходом из архива. Mobile показывает одну lane без внутренней прокрутки всей доски; поиск остаётся видимым, «Фильтры и порядок» имеет подпись/chevron/count. Перенос через select, удаление с undo, поиск, сортировка и пустые состояния используют настоящие browser-local данные.

### Browser surfaces, focus and motion

Golos/Unbounded загружаются локально; caret и native accent медные. Общий focus — 3px с offset 4px; game переопределяет цвет на game-focus, library — 2px accent с offset 4px, поиск — 2px с offset 3px, нижний landing — общий синий с offset 5px. Outline поля может дополнительно наследовать более специфичное правило старого input; не заявлять один точный ring для всех controls.

Library hover — .18s cubic-bezier(.16,1,.3,1) для фона/границы; game choices — .16s ease-out, legacy controls — существующие короткие transitions. Появления секций не анимированы. prefers-reduced-motion отключает animation/transition и smooth scroll в scoped app, нижний лендинг отключает transition/smooth scroll. Процент и ETA ожидания не выдумываются.

## Do's and Don'ts

### Do:

- **Do** сохранять границу Conversation и исходного верха главной.
- **Do** показывать состояние подписью и формой вместе с цветом.
- **Do** оставлять вопрос, ответы и продолжение в одной рабочей колонке.
- **Do** сохранять сводку запроса видимой на телефоне и обозначать раскрытие подробностей.
- **Do** давать отсутствующей или сломанной обложке текстовый fallback; сохранять реальный источник изображения.
- **Do** сохранять черновики, выделение, раскрытия и выбранные ответы при обновлениях и повторе.

### Don't:

- **Don't** распространять новый фон, шрифт или display voice на frozen hero/header.
- **Don't** возвращать выдаче прежнюю композицию «hero плюс сетка трёх альтернатив».
- **Don't** смешивать планы библиотеки, вкусовую оценку и знакомство одним цветным статусом.
- **Don't** подменять нарисованные иконки Unicode-глифами или добавлять декоративные надписи над заголовками.
- **Don't** превращать временное ожидание в заявленный процент, ETA или доказательство качества рекомендаций.
- **Don't** считать неизвестные возраст/время/свойства проверенными или тестовые локальные записи человеческими оценками.
