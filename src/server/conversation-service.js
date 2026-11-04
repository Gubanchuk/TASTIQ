import {createHash} from 'node:crypto';
import {newConversation,normalizeConversation,answerConversation,applyConversationProposal,conversationScreen,conversationToLegacy,fallbackQuestion} from '../core/conversation.js';
import {profileOf,sessionOf} from '../core/dialogue.js';
import {recommend,recommendIds,rankAll} from '../core/recommend.js';
import {editionsOf} from '../core/catalog.js';
import {aiConversation} from '../ai/conversation.js';
import {aiPick} from '../ai/pick.js';
import {AI} from '../ai/config.js';
import {estimateCost} from '../ai/usage.js';
import {createConversationGameIdentity} from './conversation-game-identity.js';
import {feedbackContextOf} from '../ai/feedback-context.js';

const contextual = s => ({...s,question:s.question??fallbackQuestion(s),phase:'talk',provisional:true});

// The controller is injectable so every request boundary can be exercised without billing.
export function createConversationService({catalogs,plan=aiConversation,pick=aiPick,api,access=()=>({allowed:true}),spend=()=>{},journal=()=>{},now=Date.now}={}) {
  const catalog=catalogs.game,cache=new Map(),running=new Map();
  const cardsOf=r=>[r?.top,...(r?.alternatives??[])].filter(Boolean);
  const projection=s=>conversationToLegacy(s,catalog.dict,catalog);
  const identities=createConversationGameIdentity(catalog);
  function log(stage,s,out) {
    journal({at:new Date(now()).toISOString(),event:`conversation-${stage}`,data:{id:s.id,revision:s.revision,mode:s.mode,model:out.model??AI.model,
      error:out.error??null,ms:out.ms??null,usage:out.usage?{in:out.usage.input_tokens,out:out.usage.output_tokens,
        cached:out.usage.input_tokens_details?.cached_tokens??0,estimatedUsd:estimateCost(out.usage,AI.model)}:null}});
  }
  const response = (state,extra={}) => ({state,screen:conversationScreen(state),...(state.phase==='result'?{feedbackState:projection(state)}:{}),...extra});
  function remembered(body,s) {
    if(body.rememberedExclusions===undefined)return s;
    const list=body.rememberedExclusions;
    if(!Array.isArray(list)||list.length>500||list.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9:_-]{1,80}$/.test(id)))throw Object.assign(Error('Некорректный список знакомых игр.'),{status:400});
    s.familiar.excluded=[...new Set(list.filter(id=>catalog.byId.has(id)))];return s;
  }
  async function replace(s,who,more=false,targetIds=null) {
    const before=cardsOf(s.result),marked=new Set((more?before.map(card=>card.id):targetIds??s.familiar.marked).filter(id=>before.some(c=>c.id===id)));
    if(!marked.size)return response(s);
    const legacy=projection(s);
    const neutralShown=[...new Set([...(s.browseSeen??[]).flatMap(id=>editionsOf(catalog,id)),...before.flatMap(card=>editionsOf(catalog,card.id))])].filter(id=>!(legacy.session.notNow??[]).includes(id));
    // Every displayed work is unavailable as a replacement, including editions of retained cards.
    legacy.session.notNow=[...new Set([...legacy.session.notNow,...(s.browseSeen??[]).flatMap(id=>editionsOf(catalog,id)),...before.flatMap(c=>editionsOf(catalog,c.id))])];
    const failed=(error,retryable=true)=>response({...s,failedAction:more?'more':'replace',...(!more?{replacement:{...s.replacement,pendingIds:[...marked]}}:{})},{error,retryable});
    if(new Set([...(s.browseSeen??[]),...s.familiar.hidden,...before.map(card=>card.id)]).size>496)return failed('В этом подборе уже слишком много отметок. Начни новый подбор: явные сохранённые исключения останутся.',false);
    const eligible=rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked;
    if(!eligible.length)return failed(more?'Других подходящих игр по этому запросу пока нет. Прежние варианты сохранены — можно уточнить запрос.':'Других подходящих игр пока нет. Оставь знакомую для возвращения или уточни запрос.',false);
    const sole=eligible.length===1;
    let out;
    if(sole)out={picks:[{id:eligible[0].game.id}]};
    else {
      const permission=access(who);if(!permission.allowed)return failed(`${permission.reason??'Помощник недоступен'}. Варианты и отметки сохранены.`,false);
      spend(who);
      try {out=await pick(catalogs,legacy,{...(api?{api}:{}),...(who.feedbackContext?.length?{feedbackContext:who.feedbackContext}:{}),wish:s.summary,...(more?{alreadyShown:neutralShown}:{previous:before.map(c=>c.id)})});}
      catch {out={error:'Не удалось заменить игры. Варианты и отметки сохранены.'};}
      log(more?'more':'replace',s,out);if(out.error)return failed(out.error,out.retryable!==false);
    }
    const unique=[...new Set((out.picks??[]).map(p=>p.id))];
    const selected=recommendIds(catalog,profileOf(legacy),sessionOf(legacy),unique);
    const queue=cardsOf(selected),picks=new Map((out.picks??[]).map(p=>[p.id,p]));
    // Two editions proposed by the model count as one replacement work.
    const used=new Set();const available=queue.filter(c=>{const work=catalog.byId.get(c.id)?.work??c.id;if(used.has(work))return false;used.add(work);return true;});
    if(!available.length)return failed('Не получилось найти подтверждённую замену. Прежние варианты и отметки сохранены.',false);
    const changedIds=[],unresolvedIds=[];
    const decorate=next=>{
      if(sole) {next.replacementSource='engine';next.labelText='Единственный другой вариант по условиям';}
      else {const p=picks.get(next.id);next.ai={reason:p.reason,caveat:p.caveat,likelySeen:p.likelySeen,own:p.own};next.labelText='Вариант по твоему запросу';}
      if(legacy.session.goalExcludes.length)next.feasibility.push({status:'unknown',text:'Отсутствие исключённых особенностей не всегда подтверждено разметкой; проверь оговорку перед выбором.'});
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
      ai:sole?s.result.ai?{...s.result.ai,mixed:true}:undefined:{understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist,mixed:retainedIds.length>0}};
    s={...s,result,browseSeen:[...new Set([...(s.browseSeen??[]),...before.map(card=>card.id),...after.map(card=>card.id)])],failedAction:null,familiar:{...s.familiar,marked:more?[]:s.familiar.marked.filter(id=>!changedIds.includes(id)),hidden:more?s.familiar.hidden:[...new Set([...s.familiar.hidden,...changedIds])],undo},
      replacement:{changedIds,unresolvedIds,notice:[more?(after.length<4?'Нашлось меньше четырёх новых вариантов по этому запросу.':'Другие варианты по тому же запросу.'):'',sole?'Доступен только один другой вариант по условиям. Он подобран по каталогу без нового обращения к модели.':'',unresolvedIds.length?'Часть отмеченных игр осталась: подтверждённых замен пока недостаточно.':''].filter(Boolean).join(' ')}};
    return response(s,{feedbackCarry:{retainedIds}});
  }
  async function handle(body,who) {
    const feedbackContext=feedbackContextOf(body.qualityFeedback,catalog,'game');if(feedbackContext.length)who={...who,feedbackContext};
    let s=body.state?normalizeConversation(body.state):newConversation({mode:body.mode});
    if(s.facts.some(f=>f?.gameId==null)) {
      const resolved=identities.resolve(s);
      // Repair identity only; preserve the saved exposure, stance and source words verbatim.
      s.facts=s.facts.map(f=>f?.gameId==null?identities.bindFacts(s,[f],resolved).facts?.[0]??f:f);
    }
    s=remembered(body,s);
    if(!body.action) {
      // A visible local recovery question must also be the question accepted by the reducer.
      if(s.phase==='talk'&&!s.question)s.question=conversationScreen(s).question;
      return response(s); // restore never calls an AI endpoint
    }
    const action=body.action;
    const beforeResult=s.result;
    const priorExclusions=s.familiar.excluded;
    if(['familiar_mark','familiar_unmark','familiar_keep'].includes(action.type)&&!catalog.byId.has(action.id))throw Object.assign(Error('Этой карточки нет в каталоге игр.'),{status:400});
    const more=action.type==='more'||action.type==='retry'&&s.failedAction==='more';
    const replacing=more||action.type==='replace_familiar'||action.type==='retry'&&s.failedAction==='replace';
    s=answerConversation(s,action);
    if(action.type==='restart') {s.familiar.excluded=priorExclusions;s=remembered(body,s);}
    if(replacing){
      if(action.type==='replace_familiar'&&action.id!==undefined&&!s.familiar.marked.includes(action.id))throw Object.assign(Error('Сначала отметь этот вариант для замены.'),{status:400});
      const targets=action.type==='replace_familiar'&&action.id!==undefined?[action.id]:action.type==='retry'?s.replacement?.pendingIds:null;
      return replace(s,who,more,targets);
    }
    if(action.type==='undo_replacement')return response(s,{feedbackCarry:{retainedIds:cardsOf(s.result).filter(c=>cardsOf(beforeResult).some(old=>old.id===c.id)).map(c=>c.id)}});
    const final=action.type==='confirm'||action.type==='retry'&&s.failedAction==='pick';
    const planning=!final&&s.needsPlan&&['answer','correct','retry'].includes(action.type);
    if(!final&&!planning)return response(s);
    const permission=access(who);
    if(planning) {
      if(!permission.allowed) {
        s=contextual(s);s.needsPlan=false;s.failedAction='plan';
        return response(s,{error:`${permission.reason??'Помощник недоступен'}. Можно ответить на вопросы и посмотреть предварительные варианты.`,retryable:false});
      }
      spend(who);
      const resolved=identities.resolve(s),knownGames=resolved.knownGames;
      let out;
      try {out=await plan(catalog,s,{...(api?{api}:{}),knownGames});}
      catch {out={error:'Не удалось разобрать ответ. Он сохранён; попробуй ещё раз.'};}
      log('plan',s,out);
      let checked;
      if(!out.error) {
        const bound=identities.bindFacts(s,out.proposal?.facts,resolved);
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
      s=checked.state;s.failedAction=null;
      return response(s);
    }
    const legacy=projection(s);
    if(!permission.allowed) {
      s={...s,phase:'result',result:recommend(catalog,profileOf(legacy),sessionOf(legacy)),provisional:true,failedAction:null};
      s.uncertainties=[...new Set([...s.uncertainties,'Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.'])];
      return response(s);
    }
    spend(who);
    let out;
    try {out=await pick(catalogs,legacy,{...(api?{api}:{}),...(who.feedbackContext?.length?{feedbackContext:who.feedbackContext}:{}),wish:s.summary,previous:[]});}
    catch {out={error:'Не удалось получить рекомендации. Запрос сохранён.'};}
    log('pick',s,out);
    if(out.error)return response({...s,phase:'review',failedAction:'pick'},{error:out.error,retryable:out.retryable!==false});
    // Re-sieve the actual model picks; never silently fill a failed AI list with unrelated popular titles.
    const cards=recommendIds(catalog,profileOf(legacy),sessionOf(legacy),(out.picks??[]).map(p=>p.id));
    if(!cards)return response({...s,phase:'review',failedAction:'pick'},{error:'По этим условиям пока не нашлось подтверждённых вариантов. Можно уточнить или изменить запрос.',retryable:false});
    const byId=new Map(out.picks.map(p=>[p.id,p]));
    for(const card of [cards.top,...cards.alternatives]) {
      const p=byId.get(card.id);card.ai={reason:p.reason,caveat:p.caveat,likelySeen:p.likelySeen,own:p.own};
      card.labelText='Вариант по твоему запросу';
      if(legacy.session.goalExcludes.length) card.feasibility.push({status:'unknown',text:'Отсутствие исключённых особенностей не всегда подтверждено разметкой; проверь оговорку перед выбором.'});
    }
    cards.ai={understood:s.summary,model:out.model??AI.model,shortlist:out.shortlist};
    s={...s,phase:'result',result:cards,question:null,needsPlan:false,failedAction:null};
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
