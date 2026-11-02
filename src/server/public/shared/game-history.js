// Familiarity is a fact, never a taste score. Only an explicit blocked flag excludes future picks.
export const GAME_HISTORY_PREFIX='tastiq.game-history.v1:';
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(value);
const exposures=new Set(['played','started','finished','paused']);
const cleanTitle=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,200);
const copy=value=>value?structuredClone(value):null;
function normalize(value,key) {
 if(value?.version!==1||!validId(value.id)||key!==GAME_HISTORY_PREFIX+value.id||!exposures.has(value.exposure)
  ||typeof value.title!=='string'||!value.title||value.title.length>200||typeof value.blocked!=='boolean'
  ||typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))return null;
 return {id:value.id,title:value.title,exposure:value.exposure,blocked:value.blocked,updatedAt:value.updatedAt};
}
export function createGameHistory({storage,now=()=>new Date().toISOString()}={}) {
 let entries=new Map(),persistent=Boolean(storage);
 function refresh() {
  if(!persistent)return;
  try {
   const found=new Map();
   for(let i=0;i<storage.length;i++) {
    const key=storage.key(i);if(!key?.startsWith(GAME_HISTORY_PREFIX))continue;
    try {const row=normalize(JSON.parse(storage.getItem(key)),key);if(row)found.set(row.id,row);}catch { /* malformed individual entries are ignored */ }
   }
   entries=found;
  }catch {persistent=false;}
 }
 function save(row) {
  entries.set(row.id,row);
  if(persistent)try {storage.setItem(GAME_HISTORY_PREFIX+row.id,JSON.stringify({version:1,...row}));}catch {persistent=false;}
  return copy(row);
 }
 const api={
  get persistent(){return persistent;},
  refresh,
  all(){refresh();return [...entries.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id)).map(copy);},
  blockedIds(){return api.all().filter(x=>x.blocked).map(x=>x.id);},
  remember(card,{exposure,blocked}={}) {
   if(!validId(card?.id))return null;refresh();const prior=entries.get(card.id);
   const title=cleanTitle(card.ru||card.name||card.title||prior?.title||card.id);
   return save({id:card.id,title,exposure:exposures.has(exposure)?exposure:prior?.exposure??'played',blocked:typeof blocked==='boolean'?blocked:prior?.blocked??false,updatedAt:now()});
  },
  setBlocked(id,blocked) {refresh();const prior=entries.get(id);return prior&&typeof blocked==='boolean'?save({...prior,blocked,updatedAt:now()}):null;},
  forget(id) {
   refresh();if(!entries.has(id))return false;entries.delete(id);
   if(persistent)try {storage.removeItem(GAME_HISTORY_PREFIX+id);}catch {persistent=false;}
   return true;
  },
 };
 refresh();return api;
}
