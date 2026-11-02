---
type: raw
stream: 2
topic: источники данных и право их использовать
created: 2026-10-20
---

# Поток 2. Источники каталога, аспектов и «где смотреть»: что можно законно

Все ссылки открыты 2026-10-20, если не указано другое. Где официальная страница не открылась (403, Cloudflare), взята копия Wayback Machine с датой снимка или сниппет поисковика — это помечено.

Уровни: **S** — Strong (официальные условия/документация), **M** — Moderate (2+ независимых вторичных), **Sp** — Speculative (один вторичный источник или мой вывод).

Оговорка: это разбор условий, а не юридическое заключение. Строки «по договору» и «неясно» перед запуском проверяет юрист.

## Коротко

1. Почти все крупные бесплатные API разрешают только некоммерческое использование. Платный сервис с рекомендациями требует договора с TMDB, IGDB, MAL, Kitsu, IMDb, JustWatch.
2. TMDB прямо называет коммерческим использованием и LLM-чатбот, и сайт, который зарабатывает на рекомендациях фильмов. Бесплатная лицензия к тому же запрещает любое ML/AI-приложение на данных TMDB, даже некоммерческое. Для TASTIQ это касается и прототипа (S).
3. Без договоров коммерчески можно использовать: Wikidata (CC0), тексты Википедии (CC BY-SA), Trakt (бесплатно для коммерции, но без копирования каталога), Streaming Availability API (коммерция на всех тарифах), Watchmode (платные тарифы), RAWG Business ($149/мес), OpenCritic через RapidAPI, IsThereAnyDeal, Steam Web API (с оговорками), AniList до $150 выручки в месяц.
4. Российский рынок закрыт хуже всего. У Кинопоиска нет публичного API, его соглашение запрещает сбор и коммерческое использование. Okko, Иви, Wink, Start, Кинопоиск HD публичных API не дают. Сервисы-посредники (ПоискКино/kinopoisk.dev) продают данные Кинопоиска без подтверждённой цепочки прав.
5. Отзывы для извлечения аспектов законно доступны только через платные лицензии (IMDb User Reviews, Reddit по договору) или в серой зоне (Steam reviews). Metacritic, Кинопоиск, Letterboxd, HowLongToBeat запрещают сбор и обучение ИИ.

---

## 1. Фильмы, сериалы, мультфильмы

| Источник | Что даёт | Коммерция | Цена | Атрибуция | Ссылка на условия | Ур. |
|---|---|---|---|---|---|---|
| TMDB | Метаданные фильмов и сериалов, люди, ключевые слова, постеры и фоны, переводы, «где смотреть» (данные JustWatch) | По договору. ML/AI-приложения запрещены и в бесплатной лицензии | Не опубликована, форма заявки на странице API for Business | Логотип TMDB и текст-оговорка | [API Terms §1.C, §2.A](https://www.themoviedb.org/api-terms-of-use) | S |
| IMDb non-commercial datasets | 7 TSV-файлов: title.basics (тип, названия, год, длительность, жанры), akas, crew, episode, principals, ratings (средняя оценка, число голосов), name.basics. Описаний, ключевых слов и картинок нет | Нет | 0 | По условиям IMDb | [data.imdb.com/non-commercial-datasets](https://data.imdb.com/non-commercial-datasets/), [help: Can I use IMDb data](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX) | S |
| IMDb через AWS Data Exchange | Essential Metadata, рейтинги, Box Office Mojo. Отдельно продаются Meters, User Reviews, Parents Guide, Trivia & Goofs. GraphQL API только через ADX | Да, по контракту | IMDb Essential v2: $150 000 за 12 месяцев, «subject to specific licensed use case» | По EULA (текст не открывал) | [data.imdb.com](https://data.imdb.com/), [листинг AWS](https://aws.amazon.com/marketplace/pp/prodview-yeuyizioqmfsy) | S |
| OMDb | Карточка фильма по IMDb ID | Нет | Бесплатно 1000 запросов в день, остальное через Patreon | — | [legal.htm §4.1, §4.2.5, §10](https://www.omdbapi.com/legal.htm) | S |
| Wikidata | Структурированные факты: жанры, даты, создатели, внешние ID других баз | Да | 0 | Не требуется (CC0) | [Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing), [Database download](https://www.wikidata.org/wiki/Wikidata:Database_download) | S |
| Википедия (текст) | Сюжеты, описания, приём критиков | Да | 0 | CC BY-SA 4.0: авторство и та же лицензия на производный текст. Картинки лицензируются отдельно | [Wikipedia:Copyrights](https://en.wikipedia.org/wiki/Wikipedia:Copyrights) | S |
| MovieLens | 32M: 32 000 204 оценки, 2 000 072 тега, 87 585 фильмов, 200 948 пользователей (снимок 13.10.2023). Tag Genome 2021: 1084 тега × 9734 фильма | Нет без разрешения GroupLens | 0 | Цитирование в публикациях | [README ml-32m, Usage License](https://files.grouplens.org/datasets/movielens/ml-32m-README.html), [grouplens.org/datasets](https://grouplens.org/datasets/movielens/) | S |
| Trakt | Карточки, рейтинги и голоса, тренды, связанные тайтлы, история и списки пользователя (с его согласия) | Да, бесплатно на тарифе Standard. Запрещены массовый сбор и зеркалирование каталога | Standard 0. Premium — повышенные лимиты, цена на странице не указана | Упоминание Trakt на странице About/Credits, логотип по желанию | [API Use Policy](https://developer.trakt.tv/docs/api-use-policy) | S |
| Letterboxd | Дневники, отзывы, списки | Нет для нашего случая | — | — | [api-beta](https://letterboxd.com/api-beta/) (живая страница 403, снимок Wayback от 15.10.2026) | S |
| Кинопоиск (сайт) | Рейтинг КП, отзывы, описания на русском | Нет. Нужно разрешение администрации | Публичного API нет | Рейтинг КП — только с разрешения и с указанием источника | [Пользовательское соглашение, п. 5.2, 6.6, 6.7](https://yandex.ru/legal/kinopoisk_termsofuse/) (редакция 06.02.2026) | S |
| ПоискКино API (бывш. kinopoisk.dev, poiskkino.dev) | 1 095 169 фильмов и сериалов, 6 001 062 персоны, 3 236 675 изображений; данные КП + TMDb + IMDb; обновление ежедневно | Сервис продаёт доступ, но права на перепродажу не подтверждены. Риск высокий | Демо 0 (200 запросов в сутки), 2 500 ₽/мес (5000 в сутки), 5 000 ₽/мес (безлимит), для компаний по договору. Дамп фильмов от 15 000 ₽ | — | [kinopoisk.dev](https://kinopoisk.dev/), [/database](https://kinopoisk.dev/database) | S (цены и объём), Sp (оценка риска) |
| kinopoiskapiunofficial.tech | Неофициальный API к данным Кинопоиска | Неясно, условия не прочитаны: страница только на JS | Не прочитано | — | [kinopoiskapiunofficial.tech](https://kinopoiskapiunofficial.tech/) | Sp |

### Цитаты и детали

**TMDB** (S, [api-terms-of-use](https://www.themoviedb.org/api-terms-of-use), на странице «last updated on: October 20, 2023»):
- §2.A: «The license in Paragraph 1.A above does not permit any commercial use of TMDB, the TMDB APIs, or TMDB Content.»
- §2.A, примеры коммерческого использования: «Using TMDB, the TMDB APIs, or TMDB Content on or in connection with a "destination" website, search engine, or interactive query-response system (including large language model (LLM), artificial intelligence, or any other machine learning based interactive query-response systems or chatbots)»; «Operating a website that generates revenue through charging users for access to content, or through recommend content, such as movies, television shows and music»; «Training or validating a machine learning or artificial intelligence system (including large language models and Chatbots) using TMDB content».
- §1.C, ограничения бесплатной лицензии: «Use the TMDB APIs or TMDB Content in connection with, including for training, a machine learning (ML) or artificial intelligence (AI) based Application.» и «Cache, for longer than 6 months, any information obtained through or from TMDB».
- Права на картинки TMDB не передаёт: «We do not claim ownership of any of the images or data in the API» ([FAQ](https://developer.themoviedb.org/docs/faq)). Права на постеры остаются у студий.
- Обновление: `/movie/changes` отдаёт ID, изменённые за 24 часа, окно до 14 дней ([reference](https://developer.themoviedb.org/reference/changes-movie-list)). Ежедневные выгрузки ID готовы к 8:00 UTC и хранятся 3 месяца, это «not, nor intended to be full data exports» ([daily-id-exports](https://developer.themoviedb.org/docs/daily-id-exports)). Лимит «somewhere in the 40 requests per second range» ([rate-limiting](https://developer.themoviedb.org/docs/rate-limiting)).
- Число тайтлов TMDB на официальных страницах не нашёл. Страница API for Business называет 39 языков и пользователей из 180+ стран.

**IMDb** (S):
- «Subsets of IMDb data are available for access to customers for personal and non-commercial use.» Обновление: «The data is refreshed daily.» ([non-commercial-datasets](https://data.imdb.com/non-commercial-datasets/))
- Сбор с сайта запрещён: «You may not use data mining, robots, screen scraping, or similar online data gathering and extraction tools on our website.» ([help](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX))
- Объём в листинге AWS противоречив: в одном месте «9+ million titles», в другом «over 12 million movie, TV, OTT series, and video game titles». Цифру брать нельзя, пока IMDb её не подтвердит.

**OMDb** (S, [legal.htm](https://www.omdbapi.com/legal.htm)): §4.2.5 «You may not build a business utilizing the Contributions, whether or not for profit.»

**Wikidata** (S): структурированные данные «released into the public domain under Creative Commons Zero». JSON-дампы выходят «on a weekly basis».

**MovieLens** (S, README ml-32m): «The user may not use this information for any commercial or revenue-bearing purposes without first obtaining permission from a faculty member of the GroupLens Research Project at the University of Minnesota.»

**Trakt** (S, [API Use Policy](https://developer.trakt.tv/docs/api-use-policy)):
- «Standard API access is free for commercial and noncommercial use.»
- «You may use related titles and other permitted API results to support recommendations within your app, including personalized recommendations based on titles a user follows or enjoys.»
- Запрещено: «Scraping, bulk harvesting, or mirroring Trakt data to build a reusable copy of its catalog, community activity, ratings, or lists.»
- Лимиты (старая документация на Apiary, помечена устаревшей): 1000 GET-запросов за 5 минут ([trakt.docs.apiary.io](https://trakt.docs.apiary.io/)).
- Вывод (Sp): Trakt годится для данных по запросу пользователя и для импорта его истории, но не как основа собственного каталога.

**Letterboxd** (S, снимок Wayback 15.10.2026): «At this time we are not granting access for data-analysis, visualization or recommendation projects, for LLM or GPT-related use, for private or personal projects, or for any usage that recreates current or planned features of our paid subscription tiers.»

**Кинопоиск** (S, редакция 06.02.2026):
- п. 6.6: «Пользователь или иные третьи лица не имеют права (если только иное прямо не разрешено сервисами Сайта) каким-либо образом изменять, копировать, стирать, сохранять, выкачивать, распространять, передавать, продавать, «постить» и иным образом использовать Информацию, размещенную на Сайте … без предварительного разрешения Администрации Сайта и/или соответствующего правообладателя»; там же: «Использование Рейтинга Кинопоиска возможно только с предварительного разрешения Администрации Сайта, а также при обязательном указании того, что такой рейтинг является Рейтингом Кинопоиска».
- п. 6.7: «Пользователи обязуются использовать Информацию … только в личных некоммерческих целях».
- п. 5.2 запрещает «роботы («пауки») или другие автоматические алгоритмы и методы, направленные на «выкачивание» (сбор)».
- Официальный API: в интервью 2013 года говорилось о закрытом API для партнёров ([qna.habr.com/q/77992](https://qna.habr.com/q/77992) и сниппеты выдачи). Актуальных условий нет (Sp).

**ПоискКино** (S по фактам со страницы): подвал сайта: «Агрегация из открытых источников (Кинопоиск, TMDb, IMDb). Все права на оригинальные материалы принадлежат их правообладателям.» Вывод (Sp): сервис собирает данные из трёх источников, и условия каждого из них запрещают такой сбор и перепродажу (Кинопоиск п. 5.2, 6.6; TMDB §1.C, §2.A; IMDb help). Покупка у посредника этих прав не даёт. Для прототипа проще, чем свой парсер, для платного продукта не годится.

---

## 2. Где смотреть

| Источник | Что даёт | Коммерция | Цена | Атрибуция | Ссылка | Ур. |
|---|---|---|---|---|---|---|
| JustWatch Data API | Доступность по сервисам, цены, виджеты, BI-отчёты; по словам JustWatch, 120+ стран | По договору («currently serves bigger partners») | Не опубликована, писать на data-partner@justwatch.com | По договору | [JustWatch Streaming API](https://www.justwatch.com/us/JustWatch-Streaming-API), [Terms of Use §1.2, §7.1](https://support.justwatch.com/article/just-watchs-terms-of-use) | S |
| TMDB watch providers | Список сервисов по стране (данные JustWatch), без прямых ссылок | Только в рамках коммерческого договора с TMDB | — | Обязательна ссылка на JustWatch | [movie-watch-providers](https://developer.themoviedb.org/reference/movie-watch-providers) | S |
| Watchmode | Доступность, 424 провайдера в списке, 54 страны | Developer — нет; Startup, Business, Enterprise — да | Developer 0 (2500 кредитов/мес, до 3 стран); Startup $349/мес (40 000); Business $599/мес (100 000); Enterprise по запросу (S3/sFTP) | На бесплатном обязательна, на платных нет | [api.watchmode.com](https://api.watchmode.com/) | S |
| Streaming Availability API (Movie of the Night) | 65 стран, 2277 каталогов, 200 000 фильмов и сериалов; прямые ссылки, даты ухода из каталога, цены аренды и покупки, Top 10 | Да, на всех тарифах, включая бесплатный | Free 1000 запросов/мес; $49 (25 000); $99 (100 000); $299 (1 000 000) | Обязательна, если данные и картинки показываются публично | [about/api](https://www.movieofthenight.com/about/api), [pricing](https://www.movieofthenight.com/about/api/pricing) | S |
| Reelgood | Доступность и прямые ссылки, REST + S3; по словам Reelgood, 300+ сервисов, 25+ стран | По лицензии | Не опубликована | — | [data.reelgood.com](https://data.reelgood.com/) (через сниппеты поиска) | Sp |
| Кинопоиск HD, Okko, Иви, Wink, Start | Публичных API и фидов для сторонних сервисов не нашёл | Нет источника | — | — | См. лог поиска | Sp |

Детали:
- JustWatch, пользовательские условия (S): §1.2 «The use of the service on JustWatch is intended for personal and non-commercial use only»; §7.1 запрещает «data mining, robots, scraping or similar data gathering or extraction methods». Условия партнёрского кабинета §3.1 запрещают «use the Service Content in any way for any public or commercial purpose» без разрешения ([partners.justwatch.com/legal/termsofuse](https://partners.justwatch.com/legal/termsofuse)).
- Россия в JustWatch: страница justwatch.com/ru открывается. В HTML на 2026-10-20 есть ссылки на провайдеров kinopoisk, okko, premier, amediateka, more-tv, tvigle, rambler; ivi, wink и start на главной не нашёл (S как наблюдение; полнота списка не проверена). Значит, через JustWatch (напрямую или через TMDB watch providers) часть российских сервисов, вероятно, покрыта (Sp).
- Покрывают ли Россию Watchmode и Streaming Availability, не проверил: списки стран отдаются только API с ключом.
- Иви: есть CPA-партнёрка (оплата за подписку или покупку), формат фида не описан ([affi.io/m/ivi-ru-cps](https://affi.io/m/ivi-ru-cps), Sp). У Яндекса есть формат JSON-фида, в котором кинотеатры передают каталог в поиск Яндекса ([yandex.ru/support/webmaster](https://yandex.ru/support/webmaster/search-appearance/films.html)). Данные идут от кинотеатра к Яндексу, сторонним сервисам этот канал ничего не даёт (Sp).
- Streaming Availability, FAQ (S): «Yes, all subscription plans, including the free tier, allows commercial usage.»

---

## 3. Видеоигры (ПК, консоли, телефон)

| Источник | Что даёт | Коммерция | Цена | Атрибуция | Ссылка | Ур. |
|---|---|---|---|---|---|---|
| IGDB (Twitch) | Метаданные, жанры, темы (themes), ключевые слова, режимы, перспектива игрока, время прохождения (`game_time_to_beats`: hastily/normally/completely), популярность (PopScore), вебхуки на изменения | По договору (партнёрская программа) | Бесплатно для некоммерческого. Цена партнёрства не опубликована, писать на partner@igdb.com | Не нашёл в доке | [api-docs.igdb.com](https://api-docs.igdb.com/), [Twitch Developer Services Agreement](https://legal.twitch.com/legal/developer-agreement/) | S |
| RAWG | 500 000+ игр, «где купить», похожие игры, видео | Условия противоречат друг другу (см. ниже). Безопасно — тариф Business | Free 20 000 запросов/мес; Business $149/мес (50 000); Enterprise по запросу (1 000 000) | Активная ссылка на RAWG на каждой странице с данными | [apidocs](https://rawg.io/apidocs), [tos_api §8](https://rawg.io/tos_api) | S |
| Steam Web API | Список приложений с фильтром по дате изменения (`IStoreService/GetAppList`, `if_modified_since`); отзывы (`IUserReviewsService/GetAppReviews`: текст, оценка, языки, фильтры по наработке часов) | Явного запрета нет; лицензия — показ данных пользователям «for their personal use» | 0, 100 000 вызовов в сутки | Имя, логотип Valve и ссылки на Valve без nofollow | [Steam Web API Terms §1–3](https://steamcommunity.com/dev/apiterms), [IUserReviewsService](https://partner.steamgames.com/doc/webapi/IUserReviewsService), [IStoreService](https://partner.steamgames.com/doc/webapi/IStoreService) | S |
| Steam Storefront `appdetails` | Описание, жанры, категории, цены, системные требования | Неясно: в официальной документации эндпоинт не описан | 0 | — | — | Sp |
| SteamSpy | Пользовательские теги Steam с числом голосов, оценка владельцев (диапазоном), среднее и медианное время в игре | Неясно: лицензия не указана | 0; 1 запрос/с, `all` — 1 раз в 60 с; обновление раз в сутки | — | [steamspy.com/api.php](https://steamspy.com/api.php) | S (факты), неясно (права) |
| OpenCritic (RapidAPI) | Оценки критиков, ссылки на рецензии | Да («Commercial Use» на всех тарифах) | Basic 0 (200 запросов/день); Ultra $19/мес (2000/день); Mega $50/мес (без лимита) | Не нашёл | [RapidAPI pricing](https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api/pricing) | S |
| MobyGames API | Жанры, группы/серии, платформы, обложки, скриншоты | Есть коммерческий вариант, цены не видел | Не прочитано (Cloudflare) | — | [info/api](https://www.mobygames.com/info/api/) (снимок Wayback 12.09.2026) | S (наличие), Sp (условия) |
| PCGamingWiki | Технические данные, фиксы, системные требования | Нет (CC BY-NC-SA) | 0 | BY | [PCGamingWiki:Copyrights](https://www.pcgamingwiki.com/wiki/PCGamingWiki:Copyrights) | S |
| HowLongToBeat | Время прохождения | Нет. API нет, автоматический сбор запрещён | — | — | [robots.txt](https://howlongtobeat.com/robots.txt) | S |
| IsThereAnyDeal | Текущие цены по магазинам и регионам, исторический минимум, история цен | Да, если приложение публичное; запрещено конкурировать с ITAD | 0; 1000 запросов за 5 минут | Рекомендуется (SHOULD), не обязательна | [docs.isthereanydeal.com](https://docs.isthereanydeal.com/) | S |
| App Store (iTunes Search API) | Поиск и карточки приложений, обложки 100×100 и 60×60 | Только для продвижения контента стора (партнёрские ссылки) | 0; около 20 вызовов в минуту | Значок стора рядом с промо-материалами | [performance-partners.apple.com/search-api](https://performance-partners.apple.com/search-api) | S |
| Google Play | Публичного API каталога для сторонних сервисов не нашёл | Нет: контент только «в некоммерческих целях» | — | — | [Условия Google Play](https://play.google.com/about/play-terms/index.html) | S (условия), Sp (отсутствие API) |

Цитаты и детали:
- IGDB (S): «The IGDB.com API is free for non-commercial usage under the terms of the Twitch Developer Service Agreement.» и «we allow commercial usage. Get in touch with us about our partner program!» Лимит: «There is a rate limit of 4 requests per second.» Дампы: «Daily updated CSV Data Dumps … exclusively available to our Data Partners.»
- Twitch Developer Services Agreement (S, снимок Wayback 28.08.2026, «Last modified on 12/04/2024»): «Do not store copies of Twitch Content or Program Materials, unless you: (a) obtain prior written authorization from Twitch …; (b) control the rights associated with such content; or (c) cache such information for only a twenty-four hour time period» и «Re-syndication and re-distribution of Program Materials or data as available from a Twitch API is prohibited.» Распространяется ли это на данные IGDB, документ прямо не говорит. Если распространяется, свой каталог из IGDB без партнёрского договора хранить нельзя (Sp, уточнить у partner@igdb.com).
- RAWG (S): страница apidocs про Free: «Non-commercial projects only». Условия §8.2.1, обновлены 1 марта 2021: API «is free for commercial use for projects and/or services within 20.000 requests per month», пока у проекта «no more than 100.000 monthly active users or 500.000 page views per month». Условия противоречат странице тарифов. Для платного продукта брать Business: в его описании прямо указано «Commercial use». Перепродавать данные нельзя: «No data redistribution».
- Steam Web API Terms §2 (S): «you may access the Steam Web API, implement the Steam Web API in your Application, and distribute Steam Data to end users for their personal use via your Application». Отзывы — пользовательский контент. Можно ли извлекать из них признаки и показывать производные выводы в платном продукте, условия прямо не говорят (неясно).
- Официального эндпоинта для пользовательских тегов Steam в документации Steamworks не нашёл. Теги с голосами есть только у SteamSpy, у которого лицензии нет.
- HowLongToBeat (S, robots.txt, сайт принадлежит Ziff Davis): «Use of any robot, crawler, or other tool to scrape, harvest, extract, or retrieve any content on this website using automated means is prohibited without written permission from Ziff Davis», в том числе для «development or operation of artificial intelligence or machine learning software or databases, including by training, fine-tuning, embedding, and retrieval-augmented generation» и «any commercial purposes». Замена — IGDB `game_time_to_beats`.
- MobyGames (снимок 12.09.2026): «We have options for hobbyists as well as users with a commercial application in mind.» Некоммерческий лимит: 720 запросов в час, не чаще 1 в секунду.
- PCGamingWiki (S): «Content is available under Creative Commons Attribution Non-Commercial Share Alike».
- IsThereAnyDeal (S): «You MAY use this API for commercial purposes IF the resulting app is available to public»; «You MUST NOT change provided data in any way» (сюда относятся и партнёрские метки в ссылках).
- Мобильные игры: IGDB ведёт платформы iOS и Android (Sp, справочник платформ не открывал). Легального источника по каталогу Google Play и отзывам из сторов не нашёл. Это дыра.

---

## 4. Аниме

| Источник | Что даёт | Коммерция | Цена | Атрибуция | Ссылка | Ур. |
|---|---|---|---|---|---|---|
| AniList GraphQL | Метаданные, жанры, теги, рейтинги, связи | Бесплатно при выручке до $150 в месяц, выше — коммерческая лицензия | 0 / по договору (contact@anilist.co) | Правила именования: «UNOFFICIAL» или «for AniList» в названии | [docs.anilist.co/guide/terms-of-use](https://docs.anilist.co/guide/terms-of-use) | S |
| MyAnimeList API v2 | Метаданные, оценки, списки пользователей | Только с письменного разрешения | 0 для некоммерческого | «authorized by MyAnimeList» | [API License and Developer Agreement](https://myanimelist.net/static/apiagreement.html) (Last Modified: August 8, 2019) | S |
| Jikan | Неофициальный API: парсит MyAnimeList | Нет (вывод: нарушает §4(i) соглашения MAL) | 0; 3 запроса/с, 60/мин; кэш 24 ч | — | [OpenAPI-описание Jikan](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json) | S (факты), Sp (вывод) |
| Kitsu | Метаданные аниме и манги | Нет по общим условиям; условия API — «available upon request» | — | — | [kitsu.app/terms §1.3](https://kitsu.app/terms) | S |
| Shikimori | Каталог на русском, оценки, рецензии; GraphQL и v2 | Неясно: отдельных условий API нет | 0; 5 запросов/с, 90/мин | — | [shikimori.io/api/doc](https://shikimori.io/api/doc), [terms](https://shikimori.io/terms) | S (лимиты), неясно (коммерция) |
| AniDB | Метаданные, связи, дамп названий | Неясно. Страница закрыта Cloudflare | — | — | [HTTP API Definition](https://wiki.anidb.net/HTTP_API_Definition) (не открылась) | Sp |

Цитаты:
- AniList (S): «The AniList API may be used within commercial applications or services operating at less than $150 of revenue per month free of charge, no express permission is required. Applications or services operating at greating than $150 of revenue per month will need to acquire a commercial license.» Запреты: «Using the AniList API as a backup or data storage service is strictly prohibited. Hoarding or mass collection of data from the AniList API is strictly prohibited.» Также запрещены «competing, non-complementary services of the same nature … anime and manga list or tracker services». Лимит: 90 запросов в минуту, сейчас временно 30 ([rate-limiting](https://docs.anilist.co/guide/rate-limiting)).
- MAL (S): §1 определяет коммерческие приложения через примеры: «subscription or single-pay use model applications … applications with tiered user experiences based on financial transactions». §3(a)(xiv) запрещает «generate, charge or earn any fees, profits, revenues or other funds or amounts through Your Commercial Applications without the express authorization of the Company in writing». §4(i): «You agree that you and Your Applications will only obtain MyAnimeList Content directly through the API».
- Jikan (S): «Jikan is an **Unofficial** MyAnimeList API. It scrapes the website»; «Jikan is not affiliated with MyAnimeList.net.»
- Kitsu (S): §1.3 «You may not, under any circumstances, make commercial use of, copy, access or otherwise use Kitsu content … separate or apart from your use of Kitsu Services»; «To the extent Kitsu permits the use of Kitsu's API, such use will be subject to a separate set of terms available upon request.»
- Shikimori (S): «Please do not parse the main site. Fetch all necessary data via API.» В пользовательском соглашении запрет узкий: «копировать и использовать в коммерческих целях любую информацию, получаемую посредством данного ресурса, нарушающую права других Пользователей». Прямого разрешения на коммерческое использование нет, нужен письменный ответ (mail@shikimori.io).
- AniDB (Sp, сниппет поисковика с официальной страницы): клиент нужно регистрировать; требуется локальный кэш; за повторный запрос тех же данных в течение дня банят; не чаще одной страницы в 2 секунды. Условия коммерческого использования не нашёл.

---

## 5. Отзывы и обсуждения — сырьё для аспектов

| Источник | Что даёт | Коммерция | Цена | Ссылка | Ур. |
|---|---|---|---|---|---|
| Steam reviews | Текст, оценка, язык, часы в игре на момент отзыва; без ключа | Неясно (см. §2 условий Steam Web API) | 0 | [IUserReviewsService](https://partner.steamgames.com/doc/webapi/IUserReviewsService) | S (доступ), неясно (права) |
| IMDb User Reviews (add-on) | «The most helpful movie, TV show, and video game reviews written by IMDb users» | Да, по контракту | По запросу | [data.imdb.com](https://data.imdb.com/) | S |
| IMDb Parents Guide (add-on) | Описания насилия, страшных сцен и т.п. по тайтлам (по названию продукта; состав полей не открывал) | Да, по контракту | По запросу | [data.imdb.com](https://data.imdb.com/) | S (наличие), Sp (состав) |
| Reddit Data API | Посты и комментарии | По отдельному договору. Обучать ML/AI на пользовательском контенте без разрешения правообладателей нельзя | Официально не опубликована. $0,24 за 1000 вызовов — слова представителя Reddit в 2023 г., пересказанные вторичными источниками | [Data API Terms §2.4, §3.1, §3.2](https://redditinc.com/policies/data-api-terms) | S (условия), M (цена) |
| Кинопоиск (рецензии) | Русскоязычные рецензии | Нет (п. 5.2, 6.6, 6.7) | — | [соглашение](https://yandex.ru/legal/kinopoisk_termsofuse/) | S |
| Metacritic | Оценки критиков и пользователей | Нет без письменного согласия | — | [Fandom Terms of Service](https://www.fandom.com/terms-of-service-pp1) (заголовок страницы включает Metacritic) | S |
| Rotten Tomatoes | Tomatometer, отзывы | Только партнёрская лицензия (Fandango, Fabric) | Не опубликована; цифра «от $60 000 в год» есть только в каталогах API | Сниппеты: [fabricdata.com/developer](https://fabricdata.com/developer), [apis.io](https://apis.io/providers/rottentomatoes/) | Sp |
| Letterboxd | Отзывы, дневники | Нет (см. раздел 1) | — | [api-beta](https://letterboxd.com/api-beta/) | S |
| Trakt comments | Комментарии к тайтлам | Можно показывать в приложении, нельзя собирать массово | 0 | [API Use Policy](https://developer.trakt.tv/docs/api-use-policy) | S |

Цитаты:
- Reddit (S, «Effective June 19, 2023. Last Revised July 20, 2026»): §3.1 «If you are interested in using the Data APIs for commercial purposes, research in excess of rate limits, or for any use that is not expressly permitted under the Data API Terms, then you will need to enter into a separate agreement with Reddit.» §2.4: прав нет «including any right to use User Content for other purposes, such as for training a machine learning or AI model, without the express permission of rightsholders in the applicable User Content.» §3.2 требует «immediately delete any data not required for it».
- Fandom/Metacritic (S): «You are only permitted to access and view the Content for personal, non-commercial purposes … and may not build a business or other enterprise utilizing any of the Content»; запрещено «Engage in unauthorized spidering, "scraping," data mining or harvesting of Content» и «Without our express, prior written consent, use or copy the Content for the development of any software program, including, but not limited to, training a machine learning or artificial intelligence (AI) system».
- Цена Reddit по вторичным источникам расходится: от «без минимального платежа» до «минимум $12 000» ([octolens.com](https://octolens.com/blog/reddit-api-pricing), [apicostcalc.com](https://apicostcalc.com/es/reddit-api-cost-calculator.html)). Верная цифра — только после запроса в Reddit.

---

## 6. Настолки (вне скоупа)

BoardGameGeek XML API (S, [XML API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use)): лицензия «solely for strictly non-commercial purposes»; «Use of the XML API--or any of the data on the site--to train an AI (Artificial Intelligence) or Large Language Model (LLM) system is strictly prohibited»; обязателен логотип «Powered by BGG». Порядок коммерческого доступа описан в отдельном гайде, его не открывал.

---

## 7. Знания самой LLM как источник

Вывод без углубления (Sp):
- Модель придумывает несуществующие тайтлы, сиквелы, платформы, длительность и «аспекты». Каждый факт из модели нужно сверять с каталогом по ID.
- Знания заканчиваются на дате среза: новинки, доступность на сервисах и цены модель не знает по определению.
- На русском рынке и в нишевых тайтлах ошибок больше, потому что в обучающих данных их меньше.
- Права: генерация сама по себе условий источников не нарушает. Но если ответы модели строятся на данных TMDB, MAL или BGG, подставленных в контекст, это и есть запрещённое без договора «AI-based Application» или «Chatbot» (TMDB §1.C, §2.A).

---

## 8. Вывод по доменам

### Фильмы, сериалы, мультфильмы
- **Коммерческий MVP без договоров.** Каталог: Wikidata (CC0, еженедельный дамп) плюс описания из Википедии (CC BY-SA, с атрибуцией). Где смотреть: Streaming Availability API (коммерция разрешена, от $49/мес) или Watchmode (от $349/мес). Пользовательская история: импорт через Trakt.
- **Коммерческий MVP с договорами.** TMDB (цена не опубликована, заявка через API for Business), IMDb через AWS ($150 000 в год за Essential Metadata), JustWatch (только крупные партнёры).
- **Только прототип или исследование.** IMDb non-commercial datasets, MovieLens и Tag Genome, OMDb. TMDB для прототипа с LLM тоже формально запрещён (§1.C).
- **Дыры.** Русскоязычный рейтинг и отзывы: легального источника нет, Кинопоиск запрещает, посредники прав не дают. Постеры: права у студий, ни один бесплатный источник их не передаёт.

### Где смотреть
- **Коммерция:** Streaming Availability API, Watchmode (платные тарифы), Reelgood (лицензия, цена неизвестна), JustWatch (договор).
- **Дыра — Россия.** Кинопоиск HD, Okko, Иви, Wink, Start API не публикуют. Частичное покрытие возможно через JustWatch по договору (провайдеры kinopoisk, okko, premier есть на justwatch.com/ru). Покрытие России у Watchmode и Streaming Availability не проверено.

### Игры
- **Коммерческий MVP без договоров.** RAWG Business ($149/мес; метаданные, «где купить», похожие игры), Steam Web API (каталог Steam, отзывы — с оговоркой по правам), OpenCritic (от $0 до $50/мес), IsThereAnyDeal (цены, приложение должно быть публичным).
- **По договору.** IGDB: лучший набор признаков (темы, ключевые слова, перспектива, режимы, время прохождения, вебхуки), но коммерция только через партнёрство, а хранение данных, вероятно, ограничено 24 часами (Sp).
- **Только прототип.** IGDB без договора, PCGamingWiki, SteamSpy (теги, лицензия не указана).
- **Дыры.** Мобильные игры: легального каталога Google Play нет, у Apple Search API только промо-использование. Время прохождения: HowLongToBeat запрещён, есть только IGDB `game_time_to_beats` (по договору). Пользовательские теги Steam: официального эндпоинта не нашёл.

### Аниме
- **Коммерческий MVP.** AniList бесплатно, пока выручка меньше $150 в месяц, но без массового сбора, то есть только запросы по ходу работы, а не свой каталог. Каталог аниме можно собрать из Wikidata (Sp: полноту для аниме не проверял).
- **По договору.** AniList при выручке от $150 в месяц, MAL (письменное разрешение), Kitsu (условия по запросу).
- **Неясно.** Shikimori (нужно письменное подтверждение), AniDB.
- **Нельзя.** Jikan в платном продукте.

### Общий ответ на страх «ресёрчить каталог каждый день»
Ежедневное обновление закрывается автоматически у источников с механизмом изменений: TMDB `/changes` и ежедневные выгрузки ID, IGDB вебхуки и дампы (для партнёров), Steam `GetAppList?if_modified_since`, Wikidata еженедельные дампы, IMDb ежедневные файлы, ПоискКино ежедневная пересборка. Ручная работа нужна только там, где нет легального источника: русские рейтинги, российские онлайн-кинотеатры, мобильные игры.

---

## 9. Можно ли законно собрать «аспекты опыта»

Аспект = тон, темп, гринд, длина, сложность, жестокость и т.п. Варианты по степени чистоты:

1. **Структурные поля каталогов (самое чистое).**
   - Игры: IGDB themes, keywords, game_modes, player_perspectives, `game_time_to_beats` — по партнёрскому договору. RAWG — жанры, теги, похожие игры (Business, $149/мес). Steam — жанры и категории из `appdetails` (эндпоинт не документирован, Sp).
   - Фильмы: Wikidata — жанры и свойства (CC0). TMDB keywords — по договору. IMDb Parents Guide — по контракту AWS, закрывает аспект «жестокость/страшно».
   - Аниме: теги AniList — при выручке до $150/мес или по лицензии.
2. **Тексты, по которым LLM размечает аспекты.**
   - Описания из Википедии: CC BY-SA 4.0. Выдержки, показанные пользователю, требуют атрибуции и той же лицензии. Извлечённые факты («темп медленный») — не копия текста. Это моя интерпретация, не проверенная юристом (Sp).
   - Steam reviews: доступ официальный и бесплатный, но условия разрешают показывать данные пользователю «for their personal use», а про анализ и производные признаки в платном продукте молчат. Статус неясный, нужен запрос в Valve или оценка юриста.
   - IMDb User Reviews: легально, но дорого (контракт AWS, цена по запросу).
   - Reddit: только по договору. Обучать модели на комментариях нельзя без разрешения авторов (§2.4). Как трактуется разовая разметка через LLM без обучения, условия прямо не говорят (неясно).
3. **Нельзя без договора:** Кинопоиск, Metacritic, Letterboxd, HowLongToBeat, MAL через Jikan, BGG (запрет на обучение ИИ), TMDB в любом AI-приложении.
4. **Свои данные.** Ответы пользователей TASTIQ («за что понравилось») — единственный источник аспектов, у которого нет внешнего правообладателя. Обязанности здесь — по законам о персональных данных, это вне этого потока.

Практический вывод: аспекты для игр законно собираются из IGDB (договор) + RAWG Business + Steam reviews (после проверки прав). Для фильмов — из Wikidata + Википедии + платных IMDb Reviews и Parents Guide; без бюджета на IMDb фильмам не хватает отзывов как сырья. Для аниме — AniList в пределах лимита выручки.

### Куда писать за условиями (открытые вопросы)

| Кому | Что выяснить |
|---|---|
| TMDB, форма API for Business | Цена коммерческой лицензии для рекомендательного сервиса с LLM; разрешено ли хранить каталог и как это сочетается с лимитом кэша 6 месяцев |
| partner@igdb.com | Цена партнёрства; распространяется ли на данные IGDB 24-часовой лимит хранения из Twitch DSA |
| data-partner@justwatch.com | Берут ли небольшие проекты; покрытие России |
| Valve | Можно ли извлекать признаки из отзывов Steam для платного сервиса |
| contact@anilist.co | Цена лицензии после $150 выручки в месяц; можно ли хранить локальную копию |
| imdb-licensing@imdb.com (адрес из сниппета листинга AWS, Sp) | Цена User Reviews и Parents Guide отдельно от Essential Metadata |
| Яндекс / Кинопоиск, отдел партнёрств | Есть ли партнёрский API и на каких условиях |

---

## Лог поиска

Открытые официальные страницы (WebFetch, curl, Playwright там, где страница рендерится на JS):
- TMDB: api-terms-of-use (полный текст через Playwright), FAQ, API for Business, rate-limiting, daily-id-exports, changes-movie-list, movie-watch-providers.
- IMDb: data.imdb.com, non-commercial-datasets (редирект с developer.imdb.com), help-статья про использование данных; листинг AWS Marketplace prodview-yeuyizioqmfsy.
- OMDb: legal.htm, apikey.aspx (цены Patreon не показаны).
- MovieLens: README ml-32m (WebFetch упал на SSL, текст взят через curl), grouplens.org/datasets/movielens.
- Wikidata: Licensing, Database download. Wikipedia: Copyrights.
- Trakt: trakt.tv/terms (про API ничего), trakt.docs.apiary.io (помечена deprecated), developer.trakt.tv/docs/api-use-policy (основной источник).
- Letterboxd: api-beta — живая страница 403, использован снимок Wayback от 15.10.2026.
- Кинопоиск: yandex.ru/legal/kinopoisk_termsofuse (редакция 06.02.2026). kinopoisk.dev и /database — тарифы, объём, подвал. kinopoiskapiunofficial.tech — только JS-оболочка, условия не прочитаны.
- JustWatch: JustWatch-Streaming-API, support-статья Terms of Use, partners.justwatch.com/legal/termsofuse, HTML justwatch.com/ru (список провайдеров). Адрес justwatch.com/us/terms-of-use отдал 404.
- Watchmode: api.watchmode.com. Movie of the Night: about/api, about/api/pricing; docs.movieofthenight.com/resource/countries (списка стран без ключа нет).
- IGDB: api-docs.igdb.com (WebFetch 403, текст через curl). Twitch DSA: legal.twitch.com рендерится на JS, взят снимок Wayback от 28.08.2026.
- RAWG: apidocs, tos_api. Steam: steamcommunity.com/dev/apiterms, partner.steamgames.com — getreviews (deprecated), IUserReviewsService, IStoreService. Страница IStoreBrowseService без упоминания тегов.
- SteamSpy: api.php. OpenCritic: opencritic.com/api — 404; RapidAPI pricing через Playwright; страница details пустая.
- MobyGames: Cloudflare (403 и в curl, и в Playwright), использован снимок Wayback от 12.09.2026. Обходить защиту не пытался.
- PCGamingWiki: Copyrights (WebFetch 403, текст через curl). HowLongToBeat: /terms пустой, robots.txt прочитан.
- IsThereAnyDeal: docs.isthereanydeal.com. Apple: performance-partners.apple.com/search-api. Google Play: play-terms.
- AniList: terms-of-use и rate-limiting (WebFetch 403, curl успешно). MAL: apiagreement.html. Jikan: OpenAPI JSON на GitHub; jikan.moe/terms — 404. Shikimori: shikimori.one и shiki.one — 522, shikimori.io/api/doc и /terms открылись. Kitsu: kitsu.app/terms через Playwright. AniDB: Cloudflare-блок и в Playwright, и в Wayback.
- Reddit: redditinc.com/policies/data-api-terms через curl (WebFetch отказал). Страница support.reddithelp.com — 403.
- Metacritic: metacritic.com/terms-of-use — 404; ссылка из подвала ведёт на fandom.com/terms-of-service-pp1 (Playwright, WebFetch отдал 402).
- BGG: XML_API_Terms_of_Use через Playwright (WebFetch 403).

Поисковые запросы (WebSearch):
- «Trakt API terms of use commercial use» — официальных условий в выдаче нет; нашлись позже на developer.trakt.tv.
- «Letterboxd API access request terms commercial» — ссылка на api-beta и условия.
- «IMDb API AWS Data Exchange pricing» — листинги AWS; цифра $150 000 есть и в блоге api.market (вторичный), подтверждена листингом.
- «kinopoisk.dev API условия использования коммерческое тарифы» — условий нет; тарифы найдены на самом сайте.
- «официальный API Кинопоиска для партнёров» — только старые упоминания закрытого API (2013–2015); актуального нет. **Отрицательный результат.**
- «JustWatch API partner content partner data licensing terms» — GitHub README с адресом data-partner@, плагин WordPress, ссылка на партнёрские условия.
- «Streaming Availability API pricing commercial» — подтверждение бесплатного тарифа и требования атрибуции; цены взяты с официальной страницы.
- «Reelgood API data partners» — только маркетинговые страницы Reelgood; цены и условия не опубликованы. **Отрицательный результат по ценам.**
- «MobyGames API pricing commercial license» — цен нет. **Отрицательный результат.**
- «OpenCritic API RapidAPI pricing» — в выдаче только статьи PCGamesN; цены взяты с RapidAPI напрямую.
- «HowLongToBeat official API terms» — API нет (форум muOS); запрет найден в robots.txt.
- «AniDB HTTP API definition commercial» — сниппет официальной страницы про регистрацию клиента и баны; про коммерцию ничего. **Отрицательный результат.**
- «Reddit Data API terms 2024 commercial pricing» — вторичные источники с расходящимися цифрами; условия взяты с redditinc.com.
- «Rotten Tomatoes API licensing Fandango» — только партнёрский доступ; цена $60 000 только в каталогах API. **Официальной цены нет.**
- «Иви Okko Wink Start партнёрская программа XML фид API» — CPA-партнёрка Иви (affi.io) и формат фида Яндекса для кинотеатров; API для сторонних сервисов нет. **Отрицательный результат.**
- «Кинопоиск API для партнёров 2026» — ничего нового. **Отрицательный результат.**

Что не проверено и почему:
- Покрытие России у Watchmode и Streaming Availability: списки стран отдаются только с API-ключом.
- Полные EULA IMDb на AWS и коммерческие условия TMDB, IGDB, JustWatch: не опубликованы, выдаются по запросу.
- Общее число тайтлов TMDB, IGDB, AniList, Trakt: на официальных страницах цифр нет.
- Условия kinopoiskapiunofficial.tech, Shikimori (коммерция), AniDB: страницы недоступны или не содержат условий.
