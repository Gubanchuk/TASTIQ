import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiErrorMessage,replacementNotice} from '../src/server/public/shared/ai-error-message.js';

test('provider failures in new or saved selections display a recoverable picker message',()=>{
 for(const message of ['ошибка нейросети 503','Нейросеть ответила не по форме разговора.','нейросеть не ответила вовремя']){
  assert.equal(aiErrorMessage(message),'Не получилось продолжить подбор. Твои ответы сохранены.');
 }
 for(const message of ['ключ OpenAI не принят','нет доступа к модели OpenAI','проверь баланс или лимит оплаты OpenAI']){
  assert.equal(aiErrorMessage(message),'Подбор по пожеланию сейчас недоступен.');
 }
 assert.equal(aiErrorMessage('нейросеть выключена. Можно ответить на вопросы и посмотреть предварительные варианты.'),
  'Подбор по пожеланию сейчас недоступен. Можно ответить на вопросы и посмотреть предварительные варианты.');
 assert.equal(aiErrorMessage('Запрос не отправлен: оставшийся бюджет недостаточен или цена модели неизвестна.'),
  'Подбор по пожеланию временно недоступен. Твои ответы сохранены.');
});

test('picker-specific next steps and the catalog explanation on old replacements stay visible',()=>{
 const next='По этим условиям пока не нашлось подтверждённых вариантов. Можно уточнить или изменить запрос.';
 assert.equal(aiErrorMessage(next),next);
 assert.equal(replacementNotice('Доступен только один другой вариант по условиям. Он подобран по каталогу без нового обращения к модели.'),
  'Доступен только один другой вариант по условиям. Он подобран по каталогу.');
});
