import {inLibraryDomain} from './anime-pilot.js';
import {safeLibraryUrl} from './library-store.js';
const votes=new Set(['liked','disliked']);
export const exampleLimit=8;
export const exampleKey=row=>row.id??'title:'+row.title.trim().toLowerCase();

export function exampleChoices({mentioned=[],suggested=[]},library,history,domain){
  const familiar=library.filter(r=>inLibraryDomain(r,domain)&&(r.lane==='known'||r.status==='known'||votes.has(r.status)));
  const experienced=history.filter(r=>r.exposure!=='unplayed');
  const known=new Map([...experienced,...familiar].map(r=>[r.id,r]));
  const matches=suggested.filter(r=>known.has(r.id));
  const knownRows=[...matches,...familiar,...experienced];
  // Leave room for today's theme even when the library has many older ratings.
  const ordered=[...mentioned.slice(0,2),...knownRows.slice(0,2),...suggested,...knownRows,...mentioned];
  const cards=new Map();
  for(const row of ordered){
    if(cards.has(row.id))continue;
    const prior=known.get(row.id);
    cards.set(row.id,{...prior,...row,title:row.title||row.ru||row.name,libraryRating:votes.has(prior?.status)?prior.status:null});
    if(cards.size===4)break;
  }
  return [...cards.values()].map(row=>row.id?.startsWith('example:')?{...row,id:null}:row);
}

// This optional field lives in the existing conversation draft envelope, so restart,
// archive navigation and restore follow the same lifecycle as typed answers.
export function cleanExampleDraft(rows){
  if(!Array.isArray(rows))return [];
  return rows.slice(0,exampleLimit).filter(r=>r&&typeof r.title==='string'&&r.title.trim()).map(r=>({
    id:typeof r.id==='string'?r.id.slice(0,100):null,title:r.title.trim().slice(0,160),
    rating:votes.has(r.rating)?r.rating:null,reason:votes.has(r.rating)&&typeof r.reason==='string'?r.reason.slice(0,300):'',
    added:r.added===true,poster:safeLibraryUrl(r.poster),image:safeLibraryUrl(r.image),
  }));
}

export function exampleVotes(rows){
  return rows.filter(row=>votes.has(row.rating)).map(({id,title,rating,reason})=>({id,title,rating,...(reason?.trim()?{reason:reason.trim()}:{})}));
}
