export const MEDIA_HISTORY_PREFIX='tastiq.media-history.';
export const mediaHistoryPrefix=domain=>`${MEDIA_HISTORY_PREFIX}${domain}.v1:`;
const domains=new Set(['film','series','cartoon']);
const copy=value=>structuredClone(value);
const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,80}$/.test(id);
const exposures=new Set(['seen','unplayed','started','finished','dropped','paused']);
const safe=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};

// Familiarity is domain-scoped and independent of taste and saved plans.
export function createMediaHistory(domain,{storage,now=()=>new Date().toISOString()}={}) {
 if(!domains.has(domain))throw TypeError('Некорректный раздел истории');
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{/* in-memory visit */}
 const prefix=mediaHistoryPrefix(domain),entries=new Map();let persistent=Boolean(storage);
 const normalize=row=>row&&valid(row.id)&&typeof row.title==='string'&&row.title.length<=300
  ?{id:row.id,title:row.title,domain,exposure:exposures.has(row.exposure)?row.exposure:'seen',blocked:row.blocked===true,
    updatedAt:typeof row.updatedAt==='string'?row.updatedAt:now(),poster:safe(row.poster),image:safe(row.image),link:safe(row.link),year:row.year??null,kind:row.kind??null}:null;
 function refresh(){
  if(!persistent)return;
  try{const fresh=new Map();for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;try{const row=normalize(JSON.parse(storage.getItem(key)));if(row&&key===prefix+row.id)fresh.set(row.id,row);}catch{/* one corrupt record */}}entries.clear();for(const [id,row]of fresh)entries.set(id,row);}catch{persistent=false;}
 }
 function save(row){entries.set(row.id,row);if(persistent)try{storage.setItem(prefix+row.id,JSON.stringify({version:1,...row}));}catch{persistent=false;}return copy(row);}
 const api={get persistent(){return persistent;},refresh,all(){refresh();return [...entries.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id)).map(copy);},blockedIds(){return api.all().filter(r=>r.blocked).map(r=>r.id);},
  remember(card,{exposure,blocked}={}){if(!valid(card?.id))return null;refresh();const prior=entries.get(card.id);return save(normalize({...prior,...card,id:card.id,title:String(card.ru||card.name||card.title||prior?.title||card.id).slice(0,300),exposure:exposures.has(exposure)?exposure:prior?.exposure??'seen',blocked:typeof blocked==='boolean'?blocked:prior?.blocked??false,updatedAt:now()}));},
  setBlocked(id,blocked){refresh();const prior=entries.get(id);return prior&&typeof blocked==='boolean'?save({...prior,blocked,updatedAt:now()}):null;},
  forget(id){refresh();if(!entries.has(id))return false;entries.delete(id);if(persistent)try{storage.removeItem(prefix+id);}catch{persistent=false;}return true;},
 };refresh();return api;
}
