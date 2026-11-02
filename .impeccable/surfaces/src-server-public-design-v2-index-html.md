---
version: 1
slug: "src-server-public-design-v2-index-html"
primary_target: "src/server/public/design-v2/index.html"
related_targets: ["src/server/public/design-v2/style.css", "src/server/public/design-v2/app.js", "src/server/public/design-v2/frozen-top.html", "src/server/public/design-v2/frozen-top.js"]
---

Mode: Operate. Новый выбор структур после отказа владельца от ВСЕХ прежних `/design/`. Все кандидаты невыбранные; основной сайт не переносили. Системы записаны отдельно в `research-vault/site-design-reset-2026-11-02/DESIGN.md` и `design.json`; root DESIGN не заменяется.

THESIS: разные единицы выбора, порядок чтения и группировка сохранённого. Цвет и радиус не засчитываются как самостоятельная структура.

OWN-WORLD: «Разговор» — Golos/Unbounded, тёплое поле, медный акцент, графитовый rail; «Витрина» — Onest/Unbounded, светлая поверхность, синий, реальные постеры; «Сравнение» — Golos, светлый плотный список, графитовая шапка и зелёный. Frozen верх сохраняет оригинальный нейтральный мир.

STORY: желание/уточнение → варианты → выбор/сохранение/знакомство. Библиотеки соответственно статусная доска, медиаполки, фильтруемый компактный список. Нижние примеры и библиотеки читают один Map состояний; пустая группа не заполняется случайным элементом.

FIRST VIEWPORT: transcript и предложения/вопрос; раскрытые сравнительные ряды; четыре компактные строки и detail. На mobile доска превращается в переключатель статусов, полки остаются горизонтальными, detail раскрывается inline. В v5 при 640px сводка и «Поправить» видны перед явным раскрытием предыдущих ответов.

FORM: code-led структуры по прямому поручению; seed `537787fa`, API receipt `structure-seed.txt`, deal 6/4/5. Утверждённого comp и выбранного product-world нет. Свидетельства прежних макетов не означают принятия новых.

FINISH: новый full review дал три material fixes; последующий verdict прочитан, все три resolved, disposition ship относится к scored fixes. Это сравнение для выбора, без production approval и human-fit claim. Документация фиксирует v5.

Граница лендинга: исходные header и весь first, включая headline/sub, двери/коллажи/счётчики и soon-слоты, размещены в изолированном iframe с исходными CSS/app. Исходные файлы главной совпадают с baseline SHA256; header/first — после CRLF/LF-нормализации. Изменяется только низ. Счётчик исходного «Моё» может читать реальную локальную библиотеку, но новые действия не записывают её и не вызывают подбор API; явный выбор пишет только design-choice.v2.

Capture scope: `CAPTURE_MANIFEST.json` перечисляет 35 required images. Чёткие full-document result/library/question и lower-only отдельно от мягких partial native landing-top; последние показывают topology, не типографическую fidelity. Invalid-capture/initial-landing/старые landing-metrics исключены из evidence из-за iframe-height side effect screenshot API. Документер выборочно открыл 11 финальных оригиналов, исходники и итог review; новых browser/API/server/detector не было. Каталожные URL обложек и self-hosted OFL fonts сохраняют происхождение; растры не генерировались.
