import {createHash} from 'node:crypto';
import {newMediaConversation,normalizeMediaConversation,answerMediaConversation,applyMediaConversationProposal,mediaConversationScreen,mediaConversationToLegacy} from '../core/media-conversation.js';
import {profileOf,sessionOf} from '../core/dialogue.js';
import {recommend,recommendIds,rankAll} from '../core/recommend.js';
import {editionsOf,makeCatalog} from '../core/catalog.js';
import {aiMediaConversation} from '../ai/media-conversation.js';
import {aiPick} from '../ai/pick.js';
import {AI} from '../ai/config.js';
import {estimateCost} from '../ai/usage.js';
import {createConversationMediaIdentity} from './conversation-media-identity.js';

const DOMAINS=new Set(['film','series','cartoon']);
const FORMAT_UNKNOWN='У части произведений формат не указан в каталоге: они не включены при выборе фильма или сериала.';
const bad=message=>Object.assign(Error(message),{status:400});
const cardsOf=result=>[result?.top,...(result?.alternatives??[])].filter(Boolean);
const contextual=s=>{const state={...s,phase:'talk',provisional:true};return {...state,question:s.question??mediaConversationScreen(state).question};};

// One scoped controller per media catalog. The injected transport is the same guarded transport as game AI.
export function createMediaConversationService({domain,catalogs,plan=aiMediaConversation,pick=aiPick,api,access=()=>({allowed:true}),spend=()=>{},journal=()=>{},now=Date.now}={}) {
  if(!DOMAINS.has(domain)||catalogs?.[domain]?.domain?.id!==domain)throw bad('Недоступный раздел просмотра.');
  const catalog=catalogs[domain],cache=new Map(),running=new Map(),formatCatalogs=new Map(),identities=createConversationMediaIdentity(catalog);
  // Format is an explicit media constraint. Preserve the base catalog for reference identities;
  // shortlist, deterministic sieves and model-owned additions all see the same eligible view.
  function catalogFor(s) {
    const format=s.context?.format,kind=format==='movie'?'film':format==='episodic'?'series':null;
    if(!kind)return catalog;
    if(!formatCatalogs.has(format))formatCatalogs.set(format,makeCatalog({...catalog,items:catalog.items.filter(item=>item.kind===kind)},domain));
    return formatCatalogs.get(format);
  }
  const catalogsFor=s=>({...catalogs,[domain]:catalogFor(s)});
  const projection=s=>mediaConversationToLegacy(s,catalog.dict,catalog);
  const response=(state,extra={})=>{
    const unknown=state.context?.format&&catalog.items.some(item=>!['film','series'].includes(item.kind));
    state={...state,uncertainties:[...(unknown?[FORMAT_UNKNOWN]:[]),...state.uncertainties.filter(text=>text!==FORMAT_UNKNOWN)].slice(0,8)};
    return {state,screen:mediaConversationScreen(state),...(state.phase==='result'?{feedbackState:projection(state)}:{}),...extra};
  };
  function log(stage,s,out) {
    journal({at:new Date(now()).toISOString(),event:`media-conversation-${stage}`,data:{domain,id:s.id,revision:s.revision,mode:s.mode,model:out.model??AI.model,
      error:out.error??null,ms:out.ms??null,usage:out.usage?{in:out.usage.input_tokens,out:out.usage.output_tokens,
        cached:out.usage.input_tokens_details?.cached_tokens??0,estimatedUsd:estimateCost(out.usage,AI.model)}:null}});
  }
  function checkBody(body) {
    if(!body||typeof body!=='object'||Array.isArray(body)||body.domain!==domain)throw bad('Раздел запроса не совпадает с разделом подбора.');
    if(body.state!=null&&(typeof body.state!=='object'||Array.isArray(body.state)||body.state.domain!==domain))throw bad('Сохранённый подбор относится к другому разделу.');
  }
  function validateCards(result,s) {
    for(const card of cardsOf(result))if(!catalog.byId.has(card.id)||catalog.byId.get(card.id).domain!==domain||card.domain!=null&&card.domain!==domain)throw bad('Этой карточки нет в каталоге выбранного раздела.');
    for(const card of cardsOf(result))if(!catalogFor(s).byId.has(card.id))throw bad('В сохранённых вариантах есть произведение другого или неподтверждённого формата. Уточни условия просмотра.');
  }
  function validateSnapshot(s) {
    validateCards(s.result,s);validateCards(s.familiar?.undo?.result,s);
    const bound=identities.bindFacts(s,s.facts);
    if(bound.error)throw bad(bound.error);
    if(bound.facts.some(f=>f.feature!==null&&!catalog.dict.featureById.has(f.feature)))throw bad('В сохранённом понимании есть признак другого раздела.');
    s.facts=bound.facts;
    if(s.factRemovalUndo)validateSnapshot(s.factRemovalUndo);
    return s;
  }
  function remembered(body,s) {
    if(body.rememberedExclusions===undefined)return s;
    const list=body.rememberedExclusions;
    if(!Array.isArray(list)||list.length>500||list.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)))throw bad('Некорректный список знакомых произведений.');
    s.familiar.excluded=[...new Set(list.filter(id=>catalog.byId.get(id)?.domain===domain))];return s;
  }
  function caveats(card,s,legacy) {
    const item=catalog.byId.get(card.id),context=s.context??{},session=sessionOf(legacy);
    card.feasibility??=[];
    const add=(key,text)=>{if(!card.feasibility.some(f=>f.key===key))card.feasibility.push({key,status:'unknown',text});};
    if(context.minutes!=null&&item.runtime==null)add('minutes',`Длительность ${domain==='series'?'эпизода':'просмотра'} не проверена; сегодня есть ${context.minutes} мин.`);
    if(context.company==='children'&&context.childAge!=null)add('age','Возрастная пригодность по проверенному источнику пока не подтверждена.');
    if(context.onlyEnded&&item.status==null)add('ended','Статус завершения в каталоге не подтверждён.');
    if(domain==='series'&&['short','long'].includes(context.commitment)&&item.seasons==null&&item.episodes==null)add('commitment','Общий объём истории в каталоге не подтверждён.');
    if((session.goalExcludes??[]).length)add('excluded-features','Отсутствие исключённых особенностей не всегда подтверждено разметкой; проверь оговорку перед выбором.');
    return card;
  }
  function attach(card,p,s,legacy) {
    card.ai={reason:p?.reason,caveat:p?.caveat,likelySeen:p?.likelySeen,own:p?.own};
    card.labelText='Вариант по твоему запросу';return caveats(card,s,legacy);
  }
  async function replace(s,who) {
    const before=cardsOf(s.result),marked=new Set(s.familiar.marked.filter(id=>before.some(card=>card.id===id)));
    if(!marked.size)return response(s);
    const legacy=projection(s);
    legacy.session.notNow=[...new Set([...(legacy.session.notNow??[]),...before.flatMap(card=>editionsOf(catalog,card.id))])];
    const failed=(error,retryable=true)=>response({...s,failedAction:'replace'},{error,retryable});
    if(new Set([...s.familiar.hidden,...marked]).size>500)return failed('В этом подборе уже слишком много отметок. Начни новый подбор: явные сохранённые исключения останутся.',false);
    const eligibleCatalog=catalogFor(s),eligible=rankAll(eligibleCatalog,profileOf(legacy),sessionOf(legacy)).ranked;
    if(!eligible.length)return failed('Других подходящих вариантов пока нет. Оставь знакомое для возвращения или уточни запрос.',false);
    const sole=eligible.length===1;
    let out;
    if(sole)out={picks:[{id:eligible[0].game.id}]};
    else {
      const permission=access(who);if(!permission.allowed)return failed(`${permission.reason??'Помощник недоступен'}. Варианты и отметки сохранены.`,false);
      spend(who);
      try {out=await pick(catalogsFor(s),legacy,{...(api?{api}:{}),wish:s.summary,previous:before.map(card=>card.id)});}
      catch {out={error:'Не удалось заменить варианты. Варианты и отметки сохранены.'};}
      log('replace',s,out);if(out.error)return failed(out.error,out.retryable!==false);
    }
    const ids=[...new Set((out.picks??[]).map(p=>p.id))];
    const selected=recommendIds(eligibleCatalog,profileOf(legacy),sessionOf(legacy),ids),picks=new Map((out.picks??[]).map(p=>[p.id,p]));
    const used=new Set(),available=cardsOf(selected).filter(card=>{const work=catalog.byId.get(card.id)?.work??card.id;if(used.has(work))return false;used.add(work);return true;});
    if(!available.length)return failed('Не получилось найти подтверждённую замену. Прежние варианты и отметки сохранены.',false);
    const changedIds=[],unresolvedIds=[];
    const after=before.map(card=>{
      if(!marked.has(card.id))return card;
      const next=available.shift();if(!next){unresolvedIds.push(card.id);return card;}
      if(sole){next.replacementSource='engine';next.labelText='Единственный другой вариант по условиям';caveats(next,s,legacy);}
      else attach(next,picks.get(next.id),s,legacy);
      changedIds.push(card.id);return next;
    });
    const undo={result:s.result,marked:s.familiar.marked,keep:s.familiar.keep,hidden:s.familiar.hidden,replacement:s.replacement};
    const retainedIds=after.filter(card=>before.some(old=>old.id===card.id)).map(card=>card.id);
    const result={...s.result,top:after[0],alternatives:after.slice(1),ai:sole?s.result.ai?{...s.result.ai,mixed:true}:undefined:{understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist,mixed:retainedIds.length>0}};
    s={...s,result,failedAction:null,familiar:{...s.familiar,marked:unresolvedIds,hidden:[...new Set([...s.familiar.hidden,...changedIds])],undo},
      replacement:{changedIds,unresolvedIds,notice:[sole?'Доступен только один другой вариант по условиям. Он подобран по каталогу без нового обращения к модели.':'',unresolvedIds.length?'Часть отмеченных вариантов осталась: подтверждённых замен пока недостаточно.':''].filter(Boolean).join(' ')}};
    return response(s,{feedbackCarry:{retainedIds}});
  }
  async function handle(body,who) {
    let s=validateSnapshot(body.state?normalizeMediaConversation(body.state,domain):newMediaConversation({domain,mode:body.mode}));
    s=remembered(body,s);
    if(!body.action) {
      if(s.phase==='talk'&&!s.question)s.question=mediaConversationScreen(s).question;
      return response(s); // Explicit restore never pays, including pending/error states.
    }
    const action=body.action,beforeResult=s.result,priorExclusions=s.familiar.excluded;
    if(['familiar_mark','familiar_unmark','familiar_keep'].includes(action.type)&&catalog.byId.get(action.id)?.domain!==domain)throw bad('Этой карточки нет в каталоге выбранного раздела.');
    const replacing=action.type==='replace_familiar'||action.type==='retry'&&s.failedAction==='replace';
    const final=action.type==='confirm'||action.type==='retry'&&s.failedAction==='pick';
    s=answerMediaConversation(s,action);
    if(action.type==='restart'){s.familiar.excluded=priorExclusions;s=remembered(body,s);}
    if(replacing)return replace(s,who);
    if(action.type==='undo_replacement')return response(s,{feedbackCarry:{retainedIds:cardsOf(s.result).filter(card=>cardsOf(beforeResult).some(old=>old.id===card.id)).map(card=>card.id)}});
    const planning=!final&&s.needsPlan&&['answer','correct','retry'].includes(action.type);
    if(!final&&!planning)return response(s);
    const permission=access(who);
    if(planning) {
      if(!permission.allowed){s=contextual(s);s.needsPlan=false;s.failedAction='plan';return response(s,{error:`${permission.reason??'Помощник недоступен'}. Можно ответить на вопросы и посмотреть предварительные варианты.`,retryable:false});}
      spend(who);
      const resolved=identities.resolve(s);let out;
      try {out=await plan(catalogFor(s),s,{...(api?{api}:{}),knownTitles:resolved.knownTitles});}
      catch {out={error:'Не удалось разобрать ответ. Он сохранён; попробуй ещё раз.'};}
      log('plan',s,out);let checked;
      if(!out.error) {
        const bound=identities.bindFacts(s,out.proposal?.facts,resolved);
        if(bound.error)checked={error:bound.error};
        else {
          const uncertainties=[...new Set([...(out.proposal?.uncertainties??[]),...resolved.ambiguous.map(m=>`Уточни название «${m.quote}»: в этом разделе есть несколько разных произведений.`)])];
          checked=applyMediaConversationProposal(s,{...out.proposal,facts:bound.facts,uncertainties},catalog.dict,s.revision);
        }
      }
      const error=out.error??checked?.error;
      if(error){s=contextual(s);s.failedAction='plan';s.needsPlan=true;return response(s,{error,retryable:out.retryable!==false});}
      s=checked.state;s.failedAction=null;return response(s);
    }
    const legacy=projection(s);
    if(!permission.allowed) {
      const result=recommend(catalogFor(s),profileOf(legacy),sessionOf(legacy));
      if(!result.top)return response({...s,phase:'review',failedAction:'pick'},{error:'По этим условиям пока не нашлось доступных вариантов. Уточни условия или разреши вернуться к знакомому.',retryable:false});
      for(const card of cardsOf(result))caveats(card,s,legacy);
      s={...s,phase:'result',result,provisional:true,failedAction:null};
      s.uncertainties=[...new Set([...s.uncertainties,'Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.'])];return response(s);
    }
    spend(who);let out;
    try {out=await pick(catalogsFor(s),legacy,{...(api?{api}:{}),wish:s.summary,previous:[]});}
    catch {out={error:'Не удалось получить рекомендации. Запрос сохранён.'};}
    log('pick',s,out);
    if(out.error)return response({...s,phase:'review',failedAction:'pick'},{error:out.error,retryable:out.retryable!==false});
    const ids=[...new Set((out.picks??[]).map(p=>p.id))],cards=recommendIds(catalogFor(s),profileOf(legacy),sessionOf(legacy),ids);
    if(!cards)return response({...s,phase:'review',failedAction:'pick'},{error:'По этим условиям пока не нашлось подтверждённых вариантов. Можно уточнить или изменить запрос.',retryable:false});
    cards.alternatives=cards.alternatives.slice(0,3);
    const byId=new Map((out.picks??[]).map(p=>[p.id,p]));for(const card of cardsOf(cards))attach(card,byId.get(card.id),s,legacy);
    cards.ai={understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist};
    s={...s,phase:'result',result:cards,question:null,needsPlan:false,failedAction:null};return response(s);
  }
  return async(body={},who={})=>{
    checkBody(body);
    if(!body.action)return handle(body,who);
    const key=createHash('sha256').update(JSON.stringify([domain,who.uid??who.ip??null,body])).digest('hex');
    const hit=cache.get(key);if(hit&&now()-hit.at<3_600_000)return structuredClone(hit.out);
    if(running.has(key))return structuredClone(await running.get(key));
    const promise=handle(body,who).then(out=>{
      if(!out.error){for(const[k,v]of cache)if(now()-v.at>=3_600_000)cache.delete(k);if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{at:now(),out:structuredClone(out)});}
      return out;
    }).finally(()=>running.delete(key));
    running.set(key,promise);return promise;
  };
}
