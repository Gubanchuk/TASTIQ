// Two catalog signals for a present-tense wish in the offline film picker.
// A short noun phrase is a valid answer to the direction question. Keep its
// syntax narrow so a title, a quote or someone else's experience stays opaque.
const wishPrefix=/^(?:(?:я|мне|сегодня|теперь|сейчас|хочу|хочется|нужен|нужно|посмотреть|что-нибудь|что-то|фильм|кино|истори[юя]|л[её]гк(?:ое|ий|ую|ого)|вес[её]л(?:ое|ый|ую)|смешн(?:ое|ой|ую)|приключени[ея])\s+)*$/iu;
const uncertainOrPast=/[«»“”"]|(?:^|\s)(?:если|может|возможно|раньше|вчера|прежде|прошл\p{L}*|смотрел\p{L}*|посмотрел\p{L}*|понрав\p{L}*|надоел\p{L}*|устал\p{L}*|разонрав\p{L}*|или|либо|например|неважно|необязательно)(?!\p{L})|(?:пока\s+)?не\s+(?:знаю|уверен|важно|обязательно|нуж\p{L}*|интерес\p{L}*)/iu;
const adventure={mention:/приключени\p{L}*/iu,wish:/(?<!\p{L})приключени[ея](?!\p{L})/iu};
const humour={mention:/юмор\p{L}*/iu,wish:/(?<!\p{L})с\s+юмором(?!\p{L})/iu};

function evidence(state,signal){
 let active=null;
 for(const turn of state.turns??[]){
  if(turn?.kind!=='answer'||turn.superseded)continue;
  const question=turn.question?.id??turn.questionId;
  if(typeof question!=='string')continue;
  if(question!=='direction'&&question!=='experience'&&!question.startsWith('correction:'))continue;
  const answer=turn.text??turn.answer;
  if(typeof answer!=='string')continue;
  for(const clause of answer.trim().split(/[.;!?]/u)){
   const text=clause.trim();
   const mention=signal.mention.exec(text);
   if(!mention)continue;
   if(uncertainOrPast.test(text))continue;
   if(/(?:^|\s)(?:не\s+(?:хочу|хочется|нужно|надо)|без)(?:\s|$)/iu.test(text.slice(0,mention.index))
     ||/(?:^|\s)не\s+(?:хочу|хочется|надо)(?!\p{L})/iu.test(text.slice(mention.index))){
    active=null;continue;
   }
   const match=signal.wish.exec(text);
   if(!match||!wishPrefix.test(text.slice(0,match.index)))continue;
   const removed=state.retractions?.some(r=>r.sourceId===turn.id&&r.kind!=='session_time'&&r.kind!=='context'
    &&(r.quote?.toLowerCase().includes(match[0].toLowerCase())||r.feature==='humor.funny'&&signal===humour));
   if(!removed)active=match[0];
  }
 }
 return active;
}

export function filmPreviewSession(state,session){
 if(state.domain!=='film')return session;
 const genre=evidence(state,adventure),funny=evidence(state,humour);
 const knownFunny=[...(session.goalWants??[]),...(session.goalAvoids??[]),...(session.goalExcludes??[])].some(x=>x.f==='humor.funny');
 return {...session,...(genre?{genreWants:[...new Set([...(session.genreWants??[]),'Adventure'])]}:{}),
  ...(funny&&!knownFunny?{goalWants:[...(session.goalWants??[]),{f:'humor.funny',evidence:funny}]}:{})};
}
