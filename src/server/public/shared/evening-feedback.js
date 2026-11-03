// Shared browser/server contract. Feedback describes one evening, never a persistent taste update.
import { feedbackTransactions } from './evening-storage.js';
import {normalizeSelectionReview,historicalFeedback} from './selection-review.js';
export const FEEDBACK_KEY = 'tastiq.site.evenings';
export const FIT = {accept:'Подходит',conditional:'С оговоркой',reject:'Не подходит',unknown:'Пока не знаю'};
export const REASONS = {mood:'Не то настроение',taste:'Не мой вкус',time:'Не укладывается по времени',company:'Не для моей компании',availability:'Не могу запустить или посмотреть',seen:'Уже знакомо',other:'Другая причина'};
export const OUTCOMES = {liked:'Понравилось',mixed:'Нормально',disliked:'Не зашло',not_started:'Не начал'};
const DOMAINS = ['game','film','series','cartoon'], ORIGINS = ['model','fill','engine'];
const token = (x) => typeof x === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(x);
const feature = (x) => typeof x === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(x);
const text = (x,max) => typeof x === 'string' && x.length <= max;
const date = (x) => text(x,40) && Number.isFinite(Date.parse(x));
const member = (x, obj) => x === null || Object.hasOwn(obj,x);
const clean = (x,max) => String(x ?? '').replace(/\s+/g,' ').trim().slice(0,max);

// The new dialogue carries a checked budget directly, without forging legacy confirmedIntent.
function conversationMinutes(state) {
  const budget=state?.conversation?.sessionTime;
  if(!DOMAINS.includes(state?.domain)||state.domain!=='game'&&state.conversation?.domain!==state.domain||!Number.isInteger(budget?.minutes)||budget.minutes<5||budget.minutes>1440
    ||budget.minutes!==state.session?.minutes||!token(budget.sourceId)||!text(budget.quote,400)||!budget.quote.trim())return null;
  const source=state.conversation.turns?.find(turn=>turn.id===budget.sourceId&&!turn.superseded);
  return typeof source?.answer==='string'&&source.answer.includes(budget.quote)?budget.minutes:null;
}
const MEDIA_CONTEXT={timeMode:['runtime','episode','session'],commitment:['single','short','long','open'],format:['movie','episodic']};
function mediaConversationContext(state){
 if(state.domain==='game'||state.conversation?.domain!==state.domain)return {};
 const conversation=state.conversation,context={};
 for(const key of [...Object.keys(MEDIA_CONTEXT),'onlyEnded']){
  const value=conversation.context?.[key],evidence=conversation.contextEvidence?.[key];
  const source=conversation.turns?.find(t=>t.id===evidence?.sourceId&&!t.superseded);
  const valid=value!=null&&(key==='onlyEnded'?typeof value==='boolean':MEDIA_CONTEXT[key].includes(value));
  context[key]=valid&&evidence?.value===value&&typeof evidence.quote==='string'&&evidence.quote.trim()&&typeof source?.answer==='string'&&source.answer.includes(evidence.quote)?value:null;
 }
 return context;
}

export function normalizeFeedback(x) {
  if (!x || x.version !== 1 || !token(x.id) || !token(x.dialogueId) || !DOMAINS.includes(x.domain)
    || !Number.isInteger(x.revision) || x.revision < 0 || x.revision > 1e6 || !date(x.at) || !date(x.updatedAt)
    || !Array.isArray(x.cards) || !x.cards.length || x.cards.length > 4 || !Array.isArray(x.responses) || x.responses.length > 4) return null;
  const ids = new Set(), cards = [];
  for (const c of x.cards) {
    if (!token(c?.id) || ids.has(c.id) || !text(c.title,200) || !ORIGINS.includes(c.origin)) return null;
    ids.add(c.id); cards.push({id:c.id,title:c.title,origin:c.origin,reason:clean(c.reason,220),caveat:clean(c.caveat,140)});
  }
  const responded = new Set(), responses = [];
  for (const r of x.responses) {
    if (!ids.has(r?.cardId) || responded.has(r.cardId) || !member(r.fit,FIT) || !member(r.reason,REASONS) || !member(r.outcome,OUTCOMES)
      || !text(r.note,300) || typeof r.chosen !== 'boolean' || typeof r.started !== 'boolean'
      || (!r.chosen && (r.started || r.outcome != null)) || (r.outcome === 'not_started' && r.started)
      || (r.outcome && r.outcome !== 'not_started' && !r.started)) return null;
    responded.add(r.cardId); responses.push({cardId:r.cardId,fit:r.fit,reason:r.reason,note:r.note,chosen:r.chosen,started:r.started,outcome:r.outcome});
  }
  const c = x.context ?? {}, context = {};
  for (const k of ['platform','time','company','partySize','childAge']) {
    if (c[k] != null && !text(c[k],40)) return null;
    context[k] = c[k] ?? null;
  }
  for (const k of ['wants','avoids','stops']) {
    if (c[k] != null && (!Array.isArray(c[k]) || c[k].length > 30 || c[k].some(f=>!feature(f)))) return null;
    context[k] = [...new Set(c[k] ?? [])];
  }
  if (c.minutes != null && (!Number.isInteger(c.minutes) || c.minutes < 5 || c.minutes > 1440)) return null;
  context.minutes = c.minutes ?? null; context.note = clean(c.note,300);
  if(x.domain!=='game'){
    for(const [key,values] of Object.entries(MEDIA_CONTEXT))if(Object.hasOwn(c,key)){
      if(c[key]!=null&&!values.includes(c[key]))return null;context[key]=c[key]??null;
    }
    if(Object.hasOwn(c,'onlyEnded')){if(c.onlyEnded!=null&&typeof c.onlyEnded!=='boolean')return null;context.onlyEnded=c.onlyEnded??null;}
  }
  const selectionReview=Object.hasOwn(x,'selectionReview')?normalizeSelectionReview(x.selectionReview):undefined;
  if(selectionReview===null)return null;
  return {version:1,id:x.id,dialogueId:x.dialogueId,domain:x.domain,revision:x.revision,at:x.at,updatedAt:x.updatedAt,context,cards,responses,...(selectionReview?{selectionReview}:{})};
}

// Private source words and displayed AI sentences can contain those words. Never send either automatically.
export function publicFeedback(run) {
  const out = normalizeFeedback(run);
  if (!out) return null;
  delete out.context.note;
  out.cards = out.cards.map(({id,title,origin})=>({id,title,origin}));
  return out;
}

export function createFeedbackStore({storage,send,id=()=>crypto.randomUUID(),now=()=>new Date().toISOString(),onChange=()=>{},locks,transaction=feedbackTransactions(storage)}) {
  // A transaction contains local read-modify-write, never a network request. Locks are an offline test adapter.
  if(!transaction&&!locks?.request)storage=undefined;
  const exclusive=async fn=>{
    if(transaction){let called=false,value;
      try{return await transaction(atomic=>{
        const cache=storage;storage=atomic;
        try{entries=read();called=true;value=fn();return value;}finally{storage=cache;}
      });}catch{
        transaction=null;storage=undefined;persistent=false;onChange();
        return called?value:fn();
      }
    }
    return locks?.request?locks.request(FEEDBACK_KEY,fn):fn();
  };
  const payload=run=>JSON.stringify(publicFeedback(run));
  let entries = [], persistent = Boolean(transaction||storage), pending = null;
  const read = () => { try {
    const saved = JSON.parse(storage?.getItem(FEEDBACK_KEY) ?? 'null');
    if (saved?.version === 1 && Array.isArray(saved.entries)) return saved.entries.flatMap(e=>{
      const run=normalizeFeedback(e.run);
      if(!run || !text(e.key,100000) || !Number.isInteger(e.ack) || e.ack < -1 || e.ack>run.revision)return [];
      const ack=e.ack===run.revision && e.ackPayload!==payload(run)?-1:e.ack;
      const carryFrom=token(e.carryFrom?.id)&&Number.isSafeInteger(e.carryFrom.revision)&&e.carryFrom.revision>=0
        ? {id:e.carryFrom.id,revision:e.carryFrom.revision} : null;
      return [{run,key:e.key,ack,ackPayload:e.ackPayload??null,carryFrom}];
    });
  } catch { /* malformed storage starts empty */ } return []; };
  entries=read();
  const refresh = () => {
    for(const stored of read()) {
      const current=entries.find(e=>e.run.id===stored.run.id);
      if(!current)entries.push(stored);
      else {
        if(stored.run.revision>current.run.revision){current.run=stored.run;current.key=stored.key;current.carryFrom=stored.carryFrom;}
        if(stored.run.revision===current.run.revision && payload(stored.run)===payload(current.run))current.carryFrom=stored.carryFrom;
        if(payload(stored.run)===payload(current.run) && stored.ack>=current.ack){current.ack=stored.ack;current.ackPayload=stored.ackPayload;}
      }
    }
    while(entries.length>60){const i=entries.findIndex(e=>e.ack>=e.run.revision);if(i<0)break;entries.splice(i,1);}
  };
  const save = () => {
    try { if (!storage) throw Error(); storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries})); }
    catch { persistent=false; }
    onChange();
  };
  const getEntry = (rid) => entries.find(e=>e.run.id===rid);
  const api = {
    get persistent() { return persistent; },
    async refresh() {await exclusive(()=>refresh());onChange();},
    all: () => entries.map(e=>structuredClone(e.run)),
    get: (rid) => { const e=getEntry(rid); return e ? structuredClone(e.run) : null; },
    learning: domain => historicalFeedback(entries.map(e=>e.run),domain),
    review(rid,value) { return exclusive(()=>{
      refresh();const e=getEntry(rid),checked=normalizeSelectionReview(value);if(!e||!checked)return false;
      if(JSON.stringify(e.run.selectionReview)===JSON.stringify(checked))return true;
      e.run.selectionReview=checked;e.run.revision++;e.run.updatedAt=now();save();return true;
    }); },
    status: (rid) => { const e=getEntry(rid); return !e ? 'missing' : e.ack===e.run.revision && e.ackPayload===payload(e.run) ? 'sent' : 'pending'; },
    observe(dialogueId,state,result,{inheritFrom,carryIntoExisting=false,retainedIds}={}) { return exclusive(()=>{
      if (!token(dialogueId) || !DOMAINS.includes(state?.domain) || !result?.top) return null;
      refresh();
      const s=state.situation ?? {}, intent=s.intent?.source==='confirmed' && s.intent.sourceText===s.note ? s.intent : null;
      const context={platform:state.domain==='game'?state.platform:null,time:s.time??null,company:s.company??null,
        partySize:state.domain==='game'?(s.company==='friend'?'2':s.company==='group'?s.partySize??null:null):null,childAge:s.company==='kids'?s.childAge??null:null,
        minutes:conversationMinutes(state)??intent?.time?.minutes??null,...mediaConversationContext(state),wants:(intent?.wants??(state.domain!=='game'?state.session?.goalWants:[])??[]).map(x=>x.f),avoids:(intent?.avoids??(state.domain!=='game'?state.session?.goalAvoids:[])??[]).map(x=>x.f),stops:state.stops??[],note:clean(result.ai?.wish || s.note,300)};
      const cards=[result.top,...(result.alternatives??[])].slice(0,4).map(p=>({id:p.id,title:clean(p.ru??p.name,200),origin:p.ai?'model':result.ai?'fill':'engine',reason:clean(p.ai?.reason,220),caveat:clean(p.ai?.caveat,140)}));
      const key=JSON.stringify([dialogueId,state.domain,context,cards,state.answers,state.preferences,state.corrections]);
      // A replacement may carry opinions only for the same games in the same evening.
      // Compare the private source note too: identical feature tags can hide a changed wish.
      const source=getEntry(inheritFrom)?.run;
      const retained=retainedIds===undefined?null:new Set(Array.isArray(retainedIds)?retainedIds.filter(token):[]);
      const responses=source?.dialogueId===dialogueId && source.domain===state.domain && Object.keys(context).every(k=>JSON.stringify(source.context[k])===JSON.stringify(context[k]))
        ? structuredClone(source.responses.filter(r=>cards.some(c=>c.id===r.cardId)&&(!retained||retained.has(r.cardId)))) : [];
      const carryFrom=responses.length?{id:source.id,revision:source.revision}:null;
      const prior=entries.find(e=>e.key===key);
      if(prior) {
        // Only an explicit transition may refresh retained opinions on an existing snapshot.
        // Persist its source revision so a repeated transition cannot undo a later local edit.
        if(carryIntoExisting && carryFrom && JSON.stringify(prior.carryFrom)!==JSON.stringify(carryFrom)) {
          const incoming=new Map(responses.map(r=>[r.cardId,r]));
          const merged=prior.run.responses.map(r=>incoming.get(r.cardId)??r);
          merged.push(...responses.filter(r=>!prior.run.responses.some(old=>old.cardId===r.cardId)));
          if(JSON.stringify(merged)!==JSON.stringify(prior.run.responses)) {
            prior.run.responses=merged;prior.run.revision++;prior.run.updatedAt=now();
          }
          prior.carryFrom=carryFrom;save();
        }
        return structuredClone(prior.run);
      }
      if(entries.length>=60) { const at=entries.findIndex(e=>e.ack>=e.run.revision); if(at<0)return null; entries.splice(at,1); }
      let rid=id(); for(let attempt=0;getEntry(rid)&&attempt<5;attempt++)rid=id();
      if(getEntry(rid))return null;
      const at=now(), run=normalizeFeedback({version:1,id:rid,dialogueId,domain:state.domain,revision:0,at,updatedAt:at,context,cards,responses});
      if(!run)return null;
      entries.push({key,run,ack:-1,carryFrom});save();return structuredClone(run);
    }); },
    update(rid,cardId,action) { return exclusive(()=>{
      refresh();
      const e=getEntry(rid); if(!e?.run.cards.some(c=>c.id===cardId))return false;
      const before=e.run.responses.find(r=>r.cardId===cardId);
      const r={...(before??{cardId,fit:null,reason:null,note:'',chosen:false,started:false,outcome:null})};
      if(action.type==='fit' && member(action.value,FIT)) {r.fit=action.value;if(!['conditional','reject'].includes(r.fit))r.reason=null;}
      else if(action.type==='choose' && typeof action.value==='boolean') {r.chosen=action.value;if(!r.chosen){r.started=false;r.outcome=null;}}
      else if(action.type==='start' && r.chosen && typeof action.value==='boolean') {r.started=action.value;if(!r.started||r.outcome==='not_started')r.outcome=null;}
      else if(action.type==='outcome' && r.chosen && member(action.value,OUTCOMES)) {r.outcome=action.value;if(r.outcome)r.started=r.outcome!=='not_started';}
      else if(action.type==='explain' && member(action.reason,REASONS)) {r.reason=action.reason;r.note=clean(action.note,300);}
      else return false;
      if(JSON.stringify(before)===JSON.stringify(r))return true;
      e.run.responses=e.run.responses.filter(x=>x.cardId!==cardId).concat(r);e.run.revision++;e.run.updatedAt=now();save();return true;
    }); },
    flush() {
      if(pending)return pending;
      // Drain the latest revisions, including edits during a slow request. Bound work; stop on the first error.
      pending=(async()=>{
        for(let count=0;count<120;count++)try {
          const run=await exclusive(()=>{refresh();const next=entries.find(e=>api.status(e.run.id)==='pending');return next?publicFeedback(next.run):null;});
          if(!run)break;
          const ack=await send(run);
          if(!ack?.ok || ack.id!==run.id || ack.revision!==run.revision)break;
          await exclusive(()=>{
            refresh();const e=getEntry(run.id);
            if(e && (e.run.revision>run.revision || payload(e.run)===payload(run)) && run.revision>=e.ack){e.ack=run.revision;e.ackPayload=payload(run);save();}
          });
        } catch { break; }
      })().finally(()=>{pending=null;onChange();});
      return pending;
    },
  };
  return api;
}
