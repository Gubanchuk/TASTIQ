import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSessionTime} from '../src/core/session-time.js';

const correction='Поправка: сегодня уже не RPG и не Skyrim. Хочу гонки: нравится управлять машиной и быстро начинать заезды, без обязательной длинной карьеры. Сегодня есть 45 минут. Общая длина игры неважна. Сюжет — хорошо, если есть, но он не обязателен.';
const validate=(answer,quote,minutes=45)=>validateSessionTime({minutes,sourceId:'correction:5',quote},{turns:[{id:'correction:5',answer,question:{id:'correction:5',title:'Что нужно изменить?'}}],retractions:[]});

test('the real racing correction keeps its explicit current budget despite an unrelated later story condition',()=>{
 for(const quote of ['Сегодня есть 45 минут.','Сегодня есть 45 минут']) {
  const out=validate(correction,quote);
  assert.equal(out.error,undefined);assert.deepEqual(out.time,{minutes:45,sourceId:'correction:5',quote});
 }
});

test('a dependent condition or cancellation immediately after the time sentence cannot be hidden by quoting its full stop',()=>{
 for(const answer of [
  'Сегодня есть 45 минут. Если не позвонят.',
  'Сегодня есть 45 минут. Но теперь уже нет.',
  'Сегодня есть 45 минут. Но это я вчера думал.',
  'Сегодня есть 45 минут. Не получится поиграть.',
  'Сегодня есть 45 минут. Времени уже нет.',
  'Сегодня есть 45 минут. Но это уже неактуально.',
  'Сегодня есть 45 минут, если не позвонят. Сюжет необязателен.',
  'Если сегодня есть 45 минут. Хочу гонки.',
  'Сегодня есть 45 минут, или час. Хочу гонки.',
 ]) {
  const quote=answer.startsWith('Если')?'сегодня есть 45 минут':'Сегодня есть 45 минут';
  assert.ok(validate(answer,quote).error,answer);
  if(answer.includes('Сегодня есть 45 минут.'))assert.ok(validate(answer,'Сегодня есть 45 минут.').error,answer);
 }
});
