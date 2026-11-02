---
name: TASTIQ — три невыбранные структуры v5
description: Фактические системы /design-v2/ после отказа от прежних макетов; продуктовый дизайн не выбран.
colors:
  comparison-ground: "#ebeae6"
  comparison-ink: "#202329"
  on-action: "#fff"
  focus: "#257eaa"
  conversation-ink: "#2b2b2a"
  conversation-muted: "#6b655f"
  conversation-accent: "#b84025"
  conversation-surface: "#fbf4ec"
  conversation-line: "#d9cec4"
  conversation-ground: "#f5ece2"
  conversation-nav: "#282a2c"
  conversation-transcript: "#e7dcd1"
  conversation-card: "#fffcf6"
  showcase-ink: "#252529"
  showcase-muted: "#65636b"
  showcase-accent: "#2c32b3"
  showcase-surface: "#fffaf1"
  showcase-line: "#d9d4d1"
  showcase-nav: "#292fac"
  catalogue-ink: "#222d2d"
  catalogue-muted: "#626e6b"
  catalogue-accent: "#215e54"
  catalogue-surface: "#f7f7f0"
  catalogue-line: "#ccd4ce"
  catalogue-nav: "#1f282b"
  catalogue-selected: "#dfebe1"
  catalogue-detail: "#e6ede4"
typography:
  conversation-display:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "35px"
    fontWeight: 500
    lineHeight: 1.24
    letterSpacing: "-0.035em"
  conversation-title:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  showcase-display:
    fontFamily: "Unbounded, Golos, sans-serif"
    fontSize: "49px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  showcase-title:
    fontFamily: "Onest, Arial, sans-serif"
    fontSize: "39px"
    fontWeight: 550
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  catalogue-display:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "45px"
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  catalogue-title:
    fontFamily: "Golos, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  reason:
    fontSize: "14px"
    lineHeight: 1.75
  catalogue-reason:
    fontSize: "13px"
    lineHeight: 1.75
  meta:
    fontSize: "12px"
    lineHeight: 1.6
  action:
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.4
rounded:
  control: "6px"
  select: "5px"
  conversation-card: "4px"
  catalogue-image: "2px"
  showcase-image: "0"
  speech: "10px 10px 2px 10px"
spacing:
  actions: "8px"
  answers: "10px"
  control-y: "11px"
  control-x: "16px"
  conversation-row: "25px"
  catalogue-gap: "35px"
components:
  conversation-primary:
    backgroundColor: "{colors.conversation-accent}"
    textColor: "{colors.on-action}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  showcase-primary:
    backgroundColor: "{colors.showcase-accent}"
    textColor: "{colors.on-action}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  catalogue-primary:
    backgroundColor: "{colors.catalogue-accent}"
    textColor: "{colors.on-action}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  conversation-board-card:
    backgroundColor: "{colors.conversation-card}"
    textColor: "{colors.conversation-ink}"
    rounded: "{rounded.conversation-card}"
    padding: "13px"
  catalogue-detail:
    backgroundColor: "{colors.catalogue-detail}"
    textColor: "{colors.catalogue-ink}"
    padding: "24px"
---

# Design System: TASTIQ — невыбранные структуры v5

## Overview

**Creative North Star: "Диалог и доска / Обложки и полки / Список и подробности"**

Это запись реализованного `/design-v2/`, не единая система основного сайта. Владелец отверг все прежние `/design/`; их оценки и палитры не перенесены сюда. Новый выбор ещё предстоит, production-интерфейс не переносили. Источник токенов — текущие `style.css`, `app.js` и `index.html` с asset version 5.

Кандидаты различаются единицей выбора, порядком чтения и библиотекой: «Разговор» — контекст и предложения, затем доска состояний; «Витрина» — раскрытые сравнительные ряды, затем медиаполки; «Сравнение» — строки и подробности выбранного, затем компактный фильтруемый список. Палитры с префиксами относятся только к своему кандидату.

**Key Characteristics:**

- Три самостоятельные структуры выдачи и библиотеки на desktop и mobile.
- Исходные header и весь first лендинга изолированы от нового оформления.
- Один вопрос, собственный ответ и inline Next; этапы остаются индикатором.
- Демонстрационные списки имеют согласованные состояния при переходе между сценами.

## Colors

### Primary

`conversation-accent` — медный для действий и текущего этапа; `showcase-accent` — синий для выбора и большой нижней медиасекции; `catalogue-accent` — зелёный для действий в светлом списке. Фактические значения записаны в frontmatter; эти акценты не сведены в выбранную продуктовую палитру.

### Neutral

У «Разговора» тёплое основное поле, более тёмный transcript и графитовая навигация. У «Витрины» светлая поверхность и синяя шапка. У «Сравнения» почти белое поле, графитовая шапка и зелёные selected/detail surfaces. `*-surface` воспроизводит CSS-переменную; например, фактический фон conversation — отдельный `conversation-ground`, а не значение переменной surface. Оболочка сравнения нейтральная и не окрашивает frozen iframe.

## Typography

Шрифты self-hosted: Golos (`GolosText-Variable.ttf`, 400–900), Unbounded (`Unbounded-Variable.ttf`, 200–900), Onest (`Onest-Variable.ttf`, 100–900), каждый с `font-display: swap`. «Разговор» использует Golos и крупный Unbounded, «Витрина» — Onest и Unbounded, «Сравнение» — Golos с Onest в wordmark. Frozen верх сохраняет исходную типографику по прямой границе владельца; её не следует переносить на новые display-роли.

Desktop-роли frontmatter описывают результат. Библиотечные заголовки «Разговора»/«Витрины» — Unbounded 40px/1.23 и 43px/1.28. Общий вопрос — 35px/1.18, weight 600; у «Витрины» Unbounded 36px/1.3, weight 500. Служебный текст — 12px, действия — 13px. Причина в «Разговоре»/«Витрине» — 14px/1.75, detail «Сравнения» — 13px/1.75.

При 650px вопрос становится 29px/1.2; showcase-title — 29px/1.14, при 360px — 27px. Это реальные responsive overrides, а не общая вычисленная шкала. Надзаголовки предложений удалены: каждое предложение «Разговора» начинается с названия.

## Layout

| Кандидат | Широкий экран | Узкий экран |
| --- | --- | --- |
| Разговор | Rail 162px, transcript 300px и гибкая колонка предложений/вопроса; библиотека — три статусные колонки с gap 23px. | При 650px rail становится верхней навигацией, колонки идут вертикально; доска показывает выбранный статус, все три названия и счётчики остаются в переключателе. Финальный override при 640px показывает сводку и «Поправить» первыми, историю — явным раскрываемым действием. |
| Витрина | Область до 1520px; каждый результат — индекс 95px, текст и постер 230px, gap 35px; причина и оговорка раскрыты. Библиотека группирует записи по четырём медиаразделам. | Сохраняются раскрытые ряды; медиаполки прокручиваются горизонтально со scroll snap. Ширина элемента полки 184px → 160px при 1000px → 155px при 650px → 145px при 360px. |
| Сравнение | Область до 1600px; список плюс detail 330px, gap 35px. В библиотеке фильтры 200px и плотные строки. | При 650px detail появляется inline только у выбранной строки, отдельная правая панель скрыта. Библиотека сохраняет строки с маленьким постером, названием и select состояния; фильтры располагаются сверху. |

Промежуточные responsive границы — 1250px и 1000px. Поля и типографика уплотняются до телефонного перехода, структуры не сводятся к общей карточной сетке. Новый низ следует модели каждого кандидата: разговор/доска, обложки/категории, интерактивный список/поиск сохранённого. Оригинальный верх находится в собственном документе с исходными CSS/app; обновление начинается после него.

**The Структура до цвета Rule.** Сравнивать единицу выбора, порядок чтения и группировку библиотеки; перекраска общей композиции не заменяет отдельного кандидата.

## Elevation & Depth

«Разговор» и «Сравнение» разделяют области тоном и линиями, без карточных теней. У «Витрины» размытые тени подчёркивают реальные постеры в рядах, полках, вопросе и нижней медиаленте. Notice использует отдельную мягкую тень. Полные значения вынесены в sidecar; жёсткие смещённые тени не входят в систему. Новых фактур и растровых plates нет.

Переходы кнопок — background/border-color .18s с фактическим `--ease`; hover primary применяет brightness .92. Reduced motion отключает transitions, animations и плавный scroll.

## Shapes

Контролы имеют небольшой общий радиус; «Разговор» использует мягкие реплики с одним более прямым углом и небольшие прямоугольные карточки доски. Постеры «Витрины» прямые; изображения строк «Сравнения» имеют минимальные углы. Круглые узлы принадлежат прогрессу. Эти формы остаются независимыми от frozen нейтрального верха.

## Components

### Buttons and fields

Кнопка — минимум 44px, 11px 16px, рамка 1px и радиус `control`; secondary прозрачная, primary использует акцент своего кандидата. Focus-visible — 3px `focus`, offset 4px. Disabled — opacity .48. Ответы — кнопки с `aria-pressed`, SVG plus/check и явным selected state. Textarea белая, минимум 100px, padding 16px, resize vertical. «Дальше» включается после ответа и находится под ним в той же рабочей области. Поиск имеет focus-within 3px с offset 3px; перемещение состояния — native select.

### Navigation and progress

Глобальные «Подобрать»/«Библиотека» и четыре медиараздела отделены от этапов. Прогресс — `ol/li`, четыре подписи, текущий `aria-current="step"`, круги и соединительные линии; кнопок внутри нет. Иконки authored inline SVG, viewBox 24×24, stroke 1.7, round caps/joins; общая геометрия 20px, в кнопках 17px. Шрифтовые знаки не служат иконками.

### Signature units

«Разговор»: предложение — постер, название, метаданные, причина, выбор и сохранение; kicker перед названием отсутствует. Доска группирует по `want/tonight/known`. При 640px сводка контекста доступна без вложенного скролла, предыдущие ответы открываются отдельной кнопкой с `aria-expanded`/`aria-controls`.

«Витрина»: все четыре результата раскрыты одинаковыми сравнительными рядами, а не одним hero и тремя остаточными карточками. Полка группирует по media type; статус фильтруется отдельно, действия записи раскрываются у постера.

«Сравнение»: выбранная строка окрашена, все четыре строки остаются доступными; действия и оговорка находятся в единственном detail. Плотная библиотека показывает состояние select и удаление с отменой. Нижние примеры берут действительное состояние из того же Map, пустые группы остаются пустыми.

Обложка использует `object-fit: cover`, при отсутствии/ошибке изображения остаётся текстовый fallback. Сохранение и выбор меняют демонстрационный Map; удаление с отменой восстанавливает прежнее состояние.

## Do's and Don'ts

### Do:

- **Do** сохранять самостоятельные модели выдачи и библиотеки каждого кандидата на телефоне.
- **Do** сохранять исходный header и весь first лендинга; менять только нижнюю часть.
- **Do** показывать текущую сводку и действие её правки перед скрываемой историей.
- **Do** брать подписи состояний из одного состояния прототипа во всех сценах.
- **Do** сохранять реальные обложки, текстовый fallback и демонстрационные подписи.

### Don't:

- **Don't** называть кандидата выбранной системой или переносить прежний verdict отвергнутых макетов.
- **Don't** заменять структурное различие одной перекраской общей сетки.
- **Don't** возвращать надзаголовки «Начни с этого» / «Ещё вариант N» перед названиями предложений.
- **Don't** превращать этапы в кликабельные вкладки.
- **Don't** записывать демонстрационные изменения в реальные сохранения владельца или вызывать подбор приложения.
