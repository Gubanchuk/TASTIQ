import {resultBatchNotice} from './public/shared/result-clarity.js';
import {createHash} from 'node:crypto';
import {newMediaConversation,normalizeMediaConversation,answerMediaConversation,applyMediaConversationProposal,mediaConversationScreen,mediaConversationToLegacy} from '../core/media-conversation.js';
import {canOfferInterviewQuestion,rememberInterviewQuestion,reviewAtInterviewCapacity,completeInterview} from '../core/selection-dialogue.js';
import {profileOf,sessionOf} from '../core/dialogue.js';
import {filmPreviewSession} from '../core/film-preview.js';
import {savedMediaMismatch} from '../core/sieves.js';
import {recommend,recommendIds,rankAll} from '../core/recommend.js';
import {editionsOf,makeCatalog} from '../core/catalog.js';
import {aiMediaConversation} from '../ai/media-conversation.js';
import {aiPick} from '../ai/pick.js';
import {criteriaOf,unconfirmedSavedCriteria} from '../ai/pick-constraints.js';
import {personalContextOf} from '../ai/feedback-context.js';
import {pickerMemoryView,refreshMemoryPlan,rememberPlanMemory,restoreMemoryFactKeys} from '../ai/taste-context.js';
import {AI} from '../ai/config.js';
import {estimateCost} from '../ai/usage.js';
import {createConversationMediaIdentity} from './conversation-media-identity.js';
import {invalidSavedSource,normalizeSavedSource,savedSourceKey} from '../core/saved-source.js';

const DOMAINS=new Set(['film','series','cartoon','anime']);
const FORMAT_UNKNOWN='У части произведений формат не указан в каталоге: они не включены при выборе фильма или сериала.';
const bad=message=>Object.assign(Error(message),{status:400});
const cardsOf=result=>[result?.top,...(result?.alternatives??[])].filter(Boolean);
const contextual=s=>{
  if(!canOfferInterviewQuestion(s))return reviewAtInterviewCapacity(s);
  const state={...s,phase:'talk',provisional:true};state.question=s.question??mediaConversationScreen(state).question;
  return rememberInterviewQuestion(state,state.question);
};

// One scoped controller per media catalog. The injected transport is the same guarded transport as game AI.
export function createMediaConversationService({domain,catalogs,plan=aiMediaConversation,pick=aiPick,api,access=()=>({allowed:true}),spend=()=>{},journal=()=>{},now=Date.now}={}) {
  if(!DOMAINS.has(domain)||catalogs?.[domain]?.domain?.id!==domain)throw bad('Недоступный раздел просмотра.');
  const catalog=catalogs[domain],cache=new Map(),running=new Map(),formatCatalogs=new Map(),identities=createConversationMediaIdentity(catalog);
  // Format is an explicit media constraint. Preserve the base catalog for reference identities;
  // shortlist, deterministic sieves and model-owned additions all see the same eligible view.
  function catalogFor(s) {
    const format=s.context?.format,kind=format==='movie'?'film':format==='episodic'?'series':null;
    if(s.savedSource){
      const items=s.savedSource.ids.map(id=>catalog.byId.get(id)).filter(item=>item?.domain===domain&&(!kind||item.kind===kind));
      return makeCatalog({...catalog,items},domain);
    }
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
    journal({at:new Date(now()).toISOString(),event:`media-conversation-${stage}`,data:{domain,id:s.id,revision:s.revision,mode:s.mode,...(s.depth?{depth:s.depth}:{}),model:out.model??AI.model,
      error:out.error??null,ms:out.ms??null,usage:out.usage?{in:out.usage.input_tokens,out:out.usage.output_tokens,
        cached:out.usage.input_tokens_details?.cached_tokens??0,estimatedUsd:estimateCost(out.usage,AI.model)}:null}});
  }
  function checkBody(body) {
    if(!body||typeof body!=='object'||Array.isArray(body)||body.domain!==domain)throw bad('Раздел запроса не совпадает с разделом подбора.');
    if(body.state!=null&&(typeof body.state!=='object'||Array.isArray(body.state)||body.state.domain!==domain))throw bad('Сохранённый подбор относится к другому разделу.');
  }
  function validateCards(result,s) {
    const cards=cardsOf(result);
    if(!cards.length)return;
    const eligible=catalogFor(s),works=new Set(),session=s.savedSource?sessionOf(projection(s)):null;
    for(const card of cards){
      const item=eligible.byId.get(card.id);
      if(!catalog.byId.has(card.id)||catalog.byId.get(card.id).domain!==domain||card.domain!=null&&card.domain!==domain)throw bad('Этой карточки нет в каталоге выбранного раздела.');
      if(s.savedSource&&!s.savedSource.ids.includes(card.id))throw invalidSavedSource();
      if(!item)throw bad('В сохранённых вариантах есть произведение другого или неподтверждённого формата. Уточни условия просмотра.');
      const mismatch=session&&savedMediaMismatch(item,session);
      if(mismatch)throw bad('Сохранённый вариант не проходит условия просмотра: '+mismatch+'.');
      const work=item.work??item.id;
      if(s.savedSource&&works.has(work))throw invalidSavedSource();
      works.add(work);
    }
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
  function initialState(body) {
    const state=body.state?normalizeMediaConversation(body.state,domain):newMediaConversation({domain,mode:body.mode,depth:body.depth});
    const provided=Object.hasOwn(body,'savedSource')?normalizeSavedSource(body.savedSource,domain):null;
    if(provided&&state.savedSourceKey&&savedSourceKey(provided)!==state.savedSourceKey)throw invalidSavedSource();
    if(provided&&!state.savedSource&&(state.revision||state.turns.length||state.phase!=='direction'||state.result))throw invalidSavedSource();
    const source=state.savedSource??provided;
    if(source && !state.revision && state.phase==='direction'){
      state.savedSource={...source,ids:source.ids.filter(id=>catalog.byId.get(id)?.domain===domain)};
      state.savedSourceKey=savedSourceKey(state.savedSource);
    }
    return validateSnapshot(state);
  }
  const locallyConfirmed=(legacy,item)=>(legacy.savedSource?unconfirmedSavedCriteria(legacy,item):criteriaOf(legacy,item)).length===0;
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
    card.ai={reason:p?.reason,caveat:p?.caveat,likelySeen:p?.likelySeen,own:p?.own,...(p?.constraintChecks?{constraintChecks:p.constraintChecks}:{})};
    card.labelText='Вариант по твоему запросу';caveats(card,s,legacy);return constraintWarnings(card,p?.unknownCriteria,criteriaOf(legacy));
  }
  function constraintWarnings(card,unknowns=[],allCriteria=[]) {
    const items=[...unknowns,...allCriteria.filter(c=>c.stance==='exclude')];
    const texts=[...new Set(items.filter(c=>!c.key?.startsWith('context:childAge:')&&!(c.key?.startsWith('session:minutes:')&&card.feasibility.some(f=>f.key==='minutes'))&&!(c.key?.startsWith('context:onlyEnded:')&&(card.status==='Ended'||card.feasibility.some(f=>f.key==='ended')))&&typeof c.text==='string').map(c=>c.text.trim().replace(/[.!?;:]+$/u,'')))];
    if(!texts.length)return card;
    const detail=`${texts.length===1?'Условие требует':'Условия требуют'} проверки: ${texts.map(text=>`«${text}»`).join('; ')}.`;
    const existing=card.feasibility.find(c=>c.key==='excluded-features');
    if(existing)existing.text=detail;
    else card.feasibility.push({key:'request-conditions',status:'unknown',text:detail});
    return card;
  }
  async function replace(s,who,personalContext,more=false,targetIds=null) {
    const before=cardsOf(s.result),marked=new Set((more?before.map(card=>card.id):targetIds??s.familiar.marked).filter(id=>before.some(card=>card.id===id)));
    if(!marked.size)return response(s);
    const legacy=projection(s);
    const explicitExclusions=new Set([...s.familiar.excluded,...s.facts.filter(f=>f.scope==='today'&&f.stance==='exclude'&&f.titleId).map(f=>f.titleId)]);
    const shown=[...new Set([...(s.browseSeen??[]),...s.familiar.hidden,...before.map(card=>card.id)].flatMap(id=>editionsOf(catalog,id)))];
    const neutralShown=shown.filter(id=>!explicitExclusions.has(id));
    legacy.session.notNow=[...new Set([...(legacy.session.notNow??[]),...shown])];
    const failed=(error,retryable=true)=>response({...s,failedAction:more?'more':'replace',...(!more?{replacement:{...s.replacement,pendingIds:[...marked]}}:{})},{error,retryable});
    if(new Set([...(s.browseSeen??[]),...s.familiar.hidden,...before.map(card=>card.id)]).size>496)return failed('В этом подборе уже слишком много отметок. Начни новый подбор: явные сохранённые исключения останутся.',false);
    const eligibleCatalog=catalogFor(s),session=sessionOf(legacy),previewSession=filmPreviewSession(s,session);
    const eligible=rankAll(eligibleCatalog,profileOf(legacy),previewSession).ranked;
    if(!eligible.length)return failed(s.savedSource?'В этом списке сохранённых больше нет подходящих вариантов. Можно уточнить условия или начать подбор по всему каталогу.':more?'Других подходящих вариантов по этому запросу пока нет. Прежние варианты сохранены — можно уточнить запрос.':'Других подходящих вариантов пока нет. Оставь знакомое для возвращения или уточни запрос.',false);
    const sole=eligible.length===1&&locallyConfirmed(legacy,eligible[0].game);
    let local=sole;
    let out;
    if(sole)out={picks:[{id:eligible[0].game.id}]};
    else {
      const permission=access(who);
      if(!permission.allowed){
        if(!s.savedSource)return failed(`${permission.reason??'Помощник недоступен'}. Варианты и отметки сохранены.`,false);
        const picks=eligible.filter(({game})=>locallyConfirmed(legacy,game)).slice(0,4).map(({game})=>({id:game.id}));
        if(!picks.length)return failed('В списке сохранённых не удалось подтвердить обязательные условия. Прежние варианты сохранены.',false);
        local=true;out={picks};
      }else{
        spend(who);
        try {out=await pick(catalogsFor(s),pickerMemoryView(legacy,s,personalContext.tasteMemory),{...(api?{api}:{}),...personalContext,wish:s.summary,alreadyShown:neutralShown});}
        catch {out={error:'Не удалось заменить варианты. Варианты и отметки сохранены.'};}
        log(more?'more':'replace',s,out);if(out.error)return failed(out.error+(out.constraintDrops?' Прежние варианты и отметки сохранены.':''),out.retryable!==false);
      }
    }
    const ids=[...new Set((out.picks??[]).map(p=>p.id))];
    const selected=recommendIds(eligibleCatalog,profileOf(legacy),local?previewSession:session,ids),picks=new Map((out.picks??[]).map(p=>[p.id,p]));
    const used=new Set(),available=cardsOf(selected).filter(card=>{const work=catalog.byId.get(card.id)?.work??card.id;if(used.has(work))return false;used.add(work);return true;});
    if(!available.length)return failed('Не получилось найти подтверждённую замену. Прежние варианты и отметки сохранены.',false);
    const changedIds=[],unresolvedIds=[];
    const decorate=next=>{
      if(local){next.replacementSource='engine';next.labelText=sole?'Единственный другой вариант по условиям':'Вариант из сохранённых по данным каталога';caveats(next,s,legacy);}
      else attach(next,picks.get(next.id),s,legacy);
      return next;
    };
    const after=more?available.slice(0,4).map(decorate):before.map(card=>{
      if(!marked.has(card.id))return card;
      const next=available.shift();if(!next){unresolvedIds.push(card.id);return card;}
      changedIds.push(card.id);return decorate(next);
    });
    if(more)changedIds.push(...before.map(card=>card.id));
    const undo={result:s.result,marked:s.familiar.marked,keep:s.familiar.keep,hidden:s.familiar.hidden,replacement:s.replacement};
    const retainedIds=after.filter(card=>before.some(old=>old.id===card.id)).map(card=>card.id);
    const result={...s.result,top:after[0],alternatives:after.slice(1),ai:local?s.result.ai?{...s.result.ai,mixed:true}:undefined:{understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist,mixed:retainedIds.length>0}};
    s={...s,result,browseSeen:[...new Set([...(s.browseSeen??[]),...before.map(card=>card.id),...after.map(card=>card.id)])],failedAction:null,familiar:{...s.familiar,marked:more?[]:s.familiar.marked.filter(id=>!changedIds.includes(id)),hidden:more?s.familiar.hidden:[...new Set([...s.familiar.hidden,...changedIds])],undo},
      replacement:{changedIds,unresolvedIds,notice:[more?resultBatchNotice(after.length,{more:true}):'',sole?'Доступен только один другой вариант по условиям. Он подобран по каталогу.':'',unresolvedIds.length?'Часть отмеченных вариантов осталась: подтверждённых замен пока недостаточно.':''].filter(Boolean).join(' ')}};
    return response(s,{feedbackCarry:{retainedIds}});
  }
  async function handle(body,who) {
    const personalContext=personalContextOf(body,catalog,domain);
    let s=refreshMemoryPlan(initialState(body),personalContext.tasteMemory,body.action);
    s=remembered(body,s);
    if(s.savedSource&&!s.savedSource.ids.length&&!s.result)return response({...s,phase:'review',needsPlan:false,question:null},{
      error:'В списке сохранённых не осталось произведений этого раздела. Вернись в библиотеку или начни подбор по всему каталогу.',retryable:false});
    if(!body.action) {
      for(const result of [s.result,s.familiar?.undo?.result])for(const card of cardsOf(result)){
        const item=catalog.byId.get(card.id);
        if(!card.poster&&item?.poster)card.poster=item.poster;
        if(!card.image&&item?.image)card.image=item.image;
      }
      if(s.phase==='talk'&&!s.question) {
        if(!canOfferInterviewQuestion(s))s=reviewAtInterviewCapacity(s);
        else {s.question=mediaConversationScreen(s).question;s=rememberInterviewQuestion(s,s.question);}
      }
      return response(s); // Explicit restore never pays, including pending/error states.
    }
    const action=body.action,beforeResult=s.result,priorExclusions=s.familiar.excluded;
    if(['familiar_mark','familiar_unmark','familiar_keep'].includes(action.type)&&catalog.byId.get(action.id)?.domain!==domain)throw bad('Этой карточки нет в каталоге выбранного раздела.');
    const more=action.type==='more'||action.type==='retry'&&s.failedAction==='more';
    const replacing=more||action.type==='replace_familiar'||action.type==='retry'&&s.failedAction==='replace';
    const final=action.type==='confirm'||action.type==='retry'&&s.failedAction==='pick';
    s=answerMediaConversation(s,action);
    if(action.type==='restart'){s.familiar.excluded=priorExclusions;s=remembered(body,s);}
    if(replacing){
      if(action.type==='replace_familiar'&&action.id!==undefined&&!s.familiar.marked.includes(action.id))throw bad('Сначала отметь этот вариант для замены.');
      const targets=action.type==='replace_familiar'&&action.id!==undefined?[action.id]:action.type==='retry'?s.replacement?.pendingIds:null;
      return replace(s,who,personalContext,more,targets);
    }
    if(action.type==='undo_replacement')return response(s,{feedbackCarry:{retainedIds:cardsOf(s.result).filter(card=>cardsOf(beforeResult).some(old=>old.id===card.id)).map(card=>card.id)}});
    const planning=!final&&s.needsPlan&&['answer','correct','retry','continue'].includes(action.type);
    if(!final&&!planning)return response(s);
    const permission=access(who);
    if(planning) {
      if(!permission.allowed){s=contextual(s);s.needsPlan=false;s.failedAction='plan';return response(s,{error:`${permission.reason??'Помощник недоступен'}. Можно ответить на вопросы и посмотреть предварительные варианты.`,retryable:false});}
      spend(who);
      const resolved=identities.resolve(s);let out;
      try {out=await plan(catalogFor(s),s,{...(api?{api}:{}),tasteMemory:personalContext.tasteMemory,knownTitles:resolved.knownTitles});}
      catch {out={error:'Не удалось разобрать ответ. Он сохранён; попробуй ещё раз.'};}
      log('plan',s,out);let checked;
      if(!out.error) {
        const bound=identities.bindFacts(s,restoreMemoryFactKeys(out.proposal?.facts,s),resolved);
        if(bound.error)checked={error:bound.error};
        else {
          const uncertainties=[...new Set([...(out.proposal?.uncertainties??[]),...resolved.ambiguous.map(m=>`Точная версия «${m.quote}» не определена: в этом разделе есть несколько разных произведений.`)])];
          checked=applyMediaConversationProposal(s,{...out.proposal,facts:bound.facts,uncertainties},catalog.dict,s.revision);
        }
      }
      const error=out.error??checked?.error;
      if(error){s=contextual(s);s.failedAction='plan';s.needsPlan=true;return response(s,{error,retryable:out.retryable!==false});}
      s=rememberPlanMemory(checked.state,personalContext.tasteMemory);s.failedAction=null;return response(s);
    }
    const legacy=projection(s);
    if(!permission.allowed)legacy.session=filmPreviewSession(s,legacy.session);
    if(s.savedSource){
      const scoped=catalogFor(s),session=sessionOf(legacy),profile=profileOf(legacy);
      const {ranked}=rankAll(scoped,profile,session);
      const candidates=permission.allowed?ranked:ranked.filter(({game})=>locallyConfirmed(legacy,game));
      if(!candidates.length)return response({...s,phase:'review',failedAction:'pick'},{error:'В этом списке сохранённых не нашлось вариантов с подтверждёнными условиями. Можно изменить условия или начать подбор по всему каталогу.',retryable:false});
      if(!permission.allowed || candidates.length===1&&locallyConfirmed(legacy,candidates[0].game)){
        const result=recommendIds(scoped,profile,session,candidates.slice(0,4).map(({game})=>game.id));
        for(const card of cardsOf(result)){caveats(card,s,legacy);card.labelText='Вариант из сохранённых по данным каталога';}
        return response({...s,...completeInterview(s),phase:'result',result,provisional:true,failedAction:null,question:null,needsPlan:false});
      }
    }
    if(!permission.allowed) {
      const result=recommend(catalogFor(s),profileOf(legacy),sessionOf(legacy));
      if(!result.top)return response({...s,phase:'review',failedAction:'pick'},{error:'По этим условиям пока не нашлось доступных вариантов. Уточни условия или разреши вернуться к знакомому.',retryable:false});
      const hardCriteria=criteriaOf(legacy);for(const card of cardsOf(result)){caveats(card,s,legacy);constraintWarnings(card,hardCriteria,hardCriteria);}
      s={...s,...completeInterview(s),phase:'result',result,provisional:true,failedAction:null};
      s.uncertainties=[...new Set([...s.uncertainties,'Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.'])];return response(s);
    }
    spend(who);let out;
    try {out=await pick(catalogsFor(s),pickerMemoryView(legacy,s,personalContext.tasteMemory),{...(api?{api}:{}),...personalContext,wish:s.summary,previous:[]});}
    catch {out={error:'Не удалось получить рекомендации. Запрос сохранён.'};}
    log('pick',s,out);
    if(out.error)return response({...s,phase:'review',failedAction:'pick'},{error:out.error,retryable:out.retryable!==false});
    const ids=[...new Set((out.picks??[]).map(p=>p.id))],cards=recommendIds(catalogFor(s),profileOf(legacy),sessionOf(legacy),ids);
    if(!cards)return response({...s,phase:'review',failedAction:'pick'},{error:'По этим условиям пока не нашлось подтверждённых вариантов. Можно уточнить или изменить запрос.',retryable:false});
    cards.alternatives=cards.alternatives.slice(0,3);
    const byId=new Map((out.picks??[]).map(p=>[p.id,p]));for(const card of cardsOf(cards))attach(card,byId.get(card.id),s,legacy);
    cards.ai={understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist};
    s={...s,...completeInterview(s),phase:'result',result:cards,question:null,needsPlan:false,failedAction:null};return response(s);
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
