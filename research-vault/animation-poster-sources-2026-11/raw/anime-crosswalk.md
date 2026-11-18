# Связи IMDb с каталогами аниме

## Сколько работ покрывают открытые выгрузки

### Takeaway

По точному IMDb ID нашлись 22 из 3 848 работ (0,57%). У всех 22 есть хотя бы одна связанная запись Anime Offline Database с изображением. После проверки метаданных и первичных источников осталось 16 кандидатов. [Данные и протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Cited Findings

Вход — 4 112 уникальных IMDb ID за вычетом 264 из четырёх отчётов о предыдущем добавлении (43 + 29 + 108 + 84). Для каждого снимка посчитаны уникальные IMDb ID, попавшие в остаток. В трёх столбцах учитываются только связи с одним значением в соответствующем пространстве идентификаторов. AOD содержит 41 537 записей, дата снимка в файле — 4 июля 2026. [Очередь](../../../data/raw/c5-bulk/animation-alt-candidates.json), [протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json), [релиз AOD](https://github.com/manami-project/anime-offline-database/tree/2026-27)

| Снимок | Строк | IMDb в очереди | Один AniDB | Один MAL | Один AniList | Есть изображение AOD |
|---|---:|---:|---:|---:|---:|---:|
| [Fribb, 68ec5f2](https://github.com/Fribb/anime-lists/blob/68ec5f2e7f69e6f00fd67c795a5e683d871a2ba6/anime-list-full.json) | 39 779 | 15 | 15 | 14 | 12 | 15 |
| [Kometa, bb11df6](https://github.com/Kometa-Team/Anime-IDs/blob/bb11df6a92f47d781ce7001d8f43b8e7928fbed2/anime_ids.json) | 17 050 | 14 | 14 | 13 | 11 | 14 |
| [Otaku, 58f5e57](https://github.com/Goldenfreddy0703/Otaku-Mappings/blob/58f5e5799c3513fc047f308ce54c9c5435befed9/anime_mappings.db) | 31 182 | 17 | 15 | 15 | 14 | 17 |
| [animap v2026.10.17](https://github.com/cplieger/animap/releases/tag/v2026.10.17) | 16 308 | 16 | 16 | 13 | 11 | 16 |
| [animap v2026.11.16](https://github.com/cplieger/animap/releases/tag/v2026.11.16) | 16 326 | 0 | 0 | 0 | 0 | 0 |

Из старого animap связи MAL и AniList извлечены только для тех записей, которые задают ровно одну полную часть AniDB. В актуальном снимке в таблице AniDB нет поля IMDb. Сверка SHA‑256 с опубликованным файлом прошла. Kometa документирует, что для сериала и сезонов может хранить IMDb ID всего сериала. Kometa, Fribb, Otaku и animap используют пересекающиеся исходные базы. [animap](https://github.com/cplieger/animap), [схема Kometa](https://github.com/Kometa-Team/Anime-IDs#format), [источники Fribb](https://github.com/Fribb/anime-lists), [источники Otaku](https://github.com/Goldenfreddy0703/Otaku-Mappings)

### Inferences

- Otaku дал пять ID, которых не было в других проверенных снимках. Два из пяти прошли проверку, остальные имеют конфликт IMDb ID. Единственная самостоятельная находка Fribb прошла проверку. Из двух самостоятельных находок старого animap обе ведут к одному сборнику King of Prism. Все 14 попаданий Kometa уже были во Fribb. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Gaps

- У 3 826 работ связи по IMDb ID в этих снимках отсутствуют. Результат относится к данному остатку очереди и этим версиям файлов. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

## Какие связи можно передать на проверку импорта

### Takeaway

26 уникальных URL вернули HTTP 200 и декодируемые изображения. Девять работ прошли исходную проверку, ещё семь подтверждены вручную. Для 12 из 16 документировано японское производство. Для Urarochi Diamond сохранились японские источники об издании, и нужен первичный производственный титр самой экранизации. У остальных трёх из 16 производство на Тайване или в Республике Корея. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Cited Findings

- Базовая проверка сравнила основное или альтернативное название, год, формат, число эпизодов и хронометраж, когда сведения доступны. В допуске хронометража использованы 10 минут для фильма и 5 для эпизода. Несколько изображений, поздний сезон, разные IMDb ID и конфликт свойств Wikidata требуют отдельного решения. Ручной просмотр подтвердил название на трёх отдельных постерах TMS при разном написании в базе. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json), [TMS 1969](https://www.tms-e.co.jp/alltitles/1960s/005302.html), [TMS Big League Ball](https://www.tms-e.co.jp/global/alltitles/1970s/005303.html), [TMS Fateful Showdown](https://www.tms-e.co.jp/global/alltitles/1970s/005304.html)
- Для «Хвоста короля» исторический реестр различает начало работы в 1948-м и завершение в 1949-м. Для Baghdad Hime архив подтверждает чёрно-белый фильм 1948 года и 48 минут, поэтому из двух записей оставлен один кадр. Для Pia Carrot сохранилась официально выпущенная DVD-версия с полным названием фильма. [Историческая запись](https://www.nihon-animation-eigashi.com/work-db/item/NAE0474), [Национальный киноархив Японии](https://www.nfaj.go.jp/FC/NFC_Calendar/2008-05/kaisetsu_2.html), [DVD Pia Carrot](https://www.cdjapan.co.jp/product/PIBA-3153)
- NHRCK подтверждает единый фильм If You Were Me: Anima Vision 2. В AOD указаны шесть составляющих, поэтому число частей и указанная длительность одной части не опровергают тождество полнометражному сборнику. BIFF указывает Тайвань для The Butterfly Lovers, Korean Film Council связывает What Is Not Romance с корейским производством. [NHRCK](https://www.humanrights.go.kr/eng/board/read?boardManagementNo=7003&boardNo=7000641&menuLevel=2&menuNo=114&page=126), [BIFF](https://www.biff.kr/eng/html/archive/arc_history_view.asp?kind=history&m_idx=9261&pyear=2004), [KOFIC](https://www.koreanfilm.or.kr/eng/films/index/filmsView.jsp?movieCd=20090842)

### Inferences

- Одна запись со статусом `candidate` на IMDb ID содержит подтверждённый адрес изображения, его тип, сведения об HTTP-ответе, закреплённую выгрузку, ссылки на работу и признаки страны. `productionEvidence.method` позволяет оставить квалифицированный случай `tt0386248` на дополнительную проверку. Японское производство определялось по титрам, архивной записи или карточке конкретного фильма. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json), [издание Studio 4°C](https://www.suruga-ya.com/en/product/128003664)

### Gaps

- При отсутствии числа эпизодов или хронометража у IMDb этот признак помечен `unknown`. Доступность CDN проверена отдельным GET на каждую ссылку. Проверки в интерфейсе TASTIQ и проверки критериев добавления в каталог в эту сверку не входили. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

## Почему шесть карточек остались на проверке

### Takeaway

У трёх работ конкурируют разные IMDb ID. Ещё три записи ведут к изображениям сборников нескольких фильмов. Геометрия обложки и HTTP 200 в таких случаях подтверждают доступность изображения, а для идентичности нужен источник отдельной работы. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Cited Findings

- Tetsujin 28-go `tt0142908` связан с Q2504201, где заявлен `tt0058807`. У Fist of the Blue Sky `tt0884847` Q140640860 заявляет `tt8390536`, а часть других результатов относится к сезонам 2018 года. У Wish Upon the Pleiades `tt1836435` Q1135343 содержит внешние ID веб-версии и телевизионной версии и заявляет `tt11724248`. Проверка трёх внешних свойств Wikidata дополнила локальные заявления P345 и сопоставление QID в каталоге. [Q2504201](https://www.wikidata.org/wiki/Q2504201), [Q140640860](https://www.wikidata.org/wiki/Q140640860), [Q1135343](https://www.wikidata.org/wiki/Q1135343), [протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)
- King of Prism `tt10168876` и `tt10168898` возвращают одну обложку четырёхфильмовой записи; Yumihari no Serenade `tt7230298` — обложку двухфильмовой записи. [AniDB King of Prism](https://anidb.net/anime/14134), [AniDB Meiji Tokyo Renka](https://anidb.net/anime/10240), [протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Inferences

- Повторный прогон по тем же источникам даст мало новых карточек. Остаток этого подмножества лучше разбирать по конкретным редакциям и отдельным релизам. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)

### Gaps

- Не установлено, какие карточки с конкурирующими IMDb ID следует считать отдельными произведениями. Для трёх фильмов, попавших на обложки сборников, в этой сверке отдельные кадры не проверялись. [Протокол](../../../data/raw/c5-bulk/deep-anime-crosswalk.json)
