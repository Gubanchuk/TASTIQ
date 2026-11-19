import {inLibraryDomain} from './anime-pilot.js';
import {isLibrarySaved} from './library-store.js';

export const savedScreenDomains=['film','series','cartoon','anime'];
export const savedPickerDomains=['game',...savedScreenDomains];
export function pickerUrl(domain, params) {
  const search=new URLSearchParams(domain==='game'?{}:{domain});
  for(const [name,value] of Object.entries(params))search.set(name,value);
  return (domain==='game'?'/pick/game/?':'/pick/watch/?')+search;
}
const key='tastiq.saved-sources.v1';
const recentLimit=6;
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,80}$/.test(id);
const validToken=token=>typeof token==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(token);

export function matchesLibraryQuery(row, query) {
  const needle=query.trim().toLocaleLowerCase('ru');
  if(!needle)return true;
  const titles=[row.title,row.ru,row.name,row.original,...(Array.isArray(row.aliases)?row.aliases:[]),row.searchText];
  return titles.some(title=>typeof title==='string'&&title.toLocaleLowerCase('ru').includes(needle));
}

function validView(record, domain) {
  return savedPickerDomains.includes(domain)&&record?.version===1&&record.domain===domain&&Array.isArray(record.ids)&&record.ids.length>0&&
    record.ids.every(validId)&&new Set(record.ids).size===record.ids.length&&typeof record.query==='string'&&Array.isArray(record.aliasMatches);
}

function readHandoff(storage, token, domain) {
  if(!validToken(token)||!savedPickerDomains.includes(domain))return null;
  try{
    const record=readRecent(storage).find(entry=>entry?.token===token);
    return validView(record,domain)?record:null;
  }catch{return null;}
}

function readRecent(storage){
  const value=storage.getItem(key);
  try{const saved=JSON.parse(value??'[]');return Array.isArray(saved)?saved:[];}
  catch{return [];}
}

export function readSavedSource(storage, token, domain) {
  const record=readHandoff(storage,token,domain);
  return record?{version:1,domain,ids:record.ids}:null;
}

export function readSavedSourceView(storage, token, domain, archivedView) {
  const record=readHandoff(storage,token,domain)??(validView(archivedView,domain)?archivedView:null);
  if(!record)return null;
  const {version,ids,query,aliasMatches}=record;
  return {version,domain,ids,query,aliasMatches};
}

export function savedSourceLibraryUrl(storage, token, domain, archivedView) {
  const record=readSavedSourceView(storage,token,domain,archivedView);
  const params=new URLSearchParams({view:'saved'});
  if(savedPickerDomains.includes(domain))params.set('saved.domain',domain);
  if(record?.query)params.set('saved.q',record.query);
  return '/library/?'+params;
}

// The browser may have recovered alternative titles for old bookmarks from the catalog.
// Keep the IDs of those matches so an unchanged list remains unchanged on the picker page.
const titleSnapshot=row=>JSON.stringify([row.title,row.ru,row.name,row.original,row.aliases]);
export function createSavedSource(storage, domain, rows, query, items) {
  if(!storage||!savedPickerDomains.includes(domain))return null;
  const scoped=rows.filter(row=>isLibrarySaved(row)&&inLibraryDomain(row,domain)&&matchesLibraryQuery(row,query));
  const ids=[...new Set(scoped.map(row=>row.id))].sort();
  if(!ids.length||!ids.every(validId))return null;
  const included=new Set(ids);
  const aliasMatches=items.filter(row=>included.has(row.id)&&isLibrarySaved(row)&&inLibraryDomain(row,domain)&&
    !matchesLibraryQuery(row,query)).map(row=>[row.id,titleSnapshot(row)]);
  try{
    const token=crypto.randomUUID();
    const latest={version:1,token,domain,ids,query,aliasMatches};
    // Session storage belongs to this tab. Only replace the ring after a successful write.
    const recent=[latest,...readRecent(storage).slice(0,recentLimit-1)];
    for(;;){
      try{storage.setItem(key,JSON.stringify(recent));break;}
      catch(error){if(error?.name!=='QuotaExceededError'||recent.length===1)throw error;recent.pop();}
    }
    return readHandoff(storage,token,domain)?pickerUrl(domain,{saved:token}):null;
  }catch{return null;}
}

export function savedSourceChanged(storage, token, domain, items, archivedView) {
  const record=readSavedSourceView(storage,token,domain,archivedView);
  if(!record)return false;
  const aliases=new Map(record.aliasMatches.filter(entry=>Array.isArray(entry)&&entry.length===2&&validId(entry[0])&&typeof entry[1]==='string'));
  const current=new Set(items.filter(row=>isLibrarySaved(row)&&inLibraryDomain(row,domain)&&
    (matchesLibraryQuery(row,record.query)||aliases.has(row.id)&&aliases.get(row.id)===titleSnapshot(row))).map(row=>row.id));
  return current.size!==record.ids.length||record.ids.some(id=>!current.has(id));
}
