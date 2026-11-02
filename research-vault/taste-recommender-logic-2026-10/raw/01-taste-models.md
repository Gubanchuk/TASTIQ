# Поток 1. Модели вкуса и как люди объясняют, за что им зашло

Дата сбора: 2026-10-20. Дата доступа всех ссылок — 2026-10-20, если не указано иное.

Уровни: **Strong** — первоисточник, официальная документация, рецензируемая статья; **Moderate** — два и больше независимых вторичных источника; **Speculative** — один вторичный источник или мой вывод. Мои расчёты на открытых данных помечены «расчёт».

---

## 0. Главное

1. Жанр — слабый признак и для похожести, и для отсева. Valve прямо пишет, что тег «Action» почти не влияет на рекомендации, потому что он у всех; вес у редких тегов. Netflix Prize: 10 оценок нового фильма предсказывают лучше, чем все его метаданные. Главные скрытые оси вкуса в данных Netflix идут поперёк жанров (комедия есть на обоих полюсах). **Strong**
2. Жанр часто склеивает несвязанные мотивации. Quantic Foundry: RPG исторически объединяют две разные аудитории — любителей истории и мира и минмаксеров, которым важна оптимизация персонажа. Это ровно случай «люблю BG3 за историю, а не за бои». **Strong** (тезис Ника Йи в докладе GDC 2017) / **Moderate** (пример с RPG — его цитата в интервью)
3. Объясняя вкус, люди говорят не о жанре. В играх чаще всего называют петлю — что делаешь каждые несколько минут (13 из 23 запросов), в кино и сериалах — тон (11 из 23), в аниме — персонажей и тон. В 7 из 55 запросов жанр прямо объявлен неважным. **Speculative** (моя разметка, малая выборка)
4. Сказанное и сделанное расходятся. Netflix убрал звёзды, потому что люди ставили 5 документалкам и 3 комедиям, а смотрели комедии; бинарная оценка дала на 200% больше оценок. **Moderate**
5. Средние оценки шумные. В тесте-ретесте на 118 людях больше всего расхождений на 2–3 звёздах, крайние оценки устойчивы. Значит, мягкое «не очень» — слабый сигнал, «нет» и «обожаю» — сильные. **Strong**
6. «Не моё» и «плохо сделано» в моделях разведены: в матричной факторизации есть смещение тайтла (его «воспринимают лучше или хуже других») и отдельно взаимодействие «пользователь × тайтл». Для отсева брака сервисы ставят порог числа голосов и тянут оценку к среднему. **Strong**
7. Цифры «боли выбора» — самоотчёты и внутренние оценки без методики: Nielsen 7,4 мин (2019) → 11:16 (2022) → 10,5 мин (2023), Netflix 60–90 секунд («consumer research suggests»). Эффект перегрузки выбором в среднем около нуля (Scheibehenne 2010), но проявляется при неуверенности в предпочтениях, сложном наборе и цели «потратить меньше сил» (Chernev 2015). Это как раз ситуация «не знаю, что хочу». **Strong** (метаанализы), **Moderate** (Nielsen)

---

## a) Подтверждённые измерения вкуса

### a1. Quantic Foundry, Gamer Motivation Model

- 12 мотиваций в 6 парах: Action (Destruction, Excitement), Social (Competition, Community), Mastery (Challenge, Strategy), Achievement (Completion, Power), Immersion (Fantasy, Story), Creativity (Design, Discovery). Выделены факторным анализом, связи — иерархической кластеризацией. **Strong** — https://quanticfoundry.com/2015/07/20/how-we-developed-the-gamer-motivation-profile-v2/
- Три верхних кластера: Action-Social, Immersion-Creativity, Mastery-Achievement. Discovery — мост между Immersion-Creativity и Mastery-Achievement, Power — между Action-Social и Mastery-Achievement. Оси карты авторы трактуют как «действие на мир ↔ на других игроков» и «cerebral ↔ kinetic» (вдумчиво-долгое против быстро-динамичного). Структура одинакова в регионах: Северная Америка N=81k, Западная Европа 13,8k, Юго-Восточная Азия 14,3k и др. Важная оговорка авторов: далёкие мотивации независимы, а не противоположны — можно быть высоким и в Action-Social, и в Mastery-Achievement. **Strong** — https://quanticfoundry.com/2015/12/21/map-of-gaming-motivations/
- Выборки: версия 2015 — 30 000+ игроков; модель на странице описана по 140 000+; к январю 2026 — больше 2 млн игроков и 4000+ тайтлов. Респонденты сами проходят тест и называют любимые игры — это самоотбор, не случайная выборка. **Strong** — https://quanticfoundry.com/faq/ , https://quanticfoundry.com/gamer-motivation-model/
- Жанр против мотивации:
  - Доклад GDC 2017 (выборка 250 000): «some established game genres may be accidental historical combinations of unrelated gaming motivations». **Strong** (описание доклада автором) — https://www.gdcvault.com/play/1024048/The-Anatomy-of-Gaming-Motivations
  - Ник Йи о RPG: «RPGs kind of bundle together two groups of gamers that are kind of very different» — любители истории («that grandeur, that grand setting») и минмаксеры. Игроки idle-RPG оказались не казуалами, а теми, кто играл в RPG ради Completion + Power, «even though it was bundled with story, which they didn't like». **Moderate** (прямая цитата в интервью Player Driven, 2026-04-17) — https://playerdriven.substack.com/p/quantic-foundrys-nick-yee-on-gamer
  - Пример отчёта по жанру Fighting: два кластера игр — Arena (Street Fighter: крутая кривая обучения, мастерство, быстрая конкуренция) и Lore-Rich Missions (Injustice, Mortal Kombat); доля женщин 4–10% против 20–30%. **Speculative** — это демонстрационный отчёт, часть текста в нём заглушка lorem ipsum — https://quanticfoundry.com/wp-content/uploads/2020/08/Game-Space-Mapping-Example-Report.pdf
- Ограничение: модель закрыта авторским правом; рецензия в научной литературе отмечает, что мотивация «эскапизм» в неё не вошла. **Speculative** (один источник, не перепроверял) — https://pmc.ncbi.nlm.nih.gov/articles/PMC9872527

### a2. Rentfrow, Goldberg, Zilca 2011

- Journal of Personality 79(2), DOI 10.1111/j.1467-6494.2010.00662.x. Больше 3000 человек в трёх выборках (студенты N=1946, жители Юджина-Спрингфилда N=736, интернет N=545) оценивали 108 жанров музыки, кино, книг и ТВ. **Strong** — https://projects.ori.org/lrg/PDFs_papers/RentfrowEtal2011EntertainmentPreferencesJP.pdf
- Пять факторов:
  - Communal — лёгкое, популярное, но по сути «про людей и отношения» (ток-шоу, романтика, семейное);
  - Aesthetic — «creative, abstract, cultured, dense, and demanding» (классика, иностранное кино, поэзия);
  - Dark — «intensity, edginess, and hedonism» (хоррор, метал, культовое);
  - Thrilling — «action, adventure, suspense, and fantasy» (боевики, фантастика, шпионское);
  - Cerebral — информационное (новости, документалки, бизнес). **Strong**
- Вывод авторов: «entertainment preferences are more a function of substance than style» — люди выбирают похожее содержание независимо от медиа. Личность объясняет долю различий сверх демографии. **Strong**
- Что из этого НЕ следует: исследование мерило вкус жанрами, тонкие признаки оно не сравнивало. Для TASTIQ полезно одно: оси содержания (интенсивность, «про людей», сложность) переносятся между фильмами, сериалами и играми. Это совпадает с форумами (r/ifyoulikeblank просит «comforting vibe» сразу в шоу, книгах и фильмах, см. c). **Speculative** (мой вывод)

### a3. Netflix: разметка тайтлов

- Alexis Madrigal (The Atlantic, январь 2014) собрал скриптом 76 897 «altgenres». Самое частое прилагательное — «romantic» (в 5272 категориях), дальше foreign, classic, dark, British, critically acclaimed, suspenseful, gritty, independent, visually striking, family, violent, feel-good. Имена микрожанров собирает шаблон из тегов. **Moderate** — сам Madrigal на NPR: https://www.tpr.org/science-technology/2014-01-02/netflix-built-its-microgenres-by-staring-into-the-american-soul ; цитата статьи на FlowingData: https://flowingdata.com/2014/01/03/how-netflix-creates-movie-micro-genres/
- Разметка: Тодд Йеллин нанимал людей (по NPR — начинающих сценаристов), они смотрели фильмы и оценивали «romance, gore, quirkiness and even plot resolution». Внутренний документ «Netflix Quantum Theory» описывал разметку концовок, «social acceptability» главных героев и десятки других граней. Многие значения шкальные, от 1 до 5, поэтому оценку романтики получает каждый фильм. Концовка размечается от счастливой до грустной через неоднозначную; размечаются сюжет, профессии героев, места действия. **Moderate** (NPR + FlowingData)
- Объём инструкции: в цитате из статьи — «24-page document he wrote himself». Цифра «36 страниц» из задания не подтвердилась. **Speculative** (цитата на одном вторичном сайте) — https://pxlnv.com/linklog/how-netflix-reverse-engineered-hollywood/ . Сама статья theatlantic.com недоступна: 403, архив отдаёт 429.
- Сейчас Netflix в справке перечисляет сигналы так: взаимодействия (история, оценки), похожие участники и «information about the titles, such as their genre, categories, actors, release year». Демографию (возраст, пол) не использует. **Strong** — https://help.netflix.com/en/node/100639
- Главная страница: около 40 рядов, до 75 тайтлов в ряду; с главной приходят 2 из 3 часов просмотра; рекомендации влияют примерно на 80% часов, остальное поиск. **Strong** — Gomez-Uribe & Hunt 2015, ACM TMIS 6(4):13, https://gwern.net/doc/reinforcement-learning/exploration/2015-gomezuribe.pdf

### a4. Jinni, Movie Genome / Entertainment Genome

- Таксономию составили киноспециалисты, новые тайтлы размечались автоматически: NLP по рецензиям и метаданным. «Гены» описывали mood, style, plot, setting; в описаниях упоминаются также tone и structure. **Moderate** — https://en.wikipedia.org/wiki/Jinni_(search_engine) , https://en.wikipedia.org/wiki/Movie_Genome
- Число генов «около 2200» и требование «минимум 4 рецензии на тайтл». **Speculative** (одиночные пересказы прессы, через поисковые сниппеты) — https://gamesbeat.com/jinnis-movie-genome-may-be-headed-for-the-xbox/
- Судьба: лицензии Microsoft и Xbox (годы сделок не проверял), раунд B на $5 млн, сделки с Ooyala, TELUS, Prisa (январь 2014). В июне 2015 публичный сервис закрыт, дальше только B2B (упоминается Xfinity). **Moderate** — Wikipedia (выше), https://tech.eu/2014/01/06/jinni-video-recommendation-ooyala/ , https://en.globes.co.il/en/article-1000681085
- Покупка Synamedia или кем-либо ещё **не подтверждена**. Есть анонимный пост о сорвавшейся продаже Ooyala (Medium, дата неизвестна, страница 403) — Speculative. Текущий статус компании не установлен.

### a5. MovieLens Tag Genome

- Vig, Sen, Riedl 2012, ACM TiiS 2(3):13, DOI 10.1145/2362394.2362395. Каждый фильм кодируется вектором релевантности общего набора тегов (0…1). Приложение Movie Tuner позволяло двигаться от фильма к соседним «вдоль тегов» — по сути «как X, но менее жестокий». Полевой тест: 7 недель, 2531 пользователь. **Strong** — аннотация через OpenAlex: https://api.openalex.org/works/doi:10.1145/2362394.2362395
- Набор 2012 года: 1128 тегов × 9734 фильма. **Strong** — https://files.grouplens.org/datasets/tag-genome/
- Как считается релевантность (выпуск 2021, Kotkov et al., SIGIR 2021, повторяет метод Vig 2012). Люди в опросе MovieLens оценивали, насколько тег подходит фильму, по шкале 1–5 («not at all»… «very much») или «не уверен»: 58 903 ответа, 679 пользователей, 5546 фильмов. На этих ответах обучена регрессия. Признаки: сколько раз тег поставлен вручную, частота слова в рецензиях IMDb (лог), косинусная близость оценок фильма к оценкам фильмов с этим тегом, средняя оценка фильма, LSI по тегам и по рецензиям. Выпуск 2021 — 1084 тега × 9734 фильма, оценки двумя моделями (регрессия и нейросеть TagDL). **Strong** — https://files.grouplens.org/datasets/tag-genome-2021/genome_2021_readme.txt
- Словарь тегов (проверил по файлу tags.dat) почти весь лежит вне жанра:
  - тон: atmospheric, bleak, dark, depressing, feel-good, heartwarming, melancholic, grim;
  - темп: fast paced, slow paced, slow;
  - финал: happy ending, bad ending, great ending, twist ending, surprise ending, non-hollywood ending;
  - персонажи: complex characters, unlikeable characters, lone hero, anti-hero;
  - структура: non-linear, multiple storylines, unusual plot structure;
  - длина: long, too long, too short;
  - контент: gore, violence, nudity (несколько видов), foul language, disturbing, hard to watch;
  - эстетика: cinematography, stylized, visually appealing, great soundtrack.
  
  И в том же словаре оценки качества: bad acting, bad plot, bad script, plot holes, overrated. **Strong** (данные)
- Расчёт 1. Топ-теги четырёх боевиков показывают, почему «соседние по жанру» не равны:
  - Die Hard: tense 0.97, lone hero 0.98, realistic action 0.88, excellent script 0.86;
  - Commando: silly fun 0.76, arnold 0.97;
  - Transformers (2007): cgi 0.92, big budget 0.96, product placement 0.87;
  - Drive (2011): stylized 0.96, neo-noir 0.95, melancholic 0.88, great soundtrack 0.93.
- Расчёт 2. Из 554 фильмов с «action» ≥ 0.9 доля с другим тегом ≥ 0.6: fast paced 66%, special effects 39%, great ending 27%, realistic action 19%, bad plot 17%, tense 15%, silly fun 14%, stylized 12%, complex 9%. Внутри одного «жанра» разброс по тону и качеству большой. Оговорка: порог 0.6 выбран мной, распределения у тегов разные, поэтому проценты сравнивать между тегами нельзя — только видеть разброс. Скрипт и данные: файлы GroupLens tag-genome.zip.

### a6. Pandora Music Genome Project

- Официально: «team of trained musicologists», «hundreds of musical details for each song». **Strong** — https://www.pandora.com/about/mgp
- Около 450 «генов» на песню (пол вокалиста, грув, искажение гитары…), 20–30 минут на песню, 10% песен размечают двое для проверки согласованности. **Moderate** — https://en.wikipedia.org/wiki/Music_Genome_Project , Rolling Stone 2012 («up to 450 musical attributes per track»): https://www.rollingstone.com/culture/culture-news/pandora-and-intel-decode-the-dna-of-your-favorite-songs-243113/
- Аналогия для TASTIQ: ручная разметка экспертами по фиксированной анкете — дорого, но даёт сопоставимые признаки. Jinni пошёл по пути NLP на рецензиях, MovieLens — краудсорсинг плюс модель. **Speculative** (мой вывод)

### a7. Steam: пользовательские теги

- Теги ставят разработчик, игроки без ограничений аккаунта и модераторы. Минимум 5 до релиза, рекомендовано до 20. Только топ-20 видны и влияют на видимость, некоторые фильтры берут топ-15; топ-5 описывают игру. Категории мастера тегов: жанр → поджанр (пример: Action → Platformer → Precision Platformer), визуал (2D/3D, камера, стиль), Themes & Moods (Mood: Relaxing, Funny, Atmospheric), Features (Choices Matter, Resource Management, Procedural Generation), занятия игрока (Sailing, Mining, Hacking). **Strong** — https://partner.steamgames.com/doc/store/tags
- Ключевая цитата: «Some of Steam's recommendation algorithms also factor in less-frequently used tags more than really common ones. So if you have "Action" applied to your game, it matters very little … But if you have something like "Party-Based RPG" applied … it has much more influence». **Strong** (там же)
- Interactive Recommender (Steam Labs, 2019): модель учится на времени игры миллионов пользователей и «disregards most of the usual data about a game, like genre or price point»; теги используются только как фильтры на выходе. **Moderate** — https://www.pcworld.com/article/3408497/valve-interesting-steam-labs-experiments-help-you-find-new-games-to-play-in-a-sea-of-releases.html , https://www.kitguru.net/gaming/matthew-wilson/steam-labs-interactive-recommender-is-now-a-permanent-steam-store-feature/

### a8. Аниме: AniList, MAL, Shikimori

- AniList: у тега есть rank — «relevance ranking of the tag out of the 100 for this media», флаги спойлера (общий и для конкретного тайтла), флаг 18+. **Strong** — https://docs.anilist.co/reference/object/mediatag
- Расчёт по публичному API AniList (запрос MediaTagCollection): 428 тегов. Больше всего в категориях Cast-Traits (73), Sexual Content (66), Theme-Other (60), Theme-Game-Sport (31), Setting-Scene (24), Technical (21: Episodic, No Dialogue, CGI, Rotoscoping…), Cast-Main Cast (12: Anti-Hero, Ensemble Cast, Female Protagonist…), Demographic (5). Тегов на тон и темп мало: Iyashikei, Tragedy, Surreal Comedy. Пример: у Mushishi теги Environmental 98%, Iyashikei 96%, Episodic 89%, Philosophy 88%, а жанры Adventure / Fantasy / Mystery ничего из этого не передают. **Strong** (данные API)
- Как набирается процент — голосованием пользователей за «насколько тег заметен». Официальной формулы я не нашёл. Тезис «новый тег стартует с 20%» — пост с чужого форума по памяти, **Speculative** — https://forums.learnnatively.com/t/content-tags-genre-tags/707
- MAL делит метки на Genres (Action, Comedy, Drama, Slice of Life, Suspense…), Explicit Genres, Themes (Iyashikei, Isekai, Psychological, Gore, Harem, Love Polygon, Workplace…) и Demographics (Josei, Kids, Seinen, Shoujo, Shounen). **Strong** (страница каталога) — https://myanimelist.net/anime.php . Дату разделения не нашёл.
- У MAL есть пользовательские рекомендации «если понравилось X — посмотри Y» с текстом причины. Это готовый корпус объяснений похожести (разбор в разделе c). — https://myanimelist.net/anime/31240/Re_Zero_kara_Hajimeru_Isekai_Seikatsu/userrecs

### a9. Другие данные о том, что жанр — слабый предиктор

- **Pilászy & Tikk, RecSys 2009** (DOI 10.1145/1639714.1639731): «even 10 ratings of a new movie are more valuable than its metadata for predicting user ratings». Метаданные — около 140 000 признаков по фильмам Netflix Prize. **Strong** — аннотация: https://api.openalex.org/works/doi:10.1145/1639714.1639731
- **Koren, Bell, Volinsky 2009** (IEEE Computer, Netflix Prize). Первая скрытая ось: «lowbrow comedies and horror movies, aimed at a male or adolescent audience (Half Baked, Freddy vs. Jason)» против «drama or comedy with serious undertones and strong female leads». Вторая: «independent, critically acclaimed, quirky films» против «mainstream formulaic films (Armageddon, Runaway Bride)». Комедия есть на обоих полюсах первой оси — оси вкуса идут поперёк жанров. **Strong** — https://datajobs.com/data-science-repo/Recommender-Systems-%5BNetflix%5D.pdf
- Steam (a7): широкий жанровый тег почти не влияет на рекомендацию. **Strong**
- Quantic Foundry (a1): жанр как случайная смесь мотиваций. **Strong / Moderate**

---

## b) Заявленные и проявленные предпочтения

- **Netflix, март 2017.** Звёзды заменили лайками. В тесте 2016 года на «hundreds of thousands of members» лайков поставили на 200% больше, чем звёзд. Йеллин: «What's more powerful: you telling me you would give five stars to the documentary about unrest in the Ukraine; that you'd give three stars to the latest Adam Sandler movie; or that you'd watch the Adam Sandler movie 10 times more frequently? … What you do versus what you say you like are different things.» По пересказу The Verge, Йеллин считает, что лайк ставят, «to improve their own experience rather than trying to rate it for the rest of the world». Тогда же ввели процент совпадения. **Moderate** — https://www.theverge.com/2017/3/16/14952434/netflix-five-star-ratings-going-away-thumbs-up-down , https://www.slashfilm.com/netflix-rating-system , https://stv.tv/news/entertainment/1383260-netflix-replaces-star-ratings-with-thumbs-up-or-down/
- Слово «aspirational» в цитатах Netflix я не нашёл. Это термин комментаторов («people rated aspirationally, but they watched situationally»). **Speculative** (через поисковый сниппет) — https://www.artsjournal.org/?p=118085
- **Netflix, апрель 2022.** Добавили «Two Thumbs Up» — «love», а не просто «like». Участники сами просили различать «понравилось» и «очень понравилось». Сначала тестировали сердечко, но двойной лайк сработал лучше. Фиксированного веса у сигнала нет. **Moderate** — https://techcrunch.com/2022/04/11/netflix-adds-a-two-thumbs-up-button-in-effort-to-learn-what-users-love-not-just-like , https://hypebeast.com/2022/4/netflix-two-thumbs-up-button
- **Gomez-Uribe & Hunt 2015.** Задача давно не в предсказании звёзд: Netflix смотрит, что, как, на каком устройстве, во сколько смотрят и какие показанные рекомендации не запустили. **Strong** (ссылка в a3)
- **Шум в оценках.** Amatriain, Pujol, Oliver 2009 (UMAP): 118 человек трижды оценили одни и те же 100 фильмов, между попытками от суток до 15 дней. RMSE между попытками 0.557–0.832. Чаще всего «плавают» 2 и 3 звезды; больше 90% расхождений — сдвиг на ±1; крайние 1 и 5 самые устойчивые. Авторы предлагают давать середине шкалы меньший вес. **Strong** — https://amatriain.net/pubs/umap09.pdf
- **Steam Interactive Recommender** опирается на часы игры, а не на заявленные теги и отзывы (a7). **Moderate**

Что это значит для вопросов TASTIQ — мой вывод, **Speculative**, кроме отмеченного:
1. Спрашивать про поведение, а не про оценку: «прошёл / бросил на N-й серии / перепроходил / сколько часов». Оценку «престижного» тайтла сверять с поведением — у Netflix документалки собирали 5 звёзд и не смотрелись (данные).
2. Шкала в 3 ступени («нет / да / обожаю») даёт больше ответов, чем пятибалльная (Netflix +200%, данные). А средние ступени и так шумные (Amatriain, данные).
3. «Не очень» — слабый сигнал: не отсекать по одному такому ответу, искать подтверждение. «Нет» и «обожаю» — сильные (Amatriain, данные).
4. Причину «за что понравилось» человек называет сам и может ошибаться. Проверять контрастом: показать тайтл с той же механикой, но другой историей, и наоборот (вывод; так устроен Movie Tuner, a5).

---

## c) Форумы: как люди сами объясняют вкус

Метод. Reddit напрямую закрыт (403 на old.reddit.com, www.reddit.com/.json, api.reddit.com; зеркала Redlib — проверка «бот или нет» или 429; PullPush — 429). Посты взяты из открытого архива Arctic Shift (arctic-shift.photon-reddit.com): все посты за 1–5 сентября 2025 года (для r/televisionsuggestions — август–начало сентября), дальше отбор по длине текста и словам-объяснениям. Ссылки ведут на оригинальные посты reddit.com. DTF — публичный API поиска (api.dtf.ru/v2.1/search), запросы «посоветуйте игру», «посоветуйте сериал», «почему мне не зашла». Shikimori — страница отзывов. Пикабу — страница тега «Посоветуйте игру». Кинопоиск отдал пустой ответ (4 байта) — отзывов оттуда нет.

Разметка измерений моя. Словарь: петля (core loop, механики), прогрессия, сложность, соц (одиночная / кооп / PvP), темп, напряжение, тон, контент (насилие, секс, мат, жестокость), сюжет, персонажи, финал, сеттинг, эстетика (визуал, музыка), длина, контекст (с кем, когда, зачем), пресыщение (настроение «сегодня»), стабильность (тайтл менялся по ходу), качество. Маркеры: «жанр≠критерий» — человек прямо говорит, что жанр неважен; «часть≠целое» — элемент нравится или не нравится отдельно от тайтла; «качество≠моё» — признаёт, что тайтл хороший, но ему не подходит; «3 уровня» — сам делит на «понравилось / не зацепило / не понравилось».

| № | Источник | Суть (пересказ, цитата) | Измерения | Стоп-факторы |
|---|---|---|---|---|
| G1 | [r/gamingsuggestions 1n7t9tg](https://www.reddit.com/r/gamingsuggestions/comments/1n7t9tg/), 2025-09-03 | Любит драконоподобную расу из BG3, «but i dont like bg3 as a whole»; Avowed разочаровал; открыт к любым жанрам | сеттинг, эстетика; часть≠целое; жанр≠критерий | стратегии |
| G2 | [1n7me6l](https://www.reddit.com/r/gamingsuggestions/comments/1n7me6l/), 2025-09-03 | Phasmophobia для пары: кооп без PvP, простые механики, прогрессия (деньги, снаряжение), не про сюжет; хоррор — «almost an afterthought» | соц, сложность, прогрессия, сюжет; жанр≠критерий | PvP, сложные механики (Monster Hunter), сюжетность |
| G3 | [1n7tzu9](https://www.reddit.com/r/gamingsuggestions/comments/1n7tzu9/), 2025-09-03 | Рогалики: билды, «to become overpowered», приятный бой, анлоки; старая графика не нравится; Isaac, Noita, StS — «tried and didn't like», «skill issue» | прогрессия, петля, эстетика, сложность; 3 уровня; качество≠моё | bullet hell (мягко), высокая сложность |
| G4 | [1n7p38b](https://www.reddit.com/r/gamingsuggestions/comments/1n7p38b/), 2025-09-03 | Roguelike-RPG со случайными апгрейдами, «that isn't a stupid deck builder» | петля, прогрессия | деккилдинг, bullet hell |
| G5 | [1n7dym0](https://www.reddit.com/r/gamingsuggestions/comments/1n7dym0/), 2025-09-03 | Строитель без кликанья каждого рабочего по каждому дереву — «tedious and not fun»; бой и сложность допустимы | петля, сложность | микроменеджмент сбора |
| G6 | [1n7g42m](https://www.reddit.com/r/gamingsuggestions/comments/1n7g42m/), 2025-09-03 | Car Mechanic Simulator: нет таймера, нельзя проиграть, удовольствие от починки; ищет то же «without much tension» | петля, напряжение | давление, таймер |
| G7 | [1n7fe4a](https://www.reddit.com/r/gamingsuggestions/comments/1n7fe4a/), 2025-09-03 | Сюжетные и реалистичные игры, «burned out on fantasy»; жанр любой | сюжет, сеттинг, пресыщение; жанр≠критерий | фэнтези, магия |
| G8 | [1n7iffy](https://www.reddit.com/r/gamingsuggestions/comments/1n7iffy/), 2025-09-03 | Watch Dogs 2 за «complete package»: персонажи, открытый мир, геймплей, музыка | персонажи, сеттинг, петля, эстетика | — |
| G9 | [1n7tcle](https://www.reddit.com/r/gamingsuggestions/comments/1n7tcle/), 2025-09-03 | Космос, где можно ходить по кораблю и щёлкать рабочими тумблерами, как в MSFS; в No Man's Sky «playing the ship instead of a person» | петля, сеттинг | абстрактное управление |
| G10 | [1n7npm2](https://www.reddit.com/r/gamingsuggestions/comments/1n7npm2/), 2025-09-03 | Самодельное оружие; «don't like fast paced games to much»; ретро можно, но не старше 2000-х | петля, темп, эстетика | быстрый темп |
| M1 | [r/MovieSuggestions 1n8pet8](https://www.reddit.com/r/MovieSuggestions/comments/1n8pet8/), 2025-09-04 | «Птицы»: «creeping, unexplained dread», медленный распад нормальной жизни; именно фильмы про нападения животных не нужны | тон, напряжение, темп; часть≠целое | — |
| M2 | [1n8otg6](https://www.reddit.com/r/MovieSuggestions/comments/1n8otg6/), 2025-09-04 | «Большой папа» — фильм на больничный: тёплый, позитивный, слаженный актёрский состав, 90-е–2000-е | тон, контекст, персонажи, эстетика | — |
| M3 | [1n8jeel](https://www.reddit.com/r/MovieSuggestions/comments/1n8jeel/), 2025-09-04 | Подросток: «likes action but nothing too dramatic»; Marvel, Blade, MI — нет; старое кино не заходит | напряжение, сеттинг | драматизм |
| M4 | [1n8j9ha](https://www.reddit.com/r/MovieSuggestions/comments/1n8j9ha/), 2025-09-04 | Фэнтези, где в центре сестринство или дружба; романтика допустима на втором плане | персонажи | романтика в центре |
| M5 | [1n8i7l4](https://www.reddit.com/r/MovieSuggestions/comments/1n8i7l4/), 2025-09-04 | «Залечь на дно в Брюгге»: «feels, sounds and has the similar color palette»; «Genre no bar» | эстетика, тон; жанр≠критерий | — |
| M6 | [1n8i1qn](https://www.reddit.com/r/MovieSuggestions/comments/1n8i1qn/), 2025-09-04 | Детектив с жуткой атмосферой, но «not talking about graphical horror», сюжет реалистичный | тон, контент, сюжет | графичный хоррор |
| M7 | [1n8cpuq](https://www.reddit.com/r/MovieSuggestions/comments/1n8cpuq/), 2025-09-04 | Запутанные по-настоящему, а не «будь внимательнее»; Tenet запутал «not in the best way» | сложность, сюжет | — |
| M8 | [1n8h299](https://www.reddit.com/r/MovieSuggestions/comments/1n8h299/), 2025-09-04 | Неохотный герой, который боится, а не ленится | персонажи | — |
| M9 | [1n8apkb](https://www.reddit.com/r/MovieSuggestions/comments/1n8apkb/), 2025-09-04 | Порог IMDb: фильмы от 6.5, драматические сериалы от 7.5, комедиям прощает меньше | качество | низкий рейтинг |
| A1 | [r/Animesuggest 1n6phjb](https://www.reddit.com/r/Animesuggest/comments/1n6phjb/), 2025-09-02 | «what I like is not really linked to a genre»: Medalist при полном равнодушии к фигурному катанию; Erased, хотя «I absolutely hate time travelling»; общее — хорошо написанные персонажи | персонажи; жанр≠критерий; часть≠целое | исекаи-«power fantasy» |
| A2 | [1n5twgm](https://www.reddit.com/r/Animesuggest/comments/1n5twgm/), 2025-09-01 | Re:Zero: «The time travel doesn't really excite me, it's more of the unique application of the ability»; нет скучных серий; рост героя. Mushoku Tensei: мир, магия. «Doesn't have to be isekai» | сюжет, темп, персонажи, сеттинг; часть≠целое; жанр≠критерий | — |
| A3 | [1n74uye](https://www.reddit.com/r/Animesuggest/comments/1n74uye/), 2025-09-03 | Быстрый темп и при этом уют, отношения героев; списки: любимые / «Tried but couldn't fully get into» / «Did NOT like» | темп, тон, персонажи, контент; 3 уровня | медленный темп, фансервис, гарем |
| A4 | [1n5n0oj](https://www.reddit.com/r/Animesuggest/comments/1n5n0oj/), 2025-09-01 | После Steins;Gate, Berserk, «Твоей апрельской лжи» — «I don't wanna hurt myself anymore»: грустное, но со счастливым концом | финал, пресыщение, тон | несчастливый финал |
| A5 | [1n5i8nu](https://www.reddit.com/r/Animesuggest/comments/1n5i8nu/), 2025-09-01 | Концовки с закрытостью: «the series truly ended», а не обрыв под несуществующий сезон | финал | открытый обрыв |
| A6 | [1n7jvjt](https://www.reddit.com/r/Animesuggest/comments/1n7jvjt/), 2025-09-03 | Пересмотрел «hardcore», хочет «innocent» без «weird adult implicit» | контент, пресыщение, тон | сексуализация |
| A7 | [1n77r1j](https://www.reddit.com/r/Animesuggest/comments/1n77r1j/), 2025-09-03 | Тёмное фэнтези: «violence is a huge plus as I feel it adds more feeling», монстры | тон, контент, сеттинг | — |
| A8 | [1n7lbke](https://www.reddit.com/r/Animesuggest/comments/1n7lbke/), 2025-09-03 | Групповая динамика как в KonoSuba, а не пары соперников вроде Лайта и L | персонажи | — |
| T1 | [r/televisionsuggestions 1n7izki](https://www.reddit.com/r/televisionsuggestions/comments/1n7izki/), 2025-09-03 | Бросил: The Wire — «plot uninteresting»; «Задачу трёх тел» — «too … depressing … Great show tho»; Supernatural — «too repetitive», нравилось, «when it was about 2 ghost hunters»; Dark — на путешествиях во времени | сюжет, тон, стабильность; качество≠моё | депрессивность, повторяемость |
| T2 | [1n7pggd](https://www.reddit.com/r/televisionsuggestions/comments/1n7pggd/), 2025-09-03 | Breaking Bad: три попытки, бросала на 4–5 серии — «anxiety inducing and frustrating», хотя любит character-driven | напряжение; качество≠моё | тревожность |
| T3 | [1n792j4](https://www.reddit.com/r/televisionsuggestions/comments/1n792j4/), 2025-09-03 | Быстрые психотриллеры; бросила The Fall из-за «lifeless» героини с одним выражением лица | темп, персонажи | «безжизненные» персонажи |
| T4 | [1n87pci](https://www.reddit.com/r/televisionsuggestions/comments/1n87pci/), 2025-09-04 | После The Residence: комедия с загадкой, «a No tension show» | напряжение, тон | напряжение |
| T5 | [1n7zvag](https://www.reddit.com/r/televisionsuggestions/comments/1n7zvag/), 2025-09-04 | Сериал фоном к работе: интересный, но не отвлекающий, пересматривала знакомое | контекст | — |
| T6 | [1n7b63t](https://www.reddit.com/r/televisionsuggestions/comments/1n7b63t/), 2025-09-03 | Уютное для пары; Seinfeld понравился «for the episode lengths and laughs» | тон, длина | — |
| T7 | [1n8a82i](https://www.reddit.com/r/televisionsuggestions/comments/1n8a82i/), 2025-09-04 | Для родителей: без секса и насилия, мало мата, умный сюжет; не фантастика и не хоррор | контент, сюжет, сеттинг, контекст | секс, насилие, хоррор |
| T8 | [1n8hw9a](https://www.reddit.com/r/televisionsuggestions/comments/1n8hw9a/), 2025-09-04 | Нужен хороший финал; «As per genre I think anything works»; в From «dragging the show without any proper meaning» | финал, темп; жанр≠критерий | затягивание |
| I1 | [r/ifyoulikeblank 1n5eas9](https://www.reddit.com/r/ifyoulikeblank/comments/1n5eas9/), 2025-09-01 | Over the Garden Wall, «Хайди»: «comforting vibe», мирная жизнь, тёплые отношения — «shows, books, movies, whatever» | тон, персонажи | — |
| I2 | [1n5a9tp](https://www.reddit.com/r/ifyoulikeblank/comments/1n5a9tp/), 2025-09-01 | Причудливое фэнтези в любом медиа; «Nothing dark or grim like Dark Souls or Game of Thrones» | эстетика, тон | мрачность |
| I3 | [1n5x7yf](https://www.reddit.com/r/ifyoulikeblank/comments/1n5x7yf/), 2025-09-01 | Игры, которые переносят в другую эпоху и чему-то учат (AC Odyssey) | сеттинг | — |
| D1 | [DTF 5065758](https://dtf.ru/id3428199/5065758-luchshie-partijnye-rpg-dlya-kompyutera-sovety-po-igram), 2026-05-16 | Партийная RPG: нравятся прописанный сюжет и много спутников; BG3 «тревожит масштабом карты»; не нравится, «когда ты станешь альфой, что бы ты ни делала»; в билдах не сильна | длина, прогрессия, сюжет, персонажи, сложность; часть≠целое | огромные карты, power fantasy |
| D2 | [DTF 5331313](https://dtf.ru/id3324162/5331313-luchshie-igry-pro-vyzhivanie-v-otkrytom-mire-bez-zombi), 2026-10-02 | Выживание как DayZ, но одиночное и «главное — БЕЗ ЗОМБИ»: реализм, враги — люди и звери | сеттинг, соц | зомби, мутанты, фантастика |
| D3 | [DTF 5101759](https://dtf.ru/ask/5101759-posovetuite-igry-prodolzhitelnostyu-do-25-chasov-na-pk), 2026-06-04 | Игры до 25 часов | длина | длинные игры |
| D4 | [DTF 2014961](https://dtf.ru/ask/2014961-posovetuite-igru), 2023-08-07 | После Shadow Tactics: «Не хочу купить какую то супер нишевую и трудную игру и обжечься» | сложность | высокая сложность |
| D5 | [DTF 5157169](https://dtf.ru/flood/5157169-rekomendatsii-po-igram), 2026-06-30 | После Dead Space Remake в RE Village «как будто не то»; «накушался космосом»; летом пара часов по вечерам | пресыщение, сеттинг, контекст | космос (временно) |
| D6 | [DTF 5019994](https://dtf.ru/id1248304/5019994-rekomendovannye-igry-s-interesnym-syuzhetom), 2026-04-25 | Сюжетные игры, «Хорроры не советовать, просто не люблю — в любом виде» | тон | хоррор (жёстко) |
| D7 | [DTF 685249](https://dtf.ru/ask/685249-posovetuite-igru-s-prokachkoi-poseleniya), 2021-03-28 | Прокачка поселения как вторичный элемент (Far Cry Primal, AC Valhalla), а не градострой | петля | поселение как основа |
| D8 | [DTF 3956494](https://dtf.ru/daryana/3956494-luchshie-zakonchennye-serialy-dlya-teoriy), 2025-08-10 | «Интригующий, но законченный», в конце всё объяснят; «без тягомотины»; плохо, когда «финал оказывается открытым либо слитым» | финал, темп, сюжет | открытый или слитый финал |
| D9 | [DTF 1918946](https://dtf.ru/ask/1918946-posovetuite-serial), 2023-06-28 | «Теория большого взрыва»: юмор, персонажи, сеттинг; HIMYM — не дальше 3 серий; Ted Lasso — «дальше слишком много социальных драм, бросил»; во 2 сезоне «Засланца из космоса» сместился фокус | тон, персонажи, сеттинг, стабильность | сдвиг тона в драму |
| D10 | [DTF 132959](https://dtf.ru/ask/132959-posovetuite-serial-v-duhe-lost), 2020-05-06 | «Озарк» «шикарный», но «так депрессивно»; Lost — загадка, интрига, хотя «концовка оказалась не идеальной» | тон, сюжет, финал; качество≠моё | — |
| D11 | [DTF 3601086](https://dtf.ru/ask/3601086-monstr-hunta-pochemu-ona-tak-vsem-zashla), 2025-03-01 | Не понимает, почему всем зашёл Monster Hunter: «мыльная графика», перегруженный интерфейс, «гринд ради гринда», рост персонажа не ощущается | петля, прогрессия, качество | гринд без ощутимого роста |
| D12 | [DTF 1469163](https://dtf.ru/games/1469163-hvalebnaya-oda-brotato-ili-pochemu-ona-zashla-mne-bolshe-drugih-roguelike), 2022-11-27 | Brotato: «сложность * реиграбельность * убивать_много_мобов * возможность_стать_имбой * разнообразие * баланс * удобная_сессия * развитие» | сложность, прогрессия, петля, длина | — |
| D13 | [DTF 5054369](https://dtf.ru/nintendoclub/5054369-rekomendatsii-igr-dlya-nintendo-switch), 2026-05-12 | Switch: Марио и DK «не зашло», Bayonetta «забавная, но тоже быстро надоело», Зельды «угарные»; хочет свободы, как в «Космических рейнджерах» | петля | линейные платформеры |
| D14 | [DTF 648664](https://dtf.ru/ask/648664-posovetuite-igry-pro-beskonechnoe-puteshestvie), 2021-02-20 | UNDER the SAND: едешь по бесконечной дороге, обыскиваешь заброшки, чинишь машину — «Лучшая игра в моей жизни» | петля | — |
| D15 | [DTF 5097932](https://dtf.ru/cinema/5097932-posovetuite-serial-v-zhanre-horror-uzhasy), 2026-06-02 | Хоррор-сериал, «Только не такие как Извне. Такой кринж я не буду смотреть» | качество | «кринж» |
| S1 | [Shikimori, отзывы на Re:Zero](https://shikimori.io/animes/z31240-re-zero-kara-hajimeru-isekai-seikatsu/reviews) | Сначала раздражал герой; «тяжёлая психологическая сцена… и какая нибудь странная романтическая или комедийная вставка… атмосфера у меня просто разваливается». Другой отзыв (14.09.2026): «провалы по темпу, некоторые арки как будто бы лишние» | тон, персонажи, темп | тональные скачки |
| P1 | [Пикабу 14415963](https://pikabu.ru/story/ishchu_igru_chto_byi_zatsepilo_14415963), 2026-10-12 | Genesis Alpha One «цепляет»: исследование на передвижной базе, сбор, крафт, стройка, немного менеджмента | петля | — |

**Частоты** (55 записей; одна запись может дать несколько измерений; моя разметка, **Speculative**):

| Измерение | Записей | Доля |
|---|---|---|
| тон | 17 | 31% |
| петля | 13 | 24% |
| персонажи | 13 | 24% |
| сеттинг | 12 | 22% |
| сюжет | 10 | 18% |
| темп | 8 | 15% |
| сложность | 7 | 13% |
| эстетика | 7 | 13% |
| прогрессия | 6 | 11% |
| напряжение | 5 | 9% |
| контент | 5 | 9% |
| финал | 5 | 9% |
| длина | 4 | 7% |
| контекст | 4 | 7% |
| пресыщение | 4 | 7% |
| качество | 3 | 5% |
| соц | 2 | 4% |
| стабильность | 2 | 4% |

По доменам (игры — G, I3, P1, D1–D7, D11–D14; кино и сериалы — M, T, I1–I2, D8–D10, D15; аниме — A, S1):
- игры, 23 записи: петля 13, сеттинг 7, сложность 6, прогрессия 6, эстетика 4;
- кино и сериалы, 23: тон 11, персонажи 6, сюжет 6, напряжение 4, темп 4;
- аниме, 9: персонажи 5, тон 5, темп 3, контент 3.

Маркеры: жанр≠критерий — 7 (G1, G2, G7, M5, A1, A2, T8); часть≠целое — 5 (G1, M1, A1, A2, D1), близко к ним G2 (хоррор-тема «almost an afterthought»); качество≠моё — 4 (G3, T1, T2, D10); 3 уровня — 2 (G3, A3). Подсчёт сделан скриптом по столбцу «Измерения».

Наблюдения (вывод из таблицы, **Speculative**):
- Домены объясняют по-разному. В играх говорят о том, что делаешь (петля — в 13 из 23), в кино и сериалах — о том, что чувствуешь (тон — в 11 из 23), в аниме — о персонажах и тоне. Значит, и первые вопросы «за что понравилось» в каждом домене должны быть свои.
- Стоп-факторы делятся на жёсткие и мягкие. Жёсткие звучат как «в любом виде» или капсом: хоррор (D6), зомби (D2), гарем и фансервис (A3), секс и насилие для семейного просмотра (T7). Мягкие — с оговоркой («not completely against them», G3). Жёсткие похожи на фильтр, мягкие — на понижающий вес.
- Самые частые причины бросить: тон не выдержать (депрессивно, тревожно — T1, T2, D10), затянуто или повторяется (T1, T8, D8, S1), сменился фокус по ходу (T1, D9), не тянет сложность (G3, D4).
- «Настроение сегодня» люди формулируют сами: «накушался космосом» (D5), «don't wanna hurt myself anymore» (A4), «burned out on fantasy» (G7), «too much hardcore» (A6). Это пресыщение недавним, а не постоянный вкус.
- Контекст задаёт ограничения независимо от вкуса: с партнёром, который новичок (G2), фоном к работе (T5), на больничном (M2), с родителями (T7).

**Как люди объясняют похожесть.** MAL, рекомендации к Re:Zero (страница userrecs, 593 текста). Для пары Re:Zero ↔ Steins;Gate называют:
- общий приём (петля, «butterfly effect»);
- тип героя («pretty powerless and non-significant at first», «aren't meant to be self-inserts»);
- эмоциональную тяжесть («very dreadful and life draining at times»);
- дугу героя («Both mc's start to lose it after a while»);
- медленно складывающуюся романтику.

Сеттинг прямо отбрасывают: «Despite opposite settings, both… feature time looping as the main plot device and strong character development». Встречается формула-смесь: «Re:Zero is basically Steins;Gate meets KonoSuba». При этом у A2 сам приём («time travel») не главное — важно, как его применяют. Значит, общий приём — необходимое, но не достаточное условие похожести. **Strong** (тексты) / **Speculative** (обобщение) — https://myanimelist.net/anime/31240/Re_Zero_kara_Hajimeru_Isekai_Seikatsu/userrecs

---

## d) «Не моё» против «плохо сделано»; уже потреблённое

**Разделение в моделях.** Koren, Bell, Volinsky 2009: «much of the observed variation in rating values is due to effects associated with either users or items, known as biases… some products are widely perceived as better (or worse) than others». Базовая оценка b_ui = μ + b_i + b_u: смещение тайтла b_i — это «качество в глазах всех», а взаимодействие «пользователь × тайтл» — это вкус. **Strong** (ссылка в a9)

Как отсекают низкое качество и шум:
- **IMDb** публикует взвешенные средние: «not all votes have the same impact»; при аномальном голосовании включается другое взвешивание; формулу не раскрывают. **Strong** — https://help.imdb.com/article/imdb/track-movies-tv/weighted-average-ratings/GWT2DSBYVT2F25SK . Исторически для Top 250 применялась байесовская оценка WR = v/(v+m)·R + m/(v+m)·C: при малом числе голосов v оценка тянется к среднему C. Порог m в разных пересказах разный (25 000; 3000; 1300), текущий не подтверждён. **Moderate** по формуле, **Speculative** по порогу — https://en.wikipedia.org/wiki/IMDb
- **MAL**: взвешенная оценка той же формы, минимум 50 голосов; по Wikipedia учитываются только те, кто посмотрел не меньше 20% тайтла. Раздел помечен как требующий лучшего источника. **Speculative** — https://en.wikipedia.org/wiki/MyAnimeList
- **Кинопоиск**, топ-250: только фильмы с ≥500 оценками за последний год, считаются только «регулярно голосующие» пользователи; формулу не публикуют. **Moderate** (пересказ СМИ через поисковые сниппеты) — https://daily.afisha.ru/news/43612-pobeg-iz-shoushenka-bolshe-ne-luchshiy-kinopoisk-obnovil-top-250-filmov-i-zapustil-top-serialov/ , https://kudago.com/all/news/kinopoisk-obnovil-svoj-top-250/
- **Rotten Tomatoes, Certified Fresh**: Tomatometer ≥75% и ≥5 рецензий топ-критиков; минимум 80 рецензий для широкого проката, 40 для ограниченного и стриминга, для сезона сериала 20 критиков, из них 5 топ. Значок снимают, если оценка падает ниже 70%. **Strong** — https://www.rottentomatoes.com/about
- **Steam**: оценка — доля положительных отзывов за 30 дней и за всё время, учитываются только покупки (не ключи). **Strong** — https://partner.steamgames.com/doc/store/reviews . С 2019 года «off-topic review bombs» (DRM, эксклюзивы) исключаются из оценки, но остаются видимыми. **Moderate** — https://pcgamer.com/valve-takes-steps-against-steam-review-bombs . Пороги ярлыков («Overwhelmingly Positive» — 95% при 500+ отзывах, без ярлыка при <10) Valve официально не публиковала. **Speculative** — https://www.steampageanalyzer.com/blog/steam-review-score-thresholds
- **Нижняя граница интервала Уилсона** для сортировки по доле лайков — стандартный приём, чтобы 2 лайка из 2 не обгоняли 900 из 1000. **Moderate** (широко цитируемый разбор) — https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
- **Netflix**: бейдж «Most Liked» — тайтл, который чаще всего лайкали досмотревшие. **Moderate** (TechCrunch 2022, ссылка в b)

**Уже потреблённое.** Steam с 2019 года различает два вида «скрыть»: «Not interested» и «Played on Another Platform». Второй не считается отрицательным сигналом и при этом помогает рекомендациям. **Moderate** (TNW 2019 + обсуждения Steam) — https://thenextweb.com/news/steam-ignored-games . Прямой аналог трёх состояний TASTIQ «не играл / играл, не понравилось / играл, но не хочу повторять».

**Что видно на форумах.** Люди сами разделяют две причины. «Не моё»: «Great show tho» при брошенном просмотре (T1), «шикарный, но депрессивно» (D10), «everyone loves this game but I just couldn't get into it» (G3). «Плохо сделано»: «dragging the show without any proper meaning» (T8), «Извне… кринж» (D15), «мыльная графика, перегруженный интерфейс» (D11). Порог качества у человека зависит от жанра: драмы от 7.5, комедии ниже (M9). **Speculative** (единичные посты)

Вывод для TASTIQ (**Speculative**): держать два независимых фильтра. (1) Пол качества — по числу и доле оценок со сжатием к среднему, порог свой для домена и жанра, у пользователя регулируемый. (2) Вкус — по аспектам. Ответ «бросил, хотя хорошо» не должен понижать оценку качества тайтла для других, только вес его аспектов для этого пользователя.

---

## e) Боль выбора

- **Netflix (Gomez-Uribe & Hunt 2015)**: «Consumer research suggests that a typical Netflix member loses interest after perhaps 60 to 90 seconds of choosing, having reviewed 10 to 20 titles (perhaps 3 in detail) on one or two screens». Оговорка: методика этого «consumer research» в статье не раскрыта, слово «perhaps» стоит у самих авторов. **Strong** как цитата, источник цифры — внутреннее исследование без методики. Ссылка в a3.
- **Nielsen**:
  - 2019 (Total Audience Report Q1): взрослые 18+ тратят в среднем 7,4 минуты на выбор; 18–34 — 9,4; 65+ — около 5; 21% «give up» и ничего не смотрят. Цифры — ответы респондентов («respondents… saying»). **Moderate** — https://www.thewrap.com/millennials-take-ten-minutes-decide-streaming/ (2019-07-01, прочитано), https://www.thedrum.com/news/2019/07/01/tv-watchers-are-facing-paradox-choice-nielsen-finds (только поисковый сниппет)
  - 2023 (State of Play): 10,5 минуты за сессию; в 2022 было 11:16. Когда не находят ничего интересного, каждый пятый бросает сессию. Каталог в пяти странах (США, Великобритания, Канада, Мексика, Германия) вырос с 1,9 млн тайтлов (июль 2021) до 2,7 млн (июнь 2023). Цифра времени — из онлайн-опроса стримеров США. **Strong** (пресс-релиз) / **Moderate** (методика по пересказу) — https://www.nielsen.com/news-center/2023/nielsens-state-of-play-report-delivers-new-insights-as-streamings-next-evolution-brings-content-discovery-challenges-for-viewers/ , https://thepopverse.com/streaming-choices-audience-time-nielsen
  - Цифр за 2024–2025 не нашёл.
- **Scheibehenne, Greifeneder, Todd 2010** (JCR 37(3):409–425): 63 условия из 50 опубликованных и неопубликованных экспериментов, N=5036. «Mean effect size of virtually zero but considerable variance between studies». Найдены возможные предусловия перегрузки, но не достаточные условия. **Strong** — https://ideas.repec.org/a/oup/jconrs/v37y2010i3p409-425.html
- **Chernev, Böckenholt, Goodman 2015** (JCP 25(2):333–358): эффект проявляется при четырёх модераторах — сложность задачи, сложность набора, неуверенность в предпочтениях и цель «потратить меньше сил». С учётом модераторов эффект значим, вопреки метаанализу 2010 года. Удовлетворённость и уверенность, сожаление, откладывание выбора и вероятность переключиться — одинаково хорошие меры. **Strong** — https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual
- **Zhang & Xu 2021** (MIS Quarterly 45(4):1893–1920): противоречия в данных объясняются перевёрнутой U-кривой (больше вариантов полезно до точки, потом вредно), а модераторы делают кривую круче или положе либо сдвигают её. Например, у тех, кто знаком с вариантами, издержки выбора начинают расти позже: можно перебрать больше вариантов без перегрузки. **Strong** (статья), детали модели не разбирал — https://par.nsf.gov/servlets/purl/10481276

Что отсюда следует для TASTIQ (**Speculative**): типичный пользователь TASTIQ — «не знаю, что хочу, и не хочу тратить силы», то есть два модератора Chernev сразу. Тогда разумно снижать неуверенность вопросами до показа и показывать мало вариантов. Мерить успех стоит не только кликом, но и откладыванием выбора и переключением (меры Chernev).

---

## f) Таксономия аспектов опыта

Ссылки на источники: QF — Quantic Foundry (a1); RGZ — Rentfrow et al. 2011 (a2); NF — Netflix-разметка (a3); JN — Jinni (a4); TG — Tag Genome (a5); ST — Steam-теги (a7); AL — AniList; MAL — MyAnimeList (a8); KB — Koren et al. 2009; форумные коды — таблица в c. Аспект без ссылки на данные помечен «вывод».

### Общие для всех доменов

| Аспект | Значения (примеры) | Опора |
|---|---|---|
| Тон, настроение | уютный, тёплый, мрачный, депрессивный, жуткий, лёгкий, причудливый | NF (dark, feel-good, gritty), TG (atmospheric, bleak, melancholic), JN (mood), ST (Mood), RGZ (Dark, Communal), KB (lowbrow ↔ serious); M1, M2, A4, T1, D6, D10, I1, I2 |
| Напряжение, тревожность | без напряжения … держит в стрессе | NF (suspenseful), TG (tense, suspense), RGZ (Thrilling); G6, T2, T4, M3 |
| Темп | быстрый, ровный, медленный, затянутый | TG (fast/slow paced), QF (cerebral ↔ kinetic); A3, T3, T8, D8, S1, G10 |
| Сюжет: вес и устройство | без сюжета … сюжет главное; линейный, нелинейный, загадка, твист | QF (Story), NF (plot), TG (non-linear, twist, complex), ST (Story Rich); G2, G7, M7, D8, D10 |
| Финал | счастливый, горький, неоднозначный, «слитый» (как кончилось; кончилось ли вообще — отдельный аспект «законченность истории», см. SUMMARY) | NF (happy ↔ sad ↔ ambiguous), TG (happy ending, bad ending, great ending); A4, T8, D8 |
| Законченность истории | история закончена ↔ обрыв, сериал не завершён | A5, D8; вывод (строка добавлена при сведении SUMMARY) |
| Персонажи | хорошо написаны, «безжизненные», раздражают; тип героя; архетипы и тропы каста (в т.ч. аниме); групповая динамика | NF (social acceptability), TG (complex / unlikeable characters, lone hero), AL (Cast-Main Cast, Cast-Traits), RGZ (Communal); A1, A3, A8, M4, M8, T3, D1 |
| Сеттинг, мир | реализм ↔ фэнтези, эпоха, место, «вещь не на своём месте» | NF (time period, location), TG, ST (Theme), AL (Setting-*), QF (Fantasy); G1, G7, D2, I3, M5 |
| Эстетика | визуальный стиль, палитра, музыка | TG (cinematography, stylized, soundtrack), ST (Visual Style); M5, G8, I2 |
| Интенсивность контента | насилие, жестокость, секс и фансервис, мат | NF (gore, romance 1–5), TG (gore, nudity, foul language), AL (Sexual Content), MAL (Explicit Genres); T7, A6, A7, M6 |
| Юмор | тип: абсурд, сарказм, «тупой но смешной» | TG (dark humor, deadpan, slapstick, dumb but funny); T6, D9 |
| Когнитивная нагрузка | смотреть фоном … вникать; простые механики … билды и планирование | RGZ (Aesthetic: «dense and demanding»), TG (cerebral), QF (Strategy); T5, D8, G2, D1 (тег complex и M7 отнесены к сюжету при сведении SUMMARY) |
| Длина, обязательство | часы, хронометраж, длина серии, число сезонов | TG (long, too long); T6, D3, D8, D1 |
| Стабильность по ходу | держит уровень / сдулся / сменил фокус | вывод по форумам: T1, D9 |
| Качество исполнения | рейтинг, «кринж», «затянуто без смысла» — отдельная ось, не вкус | KB (item bias), TG (bad plot, plot holes); M9, D11, D15 |

### Игры (дополнительно)

| Аспект | Значения | Опора |
|---|---|---|
| Основная петля | что делаешь каждые 5 минут: стрелять, строить, чинить, исследовать, собирать | ST (Features, Player activities), QF (Action, Design, Discovery); G5, G6, G9, D7, D13, D14, P1 |
| Ощущение боя и управления | «приятный бой», вес, отзывчивость, телесность | QF (Destruction, Excitement); G3, G9, G10 |
| Прогрессия и сила | рост ощущается, «стать имбой», коллекции, гринд | QF (Completion, Power); G2, G3, D11, D12; против — D1 («станешь альфой что бы ни делала») |
| Сложность, наказание | щадящая … хардкор; «skill issue» | QF (Challenge); G3, D4, D12 |
| ~~Стратегическая глубина, сложность систем~~ | слито в общий аспект «Когнитивная нагрузка» при сведении SUMMARY: простые механики … билды, планирование | QF (Strategy); G2, D1 |
| Соц-режим | соло, кооп, PvP, локальный кооп | QF (Competition, Community), ST (Player support); G2, D2 |
| Свобода, структура | линейно ↔ песочница, масштаб карты | вывод: D1, D13; ST (Open World, Sandbox) |
| Сессия | короткие забеги ↔ долгие сессии, «удобная сессия» | D12, D5 |
| ~~Творчество~~ | слито в «Основную петлю» при сведении SUMMARY: своей опоры нет | QF (Design, Discovery); P1 |

### Фильмы и сериалы (дополнительно)

| Аспект | Значения | Опора |
|---|---|---|
| Структура сериала | процедурал, арки, сериал целиком на одну загадку | вывод: T1 (Supernatural), D8 |
| Начальный порог | «раскачивается N серий» | вывод: T2 (бросала на 4–5 серии), D9 (HIMYM — 3 серии) |
| ~~Контекст просмотра~~ | вынесено в сито 5 «подходит ли сегодня» при сведении SUMMARY: фоном, с семьёй, на больничный | T5, T7, M2 |

### Аниме (дополнительно)

| Аспект | Значения | Опора |
|---|---|---|
| Демография, аудитория | shounen, seinen, josei, shoujo, kids | MAL (Demographics), AL (Demographic) |
| ~~Тропы и архетипы каста~~ | слито в общий аспект «Персонажи» при сведении SUMMARY (общий тег Cast-Traits): гарем, тип ГГ, «non-cringe MC» | AL (Cast-Traits: 73 тега), MAL (Themes: Harem, Love Polygon); A3, A1 |
| ~~Фансервис~~ | слито в общий аспект «Интенсивность контента» при сведении SUMMARY (общий тег Sexual Content): нет … много | AL (Sexual Content: 66 тегов), MAL (Ecchi); A3, A6 |
| ~~Эпизодичность~~ | слито в «Структуру сериала» при сведении SUMMARY: эпизодический ↔ сквозной | AL (Technical: Episodic) |
| Тональная цельность | серьёзное без комедийных вставок ↔ микс | S1 |
| ~~Законченность адаптации~~ | слито в общий аспект «Законченность истории» при сведении SUMMARY: история закончена ↔ обрыв под ненаступивший сезон | A5; вывод |
| ~~«Исцеляющее» настроение~~ | слито в общий аспект «Тон» при сведении SUMMARY: iyashikei | MAL, AL (Iyashikei) |

---

## g) Правила привязки предпочтения к аспекту

Пометка источника: **[данные]** — следует из найденного; **[вывод]** — моя интерпретация.

1. **Любовь к тайтлу ≠ любовь к каждому его аспекту.** Жанр бывает исторической смесью мотиваций (QF, GDC 2017; RPG: история против минмаксинга); в форумах 5 из 55 случаев «часть≠целое» (G1, M1, A1, A2, D1) и близкий к ним G2. **[данные]** Значит, после «понравилось» спрашивать «за что», а аспекты без ответа считать неизвестными, не «понравившимися». **[вывод]**
2. **Аспект подтверждается контрастом.** Если пользователь любит A и не любит B, а у A и B общий аспект X, то X не объясняет любовь. Если A и B различаются только по Y, то Y — кандидат. Movie Tuner показывает, что люди умеют двигаться «вдоль аспекта» («как X, но…») **[данные: Vig 2012]**. Сам способ проверки — **[вывод]**.
3. **Жёсткий стоп-фактор — фильтр, мягкий — вес.** Жёсткие формулируют «в любом виде», «главное — без…» (D6, D2, A3, T7), мягкие — с оговоркой (G3). **[данные]** Жёсткое «нет» исключает аспект из выдачи, «не очень» только понижает вес, и только после повторения: середина шкалы шумная (Amatriain). **[данные + вывод]**
4. **Точка, где бросил, указывает на аспект.** «Бросил после такой-то сцены — слишком депрессивно» (T1) → тон; «на 4–5 серии, тревожно» (T2) → напряжение и раскачка; «не дальше 3 серий» (D9) → юмор или персонажи; «на путешествиях во времени» (T1, Dark) → сюжетный приём. **[данные]** Для «мало попробовал» спрашивать, где и почему остановился, а не ставить минус тайтлу целиком. **[вывод]**
5. **«Хорошо, но не моё» ≠ «плохо сделано».** Люди разделяют сами (T1, D10, G3 против T8, D11, D15) **[данные]**, модели тоже: смещение тайтла и взаимодействие (Koren) **[данные]**. Первое меняет веса аспектов пользователя, второе — общий пол качества. **[вывод]**
6. **Настроение «сегодня» — отдельный слой поверх постоянного вкуса.** Пресыщение недавним (D5, A4, A6, G7) часто противоречит постоянному вкусу (тот же человек любит космос и грустное). **[данные]** Хранить отдельно и с затуханием, а не переписывать им постоянный профиль. **[вывод]**
7. **Контекст — ограничения, а не вкус.** С партнёром-новичком, с родителями, фоном к работе, на больничном (G2, T7, T5, M2) меняются допустимые сложность, контент и напряжение. **[данные]** Не записывать их в постоянный профиль. **[вывод]**
8. **Похожесть определяют тон, общий приём и тип героя, а не жанр и сеттинг.** MAL userrecs («Despite opposite settings»), оси Koren поперёк жанров, Steam: широкий тег почти ничего не значит **[данные]**. Но общий приём сам по себе не гарантирует похожести (A2: «time travel doesn't excite me») **[данные]**. Значит, похожими считать тайтлы, совпадающие по аспектам, которые этот пользователь подтвердил (правило 1), а не по любым общим. **[вывод]**
9. **Редкий признак весит больше частого.** «Party-Based RPG» говорит больше, чем «Action» (Steam). **[данные]** То же для аспектов: «уютный и быстрый» (A3) — сильный сигнал, «хороший сюжет» — слабый, его хотят почти все. **[вывод]**
10. **Поведение весит больше слов.** Досмотрел, перепрошёл, наиграл много часов — сильнее, чем заявленная оценка, особенно у «престижных» тайтлов (Netflix 2017; Steam Interactive Recommender на часах игры). **[данные]**
11. **Внутри одного жанра тайтлы сильно различаются по тону и качеству.** Среди 554 боевиков Tag Genome заметная доля с «silly fun», «bad plot», «realistic action», «stylized». **[данные, расчёт]** Для отсева не хватает фильтра «жанр»: нужна пара «аспект + порог качества». **[вывод]**
12. **Пол качества — свой у каждого жанра и человека.** Пример: драма от 7.5, комедия ниже (M9, один пост) **[данные, Speculative]**. У RT пороги зависят от типа релиза **[данные]**. Порог делать настраиваемым, а не глобальным. **[вывод]**

---

## Лог поиска

| Запрос / действие | Результат |
|---|---|
| Quantic Foundry 12 motivations, clusters, sample (WebSearch) | Нашёл страницы модели; WebFetch на quanticfoundry.com — 403, curl с браузерным User-Agent — 200. Прочитаны v2 (2015), карта кластеров, FAQ |
| QF genre vs motivation | Прямой статьи «жанр плохо предсказывает» нет. Найдены интервью Player Driven (RPG-цитата), доклад GDC 2017 (genres as accidental combinations), пример отчёта Fighting (с заглушками) |
| Yee/Ducheneaut CHI PLAY 2016 «250,000 gamers» | По DBLP автор один — Yee; полный текст не найден, взял описание доклада GDC |
| Rentfrow Goldberg Zilca 2011 | PDF с ori.org, текст извлечён pdftotext; цитаты сверены |
| Atlantic «How Netflix Reverse-Engineered Hollywood» | theatlantic.com — 403/запрет; Wayback — 429; archive.ph — нет ответа. Использованы NPR (сам Madrigal), FlowingData, Pixel Envy. «36 страниц» не подтвердилось, в цитате 24 |
| Netflix tech blog «Beyond the 5 stars» | netflixtechblog.com — 403; не использован |
| Netflix thumbs 2017, «aspirational» | Verge, Slashfilm, STV — подтверждено; слово «aspirational» есть только у комментаторов |
| Netflix Two Thumbs Up 2022 | TechCrunch — подтверждено |
| Netflix help: как работают рекомендации | help.netflix.com/en/node/100639 — прочитано; страницы про эффект дизлайка не найдены (404) |
| Jinni Movie Genome, судьба, Synamedia | Wikipedia (Jinni (search engine), Movie Genome), tech.eu, Globes; покупка Synamedia не подтверждается; Medium-пост о сорванной продаже — 403 |
| MovieLens Tag Genome | README 2021 (метод, опрос), архив tag-genome.zip (41 МБ) скачан, словарь и релевантности обработаны своим скриптом |
| Vig 2012, Pilászy & Tikk 2009 | Semantic Scholar — 429; аннотации взяты через OpenAlex API |
| Pandora MGP | pandora.com/about/mgp (официально: «hundreds»), Wikipedia и Rolling Stone (450, 20–30 мин) |
| Steam tags | partner.steamgames.com/doc/store/tags — прочитано полностью; Steam Labs — PCWorld, KitGuru |
| AniList tags | docs.anilist.co (MediaTag) + публичный GraphQL API (428 тегов, категории, пример Mushishi и AoT); формулу процента не нашёл |
| MAL genres/themes/demographics | Страница anime.php прочитана; дату разделения не нашёл |
| Reddit: old.reddit.com, www.reddit.com/.json, api.reddit.com | 403 |
| Redlib-зеркала (safereddit, catsarch, privacyredirect и др.) | Проверка «бот или нет», 429, 410 |
| PullPush API | 429 («does not provide free scraping resources for agents») |
| Arctic Shift API | Работает; полнотекстовый поиск — таймаут, выгрузка по датам — ок (MovieSuggestions 100, Animesuggest 95, televisionsuggestions 100, gamingsuggestions 100, ifyoulikeblank 47 постов) |
| DTF | Веб-поиск dtf.ru — 404; API api.dtf.ru/v2.1/search — работает (3 запроса) |
| Пикабу | Страница тега «Посоветуйте игру» — ок (кодировка cp1251); тег «Посоветуйте фильм» — в основном новости, без объяснений |
| Shikimori | shikimori.one API — 522; shikimori.io API reviews — 422; страница отзывов — ок только с URL вида /animes/z31240-… |
| Кинопоиск, отзывы | Ответ 4 байта (блокировка или JS) — отзывов нет |
| Gomez-Uribe & Hunt 2015 | PDF на gwern.net — цитата про 60–90 с проверена дословно |
| Nielsen 2019, 2022, 2023 | Пресс-релиз 2023 + TheWrap, The Drum, Popverse; данных за 2024–2025 не нашёл |
| Scheibehenne 2010 | PDF с abcwest и edoc — не скачались; аннотация с IDEAS/RePEc |
| Chernev 2015 | Аннотация на сайте Kellogg; полного текста нет; число «99 наблюдений, 7202 участника» из вторичного источника — не включено |
| Zhang & Xu 2021 | PDF на par.nsf.gov — прочитаны аннотация и введение |
| Amatriain 2009 | PDF на amatriain.net — цифры проверены |
| Koren 2009 | PDF (datajobs.com) — цитаты проверены |
| IMDb, MAL, Кинопоиск, RT, Steam: формулы и пороги | IMDb help — формула не раскрыта; RT about — пороги подтверждены; Steam reviews doc — без порогов ярлыков; пороги Steam — только сторонние сайты |
| Steam «Played on another platform» | TNW 2019 |
| Исследования «genre poorly predicts enjoyment» в играх | Прямого исследования не нашёл; найдены Scharkow et al. (жанр как исход, а не предиктор) и Melhart et al. 2021 (опыт внутри жанра) — не включены, т.к. не про этот вопрос |
