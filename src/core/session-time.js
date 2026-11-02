// A small deterministic grammar for explicit available session time, not general text extraction.
const hour='(?:hours?|hrs?|hr|h|час(?:а|ов)?|ч)';
const minute='(?:minutes?|mins?|min|m|минут(?:а|ы)?|мин)';
const amount=new RegExp(`(?<!\\p{L})(?:полтора\\s+часа|полчаса|часа?)(?!\\p{L})|(?<!\\d)(?:\\d{1,4}\\s*${hour}(?:\\s*(?:и\\s+)?\\d{1,3}\\s*${minute})?|\\d{1,4}\\s*${minute})(?![\\p{L}\\p{N}])`,'giu');
const hoursAndMinutes=new RegExp(`^(\\d{1,4})\\s*${hour}(?:\\s*(?:и\\s+)?(\\d{1,3})\\s*${minute})?$`,'iu');
const onlyMinutes=new RegExp(`^(\\d{1,4})\\s*${minute}$`,'iu');
const surrounding=new Set(['сегодня','сейчас','у','меня','есть','всего','только','свободных','свободного','времени','могу','поиграть','играть','на','одну','сессию','для','игры','вечером','этим','вечер','максимум','не','больше']);

function isCurrentTimeQuestion(question) {
 const title=String(question?.title??'').toLowerCase().replace(/ё/g,'е');
 return /сегодня|сейчас/.test(title)&&/времени|минут|час/.test(title)
   &&/есть|доступн|свободн|располага|можешь\s+(?:поиграть|играть)|можно\s+(?:поиграть|играть)/.test(title)
   &&!/прохожден|всю игру|всей игры|прошл|раньше|вчера|потратил|провел|успел|ушло|длил|установк/.test(title);
}

function timeSuffix(quote,after) {
 // A later standalone preference is not a condition on the time sentence.
 // Keep immediately dependent follow-ups even when the quote includes the full stop.
 let sameSentence='',next=after;
 if(!/[.!?;]\s*$/u.test(quote)) {
  const end=after.search(/[.!?;]/u);
  if(end<0)return after;
  sameSentence=after.slice(0,end);next=after.slice(end+1);
 }
 next=next.trimStart();
 const dependent=/^(?:если|но|а|однако|хотя|правда|точнее|может|возможно|наверн\p{L}*|при\s+условии|это|теперь|сейчас|уже|или|до|времени|не\s+(?:получится|могу|будет))(?:\s|[,;:—–-]|$)/iu.test(next);
 return sameSentence+(dependent?' '+next.split(/[.!?;]/u)[0]:'');
}

export function currentSessionMinutes(quote,question=null) {
 if(typeof quote!=='string')return null;
 const text=quote.toLowerCase().replace(/ё/g,'е'),matches=[...text.matchAll(amount)];
 if(matches.length!==1)return null;
 const match=matches[0],duration=match[0];let minutes;
 if(duration==='полчаса')minutes=30;
 else if(duration==='полтора часа')minutes=90;
 else if(/^часа?$/u.test(duration))minutes=60;
 else {
  const hm=duration.match(hoursAndMinutes),mm=duration.match(onlyMinutes);
  if(hm){if(hm[2]!=null&&Number(hm[2])>59)return null;minutes=Number(hm[1])*60+Number(hm[2]??0);}
  else if(mm)minutes=Number(mm[1]);
  else return null;
 }
 if(!Number.isInteger(minutes)||minutes<5||minutes>1440)return null;
 const rest=text.slice(0,match.index)+' '+text.slice(match.index+duration.length);
 const words=rest.match(/\p{L}+|\p{N}+|[^\s]/gu)??[];
 if(words.some(word=>!surrounding.has(word)&&!/[.,:;!?—–-]/u.test(word)))return null;
 if(words.includes('не')&&!/не\s+больше/u.test(rest)||words.includes('больше')&&!/не\s+больше/u.test(rest))return null;
 const current=words.some(w=>['сегодня','сейчас','есть'].includes(w))
   ||words.includes('могу')&&words.some(w=>['поиграть','играть'].includes(w))
   ||words.includes('на')&&words.includes('сессию')
   ||isCurrentTimeQuestion(question);
 return current?minutes:null;
}

export function validateSessionTime(value,state) {
 if(value==null)return {time:null};
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3
   ||!Number.isInteger(value.minutes)||value.minutes<5||value.minutes>1440
   ||typeof value.sourceId!=='string'||!value.sourceId||value.sourceId.length>100
   ||typeof value.quote!=='string'||!value.quote.trim()||value.quote.length>400)
   return {error:'Не удалось проверить время сегодняшней сессии.'};
 const source=state.turns?.find(t=>t.id===value.sourceId&&!t.superseded),quote=value.quote.trim();
 if(!source||!source.answer.includes(quote))return {error:'Время не подтверждено точной цитатой действующего ответа.'};
 if(isSessionTimeSourceRetracted(value.sourceId,state))return {error:'Это ограничение времени уже снято тобой.'};
 if(currentSessionMinutes(quote,source.question)!==value.minutes)return {error:'Не удалось подтвердить указанное число минут именно для сегодняшней сессии.'};
 // A bare answer is safe only as the whole answer to a current-time question.
 // Do not let a convenient subquote omit its original uncertainty or range.
 if(currentSessionMinutes(quote)===null&&source.answer.trim()!==quote)return {error:'Цитата времени не сохраняет условия исходного ответа.'};
 const start=source.answer.indexOf(quote),before=source.answer.slice(0,start).split(/[.!?;]/u).at(-1)??'',after=source.answer.slice(start+quote.length);
 const afterBudget=timeSuffix(quote,after).split(/[,.!?;]\s*(?:а\s+|но\s+)?(?:хочу|нужн|предпочита|важн|игра)/iu)[0];
 if(/если|может|возможно|наверн|не знаю|не уверен|примерно|около|не\s+(?:будет|могу|есть|хочу)|(?:вчера|раньше).*?(?:говор|дум|сказ)/iu.test(before)
   ||/если|при условии|может|возможно|наверн|(?:но|это).*?(?:вчера|раньше).*?(?:дум|говор|сказ)|(?:теперь|сейчас|уже)\s+(?:уже\s+)?(?:нет|не\s+(?:будет|могу|получится))|не\s+(?:получится|могу)\s+(?:поиграть|играть)|не\s+будет\s+времени|(?:это|время|бюджет)\s+(?:уже\s+)?неактуальн/iu.test(afterBudget)
   ||/^[\s,;:]*(?:[-–—]\s*(?:\d|час|пол)|(?:до|или)\s*(?:\d|час|пол))/iu.test(afterBudget))return {error:'Цитата времени не сохраняет условия исходного ответа.'};
 return {time:{minutes:value.minutes,sourceId:value.sourceId,quote}};
}

export function isSessionTimeSourceRetracted(sourceId,state) {
 const sourceIndex=state.turns?.findIndex(t=>t.id===sourceId)??-1;
 return Boolean(state.retractions?.some(r=>{
  if(r.kind!=='session_time')return false;
  if(r.sourceId===sourceId)return true;
  const cutoff=state.turns?.findIndex(t=>t.id===r.at)??-1;
  return cutoff>=0&&sourceIndex>=0&&sourceIndex<=cutoff;
 }));
}

export function isSessionTimeFact(fact,state) {
 if(fact?.feature!=null||fact?.gameId!=null||typeof fact?.quote!=='string')return false;
 const source=state.turns?.find(t=>t.id===fact.sourceId&&!t.superseded);
 const textTime=currentSessionMinutes(fact.text,fact.scope==='today'?{title:'Сколько времени есть сегодня?'}:null);
 return Boolean(source?.answer.includes(fact.quote))&&(currentSessionMinutes(fact.quote,source.question)!==null||textTime!==null);
}
