import {initialConversation,initialDirectionQuestion,gameGenreDirections as directions} from '../server/public/shared/conversation-entry.js';
// A game conversation owns today's goal; evidence is never silently promoted to permanent taste.
import { initialState } from './dialogue.js';
import { PLATFORMS } from './sieves.js';
import { editionsOf } from './catalog.js';
import { validateSessionTime,isSessionTimeFact,isSessionTimeSourceRetracted } from './session-time.js';

export const CONVERSATION_VERSION = 1;
export const TURN_LIMIT = 24;
const clean = (x, n = 1600) => typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '';
const failure = (message) => Object.assign(new Error(message), {status:400});
const controls = ['unknown','indifferent','none'];
const neutral = {unknown:'Пока не знаю',indifferent:'Не принципиально',none:'Ни один вариант не подходит'};
const question = (id,title,options,why='',multiple=true) => ({id,title,why,options:options.map(o=>Array.isArray(o)?{id:o[0],label:o[1],...(o[2]?{feature:o[2]}:{})}:o),multiple,controls});
export const directionQuestion = () => initialDirectionQuestion('game');
const requiredQuestion = (...args) => ({...question(...args),allowText:false,controls:[]});
const platformQuestion = () => requiredQuestion('platform','Где будешь играть?',Object.entries(PLATFORMS).map(([id,p])=>[id,p.label]),'Сейчас в каталоге игры для компьютера и Steam Deck.',false);
const companyQuestion = () => requiredQuestion('company','Будешь играть один или вместе с кем-то?',[['solo','Один'],['friend','Вдвоём, в кооперативе'],['group','Компанией']], 'Это поможет проверить доступные режимы.',false);
const partyQuestion = () => requiredQuestion('party','Сколько вас будет?',[['2','Двое'],['3','Трое'],['4','Четверо'],['5+','Пять и больше']], 'Если вместимость не подтверждена, я отмечу это в результате.',false);
const contextIds = new Set(['platform','company','party','context']);
const familiarIds = (value,max=500) => {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>max||value.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)))throw failure('Не удалось прочитать отметки знакомых игр.');
  return [...new Set(value)];
};
const emptyFamiliar = () => ({marked:[],keep:[],hidden:[],excluded:[],undo:null});
const resultCards = result => [result?.top,...(result?.alternatives??[])].filter(Boolean);
const normalizeReplacement = value => value==null?null:{changedIds:familiarIds(value.changedIds,4),unresolvedIds:familiarIds(value.unresolvedIds,4),notice:clean(value.notice,240),...(value.pendingIds?{pendingIds:familiarIds(value.pendingIds,4)}:{})};
function normalizeFamiliar(value) {
  const f=value??emptyFamiliar();
  const out={marked:familiarIds(f.marked,4),keep:familiarIds(f.keep),hidden:familiarIds(f.hidden),excluded:familiarIds(f.excluded),undo:null};
  if(f.undo) {
    if(!f.undo.result?.top||resultCards(f.undo.result).length>4)throw failure('Не удалось прочитать предыдущие варианты.');
    out.undo={result:structuredClone(f.undo.result),marked:familiarIds(f.undo.marked,4),keep:familiarIds(f.undo.keep),hidden:familiarIds(f.undo.hidden),replacement:normalizeReplacement(f.undo.replacement)};
  }
  return out;
}

function normalizeFactRemovalUndo(value) {
  if(value==null)return null;
  if(!Array.isArray(value.facts)||value.facts.length>16||!Array.isArray(value.retractions)||value.retractions.length>64
    ||!['direction','platform','company','party','talk','review','result'].includes(value.phase)
    ||value.result&&(resultCards(value.result).length>4||!value.result.top)||value.phase==='result'&&!value.result?.top)throw failure('Не удалось прочитать отмену снятого вывода.');
  const fields=(row,keys)=>{
    if(!row||typeof row!=='object'||Array.isArray(row))throw failure('Не удалось прочитать отмену снятого вывода.');
    return Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>{
      if(row[k]!=null&&(typeof row[k]!=='string'||row[k].length>2400))throw failure('Не удалось прочитать отмену снятого вывода.');
      return [k,row[k]];
    }));
  };
  let q=null;
  if(value.question) {
    const old=value.question;
    if(!clean(old.id,100)||!clean(old.title,220)||!Array.isArray(old.options)||old.options.length>20
      ||old.controls!=null&&(!Array.isArray(old.controls)||old.controls.length>3))throw failure('Не удалось прочитать отмену снятого вывода.');
    q={id:clean(old.id,100),title:clean(old.title,220),why:clean(old.why,220),multiple:Boolean(old.multiple),
      options:old.options.map(o=>({id:clean(o?.id,100),label:clean(o?.label,100),...(typeof o?.feature==='string'?{feature:clean(o.feature,100)}:{})})),
      controls:(old.controls??[]).filter(c=>controls.includes(c)),...(typeof old.allowText==='boolean'?{allowText:old.allowText}:{})};
  }
  const familiar=normalizeFamiliar({marked:value.marked,undo:value.familiarUndo});
  return {facts:value.facts.map(f=>fields(f,['key','text','stance','scope','sourceId','quote','feature','gameId','exposure','gameIntent'])),
    retractions:value.retractions.map(r=>fields(r,['kind','key','sourceId','feature','quote','at'])),summary:clean(value.summary,1000),result:structuredClone(value.result??null),
    phase:value.phase,question:q,provisional:Boolean(value.provisional),needsPlan:Boolean(value.needsPlan),marked:familiar.marked,familiarUndo:familiar.undo,replacement:normalizeReplacement(value.replacement)};
}

const captureFactRemovalUndo=s=>normalizeFactRemovalUndo({facts:s.facts,retractions:s.retractions,summary:s.summary,result:s.result,
  phase:s.phase,question:s.question,provisional:s.provisional,needsPlan:s.needsPlan,marked:s.familiar.marked,familiarUndo:s.familiar.undo,replacement:s.replacement});

export function newConversation({id,mode}={}) {
  return initialConversation({id:clean(id,100)||undefined,mode});
}

export function normalizeConversation(input) {
  if (!input) return newConversation();
  if(input.version!==1 || !clean(input.id,100) || !Number.isSafeInteger(input.revision) || input.revision<0
    || !Array.isArray(input.turns) || input.turns.length>TURN_LIMIT || !Array.isArray(input.facts) || input.facts.length>16
    || !Array.isArray(input.retractions) || input.retractions.length>64) throw failure('Сохранённый разговор не удалось прочитать. Начни новый подбор.');
  if(input.turns.some(t=>!t?.id || typeof t.answer!=='string' || t.answer.length>2400 || !t.question?.id)) throw failure('Некорректный ответ в истории разговора');
  const s=structuredClone(input);
  s.browseSeen=familiarIds(s.browseSeen);s.familiar=normalizeFamiliar(s.familiar);s.replacement=normalizeReplacement(s.replacement);
  s.factRemovalUndo=normalizeFactRemovalUndo(s.factRemovalUndo);
  s.mode=s.mode==='free'?'free':'guided';
  s.summary=clean(s.summary,1000); s.uncertainties=(s.uncertainties??[]).map(x=>clean(x,240)).slice(0,8);
  const checkedTime=validateSessionTime(s.sessionTime,s);s.sessionTime=checkedTime.time??null;
  if(checkedTime.error)s.uncertainties=['Сохранённое время не удалось подтвердить.',...s.uncertainties].slice(0,8);
  s.context={platform:PLATFORMS[s.context?.platform]?s.context.platform:null,
    company:['solo','friend','group'].includes(s.context?.company)?s.context.company:null,
    partySize:['2','3','4','5+'].includes(s.context?.partySize)?s.context.partySize:null};
  return s;
}

export function fallbackQuestion(s) {
  const answered = new Set(s.turns.filter(t=>t.kind!=='none').map(t=>t.question.id));
  const qs=[
    question('experience','Что хочется получать от игры?',[['story','Увлечься историей','story.central'],['explore','Находить интересное в мире','loop.exploration'],['builds','Развивать героя и пробовать билды','progression.builds'],['challenge','Преодолевать сложные испытания','difficulty.hard'],['relax','Спокойно проводить время','tension.low']], 'Жанр задаёт направление, а здесь — что важно именно сегодня.'),
    question('reference','Есть игра, из которой хочется что-то оставить?',[], 'Напиши название и что именно понравилось. Можно без примера.'),
    question('avoidance','Что может испортить тебе этот вечер?', [['grind','Однообразный фарм','progression.grind'],['stress','Постоянное напряжение','tension.high'],['slow','Медленное начало','pace.slow']], 'Можно написать свой ответ или отметить, что ограничений нет.'),
  ];
  return qs.find(q=>!answered.has(q.id))??null;
}

function localFacts(s, turn) {
  if(turn.kind!=='answer')return;
  for(const o of turn.selected) {
    const source=turn.question.options.find(x=>x.id===o.id);
    if(turn.question.id!=='direction' && !source?.feature)continue;
    s.facts.push({key:`${turn.question.id}:${o.id}`,text:o.label,stance:turn.question.id==='avoidance'||o.id.startsWith('avoid_')?'avoid':'want',scope:'today',
      sourceId:turn.id,quote:o.label,feature:source?.feature??null,gameId:null,exposure:null});
  }
  s.facts=s.facts.slice(-16);
}

function invalidate(s) {
  s.result=null;s.feedbackState=null;s.summary='';s.provisional=false;s.replacement=null;
  s.familiar.marked=[];s.familiar.undo=null;s.factRemovalUndo=null;
}
function activeContext(turns) {
  const ctx={platform:null,company:null,partySize:null};
  for(const t of turns) {
    if(t.superseded)continue;
    const value=t.selected?.[0]?.id;
    if(t.question.id==='platform' && PLATFORMS[value])ctx.platform=value;
    if(t.question.id==='company' && ['solo','friend','group'].includes(value)){ctx.company=value;ctx.partySize=value==='friend'?'2':null;}
    if(t.question.id==='party' && ['2','3','4','5+'].includes(value))ctx.partySize=value;
    if(t.question.id==='context' && t.context)Object.assign(ctx,t.context);
  }
  return ctx;
}

export function answerConversation(input, action={}) {
  let s=normalizeConversation(input);
  if(action.type==='restart')return newConversation({mode:s.mode});
  if(!action.type)return s;
  if(action.type==='undo_fact_removal') {
    const undo=s.factRemovalUndo;if(!undo)return s;
    s={...s,facts:undo.facts,retractions:undo.retractions,summary:undo.summary,result:undo.result,phase:undo.phase,question:undo.question,
      provisional:undo.provisional,needsPlan:undo.needsPlan,replacement:undo.replacement,factRemovalUndo:null,
      familiar:{...s.familiar,marked:undo.marked,undo:undo.familiarUndo},failedAction:null,revision:s.revision+1};
    return s;
  }
  if(['familiar_mark','familiar_unmark','familiar_keep','replace_familiar','more','undo_replacement'].includes(action.type)) {
    if(s.phase!=='result'||!s.result?.top)throw failure('Эти действия доступны на карточках результата.');
    if(action.type==='undo_replacement') {
      const undo=s.familiar.undo;if(!undo)return s;
      s.result=undo.result;s.familiar={...s.familiar,marked:undo.marked,keep:undo.keep,hidden:undo.hidden,undo:null};s.replacement=undo.replacement;
    } else if(!['replace_familiar','more'].includes(action.type)) {
      if(!resultCards(s.result).some(c=>c.id===action.id))throw failure('Этой карточки уже нет среди текущих вариантов.');
      const f=s.familiar;
      if(action.type==='familiar_mark') {f.marked=[...new Set([...f.marked,action.id])];f.keep=f.keep.filter(id=>id!==action.id);}
      else {f.marked=f.marked.filter(id=>id!==action.id);if(action.type==='familiar_keep')f.keep=familiarIds([...new Set([...f.keep,action.id])]);}
    }
    s.revision++;s.needsPlan=false;s.failedAction=null;s.factRemovalUndo=null;return s;
  }
  if(action.type==='retry')return {...s,needsPlan:s.phase!=='review'&&s.phase!=='result'};
  if(action.type==='continue')return {...s,revision:s.revision+1,phase:'talk',question:question('extra','Что ещё важно для этого выбора?',[],'Добавь то, чего не хватает в моём понимании. Я учту это и уточню дальше, если нужно.'),needsPlan:false,result:null,familiar:{...s.familiar,marked:[],undo:null},replacement:null,factRemovalUndo:null};
  if(action.type==='review') {
    if(!s.context.platform||!s.context.company||s.context.company==='group'&&!s.context.partySize)return s;
    return {...s,revision:s.revision+1,phase:'review',question:null,needsPlan:false,provisional:s.needsPlan||!s.summary};
  }
  if(action.type==='confirm') {
    if(s.phase!=='review' && s.phase!=='result')throw failure('Сначала проверь, как я понял твой запрос.');
    if(!s.context.platform||!s.context.company)throw failure('Сначала укажи платформу и компанию.');
    return {...s,revision:s.revision+1,needsPlan:false,factRemovalUndo:null};
  }
  if(action.type==='back') {
    if(!s.turns.length)return s;
    const removed=s.turns.pop();
    for(const t of s.turns)if(removed.supersedes?.includes(t.id))t.superseded=false;
    const active=new Set(s.turns.map(t=>t.id));
    s.facts=s.facts.filter(f=>active.has(f.sourceId));
    s.retractions=s.retractions.flatMap(r=>{
      if(r.kind==='session_time'&&r.at&&!active.has(r.at))return [{...r,at:s.turns.at(-1)?.id}];
      return !r.at||active.has(r.at)?[r]:[];
    });
    if(s.sessionTime&&!active.has(s.sessionTime.sourceId))s.sessionTime=null;
    s.context=activeContext(s.turns); s.question=removed.question;
    s.phase=['direction','platform','company','party'].includes(s.question.id)?s.question.id:'talk';
    if(s.question.id==='context')s.question=removed.resumeQuestion??platformQuestion();
    invalidate(s); s.needsPlan=false; s.revision++; return s;
  }
  if(action.type==='remove_fact') {
    const f=s.facts.find(x=>x.key===action.key); if(!f)return s;
    if(s.retractions.length>=64)throw failure('В этом разговоре уже слишком много исправлений. Начни новый подбор.');
    const undo=captureFactRemovalUndo(s),unansweredQuestion=!['review','result'].includes(s.phase)?s.question??fallbackQuestion(s):null;
    s.retractions.push({key:f.key,sourceId:f.sourceId,feature:f.feature,quote:f.quote});
    s.facts=s.facts.filter(x=>x.key!==f.key && !(f.feature && x.feature===f.feature && x.sourceId===f.sourceId));
    const phase=s.phase;invalidate(s);s.factRemovalUndo=undo;s.phase=unansweredQuestion?phase:'review';s.question=unansweredQuestion;s.needsPlan=false;s.failedAction=null;s.revision++;return s;
  }
  if(action.type==='remove_time') {
    if(!s.sessionTime)return s;
    if(s.retractions.length>=64)throw failure('В этом разговоре уже слишком много исправлений. Начни новый подбор.');
    const time=s.sessionTime,unansweredQuestion=!['review','result'].includes(s.phase)?s.question??fallbackQuestion(s):null,phase=s.phase;
    s.retractions.push({kind:'session_time',sourceId:time.sourceId,quote:time.quote,at:s.turns.at(-1)?.id});s.sessionTime=null;
    s.facts=s.facts.filter(f=>!isSessionTimeSourceRetracted(f.sourceId,s)||!isSessionTimeFact(f,s));
    invalidate(s);s.phase=unansweredQuestion?phase:'review';s.question=unansweredQuestion;s.needsPlan=false;s.failedAction=null;s.revision++;return s;
  }
  if(s.turns.length>=TURN_LIMIT)throw failure('Разговор получился длинным. Проверь понимание и посмотри варианты или начни новый подбор.');
  if(action.type==='context') {
    // Saving conditions is not an answer to the question currently on screen.
    // Keep its ID so an unsent client draft remains visible and can be submitted explicitly.
    const unansweredQuestion=s.phase==='talk'?s.question:null;
    const ctx={...s.context,...Object.fromEntries(['platform','company','partySize'].filter(k=>action[k]!=null).map(k=>[k,action[k]]))};
    if(!PLATFORMS[ctx.platform]||!['solo','friend','group'].includes(ctx.company)||ctx.company==='group'&&!['2','3','4','5+'].includes(ctx.partySize))throw failure('Проверь платформу и количество игроков.');
    ctx.partySize=ctx.company==='solo'?null:ctx.company==='friend'?'2':ctx.partySize;
    const supersedes=s.turns.filter(t=>contextIds.has(t.question.id)&&!t.superseded).map(t=>t.id);
    for(const t of s.turns)if(supersedes.includes(t.id))t.superseded=true;
    s.facts=s.facts.filter(f=>!supersedes.includes(f.sourceId));
    if(s.sessionTime&&supersedes.includes(s.sessionTime.sourceId))s.sessionTime=null;
    s.context=ctx; s.revision++; s.turns.push({id:`${s.id}:${s.revision}`,question:question('context','Условия вечера',[]),selected:[],kind:'answer',text:'',answer:`Платформа: ${ctx.platform}; компания: ${ctx.company}; игроков: ${ctx.partySize??1}`,context:ctx,supersedes,...(unansweredQuestion?{resumeQuestion:unansweredQuestion}:{})});
    invalidate(s); s.phase=unansweredQuestion?'talk':'review'; s.question=unansweredQuestion; s.needsPlan=false; return s;
  }
  const correcting=action.type==='correct';
  if(!correcting && action.type!=='answer')throw failure('Неизвестное действие');
  const q=correcting?question(`correction:${s.revision+1}`,'Что нужно изменить?',[]):s.question;
  if(!q || !correcting&&action.questionId!==q.id)throw failure('Этот вопрос уже изменился. Ответь на текущий.');
  const kind=correcting?'answer':controls.includes(action.kind)?action.kind:'answer';
  const ids=Array.isArray(action.selected)?[...new Set(action.selected)]:[];
  const selected=kind==='answer'?(q.options??[]).filter(o=>ids.includes(o.id)).map(({id,label})=>({id,label})):[];
  if(ids.length>selected.length && kind==='answer' || !q.multiple&&selected.length>1)throw failure('Проверь выбранные варианты ответа.');
  const text=clean(action.text);
  if(kind==='answer'&&!text&&!selected.length)throw failure('Выбери вариант, напиши свой ответ или пропусти вопрос.');
  if(contextIds.has(q.id)&&!selected.length)throw failure('Для этого условия выбери один из доступных вариантов.');
  s.revision++;
  const answer=[...(kind==='answer'?selected.map(o=>o.label):[neutral[kind]]),text].filter(Boolean).join('; ');
  const turn={id:`${s.id}:${s.revision}`,question:q,selected,text,kind,answer};
  s.turns.push(turn); invalidate(s); if(correcting){s.facts=[];s.sessionTime=null;} localFacts(s,turn);
  s.context=activeContext(s.turns);
  if(q.id==='direction'){s.phase='platform';s.question=platformQuestion();s.needsPlan=false;}
  else if(q.id==='platform'){s.phase='company';s.question=companyQuestion();s.needsPlan=false;}
  else if(q.id==='company'&&s.context.company==='group'){s.phase='party';s.question=partyQuestion();s.needsPlan=false;}
  else {s.phase='talk';s.question=null;s.needsPlan=true;}
  return s;
}

const stances = new Set(['want','avoid','require','exclude','indifferent','unknown','conditional','history']);
function checkedFacts(s, list, dict) {
  if(!Array.isArray(list)||list.length>16)throw failure('Не удалось проверить понимание ответа.');
  const keys=new Set(), sources=new Map(s.turns.map(t=>[t.id,t]));
  return list.map(f=>{
    if(!f||!clean(f.key,60)||keys.has(f.key)||!stances.has(f.stance)||!['today','history'].includes(f.scope)
      ||!clean(f.text,240)||!clean(f.quote,400))throw failure('Не удалось проверить основания вывода.');
    keys.add(f.key); const turn=sources.get(f.sourceId), quote=clean(f.quote,400);
    if(!turn||turn.superseded||!turn.answer.includes(quote))throw failure('Вывод не подтверждён действующими ответами.');
    if(turn.kind!=='answer'&&!turn.text && !['unknown','indifferent'].includes(f.stance))throw failure('Неопределённый ответ нельзя превращать в предпочтение.');
    if(f.feature!==null&&!dict.featureById.has(f.feature))throw failure('Неизвестный признак игры.');
    if(f.exposure!==null&&!['unplayed','started','finished','dropped'].includes(f.exposure))throw failure('Неизвестный статус знакомства с игрой.');
    const gameIntent=f.gameIntent??null;
    if(![null,'return','replay','reference'].includes(gameIntent))throw failure('Неизвестное намерение для знакомой игры.');
    if(['return','replay'].includes(gameIntent)&&(f.scope!=='today'||!['want','conditional'].includes(f.stance)||typeof f.gameId!=='string'||!clean(f.gameId,80)))
      throw failure('Возвращение к игре должно быть подтверждено сегодняшним желанием и проверенным названием.');
    if(s.retractions.some(r=>r.kind!=='session_time'&&r.sourceId===f.sourceId&&(r.key===f.key || r.feature&&r.feature===f.feature || r.quote===quote)))throw failure('Этот вывод уже снят тобой.');
    if(isSessionTimeSourceRetracted(f.sourceId,s)&&isSessionTimeFact(f,s))throw failure('Это ограничение времени уже снято тобой.');
    return {key:clean(f.key,60),text:clean(f.text,240),stance:f.stance,scope:f.scope,sourceId:f.sourceId,quote,
      feature:f.feature,gameId:typeof f.gameId==='string'?clean(f.gameId,80):null,exposure:f.exposure,gameIntent};
  });
}

export function applyConversationProposal(state, proposal, dict, expectedRevision=state.revision) {
  try {
    if(expectedRevision!==state.revision)throw failure('Пришёл ответ на предыдущую версию запроса.');
    const facts=checkedFacts(state,proposal?.facts,dict);
    const checkedTime=validateSessionTime(proposal?.sessionTime,state);if(checkedTime.error)throw failure(checkedTime.error);
    if(!['question','review'].includes(proposal?.action)||typeof proposal.summary!=='string'||!Array.isArray(proposal.uncertainties))throw failure('Неполный ответ помощника.');
    let next=null;
    if(proposal.action==='question') {
      const q=proposal.question;
      if(!q || !clean(q.id,60)||!clean(q.title,220)||!Array.isArray(q.options)||q.options.length>6||typeof q.multiple!=='boolean'
        || q.options.some(o=>!clean(o?.id,60)||!clean(o?.label,100))||new Set(q.options.map(o=>o.id)).size!==q.options.length)throw failure('Не удалось подготовить следующий вопрос.');
      const lastCorrection=state.turns.findLastIndex(t=>t.question.id.startsWith('correction:'));
      if(state.mode==='guided'&&state.turns.slice(lastCorrection+1).some(t=>t.question.id===q.id&&t.kind!=='none'))throw failure('Этот вопрос уже был отвечен.');
      next={id:clean(q.id,60),title:clean(q.title,220),why:clean(q.why,220),options:q.options.map(o=>({id:clean(o.id,60),label:clean(o.label,100)})),multiple:q.multiple,controls};
    } else if(state.mode==='guided'&&!state.turns.some(t=>!contextIds.has(t.question.id)&&t.question.id!=='direction')
      && (state.turns.find(t=>t.question.id==='direction')?.text.length??0)<80)throw failure('Одного направления пока недостаточно: уточним, что хочется от игры.');
    const effort=state.turns.filter(t=>!contextIds.has(t.question.id)).length;
    const capped=effort>=10;
    return {state:{...state,facts,sessionTime:checkedTime.time,factRemovalUndo:null,summary:clean(proposal.summary,1000),uncertainties:proposal.uncertainties.map(x=>clean(x,240)).filter(Boolean).slice(0,8),
      question:capped?null:next,phase:capped||!next?'review':'talk',needsPlan:false,provisional:capped&&Boolean(next),result:null}};
  }catch(e){return {state,error:e.message};}
}

export function conversationScreen(s) {
  const prefix={want:'Хочется',avoid:'Меньше',require:'Обязательно',exclude:'Исключить',indifferent:'Неважно',unknown:'Неясно',conditional:'При условии'};
  const common={summary:s.summary||s.facts.filter(f=>f.scope==='today').map(f=>`${prefix[f.stance]??''}: ${f.text}`).join('; '),facts:s.facts,uncertainties:s.uncertainties,
    context:s.context,sessionTime:s.sessionTime??null,canUndoFactRemoval:Boolean(s.factRemovalUndo),canBack:s.turns.length>0,provisional:Boolean(s.provisional),turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer}))};
  if(s.phase==='result')return {...common,type:'result',result:s.result};
  if(s.phase==='review')return {...common,type:'review'};
  return {...common,type:'question',question:s.question??fallbackQuestion(s)??question('extra','Что ещё важно учесть?',[], 'Можно перейти к пониманию запроса и посмотреть варианты.')};
}

export function conversationToLegacy(s, dict, catalog=null) {
  const legacy={...initialState(),domain:'game',step:'result',platform:s.context.platform??'windows'};
  const expand=id=>catalog?editionsOf(catalog,id):[id];
  const familiarity=normalizeFamiliar(s.familiar);
  // Returning is a supported current decision, never inferred from liking or a title example.
  const returnToIds=[...new Set([...familiarity.keep,...s.facts.filter(f=>f.scope==='today'&&['want','conditional'].includes(f.stance)
    &&['return','replay'].includes(f.gameIntent)&&f.gameId).map(f=>f.gameId)])];
  const keep=new Set(returnToIds.flatMap(expand));
  const today=s.facts.filter(f=>f.scope==='today'), signal=(stances)=>today.filter(f=>f.feature&&dict.featureById.has(f.feature)&&stances.includes(f.stance)).map(f=>({f:f.feature,evidence:f.quote}));
  legacy.situation={...legacy.situation,company:s.context.company,partySize:s.context.partySize,note:clean(s.summary,300)};
  // Known completed titles are excluded individually. Beginning/abandoning a game is not a negative rating.
  for(const f of s.facts)if(f.gameId&&f.exposure==='finished'&&!keep.has(f.gameId))legacy.answers[f.gameId]={reaction:'known',text:f.quote};
  legacy.preferences=s.facts.filter(f=>f.scope==='history'&&f.stance==='want'&&f.feature).map(f=>({f:f.feature}));
  const genres=today.filter(f=>f.stance==='want'||f.stance==='require').flatMap(f=>directions.filter(d=>d[3]&&(f.key===`direction:${d[0]}`||f.quote===d[1])).map(d=>d[3]));
  legacy.session={...legacy.session,goalDriven:true,excludeSeries:false,goalWants:signal(['want','require']),goalAvoids:signal(['avoid','exclude']),
    ...(s.sessionTime?{minutes:s.sessionTime.minutes}:{}),
    goalRequires:signal(['require']),goalExcludes:signal(['exclude']),genreWants:[...new Set(genres)],
    notNow:[...new Set([...today.filter(f=>f.stance==='exclude'&&f.gameId).flatMap(f=>expand(f.gameId)),
      ...[...familiarity.excluded,...familiarity.hidden].flatMap(expand).filter(id=>!keep.has(id))])]};
  legacy.conversation={revision:s.revision,summary:s.summary,facts:s.facts,sessionTime:s.sessionTime??null,uncertainties:s.uncertainties,retractions:s.retractions,
    familiarity:{returnToIds,hiddenIds:familiarity.hidden,excludedIds:familiarity.excluded},
    turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer,kind:t.kind,superseded:Boolean(t.superseded)}))};
  return legacy;
}
