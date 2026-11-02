# Независимый core review: отмена снятия факта и возврат условий

Проверены normalizeFactRemovalUndo/capture, remove_fact/undo_fact_removal, invalidate и context/resumeQuestion/back в core/conversation.js; собственные AI/service правки рецензента исключены. Код не менялся. Настоящий reducer и focused tests запускались бесплатно; браузер/сервер/API не использовались.

## Подтверждено

- Undo-cache хранит перечисленные поля understanding/result/question/marks/retractions; верхнеуровневые turns/context/следующий factRemovalUndo не копируются. Facts/retractions имеют предел16/64 и whitelist строковых полей, question/options/controls ограничены, result ограничен четырьмя карточками. Кеширует один предыдущий переход, не цепочку полных conversation snapshots.
- При снятии факта из активного talk сохраняются question.id и форма текущего ответа; одно бесплатное undo после reload восстанавливает result, summary, facts, retractions и marked. Revision растёт, кеш очищается.
- Новый ответ/поправка, смена условий, Back, новый подбор, confirm и действия списка инвалидируют прежний undo. Повторное снятие хранит только последний переход; undo не снимает предыдущую отдельную retraction.
- Context-turn сохраняет resumeQuestion, не притворяясь ответом на этот вопрос. Back снимает superseded с прежних источников условий, восстанавливает platform/company/partySize и ту же непройденную question; новые условия не остаются действующими из отменённого context-turn.

Независимый прогон `test/fact-removal-undo.test.js` + `test/overnight-journey-regressions.test.js`: **10/10 PASS**, exit0.

## Один подтверждённый P2 раннего этапа

Обычный достижимый путь: новый разговор → выбрать RPG → экран platform с sidebar-фактом RPG → «Убрать» этот факт. Reducer переводит разговор в review с platform/company:null; confirm затем бросает «Сначала укажи платформу и компанию». Undo возвращает platform, но само снятие не должно лишать пользователя обязательного текущего вопроса. Причина: remove_fact сохраняет question только при phase==='talk', хотя обязательные вопросы direction/platform/company/party тоже активны.

Это не нарушение бюджета/платного транспорта и не потеря исходного разговора, но блокирует прямое продолжение до обхода через Undo/Back. Основной исполнитель и владелец core уведомлены до любых правок; backend freeze соблюдён. Предложено сохранять активный вопрос и на обязательных этапах, с адресным regression.

Предварительный вердикт: **Fix-and-resend** по этому P2; критических дефектов в проверенном undo/context-back не найдено. API-расход рецензента **0/$0**.
