import {OpenAIError} from './openai.js';

// Internal diagnostics stay stable; only the safe message and retry policy reach the UI.
const messages={
 AI_BUDGET_LIMIT:'Доступный лимит нейросети исчерпан. Запрос сохранён.',
 AI_SPEND_UNCERTAIN:'Предыдущий запрос ещё не подтверждён. Повтор временно недоступен; ответы сохранены.',
 AI_BUDGET_HALTED:'Новые обращения к нейросети временно остановлены. Ответы сохранены.',
};
export class BudgetError extends OpenAIError {
 constructor(message,code,{notRequested=true}={}) {
  super(message);this.name='BudgetError';this.code=code;this.publicMessage=messages[code]??messages.AI_BUDGET_HALTED;
  this.retryable=false;this.notRequested=notRequested;
 }
}
