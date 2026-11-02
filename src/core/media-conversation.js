// Separate media adapter: today's evidence never silently becomes permanent taste.
import { initialState } from './dialogue.js';
import { validateSessionTime, currentSessionMinutes, isSessionTimeSourceRetracted } from './session-time.js';

const domains = ['film','series','cartoon'];
const controls = ['unknown','indifferent','none'];
const neutral = {unknown:'Пока не знаю',indifferent:'Не принципиально',none:'Ни один вариант не подходит'};
const stances = ['want','avoid','require','exclude','indifferent','unknown','conditional','history'];
const factFields = ['key','text','stance','scope','sourceId','quote','feature','titleId','exposure','titleIntent'];
const fields = ['company','childAge','timeMode','commitment','onlyEnded','format'];
const values = {company:['solo','adults','children'],timeMode:['runtime','episode','session'],commitment:['single','short','long','open'],format:['movie','episodic']};
const blankContext = () => ({company:null,childAge:null,minutes:null,timeMode:null,commitment:null,onlyEnded:null,format:null});
const blankEvidence = () => Object.fromEntries(fields.map(k=>[k,null]));
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
const endedQuestion=()=>({...q('only_ended','Сериал должен быть полностью закончен?',endedOptions,'Законченная история может быть и в ещё выходящем сериале. Уточню, какой статус тебе подходит.'),multiple:false});
const isEndedQuestion=value=>value?.id==='only_ended'&&value.options?.length===2&&endedOptions.every(([id,label])=>value.options.some(o=>o.id===id&&o.label===label));
const direction = domain => q('direction',domain==='series'?'Какой сериал хочется сегодня?':domain==='cartoon'?'Какую анимацию хочется сегодня?':'Какой фильм хочется сегодня?',[
  ['comedy','Комедия'],['drama','Драма'],['thriller','Триллер'],['adventure','Приключения'],['fantasy','Фантастика'],['detective','Детектив'],
],'Выбери направления или опиши своими словами. Можно пока не знать.');
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
  return {changedIds:ids(value.changedIds,4),unresolvedIds:ids(value.unresolvedIds,4),notice:clean(value.notice,240)};
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
    ||typeof value.multiple!=='boolean'||!Array.isArray(value.options)||value.options.length>6
    ||value.options.some(o=>!object(o)||!text(o.id,100)||!text(o.label,100))
    ||new Set(value.options.map(o=>o.id)).size!==value.options.length||!Array.isArray(value.controls)||value.controls.some(v=>!controls.includes(v)))throw fail('Не удалось подготовить вопрос.');
  if(planner&&(!exactKeys(value,['id','title','why','options','multiple','controls'])||value.controls.length!==3||new Set(value.controls).size!==3
    ||value.options.some(o=>!exactKeys(o,['id','label']))))throw fail('Некорректная форма вопроса.');
  return {id:value.id,title:value.title,why:value.why,options:value.options.map(o=>({id:o.id,label:o.label})),multiple:value.multiple,controls:[...value.controls],...(value.allowText===false?{allowText:false}:{})};
}
function sourceFor(s,value) {
  if(!object(value)||!text(value.sourceId,100)||!text(value.quote,400))throw fail('Не удалось проверить источник вывода.');
  const source=s.turns.find(t=>t.id===value.sourceId&&!t.superseded);
  if(!source||!source.answer.includes(value.quote))throw fail('Вывод не подтверждён точной цитатой действующего ответа.');
  return source;
}
const retractedContext = (s,key,sourceId) => s.retractions.some(r=>r.kind==='context'&&r.key===key&&(r.sourceId===sourceId
  ||s.turns.findIndex(t=>t.id===sourceId)<=s.turns.findIndex(t=>t.id===r.at)));
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
const movieRequest=quote=>/(?:нуж(?:ен|на|но)|хочу|только)\s+(?:од(?:ин|ну)\s+)?(?:полнометражн\p{L}*\s+)?(?:мульт)?фильм/u.test(folded(quote));
function movieEvidence(quote,source) {
  return contextEvidenceAllowed(quote,source)&&/(?:мульт)?фильм|полнометраж/u.test(folded(quote))
    &&!/(?:не\s+(?:нуж(?:ен|на|но)|хочу|буду)|без|вместо)\s+.*(?:фильм|полнометраж)|не\s+(?:фильм|мультфильм|полнометраж)|(?:или|либо)\s+(?:сериал|эпизод)/u.test(folded(quote));
}
function contextMeaning(key,value,quote,source) {
  if(source.question.id==='context'&&Object.hasOwn(source.context??{},key))return source.context[key]===value&&quote===contextQuote(key,value)
    &&source.contextQuotes?.[key]===quote;
  if(!contextEvidenceAllowed(quote,source))return false;
  const t=folded(quote);
  if(key==='company') {
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
  if(key==='timeMode')return value==='episode'?/эпизод|сери[яиюй]/u.test(t):value==='runtime'?/фильм|полнометраж|хронометраж/u.test(t):/сегодня|сейчас|вечер|есть.*(?:минут|час)|могу\s+(?:по)?смотр/u.test(t)||/сегодня.*врем|врем.*сегодня/u.test(folded(source.question.title));
  if(key==='commitment')return value==='single'?/од(?:ин|ну)\s+(?:эпизод|серию)|на один вечер|одним (?:фильмом|вечером)/u.test(t)
    ||/од(?:ин|ну)\s+(?:полнометражн\p{L}*\s+)?(?:мульт)?фильм/u.test(t)&&movieEvidence(quote,source):value==='short'?/коротк\p{L}*\s+(?:(?:закончен|завершен)\p{L}*\s+)?(?:истори|сериал)|мини[- ]?сериал|ненадолго/u.test(t):value==='long'?/(?:готов|хочу|можно|не против).*(?:длинн\p{L}*\s+(?:истори|сериал)|много\s+сезон)|надолго/u.test(t):/любая (?:длина|длительность)|длина не важна|длительность не важна|неважно.*(?:сезон|длин)/u.test(t);
  if(key==='onlyEnded') {
    if(isEndedQuestion(source.question))return endedOptions.some(([id,label])=>source.selected?.some(o=>o.id===id&&o.label===label)&&quote===label&&value===(id==='yes'));
    return value?explicitEndedSeries(quote,source)
      :/можно.*(?:выходит|незакончен|продолжа)|необязательно.*закончен|статус не важен/u.test(t);
  }
  if(key==='format')return value==='episodic'?/сериал|эпизод|серии|серию/u.test(t):movieEvidence(quote,source);
  return false;
}
function checkedContext(s,value,{clarify=false}={}) {
  if(!exactKeys(value,fields))throw fail('Неполные условия просмотра.');
  const evidence=blankEvidence(),ctx=blankContext();let clarifyEnded=false;
  for(const key of fields) {
    const v=value[key];if(v===null)continue;
    if(!exactKeys(v,['value','sourceId','quote']))throw fail('Некорректное основание условий просмотра.');
    const source=sourceFor(s,v);
    if(retractedContext(s,key,v.sourceId))throw fail('Это условие не подтверждено действующим ответом или уже снято.');
    if(!contextMeaning(key,v.value,v.quote,source)) {
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
  if(value.quote===source.answer&&correctionMinutes(source,ctx)===value.minutes&&!isSessionTimeSourceRetracted(value.sourceId,s))return {...value};
  const mapped={...s,turns:s.turns.map(t=>({...t,answer:watchTime(t.answer),question:{...t.question,title:watchTime(t.question.title)}}))};
  const checked=validateSessionTime({...value,quote:watchTime(value.quote)},mapped);
  if(!checked.error)return {...value};
  // Explicit runtime caps are different from a whole-series duration or its commitment.
  const t=folded(value.quote),match=t.match(/^(?:(?:хочу|нужен|нужны)\s+)?(?:на\s+)?(фильм|полнометражный фильм|эпизод(?:ы)?|сери[яиюй])\s+(?:по\s+)?(?:не больше|до|максимум)\s+(.+)$/u);
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

export function newMediaConversation({id,domain='film',mode}={}) {
  if(!domains.includes(domain))throw fail('Неизвестный раздел просмотра.');
  return {version:1,domain,id:clean(id,100)||crypto.randomUUID(),revision:0,mode:mode==='free'?'free':'guided',phase:'direction',context:blankContext(),contextEvidence:blankEvidence(),
    turns:[],facts:[],question:direction(domain),summary:'',uncertainties:[],retractions:[],sessionTime:null,result:null,provisional:false,needsPlan:false,failedAction:null,
    familiar:emptyFamiliar(),replacement:null,factRemovalUndo:null};
}
export function normalizeMediaConversation(input,expectedDomain) {
  if(input==null)return newMediaConversation({domain:expectedDomain??'film'});
  if(!object(input)||input.version!==1||!domains.includes(input.domain)||expectedDomain&&input.domain!==expectedDomain||!text(input.id,100)||!Number.isSafeInteger(input.revision)||input.revision<0
    ||!['guided','free'].includes(input.mode)||!['direction','talk','review','result'].includes(input.phase)||!Array.isArray(input.turns)||input.turns.length>24
    ||!Array.isArray(input.facts)||input.facts.length>16||!Array.isArray(input.retractions)||input.retractions.length>64||!Array.isArray(input.uncertainties)||input.uncertainties.length>8
    ||input.uncertainties.some(v=>typeof v!=='string'||v.length>240)||typeof input.summary!=='string'||input.summary.length>1000)throw fail('Сохранённый разговор не удалось прочитать. Начни новый подбор.');
  const s=structuredClone(input),seen=new Set();
  s.context=validateContext(s.context);s.contextEvidence=s.contextEvidence??blankEvidence();
  for(const t of s.turns) {
    if(!object(t)||!text(t.id,100)||seen.has(t.id)||typeof t.answer!=='string'||t.answer.length>2400||typeof t.text!=='string'||t.text.length>1600
      ||!['answer',...controls].includes(t.kind)||!Array.isArray(t.selected)||t.selected.length>6||t.selected.some(o=>!text(o?.id,100)||!text(o?.label,100))
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
      if(!source||!text(v.quote,400)||!source.answer.includes(v.quote)||!contextMeaning(key,v.value,v.quote,source))throw fail('Сохранённое условие не подтверждено ответом.');
      ctx[key]=v.value;
    }
    validateContext(ctx);
    if(t.acceptedTime!=null)checkedTime({...s,retractions:[],turns:s.turns.map(source=>({...source,superseded:false}))},t.acceptedTime,ctx);
  }
  if(s.retractions.some(r=>!object(r)||!text(r.sourceId,100)||r.key!=null&&!text(r.key,100)||r.quote!=null&&!text(r.quote,400)||r.at!=null&&!text(r.at,100)))throw fail('Некорректные снятые условия.');
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
    const undo=normalizeMediaConversation({...s.factRemovalUndo,factRemovalUndo:null},s.domain);s.factRemovalUndo=Object.fromEntries(Object.entries(undo).filter(([k])=>k!=='factRemovalUndo'));
  }
  if(![null,undefined,'plan','pick','replace'].includes(s.failedAction))throw fail('Некорректное действие восстановления.');
  s.failedAction=s.failedAction??null;s.uncertainties=scopedUncertainties(s,s.uncertainties);return s;
}
export function mediaFallbackQuestion(s) {
  const answered=new Set(s.turns.filter(t=>!t.superseded&&t.kind!=='none').map(t=>t.question.id));
  if(s.context.company==='children'&&s.context.childAge===null&&!answered.has('child_age'))return q('child_age','Сколько лет самому младшему зрителю?',[],'Возраст поможет проверить доступные сведения. Если пригодность неизвестна, я это отмечу.');
  const list=[q('experience','Какое впечатление хочется получить?', [['warm','Тёплая история'],['intrigue','Интрига'],['laugh','Посмеяться'],['adventure','Приключение']], 'Направление можно уточнить своими словами.'),
    ...(s.domain==='series'?[q('commitment','На какую историю сейчас готов?',[['single','Один эпизод'],['short','Короткий сериал'],['long','Готов к длинной истории'],['open','Длина не важна']], 'Это про общую историю, а не про свободные минуты сегодня.')]:[]),
    q('avoidance','Что может испортить этот просмотр?',[],'Если ограничений нет, так и напиши.'),q('reference','Есть история, которую хочется взять за ориентир?',[],'Название — только пример. Напиши, что именно хочется сохранить.')];
  return list.find(question=>!answered.has(question.id))??null;
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
  if(action.type==='restart')return newMediaConversation({domain:s.domain,mode:s.mode});
  if(!action.type)return s;
  if(action.type==='undo_fact_removal')return s.factRemovalUndo?{...structuredClone(s.factRemovalUndo),revision:s.revision+1,factRemovalUndo:null,failedAction:null}:s;
  if(['familiar_mark','familiar_unmark','familiar_keep','replace_familiar','undo_replacement'].includes(action.type)) {
    if(s.phase!=='result'||!s.result?.top)throw fail('Это действие доступно на вариантах результата.');
    if(action.type==='undo_replacement') {const undo=s.familiar.undo;if(!undo)return s;s.result=undo.result;s.familiar={...s.familiar,marked:undo.marked,keep:undo.keep,hidden:undo.hidden,undo:null};s.replacement=undo.replacement;}
    else if(action.type!=='replace_familiar') {
      if(!cards(s.result).some(c=>c.id===action.id))throw fail('Этого произведения нет среди текущих вариантов.');
      if(action.type==='familiar_mark'){s.familiar.marked=ids([...s.familiar.marked,action.id],4);s.familiar.keep=s.familiar.keep.filter(id=>id!==action.id);}
      else {s.familiar.marked=s.familiar.marked.filter(id=>id!==action.id);if(action.type==='familiar_keep')s.familiar.keep=ids([...s.familiar.keep,action.id]);}
    }
    return {...s,revision:s.revision+1,needsPlan:false,failedAction:null,factRemovalUndo:null};
  }
  if(action.type==='retry')return {...s,needsPlan:s.failedAction==='plan'||!['review','result'].includes(s.phase)};
  if(action.type==='review')return {...s,revision:s.revision+1,phase:'review',question:null,needsPlan:false,provisional:s.needsPlan||!s.summary};
  if(action.type==='confirm') {if(!['review','result'].includes(s.phase))throw fail('Сначала проверь понимание запроса.');return {...s,revision:s.revision+1,needsPlan:false,factRemovalUndo:null};}
  if(action.type==='continue') {invalidate(s);return {...s,revision:s.revision+1,phase:'talk',question:q('extra','Что ещё важно учесть?',[],'Добавь пожелание своими словами.'),needsPlan:false};}
  if(action.type==='back') {
    if(!s.turns.length)return s;const removed=s.turns.pop();for(const t of s.turns)if(removed.supersedes?.includes(t.id))t.superseded=false;
    const active=new Set(s.turns.map(t=>t.id));s.facts=s.facts.filter(f=>active.has(f.sourceId));
    s.retractions=s.retractions.flatMap(r=>r.at&&!active.has(r.at)?['session_time','context'].includes(r.kind)?[{...r,at:s.turns.at(-1)?.id}]:[]:[r]);
    refreshContext(s);invalidate(s);s.question=removed.resumeQuestion??removed.question;s.phase=s.question.id==='direction'?'direction':'talk';s.needsPlan=false;s.revision++;return s;
  }
  if(action.type==='remove_fact'||action.type==='remove_time') {
    const key=action.type==='remove_time'?'session_time':action.key,f=s.facts.find(f=>f.key===key),contextKey=key?.startsWith('context:')?key.slice(8):null;
    if(!f&&key!=='session_time'&&!fields.includes(contextKey)||key==='session_time'&&!s.sessionTime||contextKey&&!s.contextEvidence[contextKey])return s;
    const derivedFormat=f?.feature===null&&f?.titleId===null&&s.contextEvidence.format?.sourceId===f.sourceId&&s.contextEvidence.format?.quote===f.quote;
    if(s.retractions.length+(derivedFormat?2:1)>64)throw fail('Слишком много исправлений. Начни новый подбор.');
    const undo=Object.fromEntries(Object.entries(structuredClone(s)).filter(([k])=>k!=='factRemovalUndo'));
    if(key==='session_time') {s.retractions.push({kind:'session_time',sourceId:s.sessionTime.sourceId,quote:s.sessionTime.quote,at:s.turns.at(-1)?.id});s.sessionTime=null;s.context.minutes=null;s.context.timeMode=null;s.contextEvidence.timeMode=null;}
    else if(contextKey) {const e=s.contextEvidence[contextKey];s.retractions.push({kind:'context',key:contextKey,sourceId:e.sourceId,quote:e.quote,at:s.turns.at(-1)?.id});s.context[contextKey]=null;s.contextEvidence[contextKey]=null;
      if(contextKey==='format')s.facts=s.facts.filter(f=>!(f.feature===null&&f.titleId===null&&f.stance==='require'&&f.sourceId===e.sourceId&&f.quote===e.quote));
      if(contextKey==='company'){s.context.childAge=null;s.contextEvidence.childAge=null;}}
    else {
      s.facts=s.facts.filter(x=>x.key!==f.key&&!(f.feature&&x.feature===f.feature&&x.sourceId===f.sourceId));
      s.retractions.push({key:f.key,sourceId:f.sourceId,quote:f.quote,feature:f.feature,...(f.feature===null&&f.titleId===null?{kind:'untyped_source',
        allowedFacts:structuredClone(s.facts.filter(x=>x.sourceId===f.sourceId&&x.feature===null&&x.titleId===null))}:{})});
      if(derivedFormat){s.retractions.push({kind:'context',key:'format',sourceId:f.sourceId,quote:f.quote,at:s.turns.at(-1)?.id});s.context.format=null;s.contextEvidence.format=null;}
    }
    const prior=s.phase,question=!['review','result'].includes(prior)?s.question??mediaFallbackQuestion(s):null;invalidate(s);s.factRemovalUndo=undo;s.phase=question?prior:'review';s.question=question;s.needsPlan=false;s.revision++;return s;
  }
  if(s.turns.length>=24)throw fail('Разговор получился длинным. Проверь понимание или начни новый подбор.');
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
    for(const key of Object.keys(action.context))if(action.context[key]===null&&key!=='minutes'&&fields.includes(key))s.retractions.push({kind:'context',key,sourceId:id,quote:'Условия просмотра сняты',at:id});
    if(action.context.minutes===null)s.retractions.push({kind:'session_time',sourceId:id,quote:'Условия просмотра сняты',at:id});
    invalidate(s);s.phase=resumeQuestion?'talk':'review';s.question=resumeQuestion;s.needsPlan=false;return s;
  }
  const correcting=action.type==='correct';if(!correcting&&action.type!=='answer')throw fail('Неизвестное действие.');
  const question=correcting?q(`correction:${s.revision+1}`,'Что нужно изменить?'):s.question;
  if(!question||!correcting&&action.questionId!==question.id)throw fail('Вопрос уже изменился. Ответь на текущий.');
  if(action.text!=null&&(typeof action.text!=='string'||action.text.length>1600)||action.selected!=null&&(!Array.isArray(action.selected)||action.selected.length>6||action.selected.some(id=>typeof id!=='string')))throw fail('Ответ слишком длинный или имеет неверную форму.');
  const kind=correcting?'answer':controls.includes(action.kind)?action.kind:'answer',chosen=ids(action.selected??[],6),selected=kind==='answer'?question.options.filter(o=>chosen.includes(o.id)):[];
  if(kind==='answer'&&(selected.length!==chosen.length||!question.multiple&&selected.length>1))throw fail('Проверь выбранные ответы.');
  const own=clean(action.text);if(kind==='answer'&&!selected.length&&!own)throw fail('Напиши ответ, выбери вариант или пропусти вопрос.');
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
  if(correcting&&s.sessionTime&&(correctionMinutes(turn,s.context)!==null||/(?:сегодня|сейчас).*(?:есть|не больше|максимум).*?(?:минут|мин(?!\p{L})|час)|(?:фильм|эпизод|сери[яиюй]).*(?:не больше|до|максимум).*?(?:минут|мин(?!\p{L})|час)/iu.test(own))) {
    if(s.retractions.length>=64)throw fail('Слишком много исправлений. Начни новый подбор.');
    s.retractions.push({kind:'session_time',sourceId:s.sessionTime.sourceId,quote:s.sessionTime.quote,at:s.turns.at(-1)?.id});s.sessionTime=null;s.context.minutes=null;
  }
  s.revision++;s.turns.push(turn);
  invalidate(s);s.phase='talk';s.question=null;s.needsPlan=true;return s;
}

export function applyMediaConversationProposal(state,proposal,dict,expectedRevision=state.revision) {
  try {
    if(expectedRevision!==state.revision)throw fail('Пришёл ответ на предыдущую версию запроса.');
    if(!exactKeys(proposal,['summary','facts','uncertainties','action','question','context','sessionTime'])||typeof proposal.summary!=='string'||proposal.summary.length>1000
      ||!Array.isArray(proposal.uncertainties)||proposal.uncertainties.length>8||proposal.uncertainties.some(v=>typeof v!=='string'||v.length>240)||!['question','review'].includes(proposal.action))throw fail('Неполный ответ помощника.');
    let facts=checkedFacts(state,proposal.facts,dict);
    const checked=checkedContext(state,proposal.context,{clarify:true}),sessionTime=checkedTime(state,proposal.sessionTime,checked.context);
    // A hard explicit movie request remains an eligibility constraint even if the
    // planner omitted its scalar slot. Derive it only from that fact's own active
    // exact evidence; history, examples and soft/or alternatives do not qualify.
    const requiredMovies=facts.filter(f=>f.scope==='today'&&f.stance==='require'&&f.feature===null&&f.titleId===null&&movieRequest(f.quote));
    for(const f of requiredMovies)if(retractedContext(state,'format',f.sourceId)||!contextMeaning('format','movie',f.quote,sourceFor(state,f)))throw fail('Формат фильма не подтверждён действующим ответом или уже снят.');
    if(requiredMovies.length&&checked.context.format!=='movie') {
      if(checked.context.format!==null)throw fail('В условиях одновременно указаны фильм и сериал. Уточни нужный формат.');
      const f=requiredMovies[0];checked.context.format='movie';checked.evidence.format={value:'movie',sourceId:f.sourceId,quote:f.quote};
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
      question=checkedQuestion(proposal.question,{planner:true});
      if(state.mode==='guided'&&state.turns.some(t=>!t.superseded&&t.question.id===question.id&&t.kind!=='none'))throw fail('Этот вопрос уже был отвечен.');
      if((question.id==='child_age'||/сколько.*лет.*(?:реб|дет)|возраст.*(?:реб|дет)/iu.test(question.title))&&checked.context.company!=='children')throw fail('Возраст ребёнка спрашивается только при просмотре с детьми.');
    } else {
      if(proposal.question!==null)throw fail('В проверке понимания вопрос должен отсутствовать.');
      const meaningful=state.turns.filter(t=>!t.superseded&&t.question.id!=='context');
      if(state.mode==='guided'&&meaningful.length===1&&meaningful[0].question.id==='direction'&&meaningful[0].text.length<60)throw fail('Одного направления мало: уточним желаемое впечатление.');
    }
    if(clarifyEnded)question=endedQuestion();
    const uncertainties=[...(clarifyEnded?[endedUncertainty]:[]),...proposal.uncertainties];
    if(checked.context.childAge!==null)uncertainties.push('Возрастная пригодность проверяется по доступной разметке; если данных нет, она остаётся неизвестной.');
    if(sessionTime)uncertainties.push(state.domain==='series'||checked.context.format==='episodic'?'Длительность относится к эпизоду. Неизвестный хронометраж требует проверки.':'Если длительность произведения неизвестна, попадание в лимит времени не подтверждено.');
    const contextScope={domain:state.domain,context:checked.context};
    if(seriesContext(contextScope)&&(checked.context.commitment!==null||checked.context.onlyEnded!==null))uncertainties.push(seriesUncertainty);
    const turns=structuredClone(state.turns);if(turns.length){turns.at(-1).acceptedContext=structuredClone(checked.evidence);turns.at(-1).acceptedTime=structuredClone(sessionTime);}
    return {state:{...state,turns,facts,context:checked.context,contextEvidence:checked.evidence,sessionTime,summary:clarifyEnded?facts.map(f=>f.text).join(' ').slice(0,1000):proposal.summary.trim(),uncertainties:[...new Set(scopedUncertainties(contextScope,uncertainties))].slice(0,8),question,
      phase:question?'talk':'review',needsPlan:false,provisional:false,result:null,failedAction:null,factRemovalUndo:null}};
  } catch(e) {return {state,error:e.message};}
}
export function mediaConversationScreen(s) {
  const contextFacts=fields.filter(k=>s.contextEvidence?.[k]).map(k=>({key:`context:${k}`,text:s.contextEvidence[k].quote,sourceId:s.contextEvidence[k].sourceId,quote:s.contextEvidence[k].quote,stance:'require',scope:'today',feature:null,titleId:null,exposure:null,titleIntent:null}));
  const common={domain:s.domain,summary:s.summary||s.facts.filter(f=>f.scope==='today').map(f=>f.text).join('; '),facts:[...s.facts,...contextFacts],uncertainties:s.uncertainties,context:s.context,
    sessionTime:s.sessionTime??null,canBack:s.turns.length>0,canUndoFactRemoval:Boolean(s.factRemovalUndo),provisional:Boolean(s.provisional),turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer,superseded:Boolean(t.superseded)}))};
  if(s.phase==='result')return {...common,type:'result',result:s.result};if(s.phase==='review')return {...common,type:'review'};
  return {...common,type:'question',question:s.question??mediaFallbackQuestion(s)??q('extra','Что ещё важно учесть?',[],'Можно перейти к пониманию и посмотреть варианты.')};
}
export function mediaConversationToLegacy(s,dict,catalog=null) {
  if(!domains.includes(s.domain)||catalog&&catalog.domain?.id!==s.domain)throw fail('Раздел каталога не совпадает с разговором.');
  const legacy={...initialState(),domain:s.domain,step:'result'},f=familiar(s.familiar),today=s.facts.filter(f=>f.scope==='today');
  const excluded=today.filter(f=>f.stance==='exclude'&&f.titleId).map(f=>f.titleId),returnToIds=[...new Set([...f.keep,...today.filter(f=>['want','conditional'].includes(f.stance)&&['return','replay'].includes(f.titleIntent)&&f.titleId).map(f=>f.titleId)])].filter(id=>!excluded.includes(id)),keep=new Set(returnToIds);
  const signal=stances=>today.filter(f=>f.feature&&dict.featureById.has(f.feature)&&stances.includes(f.stance)).map(f=>({f:f.feature,evidence:f.quote}));
  legacy.situation={...legacy.situation,company:s.context.company==='children'?'kids':s.context.company==='adults'?'group':s.context.company,
    // Legacy feedback context uses nullable strings; media core keeps numeric age.
    childAge:s.context.company==='children'&&s.context.childAge!==null?String(s.context.childAge):null,onlyEnded:s.context.onlyEnded===true,note:clean(s.summary,300)};
  for(const fact of s.facts)if(fact.titleId&&fact.exposure==='finished'&&!keep.has(fact.titleId))legacy.answers[fact.titleId]={reaction:'known',text:fact.quote};
  legacy.preferences=s.facts.filter(f=>f.scope==='history'&&f.stance==='want'&&f.feature&&dict.featureById.has(f.feature)).map(f=>({f:f.feature}));
  legacy.session={...legacy.session,goalDriven:true,excludeSeries:false,goalWants:signal(['want','require']),goalAvoids:signal(['avoid','exclude']),goalRequires:signal(['require']),goalExcludes:signal(['exclude']),genreWants:[],
    ...(s.sessionTime?{minutes:s.sessionTime.minutes,maxRuntime:s.sessionTime.minutes}:{}),notNow:[...new Set([...excluded,...[...f.excluded,...f.hidden].filter(id=>!keep.has(id))])]};
  legacy.conversation={domain:s.domain,revision:s.revision,summary:s.summary,facts:s.facts,context:s.context,contextEvidence:s.contextEvidence,sessionTime:s.sessionTime??null,uncertainties:s.uncertainties,retractions:s.retractions,
    familiarity:{returnToIds,hiddenIds:f.hidden,excludedIds:f.excluded},turns:s.turns.map(t=>({id:t.id,question:t.question.title,answer:t.answer,kind:t.kind,superseded:Boolean(t.superseded)}))};
  return legacy;
}
