---
type: research-sources
slug: taste-recommender-logic
created: 2026-10-20
---

# Sources — логика подбора TASTIQ

Здесь источники, на которые опирается `SUMMARY.md`. Полные списки (338 уникальных ссылок) с уровнями и датами доступа лежат в конце каждого файла потока:
- `raw/01-taste-models.md`: модели вкуса, форумы, отсев качества, боль выбора;
- `raw/02-data-sources.md`: каталоги, условия использования, цены;
- `raw/03-existing-services.md`: существующие сервисы, монетизация, ниша;
- `raw/04-architecture.md`: подходы рекомендательных систем, LLM-рекомендатели, разметка, стоимость.

Все ссылки открыты 2026-10-20, если не указано иное.

## Primary sources (Strong Signal)

### 1. Steamworks, Steam Tags
- **URL**: https://partner.steamgames.com/doc/store/tags
- **Type**: official docs
- **Relevance**: доказательство, что широкий жанровый тег почти не влияет на рекомендации Steam, вес у редких тегов.
- **Quote**: > «So if you have "Action" applied to your game, it matters very little … But if you have something like "Party-Based RPG" applied … it has much more influence»

### 2. Pilászy, Tikk. Recommending new movies: even a few ratings are more valuable than metadata. RecSys 2009
- **URL**: https://api.openalex.org/works/doi:10.1145/1639714.1639731
- **Type**: peer-reviewed (аннотация)
- **Relevance**: метаданные (около 140 000 признаков) слабее 10 оценок.

### 3. Koren, Bell, Volinsky. Matrix Factorization Techniques for Recommender Systems. IEEE Computer, 2009
- **URL**: https://datajobs.com/data-science-repo/Recommender-Systems-%5BNetflix%5D.pdf
- **Type**: peer-reviewed
- **Relevance**: скрытые оси вкуса идут поперёк жанров; смещение тайтла («качество для всех») отделено от взаимодействия «пользователь × тайтл» (вкус).

### 4. Quantic Foundry: модель мотиваций и доклад GDC 2017
- **URL**: https://quanticfoundry.com/2015/07/20/how-we-developed-the-gamer-motivation-profile-v2/ ; https://www.gdcvault.com/play/1024048/The-Anatomy-of-Gaming-Motivations
- **Type**: first-party data (самоотбор респондентов)
- **Relevance**: 12 мотиваций в 6 парах; жанры как «accidental historical combinations of unrelated gaming motivations».

### 5. MovieLens Tag Genome (Vig, Sen, Riedl 2012; выпуск 2021)
- **URL**: https://files.grouplens.org/datasets/tag-genome-2021/genome_2021_readme.txt ; https://files.grouplens.org/datasets/tag-genome/
- **Type**: peer-reviewed + dataset (лицензия CC BY-NC, только для исследований)
- **Relevance**: метод релевантности тегов; данные для расчёта по боевикам (Die Hard, Commando, Transformers, Drive) и разброса внутри жанра action.

### 6. Rashid et al. Getting to Know You. IUI 2002
- **URL**: https://files.grouplens.org/papers/voi-final.pdf
- **Type**: peer-reviewed
- **Relevance**: стратегия «спрашивать популярное» требует меньше всего страниц до 10 оценок (1,9 против 4,0 и 7,0).

### 7. Amatriain, Pujol, Oliver. I like it… I like it not. UMAP 2009
- **URL**: https://amatriain.net/pubs/umap09.pdf
- **Type**: peer-reviewed
- **Relevance**: тест-ретест на 118 людях: средние оценки шумные, крайние устойчивы.

### 8. Netflix, Goodbye Stars, Hello Thumbs, 2017
- **URL**: https://about.netflix.com/en/news/goodbye-stars-hello-thumbs
- **Type**: official
- **Relevance**: переход на лайки.
- **Quote**: > «when we tested replacing stars with thumbs we saw an astounding 200% increase in ratings activity»

### 9. Gomez-Uribe, Hunt. The Netflix Recommender System. ACM TMIS 6(4), 2015
- **URL**: https://gwern.net/doc/reinforcement-learning/exploration/2015-gomezuribe.pdf
- **Type**: peer-reviewed (цифра 60–90 секунд из внутреннего исследования без методики)
- **Quote**: > «a typical Netflix member loses interest after perhaps 60 to 90 seconds of choosing, having reviewed 10 to 20 titles (perhaps 3 in detail)»

### 10. TMDB API Terms of Use
- **URL**: https://www.themoviedb.org/api-terms-of-use (last updated October 20, 2023; перепроверено ведущим 2026-10-20)
- **Type**: official terms
- **Quote**: > §1.C: «Use the TMDB APIs or TMDB Content in connection with, including for training, a machine learning (ML) or artificial intelligence (AI) based Application.»

### 11. Условия источников данных
- Steam Web API Terms: https://steamcommunity.com/dev/apiterms
- RAWG API и условия: https://rawg.io/apidocs ; https://rawg.io/tos_api
- AniList Terms of Use: https://docs.anilist.co/guide/terms-of-use
- Streaming Availability API pricing: https://www.movieofthenight.com/about/api/pricing
- Кинопоиск, пользовательское соглашение (редакция 06.02.2026): https://yandex.ru/legal/kinopoisk_termsofuse/
- Wikidata:Licensing: https://www.wikidata.org/wiki/Wikidata:Licensing
- IMDb data: https://data.imdb.com/
- **Type**: official terms
- **Relevance**: таблица прав по доменам в вопросе 2. Цитаты пунктов: `raw/02`.

### 12. Исследования LLM-рекомендателей
- He et al., CIKM 2023: https://arxiv.org/abs/2308.10053 (выдуманные тайтлы, тяга к популярному, повтор упомянутого)
- Sanner et al., RecSys 2023: https://arxiv.org/abs/2307.14225 (словесные предпочтения в холодном старте)
- Hou et al., ECIR 2024: https://arxiv.org/abs/2305.08845 (зависимость от позиции кандидата)
- **Type**: peer-reviewed

### 13. Разметка и уверенность
- Kotkov, Maslov, Neovius, SIGIR 2021: https://research.abo.fi/fi/publications/revisiting-the-tag-relevance-prediction-problem
- Xiong et al., ICLR 2024: https://arxiv.org/abs/2306.13063
- Gilardi et al., PNAS 2023: https://arxiv.org/abs/2303.15056
- **Type**: peer-reviewed
- **Relevance**: согласие на субъективных тегах ниже; словесная уверенность LLM завышена; zero-shot разметка LLM точнее краудворкеров в 4 из 5 задач.

### 14. Цены и параметры моделей
- Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic Batch processing: https://platform.claude.com/docs/en/build-with-claude/batch-processing
- Anthropic, Claude Haiku 5.5 migration guide: https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide (перепроверено ведущим 2026-10-20)
- **Type**: official
- **Relevance**: расчёт стоимости разметки (формула и скрипт в `raw/04`, раздел 4.4); ответ модели нельзя зафиксировать параметрами.
- **Quote**: > «If a request includes `temperature`, it must be `1`.»

### 15. Перегрузка выбором
- Scheibehenne, Greifeneder, Todd, JCR 2010: https://ideas.repec.org/a/oup/jconrs/v37y2010i3p409-425.html
- Chernev, Böckenholt, Goodman, JCP 2015: https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual
- **Type**: peer-reviewed (метаанализы)

### 16. Рынок и монетизация
- JustWatch, Audience as a Service, 2017: https://www.justwatch.com/blog/post/justwatch-audience-as-a-service/
- Nielsen/Gracenote, 2026: https://nielsen.com/news-center/2026/gen-alpha-leads-shift-to-ai-powered-entertainment-search-discovery-and-recommendations
- Nielsen State of Play, 2023: https://www.nielsen.com/fr/news-center/2023/nielsens-state-of-play-report-delivers-new-insights-as-streamings-next-evolution-brings-content-discovery-challenges-for-viewers/
- Кинопоиск, большое обновление, 10.11.2025: https://www.kinopoisk.ru/media/article/4012047
- GroupLens, онбординг, 2015: https://grouplens.org/blog/onboarding-new-users-in-recommender-systems/
- **Type**: official / first-party data

## Secondary sources (Moderate Signal)

### 17. Ma et al. Large Language Models are Not Stable Recommender Systems, 2023
- **URL**: https://arxiv.org/abs/2312.15746
- **Type**: препринт, совпадает с Hou et al. 2024
- **Relevance**: качество LLM-рекомендателя заметно меняется от позиции правильного тайтла в списке кандидатов. В SUMMARY не используется, остаётся в `raw/04` как довод против переранжирования через LLM.

### 18. Trakt, смена цен 2025
- **URL**: https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-/
- **Relevance**: модель «только подписка» и отток.

### 19. Netflix «Play Something» убран в 2023
- **URL**: https://news.slashdot.org/story/23/02/15/0724220/netflix-drops-surprise-me-shuffle-play-button
- **Relevance**: риск режима «удиви меня».

### 20. GameDiscoverCo, незапущенные игры в Steam
- **URL**: https://newsletter.gamediscover.co/p/how-many-pc-games-get-bought-but
- **Relevance**: в среднем 32,7% библиотеки не запускалось.

### 21. Steam «Played on another platform»
- **URL**: https://thenextweb.com/news/steam-ignored-games
- **Relevance**: Steam разделяет «не интересно» и «уже играл».

## Speculative / own analysis

### 22. Форумные запросы (55 записей)
- **Location**: `raw/01`, раздел c (Reddit через архив Arctic Shift, DTF API, Пикабу, Shikimori)
- **Why speculative**: малая выборка, разметка измерений наша.

### 23. Конкуренты 2023–2026 (TasteRay, CHOICE, Movik, Filmatic, NXTO)
- **Location**: `raw/03`, раздел 1
- **Why speculative**: самоописания продуктов, данных об аудитории нет.

### 24. Расчёты
- Концентрация оценок MovieLens, стоимость разметки, объём аспектного вектора: `raw/04`, разделы 4.4, 5.2, 7.2; скрипты в `raw/scripts/` (`cost.py`, `concentration.py`).
- Боевики Tag Genome: `raw/01`, раздел a5.
