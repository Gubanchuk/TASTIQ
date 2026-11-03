## verdict

1. **resolved — FIRST VIEWPORT / FORM / floor type.** Повторно открыты те же question-tiny-final.png, question-mobile-final.png и question-desktop-final.png. На tiny четыре названия этапов читаются отдельно в сетке 2×2; промежутки видимы, подписи не соприкасаются. В текущем shared/product.css при ≤360px стоят repeat(2,minmax(0,1fr)), gap 4px 12px и min-width:0; размер 12px сохранён. На 390px и desktop прежний однострочный прогресс читается. Три recapture соответствуют заявленным состояниям, верх документа виден, пустых/чёрных областей нет; native raster/CSS viewport остаются разными измерениями с прежним ограничением API.
2. **resolved — Persistence.** Проверены текущие PRODUCT.md, нормативные роли и соответствующие разделы DESIGN.md, современные snippets .impeccable/design.json и выборки modern surface briefs. Теперь записаны светлая горизонтальная sticky-шапка с cobalt SVG, product pills 999px, фактические радиусы вопроса/featured/альтернатив/библиотеки и сетка альтернатив 3/2/1. Rail164px, inverse logo и прежние строковые результаты явно ограничены legacy. Записи согласуются с ранее просмотренными final-снимками и текущим shared/product.css.

Видимых регрессий от исправления progress на трёх recapture не обнаружено; противоречий, внесённых исправлением документации в перечисленные правила, не обнаружено. Новая проверка остальных областей не проводилась; второй detector, браузер и платная модель не запускались.

## remaining

clear

ship covers the scored fixes, not the whole surface.

disposition: ship
