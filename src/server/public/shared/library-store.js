export const LIBRARY_KEY='tastiq.site.library';
const DOMAINS=new Set(['game','film','series','cartoon']);
const LANES=new Set(['want','tonight','known']);
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9:_.-]{1,160}$/.test(value);
const clone=value=>structuredClone(value);
const clean=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,300);
const empty=()=>({version:1,items:[],history:[]});
const laneOf=item=>LANES.has(item.lane)?item.lane:['liked','disliked','known'].includes(item.status)?'known':'want';
const matches=(row,domain,id)=>row?.domain===domain&&row.id===id;

export function safeLibraryUrl(value) {
 if(typeof value!=='string'||!value||/[\\\u0000-\u0020]/.test(value))return null;
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

// Local plans share the legacy envelope. A lane never changes a taste answer or score.
// Every operation reads the latest envelope, including history written by the older picker.
export function createLibraryStore({storage,now=()=>new Date().toISOString()}={}) {
 let snapshot=empty(),persistent=Boolean(storage?.getItem&&storage?.setItem);
 function read() {
  if(!persistent)return;
  try {
   const saved=JSON.parse(storage.getItem(LIBRARY_KEY)??'null');
   snapshot=saved?.version===1&&Array.isArray(saved.items)?{...saved,history:Array.isArray(saved.history)?saved.history:[]}:empty();
  }catch(error) {
   if(error instanceof SyntaxError)snapshot=empty();
   else persistent=false;
  }
 }
 function write() {
  if(persistent)try{storage.setItem(LIBRARY_KEY,JSON.stringify(snapshot));}catch{persistent=false;}
 }
 const visible=row=>row&&validId(row.id)&&DOMAINS.has(row.domain);
 const view=row=>clone({...row,lane:laneOf(row)});
 const indexOf=(domain,id)=>snapshot.items.findIndex(row=>matches(row,domain,id));
 const api={
  get persistent(){return persistent;},
  all(){read();return snapshot.items.filter(visible).map(view);},
  history(){read();return clone(snapshot.history);},
  save(card,{lane='want',domain=card?.domain}={}) {
   if(!validId(card?.id)||!DOMAINS.has(domain)||!LANES.has(lane))return null;
   read();const index=indexOf(domain,card.id),prior=snapshot.items[index],at=now();
   const title=clean(card.ru||card.name||card.title||prior?.title||card.id);
   const metadata={};
   for(const field of ['year','poster','image','kind','link'])if(card[field]!=null)metadata[field]=card[field];
   const item=prior?{...prior,...metadata,title,lane,updatedAt:at}
    :{id:card.id,domain,title,year:null,poster:null,image:null,kind:null,link:null,...metadata,status:lane==='known'?'known':'want',lane,addedAt:at,updatedAt:at};
   if(prior)snapshot.items[index]=item;else snapshot.items.unshift(item);
   write();return view(item);
  },
  move(domain,id,lane) {
   if(!DOMAINS.has(domain)||!validId(id)||!LANES.has(lane))return null;
   read();const index=indexOf(domain,id);if(index<0)return null;
   const item={...snapshot.items[index],lane,updatedAt:now()};snapshot.items[index]=item;write();return view(item);
  },
  remove(domain,id) {
   read();const index=indexOf(domain,id);if(index<0)return null;
   const [item]=snapshot.items.splice(index,1);write();return {item:clone(item),index};
  },
  restore(removed) {
   if(!visible(removed?.item)||!Number.isInteger(removed.index)||removed.index<0)return null;
   read();if(indexOf(removed.item.domain,removed.item.id)>=0)return null;
   const item=clone(removed.item);snapshot.items.splice(Math.min(removed.index,snapshot.items.length),0,item);write();return view(item);
  },
  // Only this explicitly invoked action edits a persistent taste rating.
  rate(domain,id,status) {
   if(![null,'liked','disliked'].includes(status))return null;
   read();const index=indexOf(domain,id);if(index<0)return null;
   const prior=snapshot.items[index],next=status??(['liked','disliked'].includes(prior.status)?'known':prior.status);
   const item={...prior,status:next,lane:laneOf(prior),updatedAt:now()};
   if(prior.status!==next)delete item.answer;
   snapshot.items[index]=item;write();return view(item);
  },
 };
 read();return api;
}
