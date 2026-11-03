---
version: 1
slug: "src-server-public-library-index-html"
primary_target: "src/server/public/library/index.html"
related_targets: ["src/server/public/shared/brand.css","src/server/public/shared/product.css","src/server/public/shared/workspace.css","src/server/public/shared/custom-select.css","src/server/public/shared/custom-select.js","src/server/public/shared/results.css","src/server/public/shared/workspace-ui.js","src/server/public/shared/request-overview.js","src/server/public/shared/clarification-view.js","src/server/public/shared/feedback-drafts.js","src/server/public/shared/evening-view.js","src/server/public/library/style.css","src/server/public/library/app.js","src/server/public/shared/library-store.js","src/server/public/pick/game/familiarity-store.js"]
---

Mode: Operate. Настоящая библиотека четырёх разделов после U01/U02/U07/U13/U15,03.11.2026.

## Direction contract and provenance

THESIS: сегодняшний запрос превращается в понятный выбор с причиной и оговорками.
OWN-WORLD: approved5B/uppercase02/Кобальт02, Golos/Unbounded, прохладная бумага, точный SVG, белые поверхности и реальные обложки.
FORM: Operate существующего выбранного мира; существенная code-led переработка по docs/superpowers/specs/2026-11-03-workspace-usability-design.md/U01–U15. Новые identity/comp/workshop не требовались. Старый seed537787fa не доказывает эту форму. Четыре файла одобренного landing byte-identical; его арки/веера не копируются в рабочую форму. Предыдущий product UI отклонён; эта новая версия ещё не одобрена владельцем.
STORY: желание → уточнение → проверка/исправление понимания → предложение/альтернативы → сохранение/вечер/знакомство.
FIRST VIEWPORT: явный раздел/действия, свои слова в request и текущая работа. Mobile result показывает title до art; Library показывает выбранный список и начало содержимого в0/1/130.

## Shipped composition

- Общий app-shell desktop top12/z60/min76px/max1380px(от1500px1440px)/margin16px auto28px/padding14px24px/radius20px/white/soft-shadow. Logo140px, видимые «Подбор»/«Библиотека»/«Подобрать новое»; domain/restart нет. Phone top0/radius0/no-shadow/logo120px/tiny105px, nav первая строка/CTA вторая. Legacy rail не менялся.
- Board max1440px/padding24px clamp(20px,4vw,64px)70px; phone18px20px50px. H1 Unbounded32px/1.3/500/-.035em/phone28px. Одна краткая вводная. «Списки / Архив / Вечера» с counts на context/radius16px, active white tab/radius12px/shadow0 2px6px #15213d08/min44px.
- Поиск всегда виден/min46px; desktop search+domain/reaction/order+reset, ≤1050px fields во втором ряду. Phone явная «Фильтры и порядок»/active count/aria-expanded плюс отдельный reset. Panel data-filter-open=false скрыт только phone, desktop options видны. Custom select46px/13px/radius12px/listbox fixed z2000/radius14px/options44px/check; keyboard/Escape/outside/focus/native fallback.
- Один выбранный list при любой ширине. Три list controls рядом; phone grid3/min44px с count/переносом label. Selected primary-border/selected-fill. Card-grid2/gap16px, ≤900px1. Вывод24, more добавляет24/«Показано N из M». Search/domain/reaction/order/lane/reset не переписывают записи, reset возвращает limit24.
- Итоговая card white/line-border/radius22px/padding18px(phone16px)/gap16px: поздний product.css перекрывает одноимённые18px/cover8px из library/style.css. Natural cover/contain/radius12px/width76px; ≤900px80px, ≤600px62px, ≤350px46px. Title Golos60017px/1.45, ≤600px16px, ≤350px15px; meta12px/1.6, description13px/1.75. Remove44px и move custom-select независимы; card align-self:start.
- Tabs/list/select/shell controls прямоугольные. Library-button сохраняет локальный pill999px/min46px/padding10px17px для filter/reset/empty CTA; не общая форма picker. Notice ink/white/z2100/radius14px/shadow0 10px30px #15213d25.
- Empty и no-results различны; empty context/radius18px/padding36px20px, phone24px16px. На1280×720 и320×740 виден содержательный empty-heading/первая запись, проверены0/1/130. Повторной длинной вводной и трёх пустых desktop-колонок нет.
- Вечера используют4видимые fit-оценки/optional reason-note. Shared draft tastiq.feedback-drafts.v1/runId:cardId доступен также в draft-only runs, не является доставленным отзывом. Choice/start/outcome отдельно; reload/resume без model call. Draft store читает свежий envelope перед записью и сохраняет чужие drafts, storage failure сообщается.
- Focus2px/offset4px; search/select2px/3px. Library buttons.18s cubic-bezier(.16,1,.3,1), reduced-motion отключает transitions.

## Data and interaction boundaries

Plan/taste/familiarity независимы; знакомство не запрет/прохождение/dislike. Undo не затирает повторное сохранение. Чтение вечеров не создаёт observe/flush. User journals/paid receipts не используются QA; каталоги/ranking/policy/квоты и legacy прежние.

## Evidence boundary

Пакет: research-vault/workspace-usability-2026-11-03/CAPTURE_MANIFEST.md, ACTION_MATRIX.md, SOURCE_REVIEW.md, FINISH_REVIEW.md.21PNG в .impeccable/review/workspace-usability-2026-11-03/; родитель переснял/открыл все после F1/F2. Documenter открыл4: game-tiny320, game-feedback1440, library-tiny320, library-empty1280; остальные сверены по code/manifest. Native390×844→380×822 и320×740→310×717, JPEG→PNG без crop/resize; CSS и raster размеры различаются явно.

Родительский свежий пакет:540/540 tests, build exit0, offline HTTP stub, source delta Pass46/46. Реальные controllers/stores/catalogs, AI_ACCESS=off/injected plan/pick; synthetic reasons не human fit. F1 first content: single1280 title y598–623; tiny320 title y695–717, empty heading y678–738. F2 Victoria3 title y641–671 при320×740 и621–654 при390×844. Tested widths без overflow. Documenter не запускал tests/server/browser и не присваивает finish verdict.

Detector один раз: exit0/58findings=52advisories+6inherited warnings; повторно не запускался. F3 синхронизация не отменяет paper drift/чужие records. Новых paid calls0/$0, imagegen0, commit/push/deploy0. Human fit/physical touch/реальный screen reader неизвестны; новый UI ещё не одобрен. Старые receipts/budgets/user states не переписаны.

## Коррекция по обратной связи 03.11.2026

Общие входы теперь /pick/start/; внешний мир и бренд прежние. Первый вопрос shared/conversation-entry.js создаётся без API. В shared/question-form.js желания выше раскрываемых жанров/ограничений/своих слов, нейтральные ответы ниже. В выдаче доступны more/уточнение/undo без перезапуска анкеты. Текущий проверенный scope и ограничения: docs/PICKER_FEEDBACK_2026-11-03.md; прежнее landing byte-identical относится к предыдущей переработке.
