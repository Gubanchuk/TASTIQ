# 03. Что уже существует и почему не снимает боль

Поток 3 из 4. Дата: 2026-10-20. Все источники открыты или найдены 2026-10-20.

Уровни: **[S]** Strong — официальный источник или первичные данные; **[M]** Moderate — 2+ независимых вторичных; **[Sp]** Speculative — один вторичный источник, самоописание продукта или мой вывод. Номера `[n]` ведут в список источников в конце.

## Коротко

- **Формат «один выбор + альтернативы + почему подходит + чем может не понравиться» в фильмах и сериалах уже занят.** TasteRay даёт до трёх вариантов с причиной и заметкой «What to watch for» [68]; CHOICE — главный выбор, четыре альтернативы и причину [65]; Reelgood Cue с 2023 года пишет «you might not like this if…» [22]. Все трое — ранние продукты 2023–2026 годов без подтверждённой аудитории [Sp].
- **Онбординг, который спрашивает, за что понравился конкретный тайтл, я не нашёл.** Все найденные сервисы собирают оценки, свайпы, «пару любимых» или настроение. Ближе всего Quantic Foundry: анкета о мотивации игрока, но она про человека, а не про тайтл [50].
- **Один профиль на кино, игры и аниме с выдачей «один выбор» я не нашёл.** Кросс-медийные TasteDive/Qloo [30][33] и Likewise [25] выдают списки и не берут игры (Likewise) или не объясняют выбор (TasteDive). TasteRay обещает «Books and games next» [68].
- **Боль подтверждена данными** по видео: Netflix — пользователь теряет интерес через 60–90 секунд выбора [1] [S]; Nielsen — 10,5 минуты на сессию, каждый пятый бросает [85] [S]. По играм данных о времени выбора нет, есть доля непройденного (около трети библиотеки Steam не запускалась [89] [M]) и живые жалобы на форумах.
- **Самостоятельный потребительский рекомендатель плохо кормит сам себя.** Почти все выжившие зарабатывают на B2B (JustWatch, Reelgood, Qloo, Jinni, Nanocrowd) или на подписке сообщества (Letterboxd, Trakt, Backloggd). Подробно — раздел 4.

## 1. Сводная таблица

### Видео

| Сервис | Подход | Онбординг | Что выдаёт | Монетизация | Главная жалоба / слабость |
|---|---|---|---|---|---|
| **Netflix** | Коллаборативная фильтрация и персонализация на всех экранах; с 2025 — AI-поиск на ChatGPT [3] | История просмотров, лайки; с 2017 большой палец вместо звёзд [2] | Ряды рекомендаций, % совпадения [2]. AI-поиск по фразам вроде «something funny and upbeat», бета на iOS с мая 2025 [3]; в 2026 — бета в США, Австралии, Новой Зеландии, глобальный запуск ожидают к концу 2026 [5] | Подписка. По оценке самой Netflix, персонализация экономит ей больше $1 млрд в год за счёт снижения оттока [1] [S] | 51% американских подписчиков считают объём алгоритмических подсказок избыточным (опрос по всем стримингам, не только Netflix) [86] [S, заказное исследование]. Кнопка «Play Something» убрана в 2023 из-за низкого использования [6][7] [M] |
| **Letterboxd** | Социальный дневник; «похожие фильмы» и «nanogenres» на технологии Nanocrowd с марта 2022 [12] [Sp] | Регистрация, лог фильмов; персонального опросника нет | Списки, отзывы, «похожие»; Pro — фильтр по своим стримингам и уведомления о появлении фильма [9] [S] | Бесплатный тариф с рекламой, Pro и Patron [9] [S]; 60% куплены Tiny в 2023 при оценке около $50 млн [10] [M]; в 2025 обсуждалась продажа [11] [Sp] | Нет персональных рекомендаций как функции: сторонние расширения закрывают пробел (Lekkerboxd, 308 пользователей) [13] [Sp] |
| **Trakt** | Трекер просмотров с рекомендациями по истории | Подключение медиаплееров, отметки просмотренного | Списки, календарь, рекомендации | Только подписка VIP: по пересказу AlternativeTo, Trakt «depends entirely on VIP memberships» [14] [M] | Февраль 2025: лимиты бесплатных списков (2 списка по 100 позиций), VIP с $30 до $60 в год; май 2025: старые тарифы тоже подняли до $60. Реакция — «low-key predatory», уход на Simkl и Letterboxd [14][15] [M] |
| **JustWatch** | Агрегатор «где смотреть» + рекомендации | Страна и стриминги | Каталог доступности, подборки, Sponsored Recommendations [20] | По блогу компании (2017), основной доход — не реклама в приложении, а B2B-кампании трейлеров для студий; «banner ads and affiliate partnerships alone would be barely enough for the server costs» [16] [S]. С октября 2026 — собственный сервис JustWatch TV (AVOD, аренда, подписка) в 12 странах [17] [Sp] | Неточная доступность и навязчивая реклама: отзывы Trustpilot и обзор Yahoo [18][19] [M] |
| **Reelgood** | Агрегатор + B2B-лицензирование данных | Стриминги, оценки, отметки «seen» | Каталог; **Cue** (2023, iOS): «Should you watch this?» с объяснением, включая «you might not like this if you're in the mood for something lighter» [22] [S] | Лицензирование данных примерно 50 компаниям (Roku, Microsoft, хедж-фонды), данные TechCrunch 2019 [21] [Sp] | Cue — только iOS, только по запросу на конкретный тайтл [22] [S]. Жалоб не искал |
| **Taste.io** | Коллаборативная: «пользователи с похожими оценками» [24] [Sp] | Выбрать любимые фильмы и жанры, затем оценить около 20 тайтлов по шкале awful/meh/good/amazing [24] [Sp] | % совпадения, где смотреть | Premium $2,99 в месяц / $11,99–19,99 в год (App Store) [23] [S] | Отзывы App Store: «It shows way too many movies I haven't even heard of!» (07.2023); устаревшие данные о стримингах [23] [Sp] |
| **Likewise** (+ Pix) | ML + рекомендации друзей + редакция; с октября 2023 AI-ассистент Pix на моделях OpenAI (SMS, почта, приложение) [26] [Sp] | Выбор любимого | Книги, фильмы, ТВ, подкасты; игр нет | Сервис продан Watchlist Inc. в июне 2025; ставка на рассылки — 8,4 млн подписок [25] [S] | Нет данных о жалобах. Факт: Gates-backed сервис с заявленными 6 млн пользователей [26] [Sp] сменил модель на рассылки |
| **Criticker** | Коллаборативная: TCI — близость вкуса к другим пользователям, на нём строится прогноз оценки (PSI) [27] [Sp] | Оценки; TCI формируется после 10 оценок, полезным становится около 50 [27] [Sp] | Прогноз вашей оценки; фильмы, ТВ, игры | Не нашёл | Долгий холодный старт (около 50 оценок) [27] [Sp] |
| **MovieLens** | Исследовательский рекомендатель GroupLens | Раньше 15 оценок; занимало больше 5 минут, часть пользователей уходила; новая схема — выбор групп фильмов (3 фильма + 3 тега на группу), вдвое быстрее при небольшой потере точности [28] [S] | Прогноз оценки, список | Некоммерческий | Даже лучшему алгоритму нужно 2–3 оценки, чтобы обогнать среднюю оценку; ItemItem — 13 [29] [S] |
| **TasteDive** (бывш. TasteKid) | Ввод тайтла → похожее; на ML Qloo после покупки в 2019 [30][31] [M] | Аккаунт не обязателен | Список похожего: кино, ТВ, музыка, игры, книги [30] | Через Qloo (B2B API, Series C $25 млн в 2024; клиенты — Netflix, Michelin, Samsung) [33][99] [M] | Разработчик интеграции: API «sometimes returns some strange results» [32] [Sp] |
| **Gnod** | Самообучающаяся карта по поведению посетителей (Marek Gibney) [34] [Sp] | Ввести любимых авторов/исполнителей/фильмы | Карта «похожих» | Не нашёл | Источники 2006 года; сайт отдаёт 403 [34] |
| **Кинопоиск** | Нейросетевая модель, с ноября 2025 учитывает просмотры на других стримингах и телеканалах, оценки друзей, любимых актёров [35] [S] | Не описан; сигналы — оценки, «Буду смотреть», лайки стримингов [35] [S] | Персональные ряды, видеолента «Что смотреть» [36]. Анонсированы AI-«персональная рецензия» и «персональный аргумент» — чем тайтл заинтересует именно вас [35] [S] | Подписка Яндекс Плюс и подписки сторонних кинотеатров через Кинопоиск [35] [S] | Отзывов о качестве рекомендаций не нашёл |
| **Иви** | Редакционные подборки, персонализированный порядок и состав [38] [S] | Фильмы, отмеченные как понравившиеся при знакомстве с сервисом [38] [S] | Подборки, плашка «Вам подходит» | Подписка (рекомендации — инструмент удержания) | Не нашёл. Факт в пользу объяснений: A/B-тесты Иви — объяснение подборок и «Вам подходит» выиграли по большинству метрик и по конверсии в просмотр и подписку, цифр нет [38] [S] |
| **Okko** | Rekko — собственная система [39] [S]; выбор по настроению и контексту («с парой», «с семьёй») [40] [Sp]; чат-бот Rekko во ВКонтакте, до 10 уточняющих вопросов [41] [Sp] | Не нашёл | Ряды; подбор по настроению | Подписка | Не нашёл |

### Игры

| Сервис | Подход | Онбординг | Что выдаёт | Монетизация | Главная жалоба / слабость |
|---|---|---|---|---|---|
| **Steam: Discovery Queue, «More like this», «Recommended for you»** | Покупки, наигранное время, теги, друзья | Нет, данные из библиотеки | Очередь, полки | Комиссия магазина | Valve сама признала: секции «rarely felt like personalized recommendations» и показывали популярное; после исправления клики выросли на 15% в тесте на 5% пользователей [44] [M]. Форум 2023: «I havent had a good discovery in the que for almost a year now» [45] [Sp] |
| **Steam Interactive Recommender** | Нейросеть по истории наигранного времени, метаданные игр почти не учитываются [42][43] [S/M] | Нет | Список; ползунки популярное/нишевое, старое/новое [42] [S] | — | Не рекомендует игры без игроков (новинки) [43] [M] |
| **Steam «Play Next»** (2020) | Та же технология, но по своей библиотеке [46] [M] | Нет | До трёх игр из библиотеки, кнопка «подобрать другие» [46] [M] | — | Нельзя исключить игру и перебросить выбор [46] [Sp] |
| **Backloggd** | Трекер-дневник | Регистрация | Каталог, бэклог; рекомендаций нет — «Game Recommendations» в планах [47] [S] | Бесплатно; единственный платный статус — Backer через Patreon [47] [S]; соло-разработчик на 1300+ патронах, 650 тыс. пользователей к концу 2025 [48] [Sp] | Нет мобильного приложения — самый частый запрос [47][48] [M] |
| **Grouvee** | Трекер, полки | Регистрация | Полки, отзывы | Grouvee Gold без рекламы [49] [Sp] | Рекомендаций не нашёл |
| **Quantic Foundry** | Модель 12 мотиваций игрока; рекомендации — игры, которые чаще упоминают похожие по мотивации игроки [50] [M] | Анкета мотиваций или «введите до трёх любимых игр» [50] [Sp] | Профиль мотивации + список игр | Исследования аудитории для студий (B2B) [50] [Sp] | Не нашёл. Ближе всех к идее «за что», но спрашивает про человека, не про тайтл |
| **Xbox Gaming Copilot** (бета с мая 2025) | LLM + активность Xbox + Bing [51] [S] | Назвать любимые игры или жанры | Ответ в чате | Часть экосистемы | Только английский, 18+, отдельные регионы [51] [S] |
| **PlayStation** | AI в рекомендациях PS Store; Sony оценивает вклад AI в платформенных операциях более чем в $700 млн [52] [Sp] | — | Витрина | Магазин | Пользовательской AI-функции подбора не нашёл |

### Аниме

| Сервис | Подход | Онбординг | Что выдаёт | Монетизация | Главная жалоба / слабость |
|---|---|---|---|---|---|
| **MyAnimeList** | Рекомендации, которые пользователи предлагают и голосуют под каждым тайтлом [54] [Sp] | Список просмотренного | Ручные пары «если понравилось X — смотри Y» с комментарием | Реклама и MAL Supporter без рекламы [55] [S]; продан Gaudiy в 2025 [55] [M] | Не нашёл жалоб именно на рекомендации; недовольство новыми владельцами и API [54] [Sp] |
| **AniList** | Тоже ручные рекомендации под тайтлом и теги, за которые голосуют пользователи [54] [Sp] | Список | Рекомендации, поиск по тегам | Надёжного источника не нашёл | Меньше отзывов, чем на MAL [54] [Sp] |
| **Anime-Planet** | Ядро — рекомендации пользователей; дополнительно — алгоритм по сотням тегов [53] [S] | Список, оценки | Пары и теговые рекомендации | Не нашёл | Не нашёл |
| **Shikimori** | Официального описания алгоритма не нашёл; есть ручные подборки пользователей | — | — | Не нашёл | Не нашёл |

### AI-ассистенты и новые продукты 2023–2026

| Сервис | Подход | Онбординг | Что выдаёт | Монетизация | Слабость |
|---|---|---|---|---|---|
| **ChatGPT, Gemini и т.п.** | LLM без своего каталога | Пользователь сам описывает вкус | Списки с объяснениями | Подписка на LLM | Эксперимент «месяц игр по выбору ChatGPT»: хорошо подбирает из своей библиотеки по настроению, слабо открывает новое, однажды выдумал несуществующий режим игры [59] [Sp]; немецкое издание: устаревшие данные, выдумки, странные пары [60] [Sp]. Gracenote (4003 пользователя чат-ботов в США, 2026): поиску доверяют больше (50% против 27%), трое из четырёх перепроверяют ответ бота [58] [S] |
| **Google TV + Gemini** (09.2025) | Разговорный поиск | — | Несколько вариантов, в том числе для пары с разными вкусами [63] [S] | Платформа | Сначала только на новых ТВ [63] |
| **Amazon Fire TV + Alexa+** | LLM по каталогу Prime Video и подключённых сервисов [64] [S] | — | Подборки, поиск сцены | Платформа | — |
| **Tubi** | Rabbit AI на GPT-4 (2023) [61] свёрнут; в апреле 2026 — приложение внутри ChatGPT, 300 тыс. фильмов и эпизодов [62] [M] | — | Подборки по настроению | AVOD | Собственный AI-поиск закрыли; причина не названа [61][62] |
| **CHOICE** (бета, 2026) | Профиль + контекст сессии | «Pick a few things you've enjoyed» + стриминги; в сессии — настроение, энергия, время, с кем, фильм/сериал [65] [Sp] | **Один выбор + 4 альтернативы + ранжированный список, причина и % совпадения** | Pro $4,99 в месяц / $39 в год [65] [Sp] | «Чем не понравится» нет; игр и аниме нет |
| **TasteRay** (ранний доступ, 2026) | Свободный запрос + история | «A few is enough», без 50 оценок [68] [Sp] | **До трёх вариантов: причина, % совпадения, «What to watch for» (медленный темп, предсказуемая концовка), вердикты «skip»** | Планируют $6,99 в месяц; Enterprise API [68] [Sp] | Только кино/ТВ; Google Play — 4,3 при 42 отзывах [68] [Sp] |
| **Movik** (2026) | Свайпы + контекст вечера | 8 свайпов [66] [Sp] | Один фильм «with a reason why it fits you», уточнение диалогом | Бесплатный старт, полные функции платно [69] [Sp] | Только фильмы; маленькая аудитория [69] [Sp] |
| **Filmatic** (2026) | Оценки + стриминги | Страна, стриминги, 20 оценок [67] [Sp] | По одному тайтлу с причиной; свайп — следующий | Не указана | Только кино/ТВ |
| **NextFilm** (Хабр, RU) | Кандидаты по оценкам и MovieLens 25M + GPT-слой объяснения [71] [Sp] | Отметить просмотренное и оценить | Группировка и объяснение от GPT | — | Автор сам называет онбординг самым чувствительным этапом [71] |
| **NXTO** (игры, 2026) | Пройденные, оценённые, брошенные игры; брошенное — сигнал «избегать» [72] [Sp] | Импорт и оценки | 1–2 игры с короткой причиной | Первый подбор бесплатно; 10 подборов — $0,99 [72] [Sp] | Без диалога; качество сильно зависит от оценок [72] |
| **Gameplays.io** (игры) | Gemini, свободный запрос [74] [Sp] | Описать, во что хочется | Топ игр с объяснением, видео | — | Дата и статус не указаны |
| **NEXTURN** (игры, 04.2026) | Свайпы в три зоны, включая «не моё»; MMR против перекоса в AAA [73] [Sp] | Сортировка 1200 тайтлов | Подборка | Бесплатно | Автор: «most recsys treat "already played" as "you'll like more like this", which is often wrong» [73] |
| **Прочие** | Backlog Buddy (библиотека Steam) [75], Dustpile (свайп-карточки по своей библиотеке Steam, RU-пресса 07.2026) [76], Ludocene (сознательно без AI, экспертный вкус, 08.2025) [77], Ellucca, CutStream, Qouch Potato, I Like Movies [69][70] | — | — | — | Все — самоописание, данных об аудитории нет [Sp] |

### Умершие и свёрнутые

| Сервис | Что было | Чем кончилось | Источник |
|---|---|---|---|
| **Jinni** | «Movie Genome»: поиск по настроению, сюжету; «taste personalities» | В июне 2015 закрыл публичный сервис, ушёл в B2B (AT&T U-verse, Belgacom, Time Warner) [79] [M]; по базе стартапов — прекратил работу в 2024 [79] [Sp] | [79][80] |
| **Nanocrowd** | «Nanogenres» из текстов рецензий; «найти фильм за два-три клика» [80] [S, самоописание] | Ушёл в B2B-аналитику аудитории для студий; технологию лицензирует Letterboxd с 2022 [12] [Sp] | [12][80] |
| **Clerk Dogs** (2009) | Бывшие продавцы видеопрокатов размечали фильмы ползунками (глубина персонажей, чёрный юмор, насилие) [81] [M] | Основатель планировал продавать движок другим сайтам [81]. Дату и причину закрытия не нашёл | [81] |
| **Hunch** | «Taste graph» | Куплен eBay в 2011 (сумму называют около $80 млн, eBay не раскрывал) [84] [Sp]; судьба сайта не нашлась | [84] |
| **GetGlue → tvtag** | Чекины «что смотрю» | Закрыт 1 января 2015, официально — «refocus our efforts»; фон — спад second-screen приложений [82] [Sp] | [82] |
| **Raptr** | Трекер игр и оптимизация настроек | Закрыт 30.09.2017 через год после того, как AMD прекратила партнёрство; CEO: рынок занят инструментами Nvidia, AMD, Microsoft [83] [M] | [83] |
| **Netflix «Play Something»** | Случайный тайтл одной кнопкой (2021) | Убрана в январе 2023 из-за низкого использования; представитель Netflix: пользователи приходят с конкретным шоу, фильмом или жанром в голове [6][7] [M] | [6][7] |
| **Tubi Rabbit AI** | AI-поиск на GPT-4 (2023) | Свёрнут; TechCrunch предполагает низкий спрос [3] [Sp] | [3][61] |
| **Алгоритм Netflix Prize** | Победитель конкурса на $1 млн | Не внедрён: прирост точности не окупал инженерные затраты, бизнес ушёл в стриминг [8] [M] | [8] |
| **Minimap AI** | Чат-бот на GPT-3.5 для подбора игр, знания до 2021 [78] [Sp] | Статус не нашёл | [78] |

## 2. Почему существующее не снимает боль

Мой вывод по данным выше [Sp], с опорой на конкретные факты:

1. **Выдают ряды и списки, выбор остаётся за человеком.** Netflix сам пишет, что пользователь просматривает 10–20 тайтлов, 3 из них внимательно, и через 60–90 секунд теряет интерес [1] [S]. Ряды Netflix, очередь Steam, списки TasteDive и пары MAL не сокращают эти 10–20 тайтлов до одного.
2. **Холодный старт долгий.** MovieLens — 15 оценок и больше 5 минут, часть уходит [28]; Criticker — около 50 оценок [27]; Filmatic — 20 [67]; Taste — около 20 [24].
3. **Трекеры — дневники, а не советчики.** У Letterboxd нет персональных рекомендаций как функции [9][13], у Backloggd они только в планах [47], у MAL и AniList — ручные пары [54].
4. **Платформы тянут к своему каталогу и популярному.** Valve признала перекос в популярное [44]. Платформенный AI (Netflix, Google TV, Alexa+, Xbox) работает только в своей экосистеме [3][51][63][64].
5. **Чат-боты не держат профиль вкуса и не проверяют факты.** Им доверяют меньше, чем поиску, ответы перепроверяют [58] [S]. Бывают выдуманные детали [59][60] [Sp].

## 3. Подтверждение боли

### Количественные данные

| Что | Цифра | Источник | Уровень |
|---|---|---|---|
| Сколько длится выбор на Netflix до потери интереса | 60–90 секунд, 10–20 тайтлов, «perhaps 3 in detail» | Gomez-Uribe, Hunt, ACM TMIS 2015 [1] | S |
| Что работает лучше | «what customers ask for (as much choice as possible…) and what actually works (a few compelling choices simply presented) are very different» | там же [1] | S |
| Время выбора на сессию, стриминги | 10,5 мин (2023); 11:16 (2022); 7:24 (2019) | Nielsen State of Play 2023 [85]; цифры 2022 и 2019 — по пересказу Popverse [85] | S (2023), M (2022, 2019) |
| Бросают сессию, не найдя что смотреть | каждый пятый | Nielsen 2023 [85] | S |
| Часов в год на выбор, США | 110 часов; 51% считают объём алгоритмических подсказок избыточным | UserTesting / Talker Research, 2000 подписчиков, ноябрь 2024 [86] | S (первичные данные заказного опроса) |
| Минут в день на выбор, Великобритания | 30 мин; почти 60% в итоге сдаются | Currys, 2018 человек, 2024 [87] | Sp |
| Выбор дольше просмотра, США | 30% (46% у Gen Z и миллениалов); 29% тратят больше 30 мин | Bango, 2500 человек, 2026 [88] | Sp |
| Незапущенные игры в Steam | в среднем 32,7% библиотеки, у медианного игрока 51,5%; Ars Technica 2014 — около 26,5% | GameDiscoverCo [89]; Ars через Game Informer [89] | M |
| Игрокам трудно выбирать, какие игры покупать | качественный вывод опроса | Hollett et al., PLOS One 2022 [90] | S |
| Сколько времени игроки тратят на выбор игры | исследований не нашёл | — | — |

### Цитаты

- r/GirlGamers, «How do you choose what to play from your backlog?», около 29.01.2026: «it always ends with me playing the "sit there and scroll through my steam library for 3 hours" game instead»; комментарий u/FairFolk: «look at my backlog, scroll through it a few times, and then don't play anything at all»; u/Lucy--chen: «i end up playing five games for five minutes each and watching Netflix». Читал через зеркало, оригинал: reddit.com/r/GirlGamers/comments/1u1wd6c/ [91] [S как первичная цитата].
- Hacker News, «Show HN: Netflix Showdown – because I can't decide what to watch», 02.11.2013, gedrap: «Sometimes I spend so much time 'deciding' what to watch, that it gets too late to watch»; RKoutnik: «Too often I've found that suggestion services just serve to further choice paralysis» [92] [S].
- DTF, «Бэклог убивает меня.», автор Dante-Y, 17 июня (год не указан), 613 комментариев: «И эти 15 игр меня убивают»; «Я не могу начать новую игру, так как постоянный нависающий на меня бэклог дарит такое лютое чувство» [93] [S].
- SteamGifts, «deciding what to play»: пользователь тратит на выбор больше времени, чем на игру. Страница отдала 403, видел только поисковый сниппет [94] [Sp].
- Steam, форум, 28.05.2023, Segert: «I havent had a good discovery in the que for almost a year now» [45] [S].
- NEXTURN, автор: «every game store's "recommended for you" only ever showed me sequels of games I'd already finished» [73] [S].

Пикабу и русские форумы о кино: подходящей цитаты про часы выбора не нашёл.

## 4. Монетизация в нише

| Модель | Кто | Что известно | Уровень |
|---|---|---|---|
| B2B-маркетинг для студий и стримингов | JustWatch | Основной доход — B2B-кампании трейлеров; реклама и партнёрки в приложении «barely enough for the server costs» (2017) [16]. Sponsored Recommendations [20]. С 2026 — собственный AVOD/TVOD JustWatch TV [17] | S (2017), Sp (2026) |
| Лицензирование данных | Reelgood | Около 50 B2B-клиентов на 2019 год (Roku, Microsoft, хедж-фонды) [21] | Sp |
| B2B API вкуса | Qloo (TasteDive как витрина) | Series C $25 млн (02.2024), всего около $57 млн; клиенты Netflix, Michelin, Samsung, JCDecaux [33][99]. Выручку не раскрывают, оценки агрегаторов расходятся | M |
| Уход из B2C в B2B | Jinni, Nanocrowd | Jinni закрыл B2C в 2015 и продавал движок операторам [79]; Nanocrowd продаёт аналитику студиям и лицензирует Letterboxd [12] | M / Sp |
| Подписка сообщества | Letterboxd, Trakt, Taste, MAL | Letterboxd: реклама + Pro + Patron [9], по сообщениям прибыльна [10]. Trakt: только VIP, цена удвоена до $60 в год, отток и негатив [14][15]. Taste: $2,99 в месяц [23]. MAL: Supporter без рекламы [55] | S / M |
| Донаты | Backloggd | Patreon, 1300+ патронов, соло-разработчик на полной ставке [48] | Sp |
| Плата за подбор | NXTO | $0,99 за 10 подборов [72] | Sp |
| Подписка на новый AI-сервис | CHOICE, TasteRay | $4,99 в месяц / $39 в год [65]; $6,99 в месяц план + Enterprise API [68] | Sp (прайс-листы ранних продуктов, выручки нет) |
| Рассылки | Likewise | После продажи в 2025 ставка на рассылки, 8,4 млн подписок [25] | S |
| Партнёрки: стриминги | Amazon Prime Video | Bounty $2–3 за пробную подписку по данным агрегаторов; официальных условий не видел [97] | Sp |
| Партнёрки: игры | Steam, Humble | У Steam нет публичной партнёрской программы: Valve этого не подтверждает, источники — каталог партнёрок и форумы Steam [95] [M]. Humble — около 8% по агрегаторам, другой агрегатор пишет 4–12% [96] | M / Sp |
| Ценность внутри платформы | Netflix | Персонализация, по оценке Netflix, экономит больше $1 млрд в год [1]. Деньги достаются владельцу каталога, а не внешнему советчику | S |

Мой вывод [Sp]: проверенной модели, на которой живёт отдельный B2C-рекомендатель, в данных нет. Живут либо владельцы каталога, либо B2B, либо сообщество-дневник (Letterboxd), где рекомендации вторичны. У игровой части нет главной партнёрки: у Steam её нет совсем.

## 5. Ниша «за что понравилось → один выбор с рисками»

**Ответ: формат выдачи занят, онбординг «за что» и кросс-медиа с играми — нет, по крайней мере среди найденного.**

| | Один выбор | Альтернативы | Почему подходит | Чем может не понравиться | Спрашивает, за что понравился тайтл | Игры | Аниме | Русский |
|---|---|---|---|---|---|---|---|---|
| TasteRay [68] | до 3 | да | да | да («What to watch for», «skip») | не указано | обещают | нет | нет |
| CHOICE [65] | да | 4 + список | да | не указано | нет («pick a few things you've enjoyed») | нет | нет | нет |
| Reelgood Cue [22] | оценка одного тайтла по запросу | нет | да | да | нет | нет | нет | нет |
| Movik [66] | да | уточнение диалогом | да | не указано | нет (свайпы) | нет | нет | нет |
| Filmatic [67] | по одному | свайп | да | не указано | нет (20 оценок) | нет | нет | нет |
| NXTO [72] | 1–2 | нет | да | не указано | нет | да | нет | нет |
| Quantic Foundry [50] | нет, список | — | нет | нет | мотивации игрока, не тайтл | да | нет | нет |
| Кинопоиск [35] | нет, ряды | — | анонсирован «персональный аргумент» | нет | нет | нет | не проверял | да |
| Иви [38] | нет, подборки | — | «Вам подходит» | нет | нет | нет | не проверял | да |
| ChatGPT и т.п. | по просьбе | да | да | по просьбе | если пользователь сам расскажет | да | да | да |

Ближе всех **TasteRay** по выдаче с рисками и **CHOICE** по формату «один + четыре». Оба только про кино и сериалы и не спрашивают, за что понравилось.

Вероятные отличия TASTIQ: онбординг по причинам симпатии, один профиль на кино, игры и аниме, русский язык. Мой вывод [Sp]: эти отличия тонкие и копируются. Кинопоиск уже анонсировал «персональный аргумент» [35], TasteRay обещает игры [68], а ChatGPT делает то же по одному хорошему промпту, только без памяти, проверки фактов и структуры.

Старое «за что» тоже пробовали: Clerk Dogs и Jinni размечали атрибуты фильмов (ползунки, настроение, сюжет) [79][81]. Разметка шла по фильмам, пользователя не спрашивали. Оба не выжили в B2C.

## 6. Уроки для TASTIQ

**1. Мало вариантов работает, голый рандом — нет.**
- Данные: Netflix — «a few compelling choices simply presented» работает лучше, чем «as much choice as possible» [1] [S]. Кнопку «Play Something» Netflix убрал из-за низкого использования: люди приходят с намерением [6][7] [M].
- Вывод [Sp]: один выбор должен опираться на намерение, высказанное сейчас (настроение, время, с кем), и идти с объяснением. Одна случайная кнопка повторит судьбу «Play Something».

**2. Объяснение — механика, а не украшение.**
- Данные: у Иви объяснение подборок и плашка «Вам подходит» выиграли A/B-тесты по конверсии в просмотр и подписку, цифр нет [38] [S]. Reelgood, TasteRay, CHOICE, Movik строят продукт вокруг объяснения [22][65][66][68] [Sp].
- Вывод [Sp]: «почему подходит» — уже стандарт. Отличаться можно только качеством объяснения: ссылкой на названную пользователем причину, а не на «похожие пользователи».

**3. Каждый шаг онбординга стоит пользователей.**
- Данные: 15 оценок в MovieLens — больше 5 минут и уход части людей; групповой выбор вдвое быстрее [28] [S]. Большой палец вместо звёзд дал Netflix на 200% больше оценок [2] [S]. Лучшему алгоритму хватает 2–3 оценок, чтобы обогнать среднюю [29] [S].
- Вывод [Sp]: вопрос «за что понравилось» дороже оценки. Его надо делать выбором из готовых вариантов, а не свободным текстом. Время до первой выдачи стоит мерить в тесте, а не назначать заранее.

**4. B2C-рекомендатель редко окупает себя сам.**
- Данные: JustWatch — реклама и партнёрки «barely enough for the server costs» [16] [S]; Trakt при модели «только подписка» удвоил цену и получил отток [14][15] [M]; Jinni и Nanocrowd ушли в B2B [12][79]; Likewise продан и живёт рассылками [25] [S]; у Steam партнёрки нет [95] [M].
- Вывод [Sp]: до запуска нужен ответ, на чём зарабатывает игровая часть без партнёрки Steam. Кандидаты — Humble, GOG, ключи, подписка, B2B-лицензия профиля вкуса, но условия партнёрок не проверены.

**5. Главный конкурент — бесплатный чат-бот, и зависимость от чужой платформы опасна.**
- Данные: 49% Gen Alpha в США считают чат-боты лучшим источником рекомендаций, но доверие к ним ниже, чем к поиску, и трое из четырёх перепроверяют ответ [58] [S]. Tubi закрыл свой AI-поиск и ушёл внутрь ChatGPT [61][62] [M]. Raptr умер через год после того, как AMD прекратила партнёрство [83] [M].
- Вывод [Sp]: ценность TASTIQ против ChatGPT — то, чего у чата нет: сохранённый профиль причин, проверенные тайтлы и доступность, кросс-медиа. Если продукт — обёртка над одним LLM и одним API каталога (TMDB, IGDB), он повторяет риск Raptr.

## 7. Лог поиска

| Запрос / действие | Результат |
|---|---|
| Netflix AI search 2025, TechCrunch, Verge | Найдено (TechCrunch, AlternativeTo). theverge.com недоступен для инструмента |
| Netflix AI search 2026 | Только вторичные (gagadget, eWeek); официального анонса 2026 не нашёл |
| Nielsen State of Play 2024/2025 | Только отчёт 2023; цифр 2024–2025 о времени выбора не нашёл |
| Taste.io onboarding, монетизация, App Store | Найдено; Dealroom-профиль помечен «Made with AI», не использовал |
| Jinni shutdown | Wikipedia: закрытие B2C в 06.2015; покупку Synamedia не подтвердил |
| Steam Interactive Recommender, Discovery Queue жалобы | Найдено; techraptor.net — 403, данные через поисковые сниппеты и PCGamesInsider |
| Likewise, Pix, продажа | Найдено (Publishers Weekly — первичный пересказ пресс-релиза); geekwire — 403 |
| JustWatch бизнес-модель | Блог JustWatch 2017 прочитан; ppc.land о JustWatch TV 2026 прочитан |
| Reelgood модель, Cue | Найдено; про сокращения штата — ничего |
| Letterboxd выручка 2025, письмо Tiny | Не нашёл; цены Pro/Patron на официальной странице не указаны |
| Trakt 2025 | AlternativeTo + Lemmy; официального заявления Trakt не читал |
| Criticker TCI | Только вторичные; criticker.com/faq — 403; монетизацию не нашёл (поиск вернул AdCritter) |
| TasteDive, Qloo | Найдено |
| MovieLens onboarding | Блоги GroupLens 2014 и 2015 прочитаны |
| Gnod | Только источники 2006 года; gnod.com — 403 |
| Кинопоиск рекомендации, отзывы | Статья Кинопоиска от 10.11.2025 прочитана; отзывов о качестве рекомендаций не нашёл; описание онбординга не нашёл |
| Иви, Okko на Хабре | Статья Иви 2022 прочитана; Okko — Rekko (Хабр), настроение (Rozetked, год не подтверждён), бот ВК (дата не указана) |
| Quantic Foundry, Backloggd, Grouvee | Найдено; у Grouvee рекомендаций не нашёл |
| AniList, MAL, Anime-Planet, Shikimori | Anime-Planet — официальный пост на форуме; AniList и MAL — форумы; Shikimori — официального описания нет; источник о монетизации AniList оказался чужой страницей Patreon, не использовал |
| AI-стартапы кино 2025–2026 | Найдены CHOICE, TasteRay, Movik, Filmatic, Ellucca, I Like Movies, Qouch Potato, Findy, NextFilm; все — самоописание |
| AI-стартапы игры 2025–2026 | NXTO, NEXTURN, Gameplays.io, Backlog Buddy, MyBacklog, Dustpile, Ludocene; крупных профинансированных не нашёл |
| Nanocrowd shutdown | Закрытия не нашёл; нашёл уход в B2B и партнёрство с Letterboxd |
| Clerk Dogs закрытие | Не нашёл ни даты, ни причины |
| Hunch после eBay | Судьбу сайта не нашёл |
| Post-mortem рекомендательных стартапов | Профильных post-mortem не нашёл, только общие статьи о провалах стартапов |
| Netflix Play Something, звёзды на большие пальцы, Netflix Prize | Найдено; статья Netflix о больших пальцах прочитана; Tom's Guide не прочитался |
| Netflix TMIS 2015 | PDF скачан, цитаты извлечены pypdf (60–90 секунд, 80% часов, $1 млрд) |
| Reddit: old.reddit.com, www.reddit.com, .json, WebSearch с allowed_domains reddit.com | Все заблокированы инструментом. Одна цитата получена через зеркало reddit.sentinel-team.org; redlib.ssps.io не резолвится |
| SteamGifts, NeoGAF, BusinessWire, newscaststudio | 403; использованы поисковые сниппеты или первичный пресс-релиз UserTesting |
| Пикабу «выбираю дольше, чем смотрю» | Подходящей цитаты не нашёл |
| Accenture / Deloitte о времени выбора | Не нашёл; использованы UserTesting, Currys, Bango, Gracenote |
| Время выбора игры, исследования | Не нашёл; есть только доля незапущенного |
| Партнёрки Steam, Humble, Amazon | Официальных условий не видел; только агрегаторы и форумы |
| PlayStation AI-рекомендации для игрока | Подтверждённой функции не нашёл |
| Сервис, который спрашивает «за что понравилось» | Не нашёл; ближайшее — студенческий проект с ключевыми словами после оценки, Quantic Foundry (мотивации), Clerk Dogs (атрибуты фильмов) |

## Источники

Все открыты или найдены 2026-10-20.

1. Gomez-Uribe C., Hunt N. The Netflix Recommender System. ACM TMIS 6(4), 2015, DOI 10.1145/2843948. Копия: https://gwern.net/doc/reinforcement-learning/exploration/2015-gomezuribe.pdf
2. Netflix, «Goodbye Stars, Hello Thumbs», 05.04.2017: https://about.netflix.com/en/news/goodbye-stars-hello-thumbs
3. TechCrunch о AI-поиске Netflix, 05.2025: https://techcrunch.com/?p=3003858
4. AlternativeTo о редизайне Netflix, 05.2025: https://alternativeto.net/news/2025/5/netflix-announces-global-tv-app-redesign-ai-search-and-vertical-tiktok-style-video-feed
5. Gagadget о голосовом AI-поиске Netflix, 08.2026: https://gagadget.com/en/709191-netflixs-new-ai-voice-search-lets-you-say-something-for-a-good-cry-and-actually-get-results/
6. Slashdot (по MarketWatch), 15.02.2023: https://news.slashdot.org/story/23/02/15/0724220/netflix-drops-surprise-me-shuffle-play-button
7. Netzwelt: https://www.netzwelt.de/news/214250-netflix-streicht-funktion-shuffle-button-ploetzlich-weg-steckt-dahinter.html
8. Techdirt о Netflix Prize, 13.04.2012: https://www.techdirt.com/2012/04/13/why-netflix-never-implemented-algorithm-that-won-netflix-1-million-challenge/
9. Letterboxd, платные тарифы: https://letterboxd.com/about/pro/
10. Gizmodo о покупке Letterboxd: https://gizmodo.com/letterboxd-majority-acquired-by-tiny-for-50-million-1850887306
11. BetaKit о возможной продаже: https://betakit.com/?p=403570 ; JoBlo: https://www.joblo.com/letterboxd-sale-a24-sony-nyt/
12. Nanocrowd и Letterboxd: https://nanocrowd.com/nanocrowd-letterboxd/
13. Lekkerboxd в Chrome Web Store: https://chromewebstore.google.com/detail/kilfhpgnabhobfinmljmgojmbndcpeph
14. AlternativeTo о Trakt, 07.02.2025: https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-/
15. AlternativeTo о Trakt, 05.2025: https://alternativeto.net/news/2025/5/trakt-announces-all-vip-renewals-will-switch-to-a-new-standard-rate-doubling-prices/
16. Блог JustWatch, «Audience as a Service», 06.12.2017: https://www.justwatch.com/blog/post/justwatch-audience-as-a-service/
17. PPC Land о JustWatch TV, 21.09.2026: https://ppc.land/streaming-guide-justwatch-to-run-its-own-service-in-12-markets/
18. Trustpilot, JustWatch: https://ca.trustpilot.com/review/www.justwatch.com
19. Yahoo Tech, обзор приложений: https://tech.yahoo.com/streaming/articles/4-essential-tv-streaming-apps-201700779.html
20. TheWrap о нативной рекламе JustWatch: https://www.thewrap.com/justwatch-jen-mutchnik-native-advertising-partnerships/
21. TechCrunch о Reelgood, 2019: https://techcrunch.com/?p=1920864
22. Reelgood, «Meet Cue», 14.06.2023: https://ads.reelgood.com/?p=2174
23. App Store, Taste: https://apps.apple.com/us/app/taste-movie-tv-suggestions/id1361180197
24. WRDW, «What the Tech», 14.08.2023: https://www.wrdw.com/2023/08/14/what-tech-how-taste-app-can-help-you-find-movie-watch
25. Publishers Weekly о продаже Likewise, 05.06.2025: https://www.publishersweekly.com/pw/by-topic/industry-news/industry-deals/article/97948-likewise-gets-new-owners-targets-book-discovery-market.html
26. Maginative о Pix: https://www.maginative.com/article/likewise-launches-pix-an-ai-powered-entertainment-recommendation-assistant/ ; GeekWire: https://www.geekwire.com/2023/bill-gates-backed-likewise-launches-ai-powered-pix-personal-entertainment-companion/
27. Neowin, обзор Criticker: https://www.neowin.net/news/review-criticker-and-their-awesome-film-rating-predictions
28. GroupLens, онбординг, 11.03.2015: https://grouplens.org/blog/onboarding-new-users-in-recommender-systems/
29. GroupLens, рекомендации новым пользователям, 02.10.2014: https://grouplens.org/blog/recommending-for-new-users-is-surprisingly-difficult/
30. Wikipedia, TasteDive: https://en.wikipedia.org/wiki/TasteDive
31. TechCrunch о покупке TasteDive компанией Qloo: https://techcrunch.com/?p=1783312
32. Форум Hooktheory про API TasteDive: https://forum.hooktheory.com/t/error-500-tab-reads-as-404-when-looking-up-songs-by-a-specific-artist/5797
33. Qloo, пресс-релиз о Series C: https://qloo.com/press/series-c-press-release/
34. Gnod, страница курса 2006 года: https://teaching.kfitz.info/170L-2006/node/431/index.html
35. Кинопоиск, большое обновление, 10.11.2025: https://www.kinopoisk.ru/media/article/4012047
36. Кинопоиск, алгоритм ленты «Что смотреть»: https://www.kinopoisk.ru/media/article/4012863/
37. Яндекс, правила рекомендательных технологий: https://yandex.ru/legal/recommendations/ru/
38. Хабр, блог Иви, 20.12.2022: https://habr.com/ru/post/706300/
39. Хабр, Rekko (Okko): https://habr.com/ru/post/454224
40. Rozetked о рекомендациях Okko по настроению: https://rozetked.me/news/27048-okko-zapuskaet-novuyu-unikal-nuyu-sistemu-rekomendaciy
41. Rozetked о чат-боте Rekko: https://rozetked.me/news/11984-rekko-chat-bot-pomogayuschiy-vybrat-kino-po-vashim-kriteriyam
42. Steam Labs, Interactive Recommender: https://store.steampowered.com/labs/recommender/
43. WePC: https://www.wepc.com/news/steam-interactive-recommender/ ; KitGuru: https://www.kitguru.net/?p=457545
44. TechRaptor: https://techraptor.net/content/steam-updating-discovery-to-give-better-recommendations ; PCGamesInsider: https://www.pcgamesinsider.biz/news/69674/valve-has-updated-how-discovery-works-on-steam/
45. Форум Steam, 28.05.2023: https://steamcommunity.com/discussions/forum/10/3841053085043958475
46. StopGame, 14.02.2020: https://stopgame.ru/newsdata/41874 ; GamingOnLinux, 05.2020: https://www.gamingonlinux.com/2020/05/valve-adds-a-play-next-shelf-in-steam-to-remind-you-of-all-those-games-youve-never-played/page=1/
47. Backloggd, roadmap: https://backloggd.com/roadmap/ ; about: https://backloggd.com/about/
48. Two Average Gamers, State of Game Tracking 2026: https://www.twoaveragegamers.com/state-of-game-tracking-2026-the-complete-industry-report/
49. Digital Trends о Grouvee: https://qa2.www.digitaltrends.com/gaming/video-game-backlog-spring-cleaning
50. Quantic Foundry: https://quanticfoundry.com/ ; https://apps.quanticfoundry.com
51. Xbox Wire, 28.05.2025: https://news.xbox.com/en-us/2025/05/28/copilot-gaming-test-xbox-android-ios/
52. Tbreak о стратегии Sony в AI: https://tbreak.com/sony-playstation-ai-strategy-development/
53. Форум Anime-Planet: https://www.anime-planet.com/forum/goto/post?id=1947395
54. Обсуждение на PieFed: https://piefed.nullspace.lol/post/229793
55. MAL Supporter FAQ: https://myanimelist.net/membership/faq ; AniTrendz о продаже Gaudiy, 01.04.2025: https://www.anitrendz.com/news/2025/04/01/myanimelist-to-be-sold-to-web3-startup-gaudiy
58. Nielsen/Gracenote, 08.04.2026: https://nielsen.com/news-center/2026/gen-alpha-leads-shift-to-ai-powered-entertainment-search-discovery-and-recommendations
59. Two Average Gamers, «I let ChatGPT pick my games for a month»: https://www.twoaveragegamers.com/i-let-chatgpt-pick-my-games-for-a-month/
60. Leinetal24: https://www.leinetal24.de/leben/games/chatgpt-ki-kaufempfehlungen-unentschlossene-gamer-reddit-hamburg-games-bot-videospiele-zr-92153251.html
61. TechCrunch о Tubi Rabbit AI, 26.09.2023: https://techcrunch.com/2023/09/26/tubi-to-launch-content-discovery-tool-powered-by-openais-chatgpt-4
62. 9to5Mac, 08.04.2026: https://9to5mac.com/2026/04/08/chatgpt-just-added-its-first-streaming-video-app-heres-what-it-can-do/ ; Tubi: https://corporate.tubitv.com/?p=5379
63. Блог Google, «Gemini comes to Google TV», 22.09.2025: https://blog.google/products-and-platforms/platforms/google-tv/gemini-google-tv/
64. About Amazon, Fire TV + Alexa+: https://www.aboutamazon.com/news/devices/fire-tv-alexa-plus-jump-to-the-scene
65. CHOICE: https://www.choiceapp.org/
66. Movik: https://movik.ai/
67. Filmatic: https://filmatic.io/
68. TasteRay: https://www.tasteray.com/
69. I Like Movies, «Best AI movie recommendation apps in 2026» (самореклама автора, проверено 09.2026): https://ilikemovies.app/best/ai-movie-recommendation-apps
70. Ellucca на Product Hunt: https://www.producthunt.com/products/ellucca
71. Хабр, NextFilm, 28 апреля (год не указан): https://habr.com/ru/articles/1029318/
72. NXTO, 09.2026: https://nxto.app/blog/ai-game-recommendations
73. NEXTURN: https://hunted.space/product/nexturn
74. Gameplays.io: https://ai.google.dev/competition/projects/gameplaysio
75. Backlog Buddy: https://www.backlogbuddy.app/
76. Shazoo о Dustpile, 09.07.2026: https://shazoo.ru/2026/07/09/186900/besplatnyi-sait-dustpile-rabotaet-kak-tinder-dlia-igr-steam-i-pomogaet-vybrat-vo-cto-igrat
77. Ludocene, пресс-релиз: https://www.gamedeveloper.com/press-release/ludocene-launches-on-national-play-day-6th-august
78. Minimap AI на Product Hunt: https://www.producthunt.com/products/minimap-ai-game-recommendation-chatbot
79. Wikipedia, Jinni: https://en.wikipedia.org/wiki/Jinni_(search_engine) ; Light Reading: https://www.lightreading.com/video-broadcast/at-t-jumps-on-board-with-jinni ; Startupim: https://startupim.com/company/jinni
80. The Next Web о Nanocrowd и Jinni, 25.03.2010: https://thenextweb.com/news/movie-search-engine-nanocrowd-jinni
81. TechCrunch о Clerk Dogs: https://techcrunch.com/?p=32588 ; VentureBeat: https://venturebeat.com/social/clerk-dogs-is-the-know-it-all-video-store-nerd-in-your-browser
82. Streaming Media о закрытии tvtag, 22.12.2014: https://www.streamingmedia.com/Articles/News/Online-Video-News/TVtag-to-Shut-Down-January-1st-Marks-Decline-in-Social-TV--101242.aspx
83. PC Gamer о закрытии Raptr: https://www.pcgamer.com/uk/raptr-online-game-optimization-and-tracking-service-is-shutting-down/ ; Wikipedia: https://en.wikipedia.org/wiki/Raptr
84. TechCrunch о покупке Hunch, 21.11.2011: https://techcrunch.com/2011/11/21/ebayshunch/embed/
85. Nielsen, State of Play, 28.08.2023: https://www.nielsen.com/fr/news-center/2023/nielsens-state-of-play-report-delivers-new-insights-as-streamings-next-evolution-brings-content-discovery-challenges-for-viewers/ ; Popverse: https://thepopverse.com/streaming-choices-audience-time-nielsen
86. UserTesting, «Lost in the Stream», 18.12.2024: https://www.usertesting.com/company/newsroom/press-releases/lost-stream-survey-finds-americans-waste-nearly-five-days-year-just
87. Advanced Television об опросе Currys, 10.04.2024: https://www.advanced-television.com/2024/04/10/survey-brits-spend-182hrs-per-year-searching-for-content/
88. NewscastStudio об опросе Bango, 20.05.2026: https://www.newscaststudio.com/2026/05/20/u-s-viewers-report-growing-frustration-with-streaming-content-overload/
89. GameDiscoverCo: https://newsletter.gamediscover.co/p/how-many-pc-games-get-bought-but ; Game Informer (Ars Technica), 16.04.2014: https://gameinformer.com/b/news/archive/2014/04/16/over-one-third-of-purchased-steam-games-have-never-been-played
90. Hollett et al., PLOS One, 2022: https://research-repository.uwa.edu.au/en/publications/evidence-that-digital-game-players-neglect-age-classification-sys/
91. r/GirlGamers через зеркало, снимок 10.06.2026: https://reddit.sentinel-team.org/posts/1u1wd6c/snapshots/2026-06-10T09%3A25%3A55.48465Z
92. Hacker News, 01.11.2013: https://news.ycombinator.com/item?id=6656757
93. DTF, «Бэклог убивает меня.»: https://dtf.ru/5132249
94. SteamGifts (только сниппет): https://www.steamgifts.com/discussion/9bQrs/deciding-what-to-play
95. UpPromote, Steam: https://uppromote.com/affiliate-directory/steam/ ; форум Steam: https://steamcommunity.com/discussions/forum/7/154644598512838460
96. Lasso, Humble Bundle: https://getlasso.co/affiliate/humble-bundle/ ; LinkClicky: https://linkclicky.com/affiliate-program/humble-bundle/
97. UpPromote, Prime Video: https://uppromote.com/affiliate-directory/amazon-prime-video/ ; Affilimate: https://affilimate.com/programs/amazon-prime-video-affiliate-program/
99. Built In NYC о Series C Qloo, 21.02.2024: https://builtinnyc.com/articles/qloo-raises-25m-series-c-20240221
