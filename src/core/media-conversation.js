import {initialConversation,initialDirectionQuestion,hasDirectionChoice,hasChosenDirection,directionChoiceMessage} from '../server/public/shared/conversation-entry.js';
// Separate media adapter: today's evidence never silently becomes permanent taste.
import { initialState } from './dialogue.js';
import { validateSessionTime, currentSessionMinutes, isSessionTimeSourceRetracted } from './session-time.js';
import { SELECTION_TURN_LIMIT,normalizeSelectionInterview,restartSelectionDepth,changeSelectionDepth,interviewQuestionFields,
  canOfferInterviewQuestion,rememberInterviewQuestion,skippedInterviewQuestions,chooseInterviewQuestion,interviewCheckpoint,reviewAtInterviewCapacity } from './selection-dialogue.js';

import {animeRequestOptions} from './anime-request.js';
import {invalidSavedSource,normalizeSavedSource,savedSourceKey} from './saved-source.js';

const domains = ['film','series','cartoon','anime'];
const controls = ['unknown','indifferent','none'];
const neutral = {unknown:'Пока не знаю',indifferent:'Не принципиально',none:'Ни один вариант не подходит'};
const stances = ['want','avoid','require','exclude','indifferent','unknown','conditional','history'];
const factFields = ['key','text','stance','scope','sourceId','quote','feature','titleId','exposure','titleIntent'];
const fields = ['company','childAge','timeMode','commitment','onlyEnded','format'];
const values = {company:['solo','adults','children'],timeMode:['runtime','episode','session'],commitment:['single','short','long','open'],format:['movie','episodic']};
const blankContext = () => ({company:null,childAge:null,minutes:null,timeMode:null,commitment:null,onlyEnded:null,format:null});
const blankEvidence = () => Object.fromEntries(fields.map(k=>[k,null]));
const retractionLimit = 64;
const clearedByEditor = 'Условия просмотра сняты';
const clean = (v,max=1600) => typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const fail = message => Object.assign(Error(message),{status:400});
const object = v => v&&typeof v==='object'&&!Array.isArray(v);
const text = (v,max) => typeof v==='string'&&v.length<=max&&Boolean(v.trim());
const exactKeys = (v,keys) => object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const q = (id,title,options=[],why='') => ({id,title,options:options.map(([id,label])=>({id,label})),why,multiple:true,controls:[...controls]});
const endedOptions=[['yes','Только полностью законченный сериал'],['any','Ещё выходящий сериал тоже подходит']];
const endedUncertainty='Пока неясно, нужен ли полностью завершённый сериал или достаточно законченной истории.';
const seriesUncertainty='Число сезонов, общая длительность и статус сериала могут отсутствовать в каталоге.';
const seriesContext=s=>s.context?.format!=='movie'&&(s.domain==='series'||s.context?.format==='episodic'||s.context?.onlyEnded!=null);
const scopedUncertainties=(s,list)=>seriesContext(s)?list:list.filter(text=>text!==seriesUncertainty);
const endedQuestion=()=>({...q('only_ended','Сериал должен быть полностью закончен?',endedOptions,'У сериала может быть законченная сюжетная линия, пока новые сезоны ещё выходят.'),multiple:false});
const isEndedQuestion=value=>value?.id==='only_ended'&&value.options?.length===2&&endedOptions.every(([id,label])=>value.options.some(o=>o.id===id&&o.label===label));
const direction = initialDirectionQuestion;
const cards = result => [result?.top,...(result?.alternatives??[])].filter(Boolean);
function ids(value,max=500) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>max||value.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(id)))throw fail('Некорректные отметки знакомых произведений.');
  return [...new Set(value)];
}
const emptyFamiliar = () => ({marked:[],keep:[],hidden:[],excluded:[],undo:null});
function replacement(value) {
  if(value==null)return null;
  if(!object(value))throw fail('Не удалось прочитать замену вариантов.');
  return {changedIds:ids(value.changedIds,4),unresolvedIds:ids(value.unresolvedIds,4),notice:clean(value.notice,240),...(value.pendingIds?{pendingIds:ids(value.pendingIds,4)}:{})};
}
function validResult(value) {
  if(value==null)return null;
  if(!object(value)||!object(value.top)||typeof value.top.id!=='string'||!Array.isArray(value.alternatives)||cards(value).length>4
    ||cards(value).some(c=>!object(c)||typeof c.id!=='string')||new Set(cards(value).map(c=>c.id)).size!==cards(value).length)throw fail('Не удалось прочитать варианты.');
  return structuredClone(value);
}
function familiar(value) {
  const f=value??emptyFamiliar();if(!object(f))throw fail('Некорректные отметки знакомства.');
  const out={marked:ids(f.marked,4),keep:ids(f.keep),hidden:ids(f.hidden),excluded:ids(f.excluded),undo:null};
  if(f.undo)out.undo={result:validResult(f.undo.result),marked:ids(f.undo.marked,4),keep:ids(f.undo.keep),hidden:ids(f.undo.hidden),replacement:replacement(f.undo.replacement)};
  return out;
}
function validateContext(value) {
  if(!object(value)||Object.keys(value).some(k=>!Object.hasOwn(blankContext(),k)))throw fail('Некорректные условия просмотра.');
  const out={...blankContext(),...value};
  for(const [key,allowed] of Object.entries(values))if(out[key]!==null&&!allowed.includes(out[key]))throw fail('Некорректные условия просмотра.');
  if(out.childAge!==null&&(!Number.isInteger(out.childAge)||out.childAge<0||out.childAge>17||out.company!=='children'))throw fail('Возраст ребёнка доступен только при просмотре с детьми.');
  if(out.minutes!==null&&(!Number.isInteger(out.minutes)||out.minutes<5||out.minutes>1440))throw fail('Проверь количество минут: от 5 до 1440.');
  if(out.onlyEnded!==null&&typeof out.onlyEnded!=='boolean')throw fail('Проверь условие законченного сериала.');
  return out;
}
function checkedQuestion(value,{planner=false}={}) {
  if(!object(value)||!text(value.id,100)||!text(value.title,220)||typeof value.why!=='string'||value.why.length>220
    ||typeof value.multiple!=='boolean'||!Array.isArray(value.options)||value.options.length>(!planner&&value.id==='direction'?20:6)
    ||value.options.some(o=>!object(o)||!text(o.id,100)||!text(o.label,100))
    ||new Set(value.options.map(o=>o.id)).size!==value.options.length||!Array.isArray(value.controls)||value.controls.some(v=>!controls.includes(v)))throw fail('Не удалось подготовить вопрос.');
  if(planner&&(!exactKeys(value,['id','title','why','options','multiple','controls'])||value.controls.length!==3||new Set(value.controls).size!==3
    ||value.options.some(o=>!exactKeys(o,['id','label']))))throw fail('Некорректная форма вопроса.');
  return {id:value.id,title:value.title,why:value.why,options:value.options.map(o=>({id:o.id,label:o.label})),multiple:value.multiple,controls:[...value.controls],...(value.allowText===false?{allowText:false}:{}),...(!planner?interviewQuestionFields(value):{})};
}
function sourceFor(s,value) {
  if(!object(value)||!text(value.sourceId,100)||!text(value.quote,400))throw fail('Не удалось проверить источник вывода.');
  const source=s.turns.find(t=>t.id===value.sourceId&&!t.superseded);
  if(!source||!source.answer.includes(value.quote))throw fail('Вывод не подтверждён точной цитатой действующего ответа.');
  return source;
}
const retractedContext = (s,key,sourceId) => s.retractions.some(r=>r.kind==='context'&&r.key===key&&(r.sourceId===sourceId
  ||s.turns.findIndex(t=>t.id===sourceId)<=s.turns.findIndex(t=>t.id===r.at)));

// An editor clear already covers every earlier source of the same field. Keep
// the newest such cutoff. Removals of individual facts carry separate evidence.
function compactEditorClears(s) {
  const position=new Map(s.turns.map((turn,index)=>[turn.id,index]));
  const latest=new Map(),covered=new Set();
  for(const r of s.retractions) {
    if(r.quote!==clearedByEditor||!position.has(r.at))continue;
    const key=r.kind==='session_time'?'minutes':r.kind==='context'&&fields.includes(r.key)?r.key:null;
    if(!key||(position.get(r.sourceId)??-1)>position.get(r.at))continue;
    const previous=latest.get(key);
    if(previous&&position.get(previous.at)>position.get(r.at))covered.add(r);
    else {if(previous)covered.add(previous);latest.set(key,r);}
  }
  s.retractions=s.retractions.filter(r=>!covered.has(r));
  if(s.retractions.length>retractionLimit)throw fail('Слишком много исправлений. Начни новый подбор.');
}
const folded = s => s.toLowerCase().replace(/ё/g,'е');
const conditional = s => /если|может быть|возможно|наверн|не знаю|не уверен|примерно|около/iu.test(s);
function contextEvidenceAllowed(quote,source) {
  if(source.kind!=='answer'||conditional(quote))return false;
  const start=source.answer.indexOf(quote),before=source.answer.slice(0,start).split(/[.!?;]/u).at(-1)??'',after=source.answer.slice(start+quote.length).split(/[.!?;]/u)[0];
  if(conditional(before)||/\bне\s*$/iu.test(before)||/(?:^|\s)не\s*$/iu.test(before)||/^\s*[,;:]?\s*(?:если|при условии)/iu.test(after))return false;
  if(/не\s+(?:хочу|готов|нуж(?:ен|на|но|ны)|собираюсь|буду)\s*$/iu.test(before)
    ||/не\s+(?:хочу|готов|нуж(?:ен|на|но|ны)|собираюсь|буду)\s+(?:(?:на|только|полностью|коротк\p{L}*)\s+)*(?:закончен|завершен)/iu.test(quote))return false;
  return true;
}
function explicitEndedSeries(quote,source) {
  if(!contextEvidenceAllowed(quote,source))return false;
  const t=folded(quote);
  if(/необязательно|не\s+(?:только|закончен|завершен)/u.test(t))return false;
  // Adjective→series or series→predicate are structural evidence. Merely finding
  // both words in a quote would confuse 'законченная история в сериале' with this.
  return /(?<!\p{L})(?:закончен|завершен)\p{L}*\s+(?:мини[- ]?)?сериал(?:а|ы|ов|у|ом|е)?(?!\p{L})/u.test(t)
    ||/(?<!\p{L})сериал(?:ы)?(?!\p{L})\s*[,—–-]?\s*(?:котор(?:ый|ые)\s+)?(?:(?:уже|полностью|давно|окончательно)\s+)*(?:закончен|завершен)\p{L}*/u.test(t);
}
function completedStory(quote,source) {
  const t=folded(quote);
  return contextEvidenceAllowed(quote,source)&&!explicitEndedSeries(quote,source)
    &&(/(?<!\p{L})(?:закончен|завершен)\p{L}*\s+(?:сюжетн\p{L}*\s+)?(?:истори|сюжет|арк)\p{L}*/u.test(t)
      ||/(?<!\p{L})(?:истори|сюжет|арк)\p{L}*\s+(?:(?:уже|полностью)\s+)*(?:закончен|завершен)\p{L}*/u.test(t));
}
const mediaDescriptor=String.raw`(?:добр|легк|детективн|комедийн|приключенческ|фантастическ|историческ|романтическ|драматическ|криминальн|полицейск|шпионск|анимационн|мультипликационн|смешн|весел|мрачн|законченн|завершенн)`;
const mediaModifiers=String.raw`(?:(?:и\s+)?${mediaDescriptor}\p{L}*\s*,?\s+){0,4}`;
const moviePhrase=String.raw`${mediaModifiers}(?:полнометражн\p{L}*\s+)?${mediaModifiers}(?:мульт)?фильм(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?!\p{L})`;
const movieRequestPattern=new RegExp(String.raw`(?<!\p{L})(?:нуж(?:ен|на|но)|хочу|только)\s+(?:од(?:ин|ну)\s+)?${moviePhrase}`,'u');
const singleMoviePattern=new RegExp(String.raw`(?<!\p{L})од(?:ин|ну)\s+${moviePhrase}`,'u');
const movieRequest=quote=>movieRequestPattern.test(folded(quote));
const seriesRequestPattern=new RegExp(String.raw`(?<!\p{L})(?:нуж(?:ен|на|но)|хочу|только)\s+(?:од(?:ин|ну)\s+)?${mediaModifiers}(?:мини[- ]?)?сериал(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?!\p{L})`,'u');
function formatAlternatives(quote,source) {
  const start=source.answer.indexOf(quote),before=source.answer.slice(0,start).split(/[.!?;]/u).at(-1)??'',after=source.answer.slice(start+quote.length).split(/[.!?;]/u)[0];
  const clause=folded(before+quote+after);
  return /(?:или|либо)/u.test(clause)&&/(?:мульт)?фильм/u.test(clause)&&/сериал|эпизод/u.test(clause)
    ||/(?:но|а)\s+(?:фильм|сериал).*(?:тоже|также|подойдет|можно)/u.test(clause);
}
function movieEvidence(quote,source) {
  return contextEvidenceAllowed(quote,source)&&/(?:мульт)?фильм|полнометраж/u.test(folded(quote))
    &&!formatAlternatives(quote,source)
    &&!/(?:не\s+(?:нуж(?:ен|на|но)|хочу|буду)|без|вместо)\s+.*(?:фильм|полнометраж)|не\s+(?:фильм|мультфильм|полнометраж)|(?:или|либо)\s+(?:сериал|эпизод)/u.test(folded(quote));
}
function seriesEvidence(quote,source) {
  return contextEvidenceAllowed(quote,source)&&/сериал|эпизод|серии|серию/u.test(folded(quote))&&!formatAlternatives(quote,source)
    &&!/(?:не\s+(?:нуж(?:ен|на|но)|хочу|буду)|без|вместо)\s+.*(?:сериал|эпизод)|не\s+(?:сериал|эпизод)/u.test(folded(quote));
}
function requestedFormatFact(f) {
  if(f.scope!=='today'||!['want','require'].includes(f.stance)||f.titleId!==null||![null,'format.animation'].includes(f.feature))return null;
  return movieRequest(f.quote)?'movie':seriesRequestPattern.test(folded(f.quote))?'episodic':null;
}
function directFormatSource(format,quote,source) {
  const match=(format==='movie'?movieRequestPattern:seriesRequestPattern).exec(folded(quote));if(!match)return false;
  const before=source.answer.slice(0,source.answer.indexOf(quote)+match.index).split(/[.!?;]/u).at(-1)??'';
  // This omission fallback does not assign the speaker of a quoted/history sentence.
  return !/[«“„"]\s*$/u.test(before)&&!/синопсис|описани|персонаж|герой|раньше|тогда|в детстве/iu.test(before);
}
// Bound the intervening words to media descriptors: adjective endings alone
// also match nouns like "description", which may refer to a long series.
const shortStoryPattern=new RegExp(String.raw`(?<!\p{L})(?:коротк\p{L}*\s*,?\s+${mediaModifiers}(?:истори(?:я|ю|и|ей|й|ями|ях)|(?:мини[- ]?)?сериал(?:а|у|ом|е|ы|ов|ам|ами|ах)?)|мини[- ]?сериал(?:а|у|ом|е|ы|ов|ам|ами|ах)?|ненадолго)(?!\p{L})`,'u');
function shortStoryEvidence(quote) {
  const t=folded(quote),match=t.match(shortStoryPattern);if(!match)return false;
  const before=t.slice(0,match.index).split(/[.!?;,]/u).at(-1)??'';
  return !/(?:^|\s)(?:не(?:\s+(?:хочу|нужен|нужна|нужны|буду|смотреть|только|очень|слишком)){0,3}|без)\s*$/u.test(before);
}
const spelledFilmHours=new Map([
  ['одного часа',60],['полутора часов',90],['двух часов',120],['два часа',120],['двух с половиной часов',150],['два с половиной часа',150],['трех часов',180],['три часа',180],
]);
const filmCapStart=/(?<![\p{L}\p{N}])(?:до|не\s+(?:больше|более|дольше)|максимум)\s+(?=\d|час|пол|одного|двух|два|тр[её]х|три)/giu;
// In the film section, an explicit upper cap at the end of a viewing clause
// can omit the word «фильм». Keep the original quote and inspect its surroundings.
function filmCapMinutes(quote,source) {
  if(!contextEvidenceAllowed(quote,source))return null;
  const [cap,conflict]=quote.matchAll(filmCapStart);
  if(!cap||conflict)return null;
  const clause=quote.replace(/[.!?;,]+$/u,'').trimEnd();
  const duration=folded(clause.slice(cap.index+cap[0].length)).trim();
  const quoteAt=source.answer.indexOf(quote),start=quoteAt+cap.index,end=quoteAt+clause.length;
  const before=folded(source.answer.slice(0,start).split(/[.!?;]/u).at(-1)??'');
  const [after,next='']=folded(source.answer.slice(end)).split(/[.!?;]/u,2);
  if(conditional(`${before} ${after}`)||/(?:^|\s)(?:вчера|раньше|тогда|днем|прошл\p{L}*|(?:по)?смотрел\p{L}*|от\s+\d|от\s+(?:часа|одного|полутора|двух|трех))|(?<!\p{L})не\s+(?:хочу|нуж|буду|надо|могу)/u.test(before)
    ||/^\s*[,–—-]?\s*(?:дня|ночи|утра|вечера|или|либо|до|а\s+может|колебл)/u.test(after)
    ||/^\s*(?:но|а|теперь|сейчас|уже|если).*?(?:времени\s+нет|времени\s+не\s+будет|не\s+актуальн|лимита\s+нет|не\s+получится)/u.test(next)
    ||after.trim()&&!/^\s*(?:,|и\s+без)/u.test(after))return null;
  return spelledFilmHours.get(duration)??currentSessionMinutes(`Сегодня есть ${duration}`);
}

// Recover only one explicit upper bound. Quoted evidence must still pass the
// same exact-source checks as a proposed film runtime after restore.
function explicitViewingCap(turn,domain='film',saved=false) {
  const [cap,conflict]=turn.text.matchAll(filmCapStart);
  if(!cap||conflict)return null;
  const at=cap.index;
  const before=folded(turn.text.slice(0,at).split(/[.!?;]/u).at(-1));
  const subject=before.split(',').at(-1);
  if(/(?:необязательно|не\s+обязательно|не\s+только|(?:^|\s)не)\s*$/u.test(before)
    ||/(?:желательно|хорошо\s+бы|лучше\s+бы|в\s+идеале|предпочтительно)/u.test(before)
    ||/(?<!\p{L})(?:про|игр[ауы]|дорог[ауие]|доставк[ауие]|поездк[ауие]|перерыв\p{L}*)\s/u.test(subject)
    ||!currentViewingEvidence(cap[0],turn))return null;
  if(/(?:лимит\p{L}*|ограничени\p{L}*)(?:\s+по\s+(?:времени|длительности))?\s+нет|(?:можно|могу|подойд[её]т)\s+(?:и\s+)?(?:дольше|длиннее)|(?:время|длительность)\s+не\s*важн|без\s+(?:лимита|ограничени[йя])\s+по\s+(?:времени|длительности)/iu.test(turn.text))return null;
  const quote=turn.text.slice(at).split(/[.!?;,]|\s+и\s+без\s/iu)[0].trim();
  const minutes=filmCapMinutes(quote,turn);
  const episode=/(?<!\p{L})(?:эпизод\p{L}*|сери[яиюй])(?!\p{L})/u.test(before);
  const movie=/(?:мульт)?фильм|полнометраж|полный метр/u.test(before);
  const evening=/(?:на\s+весь\s+вечер|на\s+(?:весь\s+)?(?:просмотр|сеанс)|(?:всего\s+)?времени|в\s+распоряжении|сегодня|сейчас|(?:могу|можем)\s+(?:по)?смотреть)(?:\s+у\s+(?:меня|нас))?(?:\s+(?:есть|осталось|всего|свободно)){0,2}\s*[,—–-]?\s*$/u.test(before);
  if(domain==='film'&&episode||domain==='series'&&movie||episode&&movie&&!evening)return null;
  if(!saved&&/(?<!\p{L})(?:сериал\p{L}*|эпизод\p{L}*|сери[яиюй])\s/u.test(subject))return null;
  const mode=saved&&evening?'session':episode||domain==='series'?'episode':movie||domain==='film'?'runtime':'session';
  return minutes===null?null:{mode,time:{minutes,quote,sourceId:turn.id}};
}

function currentViewingEvidence(quote,turn){
  const start=turn.answer.indexOf(quote),end=start+quote.length;
  const before=turn.answer.slice(0,start).split(/[.!?;]/u).at(-1)??'';
  const evidence=folded(before+quote);
  if(/[«“„"]/u.test(quote)||[...turn.answer.matchAll(/«[^»]*(?:»|$)|[“„][^”]*(?:”|$)|"[^"]*(?:"|$)/gu)].some(m=>m.index<end&&m.index+m[0].length>start))return false;
  return !conditional(evidence)&&!/(?:^|\s)(?:раньше|вчера|тогда|в\s+детстве|любил\p{L}*|(?:по)?смотрел\p{L}*|сказал\p{L}*|говорил\p{L}*|персонаж|герой|цитата|не\s+(?:хочу|нуж\p{L}*|буду)|вместо)(?!\p{L})/u.test(evidence);
}

function contextMeaning(key,value,quote,source,domain,saved=false) {
  if(source.question.id==='context'&&Object.hasOwn(source.context??{},key))return source.context[key]===value&&quote===contextQuote(key,value)
    &&source.contextQuotes?.[key]===quote;
  if(!contextEvidenceAllowed(quote,source))return false;
  const t=folded(quote);
  if(saved&&key==='timeMode'){
    const cap=explicitViewingCap(source,domain,true);
    if(cap&&quote.includes(cap.time.quote))return value===cap.mode;
  }
  if(key==='company') {
    if(saved&&value==='adults'&&/^(?:теперь\s+)?(?:только\s+)?без\s+детей$/u.test(t))return true;
    if(saved&&value==='children'&&/(?<!\p{L})ребенку\s+\d{1,2}\s+(?:лет|года?)(?!\p{L})/u.test(t))return true;
    if(value==='children')return !/без (?:дет|ребен)|не\s+(?:с|для)\s+(?:дет|ребен)/u.test(t)&&/(?:с|для)\s+(?:детьми|детей|ребенком|ребенка|сыном|дочерью)|детям/u.test(t);
    if(value==='solo')return /(?:смотр\p{L}*\s+)?(?:один|одна|в одиночку)|для себя|для\s+(?:одного взрослого|одной взрослой)/u.test(t)
      &&!/не\s+(?:один|одна|для\s+(?:одного взрослого|одной взрослой))/u.test(t);
    return /вдвоем|взросл|с (?:друзьями|партнером|партнершей|девушкой|женой|мужем)|компанией/u.test(t)&&!/не\s+(?:вдвоем|со?\s)/u.test(t);
  }
  if(key==='childAge') {
    if(/^\d{1,2}$/u.test(t)&&Number(t)===value&&source.answer.trim()===quote&&/возраст|сколько.*лет|лет.*ребен/u.test(folded(source.question.title)))return true;
    const matches=[...t.matchAll(/(?<!\d)(\d{1,2})\s*(?:лет|года?|годик\p{L}*)/gu)];
    return matches.length===1&&Number(matches[0][1])===value&&(/ребен|сын|доч|дет|ему|ей/u.test(t)||/возраст|сколько.*лет|лет.*ребен/u.test(folded(source.question.title)));
  }
  if(key==='timeMode')return value==='episode'?/эпизод|сери[яиюй]/u.test(t):value==='runtime'?/фильм|полнометраж|хронометраж/u.test(t)||domain==='film'&&filmCapMinutes(quote,source)!==null:/сегодня|сейчас|вечер|есть.*(?:минут|час)|могу\s+(?:по)?смотр/u.test(t)||/сегодня.*врем|врем.*сегодня/u.test(folded(source.question.title));
  if(key==='commitment')return value==='single'?/од(?:ин|ну)\s+(?:эпизод|серию)|на один вечер|одним (?:фильмом|вечером)/u.test(t)
    ||singleMoviePattern.test(t)&&movieEvidence(quote,source):value==='short'?shortStoryEvidence(quote):value==='long'?/(?:готов|хочу|можно|не против).*(?:длинн\p{L}*\s+(?:истори|сериал)|много\s+сезон)|надолго/u.test(t):/любая (?:длина|длительность)|длина не важна|длительность не важна|неважно.*(?:сезон|длин)/u.test(t);
  if(key==='onlyEnded') {
    if(isEndedQuestion(source.question))return endedOptions.some(([id,label])=>source.selected?.some(o=>o.id===id&&o.label===label)&&quote===label&&value===(id==='yes'));
    return value?explicitEndedSeries(quote,source)
      :/можно.*(?:выходит|незакончен|продолжа)|необязательно.*закончен|статус не важен/u.test(t);
  }
  if(key==='format')return value==='episodic'?seriesEvidence(quote,source):movieEvidence(quote,source);
  return false;
}

// The editor and the offline path use the same sourced slots. Extract only a
// clear request about this viewing, not a mentioned title, past trip or plot.
function applySavedViewingContext(s,turn){
  let changed=false;
  const assign=(key,value,quote)=>{
    s.context[key]=value;s.contextEvidence[key]=value===null?null:{value,sourceId:turn.id,quote};changed=true;
  };
  for(const raw of turn.text.split(/[.!?;,]/u)){
    const quote=raw.trim(),t=folded(quote);
    if(!quote||quote.length>400||!currentViewingEvidence(quote,turn)||!contextEvidenceAllowed(quote,turn)
      ||/(?<!\p{L})(?:про|например|вроде|желательно|предпочтительно|без\s+ограничений)(?!\p{L})/u.test(t))continue;
    const ended=contextMeaning('onlyEnded',true,quote,turn,s.domain);
    if(ended&&!/(?:не\s+(?:обязательно|нужен|только)|или|либо)/u.test(t))assign('onlyEnded',true,quote);
    else if(contextMeaning('onlyEnded',false,quote,turn,s.domain))assign('onlyEnded',false,quote);
    if(contextMeaning('company','children',quote,turn,s.domain,true)){
      assign('company','children',quote);
      const age=t.match(/(?<!\d)(\d{1,2})\s*(?:лет|года?|годик\p{L}*)/u);
      if(age&&Number(age[1])<=17&&contextMeaning('childAge',Number(age[1]),quote,turn,s.domain,true))assign('childAge',Number(age[1]),quote);
    }else if(/(?:^|(?<!\p{L}))(?:только\s+взрослые|для\s+взрослых|со\s+взрослыми|без\s+детей|для\s+себя|в\s+одиночку|(?:буду\s+)?смотреть\s+(?:один|одна|вдвоем))(?!\p{L})/u.test(t)){
      const company=/для\s+себя|в\s+одиночку|смотреть\s+(?:один|одна)/u.test(t)?'solo':'adults';
      if(!contextMeaning('company',company,quote,turn,s.domain,true))continue;
      assign('company',company,quote);assign('childAge',null,quote);
    }else if(s.context.company==='children'&&/^\d{1,2}$/u.test(t)&&Number(t)<=17&&contextMeaning('childAge',Number(t),quote,turn,s.domain,true))assign('childAge',Number(t),quote);
  }
  return changed;
}
function checkedContext(s,value,{clarify=false}={}) {
  if(!exactKeys(value,fields))throw fail('Неполные условия просмотра.');
  const evidence=blankEvidence(),ctx=blankContext();let clarifyEnded=false;
  for(const key of fields) {
    const v=value[key];if(v===null)continue;
    if(!exactKeys(v,['value','sourceId','quote']))throw fail('Некорректное основание условий просмотра.');
    const source=sourceFor(s,v);
    if(retractedContext(s,key,v.sourceId))throw fail('Это условие не подтверждено действующим ответом или уже снято.');
    if(!contextMeaning(key,v.value,v.quote,source,s.domain,Boolean(s.savedSource))) {
      if(clarify&&key==='onlyEnded'&&v.value===true&&completedStory(v.quote,source)){clarifyEnded=true;continue;}
      throw fail('Это условие не подтверждено действующим ответом или уже снято.');
    }
    ctx[key]=v.value;evidence[key]={...v};
  }
  return {context:validateContext(ctx),evidence,clarifyEnded};
}
// The mature current-session grammar supplies range, uncertainty and cutoff checks.
// Watch verbs are mapped only for parsing; stored and shown evidence stays untouched.
const watchTime = v => String(v).replace(/посмотреть|смотреть|посмотрю/giu,'поиграть');
function correctionMinutes(source,context) {
  if(!source.question.id.startsWith('correction:')||context.timeMode===null)return null;
  const t=folded(source.answer);if(conditional(t))return null;
  const cap=t.match(/^(?:(?:только\s+)?(?:короче|меньше|дольше|длиннее)\s*[,;:]?\s*)?(?:до|не больше|максимум)\s*(.+)$/u);
  return cap?currentSessionMinutes(`Сегодня есть ${cap[1]}`):null;
}
function checkedTime(s,value,ctx) {
  if(value==null)return null;
  if(!exactKeys(value,['minutes','sourceId','quote'])||!Number.isInteger(value.minutes)||value.minutes<5||value.minutes>1440)throw fail('Некорректное время просмотра.');
  const source=sourceFor(s,value);
  const remaining=source.answer.slice(source.answer.indexOf(value.quote)+value.quote.length).split(/[.!?;]/u)[0];
  if(/(?:но|теперь|сейчас|уже).*?(?:времени\s+нет|времени\s+не\s+будет|не\s+актуальн)|не\s+получится\s+(?:по)?смотр/iu.test(remaining))throw fail('Цитата времени потеряла условия ответа.');
  if(source.question.id==='context'&&source.context?.minutes===value.minutes&&value.quote===source.contextQuotes?.minutes&&!isSessionTimeSourceRetracted(value.sourceId,s))return {...value};
  if(s.savedSource&&[...value.quote.matchAll(filmCapStart)].length){
    const cap=explicitViewingCap(source,s.domain,true);
    if(cap?.time.minutes!==value.minutes||cap.mode!==ctx.timeMode||!value.quote.includes(cap.time.quote)||isSessionTimeSourceRetracted(value.sourceId,s))throw fail('Число минут или вид ограничения не подтверждены цитатой.');
    return {...value};
  }
  if(value.quote===source.answer&&correctionMinutes(source,ctx)===value.minutes&&!isSessionTimeSourceRetracted(value.sourceId,s))return {...value};
  if(s.domain==='film'&&ctx.timeMode==='runtime'&&filmCapMinutes(value.quote,source)===value.minutes&&!isSessionTimeSourceRetracted(value.sourceId,s))return {...value};
  const mapped={...s,turns:s.turns.map(t=>({...t,answer:watchTime(t.answer),question:{...t.question,title:watchTime(t.question.title)}}))};
  const checked=validateSessionTime({...value,quote:watchTime(value.quote)},mapped);
  if(!checked.error)return {...value};
  // Explicit runtime caps are different from a whole-series duration or its commitment.
  const t=folded(value.quote),match=t.match(/^(?:(?:хочу|нужен|нужны)\s+)?(?:на\s+)?(фильм|полнометражный фильм|(?:(?:перв(?:ая|ую|ой|ый)|кажд(?:ая|ую|ый)|все)\s+)?(?:эпизод(?:ы)?|сери[яиюй]))\s+(?:по\s+)?(?:не больше|до|максимум)\s+(.+)$/u);
  if(!match||conditional(t)||isSessionTimeSourceRetracted(value.sourceId,s))throw fail(checked.error);
  const expectedMode=/фильм/u.test(match[1])?'runtime':'episode';
  if(ctx.timeMode!==expectedMode||s.domain==='film'&&expectedMode!=='runtime')throw fail('Длина фильма и эпизода должны быть указаны отдельно.');
  if(currentSessionMinutes(`Сегодня есть ${match[2]}`)!==value.minutes)throw fail('Число минут не подтверждено цитатой.');
  const at=source.answer.indexOf(value.quote),before=source.answer.slice(0,at).split(/[.!?;]/u).at(-1),after=source.answer.slice(at+value.quote.length).split(/[.!?;]/u)[0];
  if(conditional(before??'')||conditional(after)||/^\s*(?:[-–—]|или|до)\s*\d/u.test(after)||/не актуальн|времени нет|не получится/u.test(after))throw fail('Цитата времени потеряла условия ответа.');
  return {...value};
}
function checkedFacts(s,list,dict) {
  if(!Array.isArray(list)||list.length>16)throw fail('Некорректное понимание ответа.');
  const seen=new Set();
  return list.map(f=>{
    if(!exactKeys(f,factFields)||!text(f.key,60)||seen.has(f.key)||!text(f.text,240)
      ||!stances.includes(f.stance)||!['today','history'].includes(f.scope)||f.feature!==null&&!dict?.featureById?.has(f.feature)
      ||f.titleId!==null&&!text(f.titleId,100)||![null,'unplayed','started','finished','dropped'].includes(f.exposure)||![null,'return','replay','reference'].includes(f.titleIntent))throw fail('Некорректный вывод о пожелании.');
    seen.add(f.key);const source=sourceFor(s,f);
    if(source.kind!=='answer'&&!source.text&&!['unknown','indifferent'].includes(f.stance))throw fail('Неопределённый ответ не является предпочтением.');
    if(s.retractions.some(r=>!['session_time','context'].includes(r.kind)&&r.sourceId===f.sourceId&&(r.key===f.key||r.quote===f.quote||r.feature&&r.feature===f.feature)))throw fail('Этот вывод уже снят тобой.');
    // Untyped meaning cannot be compared safely by keys or subquotes. After its
    // removal, freeze only the accepted untyped survivors from this source. A new
    // interpretation of any other untyped meaning needs a new explicit answer;
    // independently grounded typed facts remain available.
    if(f.feature===null&&f.titleId===null&&s.retractions.some(r=>r.kind==='untyped_source'&&r.sourceId===f.sourceId
      &&!(r.allowedFacts??[]).some(kept=>factFields.every(key=>kept[key]===f[key]))))throw fail('Новый вывод из этого ответа требует твоего нового уточнения: прежний свободный вывод уже снят.');
    const t=folded(f.quote);
    if(['return','replay'].includes(f.titleIntent)) {
      const before=source.answer.slice(0,source.answer.indexOf(f.quote)).split(/[.!?;]/u).at(-1)??'';
      if(!/(?:хочу|готов|могу|можно|не против|давай|согласен|буду|хотелось бы)\s|(?:вернусь|пересмотрю|досмотрю|продолжу)(?:\s|$)/u.test(t)
        ||/(?:не\s+(?:хочу|буду|готов|могу|собираюсь)|раньше|вчера|когда-то|прежде)/u.test(t)||/(?:не\s*|раньше\s*|вчера\s*)$/iu.test(before))throw fail('Намерение вернуться не подтверждено сегодняшними словами.');
    }
    if(f.titleIntent==='return'&&(!/верну|вернуть|продолж|досмотр/u.test(t)||conditional(t)&&f.stance!=='conditional')
      ||f.titleIntent==='replay'&&!/пересмотр|снова\s+(?:по)?смотр|еще раз\s+(?:по)?смотр/u.test(t))throw fail('Возвращение к произведению требует явного желания.');
    if(['return','replay'].includes(f.titleIntent)&&(f.scope!=='today'||!['want','conditional'].includes(f.stance)||!f.titleId))throw fail('Возвращение должно быть сегодняшним желанием и иметь проверенное название.');
    if(f.exposure!==null&&!f.titleId)throw fail('Знакомство требует проверенного названия.');
    if(f.exposure==='finished'&&!/досмотр|посмотрел|посмотрела|видел|видела|смотрел|смотрела/u.test(t)||f.exposure==='started'&&!/начал|начала|смотрю|начинал/u.test(t)
      ||f.exposure==='dropped'&&!/бросил|бросила|заброс|перестал|не досмотр/u.test(t)||f.exposure==='unplayed'&&!/не (?:видел|видела|смотрел|смотрела|начинал)/u.test(t))throw fail('Статус просмотра не подтверждён твоими словами.');
    if(f.exposure==='finished'&&/не (?:досмотр|посмотр|видел|видела|смотрел|смотрела|до конца)|только (?:начал|перв\p{L}*\s+(?:сери|эпизод)|одн\p{L}*\s+(?:сери|эпизод))|не целиком/u.test(t))throw fail('Начатое или непросмотренное произведение не считается просмотренным.');
    if(isSessionTimeSourceRetracted(f.sourceId,s)&&f.feature===null&&f.titleId===null&&(currentSessionMinutes(watchTime(f.quote),source.question)!==null||/минут|час/u.test(f.text)))throw fail('Это ограничение времени уже снято тобой.');
    return structuredClone(f);
  });
}

export function newMediaConversation({id,domain='film',mode,requireDirection,depth,savedSource}={}) {
  if(!domains.includes(domain))throw fail('Неизвестный раздел просмотра.');
  const state=initialConversation({domain,id:clean(id,100)||undefined,mode,requireDirection,depth});
  if(savedSource!==undefined){state.savedSource=normalizeSavedSource(savedSource,domain);state.savedSourceKey=savedSourceKey(state.savedSource);}
  return state;
}
export function normalizeMediaConversation(input,expectedDomain) {
  if(input==null)return newMediaConversation({domain:expectedDomain??'film'});
  if(!object(input)||input.version!==1||!domains.includes(input.domain)||expectedDomain&&input.domain!==expectedDomain||!text(input.id,100)||!Number.isSafeInteger(input.revision)||input.revision<0
    ||!['guided','free'].includes(input.mode)||!['direction','talk','review','result'].includes(input.phase)||!Array.isArray(input.turns)||input.turns.length>SELECTION_TURN_LIMIT
    ||!Array.isArray(input.facts)||input.facts.length>16||!Array.isArray(input.retractions)||input.retractions.length>retractionLimit+fields.length+1||!Array.isArray(input.uncertainties)||input.uncertainties.length>8
    ||input.uncertainties.some(v=>typeof v!=='string'||v.length>240)||typeof input.summary!=='string'||input.summary.length>1000)throw fail('Сохранённый разговор не удалось прочитать. Начни новый подбор.');
  const s=structuredClone(input),seen=new Set();
  if(Object.hasOwn(s,'savedSource')||Object.hasOwn(s,'savedSourceKey')){
    s.savedSource=normalizeSavedSource(s.savedSource,s.domain);
    const key=savedSourceKey(s.savedSource);
    if(s.savedSourceKey!==key && (Object.hasOwn(s,'savedSourceKey')||s.revision||s.phase!=='direction'||s.turns.length||s.result))throw invalidSavedSource();
    s.savedSourceKey=key;
  }
  normalizeSelectionInterview(s,fail);
  s.skippedQuestions=Array.isArray(s.skippedQuestions)?s.skippedQuestions.filter(id=>typeof id==='string'&&id.length<=100).slice(s.depth?-64:-12):[];
  s.browseSeen=ids(s.browseSeen);s.context=validateContext(s.context);s.contextEvidence=s.contextEvidence??blankEvidence();
  for(const t of s.turns) {
    if(!object(t)||!text(t.id,100)||seen.has(t.id)||typeof t.answer!=='string'||t.answer.length>2400||typeof t.text!=='string'||t.text.length>1600
      ||!['answer',...controls].includes(t.kind)||!Array.isArray(t.selected)||t.selected.length>(t.question?.id==='direction'?20:6)||t.selected.some(o=>!text(o?.id,100)||!text(o?.label,100))
      ||t.supersedes!=null&&(!Array.isArray(t.supersedes)||t.supersedes.length>24||t.supersedes.some(id=>typeof id!=='string'))
      ||t.superseded!=null&&typeof t.superseded!=='boolean')throw fail('Некорректный ответ в истории разговора.');
    seen.add(t.id);t.question=checkedQuestion(t.question);if(t.context)t.context=validateContext(t.context);
  }
  for(const t of s.turns)if(t.acceptedContext!=null||t.acceptedTime!=null) {
    if(!exactKeys(t.acceptedContext,fields))throw fail('Не удалось прочитать сохранённые основания условий.');
    const ctx=blankContext();
    for(const key of fields) {
      const v=t.acceptedContext[key];if(v===null)continue;
      if(!exactKeys(v,['value','sourceId','quote']))throw fail('Некорректные сохранённые основания условий.');
      const source=s.turns.find(source=>source.id===v.sourceId);
      if(!source||!text(v.quote,400)||!source.answer.includes(v.quote)||!contextMeaning(key,v.value,v.quote,source,s.domain,Boolean(s.savedSource)))throw fail('Сохранённое условие не подтверждено ответом.');
      ctx[key]=v.value;
    }
    validateContext(ctx);
    if(t.acceptedTime!=null)checkedTime({...s,retractions:[],turns:s.turns.map(source=>({...source,superseded:false}))},t.acceptedTime,ctx);
  }
  if(s.retractions.some(r=>!object(r)||!text(r.sourceId,100)||r.key!=null&&!text(r.key,100)||r.quote!=null&&!text(r.quote,400)||r.at!=null&&!text(r.at,100)))throw fail('Некорректные снятые условия.');
  compactEditorClears(s);
  for(const r of s.retractions)if(r.kind==='untyped_source') {
    const source=s.turns.find(t=>t.id===r.sourceId);
    if(!Array.isArray(r.allowedFacts)||r.allowedFacts.length>16||r.allowedFacts.some(f=>!exactKeys(f,factFields)||f.feature!==null||f.titleId!==null||f.sourceId!==r.sourceId
      ||!text(f.key,60)||!text(f.text,240)||!text(f.quote,400)||!stances.includes(f.stance)||!['today','history'].includes(f.scope)||f.exposure!==null||![null,'reference'].includes(f.titleIntent)
      ||source&&!source.answer.includes(f.quote)))throw fail('Не удалось проверить оставшиеся свободные выводы после снятия.');
  }
  const checked=checkedContext(s,s.contextEvidence);
  for(const key of fields)if(s.context[key]!==checked.context[key])throw fail('Условие просмотра не подтверждено источником.');
  s.contextEvidence=checked.evidence;s.sessionTime=checkedTime(s,s.sessionTime??null,s.context);
  if(s.context.minutes!==(s.sessionTime?.minutes??null))throw fail('Количество минут не подтверждено источником.');
  // Feature membership is validated against the selected catalog at proposal/projection time.
  const features=new Map(s.facts.filter(f=>typeof f?.feature==='string').map(f=>[f.feature,{}]));s.facts=checkedFacts(s,s.facts,{featureById:features});
  s.question=s.question?checkedQuestion(s.question):null;s.result=validResult(s.result);if(s.phase==='result'&&!s.result)throw fail('В сохранённом результате нет вариантов.');
  s.familiar=familiar(s.familiar);s.replacement=replacement(s.replacement);
  if(s.factRemovalUndo!=null) {
    if(!object(s.factRemovalUndo)||Object.hasOwn(s.factRemovalUndo,'factRemovalUndo'))throw fail('Некорректная отмена снятого вывода.');
    const undo=normalizeMediaConversation({...s.factRemovalUndo,factRemovalUndo:null},s.domain);
    if(undo.savedSourceKey!==s.savedSourceKey)throw invalidSavedSource();
    s.factRemovalUndo=Object.fromEntries(Object.entries(undo).filter(([k])=>k!=='factRemovalUndo'));
  }
  if(![null,undefined,'plan','pick','replace','more'].includes(s.failedAction))throw fail('Некорректное действие восстановления.');
  s.failedAction=s.failedAction??null;s.uncertainties=scopedUncertainties(s,s.uncertainties);return s;
}
export function mediaFallbackQuestion(s) {
  const answered=new Set([...s.turns.filter(t=>!t.superseded&&t.kind!=='none').map(t=>t.question.id),...(s.skippedQuestions??[])]);
  if(s.context.company==='children'&&s.context.childAge===null&&!answered.has('child_age'))return q('child_age','Сколько лет самому младшему зрителю?',[],'Проверим возрастные ограничения там, где они известны.');
  const list=[q('experience','Какое впечатление хочется получить?', [['warm','Тёплая история'],['intrigue','Интрига'],['laugh','Посмеяться'],['adventure','Приключение']], ''),
    ...(s.domain==='series'?[q('commitment','На какую историю сейчас готов?',[['single','Один эпизод'],['short','Короткий сериал'],['long','Готов к длинной истории'],['open','Длина не важна']], 'Имеется в виду весь сериал.')]:[]),
    q('avoidance','Что может испортить этот просмотр?',[],'Если ограничений нет, так и напиши.'),q('reference','Есть история, которую хочется взять за ориентир?',[],'Назови историю и расскажи, что тебе в ней понравилось.')];
  return list.find(question=>!answered.has(question.id))??null;
}
function replacementQuestion(s) {
  return s.phase==='talk'&&s.question&&s.question.allowText!==false&&canOfferInterviewQuestion(s)
    ? mediaFallbackQuestion({...s,skippedQuestions:[...(s.skippedQuestions??[]),s.question.id]}) : null;
}
function invalidate(s) {s.result=null;s.summary='';s.provisional=false;s.failedAction=null;s.replacement=null;s.familiar.marked=[];s.familiar.undo=null;s.factRemovalUndo=null;}
function refreshContext(s) {
  const ctx=blankContext(),evidence=blankEvidence();
  let restoredTime=null;
  for(const t of s.turns)if(!t.superseded) {
    if(t.context) {
      for(const key of fields) {ctx[key]=null;evidence[key]=null;if(t.context[key]!==null&&!retractedContext(s,key,t.id)){ctx[key]=t.context[key];evidence[key]={value:ctx[key],sourceId:t.id,quote:t.contextQuotes?.[key]??t.answer};}}
      restoredTime=t.context.minutes!==null&&!isSessionTimeSourceRetracted(t.id,s)?{minutes:t.context.minutes,sourceId:t.id,quote:t.contextQuotes.minutes}:null;
    }
    if(t.acceptedContext) {
      for(const key of fields){const v=t.acceptedContext[key];ctx[key]=null;evidence[key]=null;if(v&&s.turns.some(source=>source.id===v.sourceId&&!source.superseded)&&!retractedContext(s,key,v.sourceId)){ctx[key]=v.value;evidence[key]=v;}}
      restoredTime=t.acceptedTime&&s.turns.some(source=>source.id===t.acceptedTime.sourceId&&!source.superseded)&&!isSessionTimeSourceRetracted(t.acceptedTime.sourceId,s)?t.acceptedTime:null;
    }
  }
  for(const key of fields){const v=s.contextEvidence[key];if(v&&s.turns.some(t=>t.id===v.sourceId&&!t.superseded)&&!retractedContext(s,key,v.sourceId)){ctx[key]=v.value;evidence[key]=v;}}
  if(ctx.company!=='children'){ctx.childAge=null;evidence.childAge=null;}
  s.context=ctx;s.contextEvidence=evidence;
  if(!s.sessionTime||!s.turns.some(t=>t.id===s.sessionTime.sourceId&&!t.superseded))s.sessionTime=restoredTime;
  s.context.minutes=s.sessionTime?.minutes??null;
}
const contextLabels={company:{solo:'Смотрю один',adults:'Смотрим со взрослыми',children:'Смотрим с детьми'},timeMode:{runtime:'Ограничение длительности фильма',episode:'Ограничение длительности эпизода',session:'Доступное время сегодня'},commitment:{single:'Один эпизод или один вечер',short:'Короткая история',long:'Готов к длинной истории',open:'Длина истории не важна'},format:{movie:'Полнометражный фильм',episodic:'Сериал'}};
const contextQuote=(key,value)=>key==='childAge'?`Ребёнку ${value} лет`:key==='onlyEnded'?value?'Только законченный сериал':'Можно продолжающийся сериал':contextLabels[key]?.[value];
export function answerMediaConversation(input,action={}) {
  let s=normalizeMediaConversation(input);
  if(action.type==='restart')return newMediaConversation({domain:s.domain,mode:s.mode,depth:restartSelectionDepth(s,action,fail),requireDirection:s.requireDirection===true||action.requireDirection===true,savedSource:s.savedSource});
  if(!action.type)return s;
  if(action.type==='setDepth')return changeSelectionDepth(s,action,fail);
  if(action.type==='undo_fact_removal')return s.factRemovalUndo?{...structuredClone(s.factRemovalUndo),
    ...(s.depth?{depth:s.depth,questionOffers:s.questionOffers,depthChangedInReview:s.depthChangedInReview}:{}),revision:s.revision+1,factRemovalUndo:null,failedAction:null}:s;
  if(['familiar_mark','familiar_unmark','familiar_keep','replace_familiar','more','undo_replacement'].includes(action.type)) {
    if(s.phase!=='result'||!s.result?.top)throw fail('Это действие доступно на вариантах результата.');
    if(action.type==='undo_replacement') {const undo=s.familiar.undo;if(!undo)return s;s.result=undo.result;s.familiar={...s.familiar,marked:undo.marked,keep:undo.keep,hidden:undo.hidden,undo:null};s.replacement=undo.replacement;}
    else if(!['replace_familiar','more'].includes(action.type)) {
      if(!cards(s.result).some(c=>c.id===action.id))throw fail('Этого произведения нет среди текущих вариантов.');
      if(action.type==='familiar_mark'){s.familiar.marked=ids([...s.familiar.marked,action.id],4);s.familiar.keep=s.familiar.keep.filter(id=>id!==action.id);}
      else {s.familiar.marked=s.familiar.marked.filter(id=>id!==action.id);if(action.type==='familiar_keep')s.familiar.keep=ids([...s.familiar.keep,action.id]);}
    }
    return {...s,revision:s.revision+1,needsPlan:false,failedAction:null,factRemovalUndo:null};
  }
  if(action.type==='retry')return {...s,needsPlan:s.failedAction==='plan'||!['review','result'].includes(s.phase)};
  if(action.type==='another_question') {
    const next=replacementQuestion(s);
    if(!next||action.questionId!==s.question.id)throw fail('Этот вопрос уже изменился.');
    return rememberInterviewQuestion({...s,revision:s.revision+1,question:next,skippedQuestions:skippedInterviewQuestions(s,s.question),needsPlan:false,failedAction:null},next);
  }
  if(action.type==='review'||action.type==='confirm') {
    if(s.requireDirection===true&&s.phase!=='result'&&!hasChosenDirection(s))throw fail(directionChoiceMessage);
    if(action.type==='review')return {...s,revision:s.revision+1,phase:'review',question:null,needsPlan:false,provisional:s.needsPlan||!s.summary};
    if(!['review','result'].includes(s.phase))throw fail('Сначала проверь понимание запроса.');
    return {...s,revision:s.revision+1,needsPlan:false,factRemovalUndo:null};
  }
  if(action.type==='continue') {
    if(!canOfferInterviewQuestion(s))return reviewAtInterviewCapacity(s);
    if(s.depthChangedInReview&&s.phase==='review')return {...s,depthChangedInReview:false,revision:s.revision+1,phase:'talk',question:null,needsPlan:true,failedAction:null};
    invalidate(s);return {...s,revision:s.revision+1,phase:'talk',question:q('extra','Что ещё важно учесть?',[],'Добавь пожелание своими словами.'),needsPlan:false};
  }
  if(action.type==='back') {
    if(!s.turns.length)return s;const removed=s.turns.pop();for(const t of s.turns)if(removed.supersedes?.includes(t.id))t.superseded=false;
    const active=new Set(s.turns.map(t=>t.id));s.facts=s.facts.filter(f=>active.has(f.sourceId));
    s.retractions=s.retractions.flatMap(r=>r.at&&!active.has(r.at)?['session_time','context'].includes(r.kind)?[{...r,at:s.turns.at(-1)?.id}]:[]:[r]);
    refreshContext(s);invalidate(s);s.question=removed.resumeQuestion??removed.question;s.phase=s.question.id==='direction'?'direction':'talk';s.needsPlan=false;s.revision++;return s;
  }
  if(action.type==='remove_fact'||action.type==='remove_time') {
    const key=action.type==='remove_time'?'session_time':action.key,f=s.facts.find(f=>f.key===key),contextKey=key?.startsWith('context:')?key.slice(8):null;
    if(!f&&key!=='session_time'&&!fields.includes(contextKey)||key==='session_time'&&!s.sessionTime||contextKey&&!s.contextEvidence[contextKey])return s;
    const derivedFormat=f?.titleId===null&&s.contextEvidence.format?.sourceId===f.sourceId&&s.contextEvidence.format?.quote===f.quote&&(f.feature===null||requestedFormatFact(f)===s.context.format);
    if(s.retractions.length+(derivedFormat?2:1)>retractionLimit)throw fail('Слишком много исправлений. Начни новый подбор.');
    const undo=Object.fromEntries(Object.entries(structuredClone(s)).filter(([k])=>k!=='factRemovalUndo'));
    if(key==='session_time') {s.retractions.push({kind:'session_time',sourceId:s.sessionTime.sourceId,quote:s.sessionTime.quote,at:s.turns.at(-1)?.id});s.sessionTime=null;s.context.minutes=null;s.context.timeMode=null;s.contextEvidence.timeMode=null;}
    else if(contextKey) {const e=s.contextEvidence[contextKey];s.retractions.push({kind:'context',key:contextKey,sourceId:e.sourceId,quote:e.quote,at:s.turns.at(-1)?.id});s.context[contextKey]=null;s.contextEvidence[contextKey]=null;
      if(contextKey==='format')s.facts=s.facts.filter(f=>!(f.titleId===null&&f.sourceId===e.sourceId&&f.quote===e.quote&&(f.feature===null&&f.stance==='require'||requestedFormatFact(f)===e.value)));
      if(contextKey==='company'){s.context.childAge=null;s.contextEvidence.childAge=null;}}
    else {
      s.facts=s.facts.filter(x=>x.key!==f.key&&!(f.feature&&x.feature===f.feature&&x.sourceId===f.sourceId));
      s.retractions.push({key:f.key,sourceId:f.sourceId,quote:f.quote,feature:f.feature,...(f.feature===null&&f.titleId===null?{kind:'untyped_source',
        allowedFacts:structuredClone(s.facts.filter(x=>x.sourceId===f.sourceId&&x.feature===null&&x.titleId===null))}:{})});
      if(derivedFormat){s.retractions.push({kind:'context',key:'format',sourceId:f.sourceId,quote:f.quote,at:s.turns.at(-1)?.id});s.context.format=null;s.contextEvidence.format=null;}
    }
    const prior=s.phase,question=!['review','result'].includes(prior)?s.question??mediaFallbackQuestion(s):null;invalidate(s);s.factRemovalUndo=undo;s.phase=question?prior:'review';s.question=question;s.needsPlan=false;s.revision++;return s;
  }
  if(s.turns.length>=SELECTION_TURN_LIMIT)throw fail('Разговор получился длинным. Проверь понимание или начни новый подбор.');
  if(action.type==='set_context') {
    if(!object(action.context))throw fail('Не удалось прочитать условия просмотра.');
    const ctx=validateContext({...s.context,...action.context}),quotes={};
    for(const key of fields)if(ctx[key]!==null)quotes[key]=contextQuote(key,ctx[key]);
    if(ctx.minutes!==null)quotes.minutes=`Сегодня есть ${ctx.minutes} минут`;
    const supersedes=s.turns.filter(t=>t.question.id==='context'&&!t.superseded).map(t=>t.id),resumeQuestion=!['review','result'].includes(s.phase)?s.question:null;
    for(const t of s.turns)if(supersedes.includes(t.id))t.superseded=true;
    s.facts=s.facts.filter(f=>!supersedes.includes(f.sourceId));s.revision++;const id=`${s.id}:${s.revision}`;
    s.turns.push({id,question:q('context','Условия просмотра'),selected:[],text:'',kind:'answer',answer:Object.values(quotes).join('; ')||'Условия просмотра сняты',context:ctx,contextQuotes:quotes,supersedes,...(resumeQuestion?{resumeQuestion}:{})});
    s.context=ctx;s.contextEvidence=Object.fromEntries(fields.map(k=>[k,ctx[k]===null?null:{value:ctx[k],sourceId:id,quote:quotes[k]}]));s.sessionTime=ctx.minutes===null?null:{minutes:ctx.minutes,sourceId:id,quote:quotes.minutes};
    // Explicit nulls must not be reconstructed from older raw answers on a later plan.
    for(const key of fields)if(action.context[key]===null)s.retractions.push({kind:'context',key,sourceId:id,quote:clearedByEditor,at:id});
    if(action.context.minutes===null)s.retractions.push({kind:'session_time',sourceId:id,quote:clearedByEditor,at:id});
    compactEditorClears(s);
    invalidate(s);s.phase=resumeQuestion?'talk':'review';s.question=resumeQuestion;s.needsPlan=false;
    return resumeQuestion&&!canOfferInterviewQuestion(s)?reviewAtInterviewCapacity(s):s;
  }
  const correcting=action.type==='correct';if(!correcting&&action.type!=='answer')throw fail('Неизвестное действие.');
  const question=correcting?q(`correction:${s.revision+1}`,'Что нужно изменить?'):s.question;
  if(!question||!correcting&&action.questionId!==question.id)throw fail('Вопрос уже изменился. Ответь на текущий.');
  const selectionLimit=question.id==='direction'?20:6;
  if(action.text!=null&&(typeof action.text!=='string'||action.text.length>1600)||action.selected!=null&&(!Array.isArray(action.selected)||action.selected.length>selectionLimit||action.selected.some(id=>typeof id!=='string')))throw fail('Ответ слишком длинный или имеет неверную форму.');
  const kind=correcting?'answer':controls.includes(action.kind)?action.kind:'answer',chosen=ids(action.selected??[],selectionLimit),selected=kind==='answer'?question.options.filter(o=>chosen.includes(o.id)):[];
  if(kind==='answer'&&(selected.length!==chosen.length||!question.multiple&&selected.length>1))throw fail('Проверь выбранные ответы.');
  const own=clean(action.text);
  if(s.requireDirection===true&&question.id==='direction'&&(kind!=='answer'||!hasDirectionChoice(selected.map(option=>option.id),own)))throw fail(directionChoiceMessage);
  if(kind==='answer'&&!selected.length&&!own)throw fail('Напиши ответ, выбери вариант или пропусти вопрос.');
  const turn={id:`${s.id}:${s.revision+1}`,question,selected:selected.map(({id,label})=>({id,label})),text:own,kind,answer:[...(kind==='answer'?selected.map(o=>o.label):[neutral[kind]]),own].filter(Boolean).join('; ')};
  if(!correcting&&isEndedQuestion(question)&&!own&&(selected.length===1||controls.includes(kind))) {
    const value=kind==='answer'?selected[0].id==='yes':null,summary=s.summary;
    s.revision++;s.turns.push(turn);invalidate(s);s.summary=summary;s.context.onlyEnded=value;
    s.contextEvidence.onlyEnded=value===null?null:{value,sourceId:turn.id,quote:turn.answer};
    s.uncertainties=s.uncertainties.filter(u=>u!==endedUncertainty);if(value===null)s.uncertainties.unshift(endedUncertainty);
    turn.acceptedContext=structuredClone(s.contextEvidence);turn.acceptedTime=structuredClone(s.sessionTime);
    s.phase='review';s.question=null;s.needsPlan=false;return s;
  }
  // A partial correction retains independent evidence. Explicit time corrections retire
  // only the old time budget; the new complete model snapshot resolves other meanings.
  const cap=(s.savedSource||s.domain==='film')&&kind==='answer'?explicitViewingCap(turn,s.domain,Boolean(s.savedSource)):null;
  const filmTime=cap?.time;
  const clearsTime=(s.savedSource||s.domain==='film')&&kind==='answer'&&/(?:^|[.!?;,]\s*)(?:теперь\s+)?(?:без (?:лимита|ограничени[йя]) (?:по времени|длительности)|(?:время|длительность|хронометраж) (?:теперь |больше )?не\s?важн[ыоа]?|(?:сними|убери) (?:ограничение|лимит) (?:по времени|времени|длительности)|(?:лимит(?: времени)?|ограничение по времени) (?:больше )?не нуж(?:ен|но))\s*(?:$|[.!?;,])/iu.test(own);
  if(s.sessionTime&&(clearsTime||filmTime||correcting&&(correctionMinutes(turn,s.context)!==null||/(?:сегодня|сейчас).*(?:есть|не больше|максимум).*?(?:минут|мин(?!\p{L})|час)|(?:эпизод|сери[яиюй]).*(?:не больше|до|максимум).*?(?:минут|мин(?!\p{L})|час)/iu.test(own)))) {
    if(s.retractions.length>=retractionLimit)throw fail('Слишком много исправлений. Начни новый подбор.');
    s.retractions.push({kind:'session_time',sourceId:s.sessionTime.sourceId,quote:s.sessionTime.quote,at:s.turns.at(-1)?.id});s.sessionTime=null;s.context.minutes=null;
    if(clearsTime){s.context.timeMode=null;s.contextEvidence.timeMode=null;}
  }
  s.revision++;s.turns.push(turn);
  const savedContext=s.savedSource&&kind==='answer'&&applySavedViewingContext(s,turn);
  if(filmTime){
    s.sessionTime=filmTime;
    s.context.minutes=filmTime.minutes;s.context.timeMode=cap.mode;
    s.contextEvidence.timeMode={value:cap.mode,quote:filmTime.quote,sourceId:turn.id};
  }
  if(filmTime||savedContext){turn.acceptedTime=structuredClone(s.sessionTime);turn.acceptedContext=structuredClone(s.contextEvidence);}
  invalidate(s);s.phase='talk';s.question=null;s.needsPlan=true;return s;
}

export function applyMediaConversationProposal(state,proposal,dict,expectedRevision=state.revision) {
  try {
    if(expectedRevision!==state.revision)throw fail('Пришёл ответ на предыдущую версию запроса.');
    const fields=['summary','facts','uncertainties','action','question','context','sessionTime'];
    const expectedKeys=state.depth&&Object.hasOwn(proposal??{},'decision')?[...fields,'decision']:fields;
    if(!exactKeys(proposal,expectedKeys)||typeof proposal.summary!=='string'||proposal.summary.length>1000
      ||!Array.isArray(proposal.uncertainties)||proposal.uncertainties.length>8||proposal.uncertainties.some(v=>typeof v!=='string'||v.length>240)||!['question','review'].includes(proposal.action))throw fail('Неполный ответ помощника.');
    let facts=checkedFacts(state,proposal.facts,dict);
    const checked=checkedContext(state,proposal.context,{clarify:true});
    // A confirmed runtime survives omission by the planner until the user changes it.
    const currentTime=(state.savedSource||state.domain==='film'&&state.contextEvidence?.timeMode?.value==='runtime')&&state.sessionTime&&
      !isSessionTimeSourceRetracted(state.sessionTime.sourceId,state)?state.sessionTime:null;
    let sessionTime=checkedTime(state,proposal.sessionTime,checked.context);
    const turnIndex=time=>state.turns.findIndex(turn=>turn.id===time.sourceId);
    if(state.savedSource){
      for(const key of ['onlyEnded','company','childAge']){
        const current=state.contextEvidence[key],proposed=checked.evidence[key];
        if(current&&(!proposed||turnIndex(current)>turnIndex(proposed))){
          if(key==='childAge'&&checked.context.company!=='children')continue;
          checked.context[key]=current.value;checked.evidence[key]=current;
        }
      }
      if(checked.context.company!=='children'){checked.context.childAge=null;checked.evidence.childAge=null;}
    }
    if(currentTime&&(!sessionTime||turnIndex(currentTime)>turnIndex(sessionTime))){
      checked.context.timeMode=state.context.timeMode;checked.evidence.timeMode=state.contextEvidence.timeMode;
      sessionTime=checkedTime(state,currentTime,checked.context);
    }
    // A hard explicit movie request remains an eligibility constraint even if the
    // planner omitted its scalar slot. Derive it only from that fact's own active
    // exact evidence; history, examples and soft/or alternatives do not qualify.
    const requiredMovies=facts.filter(f=>f.scope==='today'&&f.stance==='require'&&f.feature===null&&f.titleId===null&&movieRequest(f.quote));
    for(const f of requiredMovies)if(retractedContext(state,'format',f.sourceId)||!contextMeaning('format','movie',f.quote,sourceFor(state,f)))throw fail('Формат фильма не подтверждён действующим ответом или уже снят.');
    if(requiredMovies.length&&checked.context.format!=='movie') {
      if(checked.context.format!==null)throw fail('В условиях одновременно указаны фильм и сериал. Уточни нужный формат.');
      const f=requiredMovies[0];checked.context.format='movie';checked.evidence.format={value:'movie',sourceId:f.sourceId,quote:f.quote};
    }
    // A directly requested format is independent of animation/genre and the time cap.
    // Recover an omitted slot only from the accepted fact's active exact request clause.
    for(const f of facts) {
      const format=requestedFormatFact(f);if(!format)continue;const source=sourceFor(state,f);
      if(!directFormatSource(format,f.quote,source)||!contextMeaning('format',format,f.quote,source))continue;
      if(retractedContext(state,'format',f.sourceId))throw fail('Этот формат уже снят. Уточни его новым ответом.');
      if(checked.context.format!==null&&checked.context.format!==format)throw fail('В условиях одновременно указаны фильм и сериал. Уточни нужный формат.');
      if(checked.context.format===null){checked.context.format=format;checked.evidence.format={value:format,sourceId:f.sourceId,quote:f.quote};}
    }
    // A finished story/arc does not prove that production of its whole series ended.
    // Keep supported goal facts and ask this one scalar question locally. An invalid
    // source, quote, retraction or negation still rejects the proposal before here.
    const endedFacts=facts.filter(f=>f.feature==='completeness.ended'&&f.scope==='today'&&['want','require','conditional'].includes(f.stance));
    for(const f of endedFacts)if(retractedContext(state,'onlyEnded',f.sourceId)
      ||!contextMeaning('onlyEnded',true,f.quote,sourceFor(state,f))&&!completedStory(f.quote,sourceFor(state,f)))throw fail('Статус законченного сериала не подтверждён действующим ответом или уже снят.');
    const ambiguousEndedFacts=endedFacts.filter(f=>completedStory(f.quote,sourceFor(state,f)));
    const clarifyEnded=checked.clarifyEnded||ambiguousEndedFacts.length>0&&checked.context.onlyEnded!==true;
    facts=facts.filter(f=>!ambiguousEndedFacts.includes(f));
    if(clarifyEnded){checked.context.onlyEnded=null;checked.evidence.onlyEnded=null;}
    checked.context.minutes=sessionTime?.minutes??null;
    if(state.domain==='film'&&checked.context.timeMode==='episode'||state.domain==='series'&&checked.context.timeMode==='runtime')throw fail('Длина фильма и эпизода не совпадают с выбранным разделом.');
    let question=null;if(proposal.action==='question') {
      let next;
      try{next=checkedQuestion(proposal.question,{planner:true});}catch(error){if(!state.depth)throw error;}
      // A dismissed next question does not invalidate the accepted answer or its evidence.
      if(next&&(state.depth||!state.skippedQuestions?.includes(next.id))){
        if(!state.depth&&state.mode==='guided'&&state.turns.some(t=>!t.superseded&&t.question.id===next.id&&t.kind!=='none'))throw fail('Этот вопрос уже был отвечен.');
        const unsupportedAge=(next.id==='child_age'||/сколько.*лет.*(?:реб|дет)|возраст.*(?:реб|дет)/iu.test(next.title))&&checked.context.company!=='children';
        if(unsupportedAge&&!state.depth)throw fail('Возраст ребёнка спрашивается только при просмотре с детьми.');
        if(!unsupportedAge)question=next;
      }
    } else if(!state.depth) {
      if(proposal.question!==null)throw fail('В проверке понимания вопрос должен отсутствовать.');
      const meaningful=state.turns.filter(t=>!t.superseded&&t.question.id!=='context');
      const explicitWish=meaningful[0]?.selected?.some(option=>option.id.startsWith('mood_')||option.id.startsWith('avoid_'));
      if(state.mode==='guided'&&meaningful.length===1&&meaningful[0].question.id==='direction'&&meaningful[0].text.length<60&&!explicitWish)throw fail('Одного направления мало: уточним желаемое впечатление.');
    }
    const decision=chooseInterviewQuestion(state,proposal,question);question=decision.question;
    if(clarifyEnded&&canOfferInterviewQuestion(state)){
      const clarification=endedQuestion();
      if(!state.skippedQuestions?.includes(clarification.id))question=clarification;
    }
    const uncertainties=[...(clarifyEnded?[endedUncertainty]:[]),...(decision.notice?[decision.notice]:[]),...proposal.uncertainties];
    if(checked.context.childAge!==null)uncertainties.push('Возрастная пригодность проверяется по доступной разметке; если данных нет, она остаётся неизвестной.');
    if(sessionTime)uncertainties.push(checked.context.timeMode==='session'?'Указано общее время на просмотр.':state.domain==='series'||checked.context.format==='episodic'||checked.context.timeMode==='episode'?'Длительность относится к эпизоду. Если длительность серии неизвестна, проверь её перед просмотром.':'Если длительность неизвестна, проверь её перед просмотром.');
    const contextScope={domain:state.domain,context:checked.context};
    if(seriesContext(contextScope)&&(checked.context.commitment!==null||checked.context.onlyEnded!==null))uncertainties.push(seriesUncertainty);
    const turns=structuredClone(state.turns);if(turns.length){turns.at(-1).acceptedContext=structuredClone(checked.evidence);turns.at(-1).acceptedTime=structuredClone(sessionTime);}
    return {state:rememberInterviewQuestion({...state,turns,facts,context:checked.context,contextEvidence:checked.evidence,sessionTime,summary:clarifyEnded?facts.map(f=>f.text).join(' ').slice(0,1000):proposal.summary.trim(),uncertainties:[...new Set(scopedUncertainties(contextScope,uncertainties))].slice(0,8),question,
      phase:question?'talk':'review',needsPlan:false,provisional:Boolean(decision.notice),result:null,failedAction:null,factRemovalUndo:null},question)};
  } catch(e) {return {state,error:e.message};}
}
export function mediaConversationScreen(s) {
  const contextFacts=fields.filter(k=>s.contextEvidence?.[k]).map(k=>({key:`context:${k}`,text:s.contextEvidence[k].quote,sourceId:s.contextEvidence[k].sourceId,quote:s.contextEvidence[k].quote,stance:'require',scope:'today',feature:null,titleId:null,exposure:null,titleIntent:null}));
  // Display metadata only: an exact format binding can share one visible control.
  const format=s.contextEvidence?.format;
  const facts=s.facts.map(f=>format&&requestedFormatFact(f)===format.value&&f.sourceId===format.sourceId&&f.quote===format.quote?{...f,conditionKey:'format'}:f);
  const common={domain:s.domain,...(s.savedSource?{savedSource:s.savedSource}:{}),summary:s.summary||s.facts.filter(f=>f.scope==='today').map(f=>f.text).join('; '),facts:[...facts,...contextFacts],uncertainties:s.uncertainties,context:s.context,
    sessionTime:s.sessionTime??null,canBack:s.turns.length>0,canUndoFactRemoval:Boolean(s.factRemovalUndo),provisional:Boolean(s.provisional),turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer,superseded:Boolean(t.superseded)}))};
  if(s.phase==='result')return {...common,type:'result',result:s.result};
  if(s.phase==='review')return {...common,type:'review',...(!canOfferInterviewQuestion(s)?{canContinue:false}:{})};
  const next=s.question??mediaFallbackQuestion(s)??q('extra','Что ещё важно учесть?',[],'Можно проверить запрос и перейти к вариантам.');
  const checkpoint=interviewCheckpoint(s,next);
  return {...common,type:'question',canChangeQuestion:Boolean(replacementQuestion(s)),question:next,...(checkpoint?{checkpoint}:{})};
}
export function mediaConversationToLegacy(s,dict,catalog=null) {
  if(!domains.includes(s.domain)||catalog&&catalog.domain?.id!==s.domain)throw fail('Раздел каталога не совпадает с разговором.');
  const legacy={...initialState(),domain:s.domain,step:'result',...(s.savedSource?{savedSource:s.savedSource}: {})},f=familiar(s.familiar),today=s.facts.filter(f=>f.scope==='today');
  const excluded=today.filter(f=>f.stance==='exclude'&&f.titleId).map(f=>f.titleId),returnToIds=[...new Set([...f.keep,...today.filter(f=>['want','conditional'].includes(f.stance)&&['return','replay'].includes(f.titleIntent)&&f.titleId).map(f=>f.titleId)])].filter(id=>!excluded.includes(id)),keep=new Set(returnToIds);
  const signal=stances=>today.filter(f=>f.feature&&dict.featureById.has(f.feature)&&stances.includes(f.stance)).map(f=>({f:f.feature,evidence:f.quote}));
  legacy.situation={...legacy.situation,company:s.context.company==='children'?'kids':s.context.company==='adults'?'group':s.context.company,
    // Legacy feedback context uses nullable strings; media core keeps numeric age.
    childAge:s.context.company==='children'&&s.context.childAge!==null?String(s.context.childAge):null,onlyEnded:s.context.onlyEnded===true,note:clean(s.summary,300)};
  for(const fact of s.facts)if(fact.titleId&&fact.exposure==='finished'&&!keep.has(fact.titleId))legacy.answers[fact.titleId]={reaction:'known',text:fact.quote};
  legacy.preferences=s.facts.filter(f=>f.scope==='history'&&f.stance==='want'&&f.feature&&dict.featureById.has(f.feature)).map(f=>({f:f.feature}));
  legacy.session={...legacy.session,...animeRequestOptions(s,s.savedSource?currentViewingEvidence:undefined),goalDriven:true,excludeSeries:false,goalWants:signal(['want','require']),goalAvoids:signal(['avoid','exclude']),goalRequires:signal(['require']),goalExcludes:signal(['exclude']),genreWants:[],
    ...(s.savedSource?{savedFormat:s.context.format,savedTimeMode:s.sessionTime?s.context.timeMode:null}:{}),
    ...(s.sessionTime?{minutes:s.sessionTime.minutes,maxRuntime:s.sessionTime.minutes}:{}),
    ...(s.domain==='film'&&s.context.timeMode==='runtime'&&s.sessionTime?{requireKnownRuntime:true}:{}),
    notNow:[...new Set([...excluded,...[...f.excluded,...f.hidden].filter(id=>!keep.has(id))])]};
  legacy.conversation={domain:s.domain,revision:s.revision,summary:s.summary,facts:s.facts,context:s.context,contextEvidence:s.contextEvidence,sessionTime:s.sessionTime??null,uncertainties:s.uncertainties,retractions:s.retractions,
    familiarity:{returnToIds,hiddenIds:f.hidden,excludedIds:f.excluded},turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer,kind:t.kind,superseded:Boolean(t.superseded)}))};
  return legacy;
}
