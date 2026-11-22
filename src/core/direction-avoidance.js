// Both entry forms carry today's free-form exclusion independently of the wish.
export function directionAvoidance(action,question,kind,fail){
  if(action.avoidText==null||action.avoidText==='')return '';
  if(question.id!=='direction'||kind!=='answer'||typeof action.avoidText!=='string'||action.avoidText.length>240){
    throw fail('Проверь поле «Своё исключение». В нём можно написать до 240 символов.');
  }
  return action.avoidText.replace(/\s+/g,' ').trim();
}
export function validTurnAvoidance(turn){
  return turn.avoidText===undefined||(turn.question?.id==='direction'&&turn.kind==='answer'
    &&typeof turn.avoidText==='string'&&turn.avoidText.length<=240&&turn.answer.endsWith('Хочу избежать: '+turn.avoidText));
}
const ownKey='direction:own-avoidance';
export function storedFactLimit(facts){
  return facts?.some(f=>f?.key===ownKey)?17:16;
}
export function initialAvoidanceFact(turn,game=false){
  if(!turn.avoidText)return [];
  return [{key:ownKey,text:turn.avoidText,quote:turn.avoidText,sourceId:turn.id,
    stance:'exclude',scope:'today',feature:null,exposure:null,...(game?{gameId:null,gameIntent:null}:{titleId:null,titleIntent:null})}];
}
// Keep the user's field editable as one condition, including when an unrelated
// planning step omits it or returns several guesses based on the same words.
export function respectAvoidanceField(facts,state){
  const original=state.turns.find(turn=>turn.avoidText&&turn.kind==='answer'&&!turn.superseded);
  if(!original)return facts;
  const matching=f=>f.sourceId===original.id&&f.scope==='today'&&typeof f.quote==='string'
    &&f.quote.replace(/^Хочу избежать:\s*/u,'').length>0&&original.avoidText.includes(f.quote.replace(/^Хочу избежать:\s*/u,''));
  const remaining=facts.filter(f=>f.key!==ownKey&&!matching(f));
  const removed=state.retractions.some(r=>r.sourceId===original.id&&(r.key===ownKey||r.quote===original.avoidText));
  const cleared=state.turns.some(t=>!t.superseded&&t.question.id.startsWith('correction:')
    &&/^(?:убери|сними|удали)\s+(?:(?:это|мо[её]|первоначальное)\s+)?исключение[.!]?$/iu.test(t.text.trim()));
  if(removed||cleared)return remaining;
  const whole=f=>matching(f)&&['exclude','avoid'].includes(f.stance)&&f.quote.replace(/^Хочу избежать:\s*/u,'')===original.avoidText;
  const interpreted=facts.find(whole)??state.facts.find(whole);
  const [canonical]=initialAvoidanceFact(original,!state.domain||state.domain==='game');
  return [...remaining,{...interpreted,...canonical,feature:interpreted?.feature??null,
    ...(interpreted?.titleId?{titleId:interpreted.titleId}:{}),...(interpreted?.gameId?{gameId:interpreted.gameId}:{})}];
}
