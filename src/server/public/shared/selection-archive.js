// Local result snapshots are independent of plans, taste ratings and submitted feedback.
export const SELECTION_ARCHIVE_KEY='tastiq.selections.v1';
const domains=['game','film','series','cartoon'];
const token=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(x);
const copy=x=>structuredClone(x);
const domainOf=s=>s?.state?.domain??'game';
const cardsOf=s=>[s?.state?.result?.top,...(s?.state?.result?.alternatives??[])].filter(Boolean);
const valid=s=>s?.state?.version===1&&token(s.state.id)&&domains.includes(domainOf(s))&&s.state.phase==='result'&&s.screen?.type==='result'&&cardsOf(s).length>0&&cardsOf(s).length<=4&&cardsOf(s).every(c=>token(c.id));
const batchKey=s=>JSON.stringify([domainOf(s),s.state.id,cardsOf(s).map(c=>c.id)]);
export const selectionUrl=row=>row.domain==='game'?`/pick/game/?selection=${encodeURIComponent(row.id)}`:`/pick/watch/?domain=${row.domain}&selection=${encodeURIComponent(row.id)}`;
export function createSelectionArchive({storage,now=()=>new Date().toISOString(),id=()=>crypto.randomUUID()}={}){
 let rows=[],persistent=Boolean(storage);
 const read=()=>{if(!persistent)return;try{const data=JSON.parse(storage?.getItem(SELECTION_ARCHIVE_KEY)??'null');if(data?.version===1&&Array.isArray(data.entries))rows=data.entries.filter(r=>token(r?.id)&&valid(r.snapshot)&&r.domain===domainOf(r.snapshot)&&Number.isFinite(Date.parse(r.at))).slice(0,30);}catch{/* keep this visit's last valid snapshot */}};
 const write=()=>{
  if(!storage){persistent=false;return;}
  // Bound our own key; never clear other local data to make space.
  while(rows.length>1&&JSON.stringify(rows).length>1_500_000)rows.pop();
  for(;;)try{storage.setItem(SELECTION_ARCHIVE_KEY,JSON.stringify({version:1,entries:rows}));persistent=true;return;}catch{if(rows.length>1)rows.pop();else{persistent=false;return;}}
 };
 const capture=snapshot=>{
  if(!valid(snapshot))return null;read();const key=batchKey(snapshot),prior=rows.find(r=>batchKey(r.snapshot)===key);
  const row={id:prior?.id??id(),domain:domainOf(snapshot),at:prior?.at??now(),snapshot:copy(snapshot)};
  rows=[row,...rows.filter(r=>r.id!==row.id)].slice(0,30);write();return copy(row);
 };
 read();
 // Recover the most recent result per domain from saves created before the archive existed.
 for(const domain of domains)try{const saved=JSON.parse(storage?.getItem(`tastiq.conversation.${domain}.v1`)??'null');for(const s of [saved?.previous?.snapshot,saved?.correctionCheckpoint?.snapshot,saved?.snapshot])if(valid(s)&&domainOf(s)===domain&&!rows.some(r=>batchKey(r.snapshot)===batchKey(s)))capture(s);}catch{/* invalid old saves do not block the library */}
 return {get persistent(){return persistent;},capture,all(){read();return copy(rows);},get(entryId,domain){read();const row=rows.find(r=>r.id===entryId&&r.domain===domain);return row?copy(row.snapshot):null;}};
}
