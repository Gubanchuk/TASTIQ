import fs from 'node:fs';

function edit(file, transform) {
  const before=fs.readFileSync(file,'utf8');
  const after=transform(before);
  if(after===before)throw Error(`No update applied: ${file}`);
  fs.writeFileSync(file,after);
}
const budget='Общий потолок OpenAI API **$5**; снимок после адаптивного диалога: upper **$1.4346095 /148** успешных, remaining lower **$3.5653905**, uncertain/pending0. Новый этап **$0.2079572 /11**. Источник — research-vault/taste-quality-strategy-2026-10/eval/quality-round-2/budget.json. Перед новым вызовом перечитать ledger, не обнулять учёт.';
edit('AGENTS.md',s=>s
  .replace('В памяти начать с `MEMORY.md`,','В памяти начать с `MEMORY.md`, `adaptive-game-dialogue-2026-10-31.md`,')
  .replace(/^- Текущий запрос — совместный выбор[^\r\n]*$/m,'- Владелец одобрил реализацию после сравнения: «мне нравится, давай сделаем как считаешь нужным». Текущая точка — docs/ADAPTIVE_DIALOGUE_2026-10-31.md. Новый /pick/game/: раннее направление и свои слова, адаптивные вопросы OpenAI, проверка/исправление понимания, варианты и поправки. По умолчанию В/guided; Б/free — внутренний контроль с теми же моделью/поиском. 250 tests, HTTP stub, desktop/mobile и реальный браузерный API-проход; независимый review Pass после 3 исправлений. Одно сравнение Б/В дало одинаковую выдачу и не доказало превосходство В. Следующий шаг — свободный проход владельца с настоящим желанием; human fit ещё не измерен. Старое ожидание выбора направления больше не действует.')
  .replace(/^- Последний отзыв владельца[^\r\n]*$/m,'- Отзыв владельца docs/OWNER_FEEDBACK_2026-10-31.md остаётся основанием: повтор восьми карточек, нет жанра/направления, навязанные ответы, быстрый вывод из прошлого вкуса. Новый путь это меняет, но тесты не означают одобрения человеком. Начатая игра не равна запрету, неважно не равно нежеланию; собственный ответ может оказаться достаточным без обязательного числа вопросов.')
  .replace(/^- Предыдущая реализация —[^\r\n]*$/m,'- Предыдущие docs/QUESTION_QUALITY_2026-10-31.md и JOURNEY_QUALITY_2026-10-31.md — история прежнего маршрута и синтетических замеров. Их max3, тестовые числа и расходы не считать текущими для /pick/game/. Старые сохранённые состояния /pick/ не мигрируют молча; фильмы/сериалы/мультфильмы остаются там. Каталоги в новой итерации не менялись.')
  .replace(/^- Онлайн-подбор и разбор пожелания:[^\r\n]*$/m,`- Онлайн-подбор: OpenAI Responses, gpt-6.1-sol, effort low. ${budget} Рабочий localhost5177/pick/game/ перезапущен (exec62890); AIon, interactive-20261031, cap$0.75 внутри общего$5, JOURNAL_PATH=data/journal.ndjson. Runtime держит lock; перед отдельным paid runner проверить владельца и receipts. Тестовые5178/5179 остановлены. Неполная вместимость/свойства видны как непроверенные; discovery/spares и спорные импортные решения не включать автоматически.`));

edit('README.md',s=>s
  .replace(/^> Актуально[^\r\n]*/,`> ${budget} Старые суммы ниже — история.`)
  .replace(/^Подбирает не по жанру[^\r\n]*/m,'Подбирает игры под сегодняшнее желание с учётом причин и ограничений. Новый игровой путь `/pick/game/`: направление или свои слова → платформа и компания → уточнения OpenAI по ответам → проверка понимания → варианты. Знакомые игры необязательны; понимание и условия можно исправить. У фильмов, сериалов и мультфильмов сохраняется прежний пошаговый маршрут `/pick/`.')
  .replace('## Полезные уточнения, 31.10.2026','## Адаптивный игровой диалог, 31.10.2026\n\nРеализован по одобрению владельца. 250/250 tests, HTTP с подменой API, desktop/mobile и полный браузерный проход с настоящим OpenAI. Проверены смена направления после результата, возврат к начатой игре и кооператив. Новые 11 обращений: $0.2079572. Качество на настоящих желаниях владельца ещё предстоит оценить. [Реализация, примеры и ограничения](docs/ADAPTIVE_DIALOGUE_2026-10-31.md).\n\n## Полезные уточнения, предыдущий этап31.10.2026'));

edit('docs/CODEX_CONTEXT.md',s=>s.replace('Новый маршрут ещё не реализован; варианты для совместного выбора описаны выше.','На момент этого отзыва новый маршрут ещё не был реализован; последующее одобрение и реализация описаны в актуальном разделе выше.'));

edit('docs/superpowers/plans/2026-10-31-adaptive-game-dialogue.md',s=>s
  .replaceAll('- [ ]','- [x]')
  .replace('State v1:','Context edits retain old turns with `superseded:true` and record `supersedes` on the new turn; inactive sources cannot support facts. `continue` opens a free addition without discarding evidence or calling the API.\n\nState v1:')
  .replace('Free text always allowed, independent of options.','Free text is always allowed for meaning questions, independent of options. Local platform/company/party questions set `allowText:false` and require a factual selection.')
  .replace('maxCostUsd=Infinity}={})','maxCostUsd=Infinity,knownGames=[]}={})')
  .replace('confirm or preview invokes final picker once.','confirm invokes final picker once; review/preview itself is free.')
  .replace('`back`; `correct','`back`; `continue`; `correct')
  + '\n## Actual completion evidence\n\n31.10.2026: 250/250 tests; HTTP smoke with stub; desktop1440×900/mobile390×705; real browser → HTTP → OpenAI cooperative journey; reviewer Pass after fixes. Live11 calls cost$0.2079572, totalupper$1.4346095/148 of authorized$5. B/C yielded equal recommendations on one rich RPG input, superiority not established. Server5177 restored, test5178/5179 stopped. Full report: docs/ADAPTIVE_DIALOGUE_2026-10-31.md. No commits, catalog changes or deployment.\n');

edit('research-vault/dialogue-architecture-2026-10/implementation/ui-report.md',s=>s.replace('Кнопка review «Продолжить уточнение» отправляет `continue`, сохраняя предыдущие ответы.','Кнопка review после финального прохода переименована «Добавить пожелание»: отправляет `continue`, открывает свободное дополнение и сохраняет предыдущие ответы.'));
