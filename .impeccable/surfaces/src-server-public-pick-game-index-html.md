---
version: 1
slug: "src-server-public-pick-game-index-html"
primary_target: "src/server/public/pick/game/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/shared/product.css","src/server/public/shared/workspace.css","src/server/public/shared/custom-select.css","src/server/public/shared/custom-select.js","src/server/public/shared/results.css","src/server/public/shared/workspace-ui.js","src/server/public/shared/request-overview.js","src/server/public/shared/request-conditions.js","src/server/public/shared/result-clarity.js","src/server/public/shared/clarification-view.js","src/server/public/shared/feedback-drafts.js","src/server/public/shared/evening-view.js","src/server/public/pick/game/app.js","src/server/public/pick/game/card-view.js"]
---

Mode: Operate. Построенный адаптивный игровой Conversation после U01–U15,03.11.2026.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: approved5B/uppercase02/Кобальт02, Golos/Unbounded, прохладная бумага, точный SVG, белые поверхности и реальные обложки.
FORM: Operate существующего выбранного мира; существенная code-led переработка по docs/superpowers/specs/2026-11-03-workspace-usability-design.md/U01–U15. Новые identity/comp/workshop не требовались. Старый seed537787fa не доказывает эту форму. Четыре файла одобренного landing byte-identical; его арки/веера не копируются в рабочую форму. Предыдущий product UI отклонён; эта новая версия ещё не одобрена владельцем.
STORY: желание → уточнение → проверка/исправление понимания → предложение/альтернативы → сохранение/вечер/знакомство.
FIRST VIEWPORT: явный раздел/действия, свои слова в request и текущая работа. Mobile result показывает title до art; Library показывает выбранный список и начало содержимого в0/1/130.

## Shipped composition

- После brand/product подключены shared/workspace.css, custom-select.css, results.css. Desktop app-shell sticky top12/z60/max1380px (от1500px1440px)/min76px/margin16px auto28px/padding14px24px/radius20px/white/shadow0 4px24px #15213d08. Logo140px, видны «Подбор»/«Библиотека», domain/restart/restore. ≤1450px поля24px; ≤1100px padding12px18px. Phone top0/radius0/no-shadow/logo120px/tiny105px, две строки, restore при наличии третьей; actions44px. Scroll-padding112px/phone146px.
- Workspace request280px +работа/gap28px/max1380/1440px/margin0 auto64px; ≤1100px250px/gap22px. Phone одна колонка/gap16px/поля14px/tiny10px. Белый request radius24px/padding24px22px, phone18px/16px18px. Факты сгруппированы по смыслу/истории,13px/1.65; условия, удаление и «Уточнить» названы. Phone сохраняет свои слова и явное уточнение, полный запрос раскрывается.
- Работа radius26px/padding26px32px30px/no border/no shadow; ≤1100px padding24px, phone22px/20px18px, tiny18px14px. Вопрос Unbounded28px/1.35/max28ch, phone24px/1.4/tiny22px; result-heading30px/phone25px. Help14px/1.7. Варианты58px/padding14px17px/radius14px/grid2→1phone, направления3/2/2/min47px/radius12px. Textarea122px/15px/radius16px, phone125px/14px. Next48px/min-width145px/radius13px у ответа, secondary/neutral/пример отдельно.
- Stepper4 круга27px с номером/check/label12px/current aria-current=step, phone25px/label11px/4колонки. ≤1100px отдельная строка. Mobile result back44×44 и четыре подписанных этапа в одном ряду; back accessible name сохранён. Progress не tabs и не квота вопросов.
- Central editor workspace-soft/radius20px/padding24px, phone16px/18px16px, контекст/textarea/apply/cancel. Более специфичный stage сохраняет paper/min122px (phone125px); перекрытые136px/white не записываются как норма. Revision/id, независимый draft, cancel/error/reload и correction checkpoint сохраняются. «Дополнить запрос» отдельно, restore предыдущего запроса/cards/feedback/drafts без модели.
- Featured grid minmax(220px,.8fr)+minmax(0,1.5fr)/gap30px/padding30px/radius28px; tablet180px/.85fr+1.35fr/gap24px/padding24px. Title30px/1.25, tablet27px, phone26px/tiny24px; reason16px/1.75/phone15px. Alternatives3/2/1/gap20px(tablet16/phone18)/padding24px/radius24px/title22px/1.3. Cards align-self:start/height:auto/no shadow. Phone block/padding22px20px/tiny20px16px; title/meta идут до art.
- Art natural width/height/max-width100%/contain, без fixed ratio/crop. Max-height featured420px/alternative220px desktop,320/280px phone; radius14/phone12px. До load/error честный title fallback/min132px, success скрывает fallback/снимает минимум. Причина/caveat/actions доступны без картинки.
- Сразу4fit-оценки; optional reason/note только своей card, соседние высоты не меняются. Choice/start/outcome/save/familiarity независимы. Shared key tastiq.feedback-drafts.v1/runId:cardId/note≤300; Library Evenings видит draft-only runs, не создавая отправленный отзыв.
- Shared select: native fallback/value до/после enhancement, trigger46px/radius12px/value13px, fixed listbox z2000/radius14px/shadow0 14px40px #15213d24/options44px/check. Arrow/Home/End/Enter/Escape/outside/focus сохранены. Focus shared3px/4px, select2px/3px. Reduced-motion отключает движение.
- Planning/picking/replacement min360px/phone300px/bars7×28px/1.25s; live focus вне busy main, Retry повторяет действие, локальная запись не имитирует модель.

## Domain boundary

Игровые context/platform/company и familiarity batch replace/keep/undo сохранены. QA содержит3допустимые actual catalog cards, четвёртая ради сетки не выдумана. Каталоги/ranking/reducer/model/квоты прежние.

## Evidence boundary

Пакет: research-vault/workspace-usability-2026-11-03/CAPTURE_MANIFEST.md, ACTION_MATRIX.md, SOURCE_REVIEW.md, FINISH_REVIEW.md.21PNG в .impeccable/review/workspace-usability-2026-11-03/; родитель переснял/открыл все после F1/F2. Documenter открыл4: game-tiny320, game-feedback1440, library-tiny320, library-empty1280; остальные сверены по code/manifest. Native390×844→380×822 и320×740→310×717, JPEG→PNG без crop/resize; CSS и raster размеры различаются явно.

Родительский свежий пакет:540/540 tests, build exit0, offline HTTP stub, source delta Pass46/46. Реальные controllers/stores/catalogs, AI_ACCESS=off/injected plan/pick; synthetic reasons не human fit. F1 first content: single1280 title y598–623; tiny320 title y695–717, empty heading y678–738. F2 Victoria3 title y641–671 при320×740 и621–654 при390×844. Tested widths без overflow. Documenter не запускал tests/server/browser и не присваивает finish verdict.

Detector один раз: exit0/58findings=52advisories+6inherited warnings; повторно не запускался. F3 синхронизация не отменяет paper drift/чужие records. Новых paid calls0/$0, imagegen0, commit/push/deploy0. Human fit/physical touch/реальный screen reader неизвестны; новый UI ещё не одобрен. Старые receipts/budgets/user states не переписаны.

## Коррекция по обратной связи 03.11.2026

Общие входы теперь /pick/start/; внешний мир и бренд прежние. Первый вопрос shared/conversation-entry.js создаётся без API. В shared/question-form.js желания выше раскрываемых жанров/ограничений/своих слов, нейтральные ответы ниже. В выдаче доступны more/уточнение/undo без перезапуска анкеты. Текущий проверенный scope и ограничения: docs/PICKER_FEEDBACK_2026-11-03.md; прежнее landing byte-identical относится к предыдущей переработке.

Полный проход передmain: collapsed extra disclosures3встроку, open fullwidth, phone1колонка. Нейтральные controls ниже вариантов, Next рядом/вdesktopviewport. Own-answer resume/example раскрывает поле и фокусирует его; oldv3drafts мигрируют. Свежий scope: research-vault/picker-feedback-2026-11-03/FULL_CHECK.md,563/563+HTTPstub+build/sourcePass/paid0.


Локальная итерация второго отзыва03.11: заголовок карточки копирует название+год (shared/title-copy.js), inline статус и доступный ручной fallback. Верхнее more у result-heading повторяет нижнее, без новой анкеты и нового вкусового сигнала. Проверки и границы: docs/TESTER_FEEDBACK_ROUND2_2026-11-03.md; production пока532299e.


03.11: «Скопировать подбор» рядом с верхним more, общий inline status и multiline manual fallback. shared/selection-copy.js экспортирует явные поля текущего запроса/выдачи, без uid/библиотеки/оценок/черновиков. Проверки/ограничение OS clipboard readback: docs/SELECTION_COPY_2026-11-03.md.


## Условия и порядок рекомендаций — 2026-11-03

Первый блок выдачи имеет явный заголовок «Главный вариант под твой запрос», альтернативы — «Другие варианты». Обе кнопки more связаны с пояснением до четырёх за раз и того же запроса. Бренд, карточки, ранжирование и feedback прежние; docs/REQUEST_CLARITY_2026-11-03.md.
# Inline selection feedback —03.11.2026, local

After the complete card list, one open question in the incumbent Operate world: selection verdict, optional reason/text disclosure, opt-in to personal contextual use and explicit submission. Shared selection-review modules/results.css; three44px controls stack below480px. No new visual identity, popup or landing change. Draft/queue/error/sent states and more→undo binding checked in native desktop/390/320. Hosted Family persistence verified with tastiq_ objects/scoped ingress; production delivery in progress; see docs/DURABLE_FEEDBACK_2026-11-03.md.
