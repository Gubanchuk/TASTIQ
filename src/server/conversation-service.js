import {resultBatchNotice} from './public/shared/result-clarity.js';
import {createHash} from 'node:crypto';
import {newConversation,normalizeConversation,answerConversation,applyConversationProposal,conversationScreen,conversationToLegacy,fallbackQuestion} from '../core/conversation.js';
import {canOfferInterviewQuestion,rememberInterviewQuestion,reviewAtInterviewCapacity} from '../core/selection-dialogue.js';
import {profileOf,sessionOf} from '../core/dialogue.js';
import {recommend,recommendIds,rankAll} from '../core/recommend.js';
import {editionsOf,makeCatalog} from '../core/catalog.js';
import {invalidSavedSource,normalizeSavedSource,savedSourceKey} from '../core/saved-source.js';
import {checkSieves} from '../core/sieves.js';
import {buildTaste} from '../core/profile.js';
import {aiConversation} from '../ai/conversation.js';
import {aiPick} from '../ai/pick.js';
import {criteriaOf,unverifiedGameCriteria,unconfirmedSavedCriteria} from '../ai/pick-constraints.js';
import {completeInterview} from '../core/selection-dialogue.js';
import {AI} from '../ai/config.js';
import {estimateCost} from '../ai/usage.js';
import {createConversationGameIdentity} from './conversation-game-identity.js';
import {checkedRatedExamples,reviewRatedExamples} from './rated-examples.js';
import {personalContextOf} from '../ai/feedback-context.js';
import {pickerMemoryView,refreshMemoryPlan,rememberPlanMemory,restoreMemoryFactKeys} from '../ai/taste-context.js';

const contextual = s => {
  if(!canOfferInterviewQuestion(s))return reviewAtInterviewCapacity(s);
  const question=s.question??fallbackQuestion(s)??conversationScreen({...s,phase:'talk'}).question;
  return rememberInterviewQuestion({...s,question,phase:'talk',provisional:true},question);
};

function chosenMechanic(state) {
  const source=state.turns.find(turn=>turn.question.id==='direction'&&!turn.superseded);
  if(!Array.isArray(source?.selected)||!Array.isArray(source.question.options))return null;
  const directions=source.selected.filter(option=>typeof option?.id==='string'&&!option.id.startsWith('mood_')&&!option.id.startsWith('avoid_'));
  if(directions.length!==1)return null;
  const feature=source.question.options.find(option=>option?.id===directions[0].id)?.feature;
  if(typeof feature!=='string'||!feature.startsWith('loop.'))return null;
  const facts=state.facts.filter(f=>f.scope==='today'&&f.feature===feature);
  return facts.some(f=>f.sourceId===source.id&&f.stance==='want')&&facts.every(f=>f.stance==='want')?feature:null;
}

// The controller is injectable so every request boundary can be exercised without billing.
export function createConversationService({catalogs,plan=aiConversation,pick=aiPick,api,access=()=>({allowed:true}),spend=()=>{},journal=()=>{},now=Date.now}={}) {
  const catalog=catalogs.game,cache=new Map(),running=new Map();
  const cardsOf=r=>[r?.top,...(r?.alternatives??[])].filter(Boolean);
  const projection=s=>conversationToLegacy(s,catalog.dict,catalog);
  const identities=createConversationGameIdentity(catalog);
  function validateSavedResults(state,results){
    if(!results.some(Boolean))return;
    if(!state.context.platform||!state.context.company||state.context.company==='group'&&!state.context.partySize)throw invalidSavedSource();
    const legacy=projection(state),session=sessionOf(legacy),taste=buildTaste(catalog,profileOf(legacy));
    // A player may mark the visible card as familiar before replacing it. Undo
    // also deliberately restores previously shown cards with their old marks.
    session.notNow=[];
    const strict=criteriaOf(legacy).filter(c=>c.verificationRequired);
    for(const result of results.filter(Boolean)){
      if(!result.top||!Array.isArray(result.alternatives)||result.alternatives.length>3)throw invalidSavedSource();
      const works=new Set();
      for(const card of [result.top,...result.alternatives]){
        const item=catalog.byId.get(card?.id);
        if(!item||item.domain!=='game'||card.domain!=null&&card.domain!=='game'||checkSieves(item,taste,session,catalog)||
          unverifiedGameCriteria(strict,item,session).length)throw invalidSavedSource();
        const work=item.work??item.id;
        if(works.has(work))throw invalidSavedSource();
        works.add(work);
      }
    }
  }
  function initialState(body){
    if(body.domain!=null&&body.domain!=='game')throw invalidSavedSource();
    const state=body.state?normalizeConversation(body.state):newConversation({mode:body.mode,depth:body.depth});
    if(Object.hasOwn(state,'ratedExamples'))state.ratedExamples=checkedRatedExamples(state.ratedExamples,catalog);
    const provided=Object.hasOwn(body,'savedSource')?normalizeSavedSource(body.savedSource,'game'):null;
    if(provided&&state.savedSourceKey&&savedSourceKey(provided)!==state.savedSourceKey)throw invalidSavedSource();
    const pristine=!state.revision&&!state.turns.length&&state.phase==='direction'&&!state.result;
    if(provided&&!state.savedSource&&!pristine)throw invalidSavedSource();
    const source=state.savedSource??provided;
    if(!source)return state;
    if(pristine){
      state.savedSource={...source,ids:source.ids.filter(id=>catalog.byId.get(id)?.domain==='game')};
      state.savedSourceKey=savedSourceKey(state.savedSource);
    }
    validateSavedResults(state,[state.result,state.familiar.undo?.result]);
    const undo=state.factRemovalUndo;
    if(undo)validateSavedResults({...state,...undo},[undo.result,undo.familiarUndo?.result]);
    if(state.phase==='result'&&!state.result)throw invalidSavedSource();
    return state;
  }
  function catalogFor(s){
    if(!s.savedSource)return catalog;
    const legacy=projection(s),session=sessionOf(legacy),strict=criteriaOf(legacy).filter(c=>c.verificationRequired);
    const items=s.savedSource.ids.map(id=>catalog.byId.get(id)).filter(item=>item?.domain==='game'&&!unverifiedGameCriteria(strict,item,session).length);
    return makeCatalog({...catalog,items},'game');
  }
  const locallyConfirmed=(legacy,item)=>(legacy.savedSource?unconfirmedSavedCriteria(legacy,item):criteriaOf(legacy,item)).length===0;
  function log(stage,s,out) {
    journal({at:new Date(now()).toISOString(),event:`conversation-${stage}`,data:{id:s.id,revision:s.revision,mode:s.mode,...(s.depth?{depth:s.depth}:{}),model:out.model??AI.model,
      error:out.error??null,ms:out.ms??null,usage:out.usage?{in:out.usage.input_tokens,out:out.usage.output_tokens,
        cached:out.usage.input_tokens_details?.cached_tokens??0,estimatedUsd:estimateCost(out.usage,AI.model)}:null}});
  }
  function response(state,extra={}){
    const screen=conversationScreen(state);
    if(screen.type==='review')screen.ratedExamples=reviewRatedExamples(state,catalog,identities,projection(state));
    return {state,screen,...(state.phase==='result'?{feedbackState:projection(state)}:{}),...extra};
  }
  function remembered(body,s) {
    if(body.rememberedExclusions===undefined)return s;
    const list=body.rememberedExclusions;
    if(!Array.isArray(list)||list.length>500||list.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)))throw Object.assign(Error('Некорректный список знакомых игр.'),{status:400});
    s.familiar.excluded=[...new Set(list.filter(id=>catalog.byId.has(id)))];return s;
  }
  function constraintWarnings(card,criteria) {
    const texts=[...new Set(criteria.filter(c=>!(c.key.startsWith('session:minutes:')&&card.feasibility.some(f=>f.key==='minutes'))
      &&!(c.key.startsWith('context:players:')&&card.feasibility.some(f=>f.key==='players'&&f.status!=='yes'))).map(c=>c.text.trim().replace(/[.!?;:]+$/u,'')))];
    if(texts.length)card.feasibility.push({key:'request-conditions',status:'unknown',text:`Нужно проверить: ${texts.map(text=>`«${text}»`).join('; ')}.`});
    return card;
  }
  function attach(card,p) {
    card.ai={reason:p.reason,caveat:p.caveat,likelySeen:p.likelySeen,own:p.own,...(p.comparisons?{comparisons:p.comparisons}:{}),...(p.constraintChecks?{constraintChecks:p.constraintChecks}:{})};
    card.labelText='Вариант по твоему запросу';
    return constraintWarnings(card,p.unknownCriteria??[]);
  }
  async function replace(s,who,personalContext,more=false,targetIds=null) {
    const before=cardsOf(s.result),marked=new Set((more?before.map(card=>card.id):targetIds??s.familiar.marked).filter(id=>before.some(c=>c.id===id)));
    if(!marked.size)return response(s);
    const legacy=projection(s);
    const neutralShown=[...new Set([...(s.browseSeen??[]).flatMap(id=>editionsOf(catalog,id)),...before.flatMap(card=>editionsOf(catalog,card.id))])].filter(id=>!(legacy.session.notNow??[]).includes(id));
    // Every displayed work is unavailable as a replacement, including editions of retained cards.
    legacy.session.notNow=[...new Set([...legacy.session.notNow,...(s.browseSeen??[]).flatMap(id=>editionsOf(catalog,id)),...before.flatMap(c=>editionsOf(catalog,c.id))])];
    const failed=(error,retryable=true)=>response({...s,failedAction:more?'more':'replace',...(!more?{replacement:{...s.replacement,pendingIds:[...marked]}}:{})},{error,retryable});
    if(new Set([...(s.browseSeen??[]),...s.familiar.hidden,...before.map(card=>card.id)]).size>496)return failed('В этом подборе достигнут предел отметок. Начни новый подбор. Сохранённые исключения останутся в силе.',false);
    const scoped=catalogFor(s),session=sessionOf(legacy),profile=profileOf(legacy);
    const eligible=rankAll(scoped,profile,session).ranked;
    if(!eligible.length)return failed(s.savedSource?'В этом списке сохранённых больше нет подходящих игр. Прежние варианты сохранены.':more?'Других подходящих игр пока нет. Предыдущие варианты на экране. Можно изменить запрос.':'Замену найти не удалось. Можно оставить знакомую игру или изменить запрос.',false);
    const sole=eligible.length===1&&locallyConfirmed(legacy,eligible[0].game);
    let local=sole;
    let out;
    if(sole)out={picks:[{id:eligible[0].game.id}]};
    else {
      const permission=access(who);
      if(!permission.allowed){
        if(!s.savedSource)return failed(`${permission.reason??'Помощник недоступен'}. Варианты и отметки сохранены.`,false);
        const picks=eligible.filter(({game})=>locallyConfirmed(legacy,game)).slice(0,AI.picks).map(({game})=>({id:game.id}));
        if(!picks.length)return failed('В списке сохранённых не удалось подтвердить условия для других игр. Прежние варианты сохранены.',false);
        local=true;out={picks};
      }else{
        spend(who);
        try {out=await pick({...catalogs,game:scoped},pickerMemoryView(legacy,s,personalContext.tasteMemory),{...(api?{api}:{}),...personalContext,wish:s.summary,alreadyShown:neutralShown});}
        catch {out={error:'Не удалось заменить игры. Варианты и отметки сохранены.'};}
        log(more?'more':'replace',s,out);if(out.error)return failed(out.error+(out.constraintDrops?' Прежние варианты и отметки сохранены.':''),out.retryable!==false);
      }
    }
    const unique=[...new Set((out.picks??[]).map(p=>p.id))];
    const selected=recommendIds(scoped,profile,session,unique);
    const queue=cardsOf(selected),picks=new Map((out.picks??[]).map(p=>[p.id,p]));
    // Two editions proposed by the model count as one replacement work.
    const used=new Set();const available=queue.filter(c=>{const work=catalog.byId.get(c.id)?.work??c.id;if(used.has(work))return false;used.add(work);return true;});
    if(!available.length)return failed('Не получилось найти подтверждённую замену. Прежние варианты и отметки сохранены.',false);
    const changedIds=[],unresolvedIds=[];
    const decorate=next=>{
      if(local) {next.replacementSource='engine';next.labelText=sole?'Единственный другой вариант по условиям':'Вариант из сохранённых по данным каталога';}
      else attach(next,picks.get(next.id));
      return next;
    };
    const after=more?available.slice(0,4).map(decorate):before.map(card=>{
      if(!marked.has(card.id))return card;
      const next=available.shift();if(!next){unresolvedIds.push(card.id);return card;}
      changedIds.push(card.id);return decorate(next);
    });
    if(more)changedIds.push(...before.map(card=>card.id));
    const undo={result:s.result,marked:s.familiar.marked,keep:s.familiar.keep,hidden:s.familiar.hidden,replacement:s.replacement};
    const retainedIds=after.filter(c=>before.some(old=>old.id===c.id)).map(c=>c.id);
    const result={...s.result,top:after[0],alternatives:after.slice(1),
      ai:local?s.result.ai?{...s.result.ai,mixed:true}:undefined:{understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist,mixed:retainedIds.length>0}};
    s={...s,result,browseSeen:[...new Set([...(s.browseSeen??[]),...before.map(card=>card.id),...after.map(card=>card.id)])],failedAction:null,familiar:{...s.familiar,marked:more?[]:s.familiar.marked.filter(id=>!changedIds.includes(id)),hidden:more?s.familiar.hidden:[...new Set([...s.familiar.hidden,...changedIds])],undo},
      replacement:{changedIds,unresolvedIds,notice:[more?resultBatchNotice(after.length,{more:true}):'',sole?'Доступен только один другой вариант по условиям. Он подобран по каталогу.':'',unresolvedIds.length?'Часть отмеченных игр осталась: подтверждённых замен пока недостаточно.':''].filter(Boolean).join(' ')}};
    return response(s,{feedbackCarry:{retainedIds}});
  }
  async function handle(body,who) {
    const personalContext=personalContextOf(body,catalog,'game');
    let s=refreshMemoryPlan(initialState(body),personalContext.tasteMemory,body.action);
    if(s.facts.some(f=>f?.gameId==null)) {
      const resolved=identities.resolve(s);
      // Repair identity only; preserve the saved exposure, stance and source words verbatim.
      s.facts=s.facts.map(f=>f?.gameId==null?identities.bindFacts(s,[f],resolved).facts?.[0]??f:f);
    }
    s=remembered(body,s);
    if(s.savedSource&&!s.savedSource.ids.length&&!s.result)return response({...s,phase:'review',needsPlan:false,question:null},{
      error:'В списке сохранённых не осталось игр. Вернись в библиотеку или начни подбор по всему каталогу.',retryable:false});
    if(!body.action) {
      // A visible local recovery question must also be the question accepted by the reducer.
      if(s.phase==='talk'&&!s.question) {
        if(!canOfferInterviewQuestion(s))s=reviewAtInterviewCapacity(s);
        else {s.question=conversationScreen(s).question;s=rememberInterviewQuestion(s,s.question);}
      }
      return response(s); // restore never calls an AI endpoint
    }
    const action=body.action;
    const beforeResult=s.result;
    const priorExclusions=s.familiar.excluded;
    if(['familiar_mark','familiar_unmark','familiar_keep'].includes(action.type)&&!catalog.byId.has(action.id))throw Object.assign(Error('Этой карточки нет в каталоге игр.'),{status:400});
    const more=action.type==='more'||action.type==='retry'&&s.failedAction==='more';
    const replacing=more||action.type==='replace_familiar'||action.type==='retry'&&s.failedAction==='replace';
    s=answerConversation(s,action);
    if(action.type==='confirm'&&Object.hasOwn(action,'ratedExamples'))s.ratedExamples=checkedRatedExamples(action.ratedExamples,catalog);
    if(action.type==='restart') {s.familiar.excluded=priorExclusions;s=remembered(body,s);}
    if(replacing){
      if(action.type==='replace_familiar'&&action.id!==undefined&&!s.familiar.marked.includes(action.id))throw Object.assign(Error('Сначала отметь этот вариант для замены.'),{status:400});
      const targets=action.type==='replace_familiar'&&action.id!==undefined?[action.id]:action.type==='retry'?s.replacement?.pendingIds:null;
      return replace(s,who,personalContext,more,targets);
    }
    if(action.type==='undo_replacement')return response(s,{feedbackCarry:{retainedIds:cardsOf(s.result).filter(c=>cardsOf(beforeResult).some(old=>old.id===c.id)).map(c=>c.id)}});
    const final=action.type==='confirm'||action.type==='retry'&&s.failedAction==='pick';
    const planning=!final&&s.needsPlan&&['answer','correct','retry','continue'].includes(action.type);
    if(!final&&!planning)return response(s);
    const permission=access(who);
    if(planning) {
      if(!permission.allowed) {
        s=contextual(s);s.needsPlan=false;s.failedAction='plan';
        return response(s,{error:`${permission.reason??'Помощник недоступен'}. Можно продолжить по вопросам и получить варианты из каталога.`,retryable:false});
      }
      spend(who);
      const resolved=identities.resolve(s),knownGames=resolved.knownGames;
      let out;
      try {out=await plan(catalogFor(s),s,{...(api?{api}:{}),tasteMemory:personalContext.tasteMemory,knownGames});}
      catch {out={error:'Не удалось обработать ответ. Он сохранён. Попробуй ещё раз.'};}
      log('plan',s,out);
      let checked;
      if(!out.error) {
        const bound=identities.bindFacts(s,restoreMemoryFactKeys(out.proposal?.facts,s),resolved);
        if(bound.error)checked={error:bound.error};
        else {
          const uncertainties=[...new Set([...(out.proposal?.uncertainties??[]),...resolved.ambiguous.map(m=>`Уточни название «${m.quote}»: в каталоге есть несколько разных игр.`)])];
          checked=applyConversationProposal(s,{...out.proposal,facts:bound.facts,uncertainties},catalog.dict,s.revision);
        }
      }
      const error=out.error??checked?.error;
      if(error) {
        s=contextual(s);s.failedAction='plan';s.needsPlan=true;
        return response(s,{error,retryable:out.retryable!==false});
      }
      s=rememberPlanMemory(checked.state,personalContext.tasteMemory);s.failedAction=null;
      return response(s);
    }
    const legacy=projection(s);
    const scoped=catalogFor(s);
    if(s.savedSource){
      const session=sessionOf(legacy),profile=profileOf(legacy);
      const {ranked}=rankAll(scoped,profile,session);
      const candidates=permission.allowed?ranked:ranked.filter(({game})=>locallyConfirmed(legacy,game));
      if(!candidates.length)return response({...s,phase:'review',failedAction:'pick'},{error:'В списке сохранённых не нашлось игр с подтверждёнными условиями. Можно изменить условия или начать подбор по всему каталогу.',retryable:false});
      if(!permission.allowed||candidates.length===1&&locallyConfirmed(legacy,candidates[0].game)){
        const result=recommendIds(scoped,profile,session,candidates.slice(0,AI.picks).map(({game})=>game.id));
        for(const card of cardsOf(result))card.labelText='Вариант из сохранённых по данным каталога';
        return response({...s,...completeInterview(s),phase:'result',result,provisional:true,failedAction:null,question:null,needsPlan:false});
      }
    }
    if(!permission.allowed) {
      const profile=profileOf(legacy),session=sessionOf(legacy);
      const criteria=criteriaOf(legacy),strict=criteria.filter(c=>c.verificationRequired);
      const result=strict.length
        ? recommendIds(catalog,profile,session,rankAll(catalog,profile,session).ranked.filter(({game})=>!unverifiedGameCriteria(strict,game,session).length).slice(0,AI.picks).map(({game})=>game.id))
        : recommend(catalog,profile,session,legacy.conversation.familiarity.returnToIds.length?null:chosenMechanic(s));
      if(!result?.top)return response({...s,phase:'review',failedAction:'pick'},{error:'По данным каталога не удалось подтвердить все условия ни для одной игры. Попробуй изменить запрос.',retryable:false});
      for(const card of cardsOf(result))constraintWarnings(card,unverifiedGameCriteria(criteria,catalog.byId.get(card.id),session));
      s={...s,...completeInterview(s),phase:'result',result,provisional:true,failedAction:null};
      s.uncertainties=[...new Set([...s.uncertainties,'Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.'])];
      return response(s);
    }
    spend(who);
    let out;
    try {out=await pick({...catalogs,game:scoped},pickerMemoryView(legacy,s,personalContext.tasteMemory),{...(api?{api}:{}),...personalContext,wish:s.summary,previous:[]});}
    catch {out={error:'Не удалось получить рекомендации. Запрос сохранён.'};}
    log('pick',s,out);
    if(out.error)return response({...s,phase:'review',failedAction:'pick'},{error:out.error,retryable:out.retryable!==false});
    // Re-sieve the actual model picks; never silently fill a failed AI list with unrelated popular titles.
    const ids=[...new Set((out.picks??[]).map(p=>p.id))];
    const cards=recommendIds(scoped,profileOf(legacy),sessionOf(legacy),s.savedSource?ids:ids.slice(0,AI.picks));
    if(!cards)return response({...s,phase:'review',failedAction:'pick'},{error:'Пока не нашлось вариантов, для которых подтверждены все условия. Попробуй изменить запрос.',retryable:false});
    cards.alternatives=cards.alternatives.slice(0,AI.picks-1);
    const byId=new Map(out.picks.map(p=>[p.id,p]));
    for(const card of cardsOf(cards))attach(card,byId.get(card.id));
    cards.ai={understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist};
    s={...s,...completeInterview(s),phase:'result',result:cards,question:null,needsPlan:false,failedAction:null};
    return response(s);
  }
  return async (body={},who={}) => {
    // Cache scoped to this user and the entire request: revisions alone are not enough after a restored tab.
    if(!body.action)return handle(body,who);
    const key=createHash('sha256').update(JSON.stringify([who.uid??who.ip??null,body])).digest('hex');
    const hit=cache.get(key);if(hit&&now()-hit.at<3_600_000)return structuredClone(hit.out);
    if(running.has(key))return structuredClone(await running.get(key));
    const promise=handle(body,who).then(out=>{
      if(!out.error){for(const[k,v]of cache)if(now()-v.at>=3_600_000)cache.delete(k);if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{at:now(),out:structuredClone(out)});}
      return out;
    }).finally(()=>running.delete(key));
    running.set(key,promise);return promise;
  };
}
