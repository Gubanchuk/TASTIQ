import {isLibrarySaved} from './library-store.js';

const key=row=>`${row.domain}:${row.id}`;
const valid=row=>row&&['game','film','series','cartoon'].includes(row.domain)&&typeof row.id==='string'&&row.id.length>0;
const ratingOf=row=>['liked','disliked'].includes(row.status)?row.status:null;

// A read-only view: saving, familiarity, request fit and experience are distinct.
// Historical feedback is never rewritten into the model's persistent taste.
export function collectionRecords({items=[],familiar=[],runs=[]}={}) {
 const rows=new Map();
 const ensure=row=>{
  const id=key(row);if(!rows.has(id))rows.set(id,{...row,saved:false,inLibrary:false,rating:null,ratingSource:null,ratingConflict:false,reviews:[],title:row.title||row.ru||row.name||row.id});
  return rows.get(id);
 };
 for(const item of items.filter(valid)){
  const row=ensure(item);Object.assign(row,item,{inLibrary:true,saved:isLibrarySaved(item),rating:ratingOf(item),ratingSource:ratingOf(item)?'explicit':null,reviews:[]});
 }
 for(const entry of familiar.filter(valid)){
  const row=ensure(entry);row.familiarity={...entry};
  for(const field of ['poster','image','year','link','addedAt'])if(!row[field]&&entry[field])row[field]=entry[field];
  if(!row.addedAt)row.addedAt=entry.updatedAt;
 }
 for(const run of runs)for(const card of run.cards??[]){
  const response=run.responses?.find(r=>r.cardId===card.id);
  if(!response||!response.chosen&&!response.started&&!response.fit&&!response.outcome&&!response.note&&!response.reason)continue;
  const item={...card,domain:run.domain};if(!valid(item))continue;
  const row=ensure(item);row.reviews.push({runId:run.id,response:{...response},at:run.at});
  if(!row.addedAt)row.addedAt=run.at;
 }
 return [...rows.values()].map(row=>{
  if(!row.ratingOverride&&!row.rating){
   const opinions=new Set(row.reviews.map(r=>r.response.outcome).filter(v=>['liked','mixed','disliked'].includes(v)));
   row.ratingConflict=opinions.size>1;
   if(opinions.size===1){const value=[...opinions][0];row.rating=value==='mixed'?'mixed':value;row.ratingSource='experience';}
  }
  return row;
 }).filter(row=>row.saved||row.rating||row.ratingOverride||row.ratingConflict||row.familiarity||row.reviews.length||row.lane==='known'||row.status==='known');
}
