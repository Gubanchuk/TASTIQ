import {profileOf,sessionOf} from '../core/dialogue.js';
import {buildTaste} from '../core/profile.js';
import {pureRatingRequirement,watchingWithChildren} from '../core/age-rating.js';
import {checkSieves} from '../core/sieves.js';
import {unconfirmedSavedCriteria,criteriaOf} from '../ai/pick-constraints.js';

// Offer to remove an untyped fact only when its entire wording is a positive
// theme. Unknown clauses may carry content, format or viewing-order boundaries.
const themeWord=/^(?:власт|свобод|братств|дружб|одиночеств|предательств|философ|приключен|фантасти|фэнтези|триллер|детектив|комеди|драм|политик|политическ|взрослени|интриг|романтик|надежд|любов|справедливост|морал|дилемм|семь|становлени|личност|самопожертвован|соперничеств|верност|ответственност|выбор|путешеств|смысл|жизн)[а-яё]*$/iu;
const themeFrame=/^(?:про|о|об|в|во|за|к|с|со|и|на|для|по|хочу|хочется|интересует|нуж(?:на|ен|но|ны)|мне|важ(?:на|ен|но|ны)|обязател(?:ен|ьна|ьно|ьны)|требуется|истори[яиюей]|тем[аыуе]|сюжет[аеу]?|борьб[ауые]|геро[йяеви]+|человек[аеу]?|людей|героях|неоднозначн[а-яё]+|сложн[а-яё]+|психологическ[а-яё]+)$/iu;
function positiveTheme(value){
  if(typeof value!=='string'||value.length>150||/[^\p{Script=Cyrillic}\s,!.–—-]/u.test(value))return false;
  const words=value.match(/[\p{Script=Cyrillic}]+/gu)??[];
  return words.some(word=>themeWord.test(word))&&words.every(word=>themeWord.test(word)||themeFrame.test(word));
}
const protectedClause=/(?<!\p{L})(?:не|ни|нет|без|никак\p{L}*|нельзя|исключ\p{L}*|избег\p{L}*|кроме|против|мимо|реб[её]н\p{L}*|детск\p{L}*|дет[яеи]\p{L}*|семейн\p{L}*|эроти\p{L}*|секс\p{L}*|насили\p{L}*|мат|мата|матерн\p{L}*|рейтинг\p{L}*|маркировк\p{L}*|\d+\+)(?!\p{L})/iu;
function whollyPositive(state,fact){
  if(!fact.quote||protectedClause.test(fact.quote)||protectedClause.test(fact.text))return false;
  const answer=state.turns.find(turn=>turn.id===fact.sourceId&&!turn.superseded)?.answer;
  const clauses=(answer??'').split(/[.!?;]/u).filter(clause=>clause.includes(fact.quote.replace(/[.!?;]+$/u,'')));
  return clauses.length===1&&!protectedClause.test(clauses[0]);
}
function groundedTheme(state,fact){
  return !fact.titleId&&!fact.gameId&&!fact.exposure&&positiveTheme(fact.quote)&&positiveTheme(fact.text)&&whollyPositive(state,fact);
}
function editsFor(state,session) {
  const choices=[];
  if(session.verifiedAge&&!watchingWithChildren(state))
    choices.push({label:'Снять требование к возрастной маркировке',action:{type:'allow_unverified_rating'}});
  if(state.sessionTime)choices.push({label:`Снять лимит в ${state.sessionTime.minutes} мин`,action:{type:'remove_time'}});
  if(state.context?.onlyEnded===true&&state.contextEvidence?.onlyEnded)
    choices.push({label:'Включить сериалы, которые ещё выходят',action:{type:'remove_fact',key:'context:onlyEnded'}});
  for(const fact of state.facts){
    if(fact.scope!=='today'||fact.stance!=='require')continue;
    if(fact.feature){
      if(/^(?:content|audience|format|length|completeness|session|social)\./u.test(fact.feature)||!whollyPositive(state,fact)
        ||state.facts.some(other=>other!==fact&&other.sourceId===fact.sourceId&&other.feature===fact.feature))continue;
    }else if(!groundedTheme(state,fact)||!state.facts.some(other=>other!==fact&&other.scope==='today'&&['want','require'].includes(other.stance)))continue;
    choices.push({label:`Искать без условия «${fact.quote}»`,action:{type:'remove_fact',key:fact.key}});
  }
  return choices;
}

function* matchingItems(state,{catalogFor,projection,sessionFor}) {
  const catalog=catalogFor(state),legacy=projection(state),session=sessionFor(state,sessionOf(legacy));
  const taste=buildTaste(catalog,profileOf(legacy));
  const hasCriteria=criteriaOf(legacy).length>0;
  for(const item of catalog.items){
    if(checkSieves(item,taste,session,catalog))continue;
    if(state.savedSource&&hasCriteria&&unconfirmedSavedCriteria(legacy,item).length)continue;
    yield item;
  }
}
function runtimeSteps(withoutLimit,options,minutes){
  const firstRuntime=new Map();
  for(const item of matchingItems(withoutLimit,options)){
    if(!Number.isInteger(item.runtime)||item.runtime<=0||item.runtime>1440)continue;
    const work=item.work||item.id;
    if(!firstRuntime.has(work)||item.runtime<firstRuntime.get(work))firstRuntime.set(work,item.runtime);
  }
  const longer=[...firstRuntime.values()].filter(value=>value>minutes);
  if(!longer.length)return [];
  const nearest=longer.reduce((a,b)=>Math.min(a,b));
  // A second film session is useful only if it opens several distinct works
  // beyond the nearest limit; three editions of one film do not qualify.
  const hasFeatureLength=longer.some(runtime=>runtime>60&&runtime<=90);
  const sessions=hasFeatureLength?[90,120]:[60,90,120];
  const wider=withoutLimit.domain==='film'&&sessions.find(limit=>limit>=nearest+15&&longer.filter(runtime=>runtime>nearest&&runtime<=limit).length>=3);
  return (wider?[nearest,wider]:[nearest]).map(minutes=>({label:`Увеличить лимит до ${minutes} мин`,action:{type:'extend_runtime',minutes}}));
}

// Simulate the very same edit the button sends. Never offer to drop exclusions or
// promise a semantic match when only the mechanical filters can be checked.
export function noMatchScreen(state,options) {
  const kind=state.noMatchKind;
  if(!['catalog','checked','title-lookup'].includes(kind)||!['pick','replace','more'].includes(state.failedAction))return null;
  const first=state.failedAction==='pick',saved=Boolean(state.savedSource);
  const session=sessionOf(options.projection(state));
  const choices=[];
  if(first&&!state.result&&(!saved||state.savedSource.ids.length)){
    const pending=editsFor(state,session);
    while(pending.length&&choices.length<3){
      const choice=pending.shift();
      let changed;
      try {changed=options.answer(state,choice.action);}catch{continue;} // The edit limit may already be reached.
      if(changed.revision===state.revision)continue;
      if(choice.action.type==='remove_time'&&(session.requireKnownRuntime||['runtime','episode'].includes(state.context?.timeMode))){
        const steps=runtimeSteps(changed,options,state.sessionTime.minutes);
        if(steps.length){pending.unshift(...steps);continue;}
      }
      // A shared source can carry several facts. A suggested edit only changes the
      // named condition; it may never erase an independent request or exclusion.
      if(state.facts.some(fact=>fact.key!==choice.action.key&&!(choice.action.type==='allow_unverified_rating'&&pureRatingRequirement(fact))
        &&!changed.facts.some(other=>other.key===fact.key)))continue;
      if(choice.action.type==='remove_fact'&&!choice.action.key.startsWith('context:')){
        if(JSON.stringify(state.context)!==JSON.stringify(changed.context))continue;
        const rules=criteriaOf(options.projection(state));
        const rule=rules.find(row=>row.key.startsWith('fact:'+choice.action.key+':'));
        const retained=new Set(criteriaOf(options.projection(changed)).map(row=>row.key));
        if(!rule||retained.has(rule.key)||rules.some(row=>row!==rule&&!retained.has(row.key)))continue;
      }
      if(!matchingItems(changed,options).next().done)choices.push(choice);
    }
  }
  let message;
  if(kind==='title-lookup')message='В каталоге не удалось подтвердить предложенные названия с учётом твоих условий.'+(first?'':' Предыдущие карточки остались на месте.');
  else if(!first)message=saved?'В списке сохранённых больше не нашлось подходящих вариантов. Предыдущие карточки остались на месте.':'Других подходящих вариантов пока не нашлось. Предыдущие карточки остались на месте.';
  else if(saved&&!state.savedSource.ids.length)message='В списке сохранённых больше нет произведений этого раздела. Можно выбрать другой список в библиотеке.';
  else if(session.verifiedAge)message='В каталоге нет подтверждённой возрастной маркировки. Если дело в содержании, укажи, каких сцен или слов хочется избежать.';
  else if(kind==='checked')message='У каждого проверенного варианта хотя бы одно условие не совпало или осталось под вопросом.';
  else message=saved?'В выбранном списке сохранённых не нашлось вариантов с подтверждёнными условиями.':'В каталоге не нашлось вариантов по этим условиям.';
  const theme=first&&!saved&&!choices.length&&state.facts.find(f=>f.scope==='today'&&['want','require'].includes(f.stance)&&groundedTheme(state,f));
  const hint=theme?`В уточнении можно указать, что оставить главным. Например, «Хочу сохранить условие „${theme.quote}“. Остальные темы могут быть другими».`:null;
  return {kind,message,choices,...(hint?{hint}:{})};
}
