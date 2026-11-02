---
version: 1
slug: "src-server-public-index-html"
primary_target: "src/server/public/index.html"
related_targets: ["src/server/public/style.css", "src/server/public/landing-bottom.css", "src/server/public/app.js", "src/server/public/shared/library-store.js"]
---

Mode: Persuade. Главная помогает начать настоящий подбор или вернуться к планам. Выбранный «Разговор»02.11.2026 обновил только нижнюю часть и разрешённую library-ссылку header.

## Direction contract and provenance

THESIS: начать с сегодняшнего желания и сохранить выбор.
OWN-WORLD: исходный нейтральный верх, тёплая Conversation-секция и графитовая библиотека ниже. Golos/Unbounded ограничены новыми секциями; граница после дверей сохранена.
STORY: прежние двери → пример игрового разговора → настоящий game route или библиотека.
FIRST VIEWPORT: исходные header.top/section.first с h1/sub/дверями/счётчиками/«скоро». Новая тема их не переписывает, iframe нет.
FORM: code-led выбранный Conversation /design-v2/; seed 537787fa, deal 6/4/5, receipt research-vault/site-design-reset-2026-11-02/structure-seed.txt. Raster comp не создавался; локальных QUALITY BAR board/hero нет, внешний ceiling не подтверждён.
FINISH: production FINISH_REVIEW.md — ship covers scored fixes. Отклонённый /design/ не выбранный образец.

## Frozen boundary

FROZEN_PROOF.json подтверждает section.first и rootstyle. Системный шрифт, dark/light media-query, синий CTA, poster doors и footer остаются исходными. Header: разрешены «Моё»→«Библиотека», href/library/; ≤360px только эта ссылка padding-inline8px/count hidden. Весь header нельзя называть byte-identical. Остальной hero/doors не перестроен.

## Shipped lower landing

- Conversation: две колонки 1.05fr/1fr, gap 75px, padding 75px 64px 70px. Unbounded clamp(29px,3vw,41px)/1.3,500; Golos15px/1.9. Реплика человека с тёплой заливкой и одним прямым углом; speakerlabels обозначают роли примера.
- CTA «Подобрать игру» ведёт в настоящий game route. После адаптивного media-этапа02.11 подпись сообщает, что фильмы, сериалы и мультфильмы тоже доступны через разговор; doors/hero сохранены.
- Графитовая библиотечная секция:1fr/1.45fr,gap 55px,padding 66px 64px 70px; три lane с настоящими browser-local записями/пустым состоянием, CTA/library/. Демонстрационные данные прототипа не импортировались.
- ≤1000px поля 35px, библиотека одноколоночная; ≤640px обе секции складываются, поля 22px, библиотечные cards вертикальны/cover 58px. Нет вложенной scrollpage.
- CTAmin46px; focus 3px blue / offset 5px; reduced motion отключает transition/smoothscroll. Новых raster/entranceanimation нет.

## Evidence boundary

Лично открыты final-landing-{desktop,mobile}.png production evidence: исходный верх, светлый низ после дверей, тёмная библиотека. Frozenproof/code review отдельно подтверждают источник/хеш; parent дополнительно проверил 319.

Existing catalog URLs Steam/TVmaze/Wikipedia и rendererfallback; права/источники не менялись. Golos/Unbounded self-hosted variable TTF + SIL OFL. Документация browser/server/API/detector не запускала, UI stage paid 0. Humanfit и полный светлый frozen вариант отдельно не проверены.
