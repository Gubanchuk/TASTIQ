import {createSelectionArchive} from './selection-archive.js';
import {conversationStorageKey} from './conversation-client.js';
import {pickerUrl,readSavedSourceView,savedSourceChanged,savedSourceLibraryUrl} from './saved-source.js';

// Keep a separate draft per tab and list. All results share the library archive.
export function savedPickerSession({params,domain,storage,session}){
 const base=conversationStorageKey(domain);
 const selection=params.get('selection'),token=params.get('saved'),archiveId=params.get('savedArchive');
 const archiveEntry=selection||archiveId;
 const archived=archiveEntry?createSelectionArchive({storage}).get(archiveEntry,domain):null;
 if(selection&&!archived)return {missing:true};
 if(token===null&&archiveId===null&&!archived?.state.savedSource)return {draftStorage:storage,key:base,selection};
 const handle=token??archiveEntry;
 const routedDomain=params.get('domain')??(domain==='game'?'game':null);
 if(routedDomain!==domain||!handle||!/^[a-zA-Z0-9:_-]{1,100}$/.test(handle)||token!==null&&archiveEntry||selection&&archiveId)return {missing:true};
 const key=base+(token!==null?'.saved.':'.archive.')+handle;
 let draft;
 try{draft=JSON.parse(session?.getItem(key)??'null')?.snapshot;}catch{/* the archive or library handoff can still be opened */}
 const valid=source=>source?.version===1&&source.domain===domain&&Array.isArray(source.ids)&&source.ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(id));
 const handoff=token!==null?readSavedSourceView(session,token,domain):null;
 const savedListView=handoff??archived?.savedListView??draft?.savedListView;
 const savedSource=handoff?{version:1,domain,ids:handoff.ids}:archived?.state.savedSource??draft?.state?.savedSource;
 if(!valid(savedSource))return {missing:true};
 return {key,draftStorage:session??null,token,savedSource,savedListView,archivedId:archiveEntry,
  selection:archiveEntry&&(selection||!valid(draft?.state?.savedSource))?archiveEntry:null};
}

// Consume the one-shot selection parameter. Subsequent reloads resume this tab's archive draft.
export function resumeArchiveUrl(session){
 const url=new URL(location.href);
 if(!url.searchParams.has('selection'))return;
 url.searchParams.delete('selection');
 if(session.archivedId)url.searchParams.set('savedArchive',session.archivedId);
 window.history.replaceState(window.history.state,'',url);
}

export function bindSavedSourceBanner(session,domain,tabStorage){
 if(!session.savedSource&&!session.missing)return ()=>{};
 const panel=document.getElementById('saved-source-banner');
 panel.innerHTML='<strong id="source-description"></strong><span id="source-changed" role="status" hidden>Список изменился. Здесь сохранён его прежний состав.</span>'
  +'<nav aria-label="Изменить источник подбора"><a id="source-library">Открыть сохранённое</a><a id="source-catalog">Искать во всём каталоге</a></nav>';
 const heading=panel.querySelector('#source-description'),libraryLink=panel.querySelector('#source-library');
 libraryLink.href=savedSourceLibraryUrl(tabStorage,session.token,domain,session.savedListView);
 panel.querySelector('#source-catalog').href=pickerUrl(domain,{choose:'1'});
 panel.hidden=false;
 if(session.missing){
  heading.textContent='Список для этого подбора больше недоступен. Открой сохранённое и выбери список заново.';
  document.getElementById('picker-workspace').hidden=true;
  document.querySelector('.app-shell-actions').hidden=true;
  return ()=>{};
 }
 return (state,items)=>{
  heading.textContent='Подбор из сохранённого · '+(state.savedSource??session.savedSource).ids.length;
  const changed=savedSourceChanged(tabStorage,session.token,domain,items,session.savedListView);
  panel.querySelector('#source-changed').hidden=!changed;
  libraryLink.textContent=changed?'Начать с обновлённым списком':'Открыть сохранённое';
 };
}

export function savedResultLimits(snapshot){
 const {state,error,retryable}=snapshot??{};
 const exhausted=state?.savedSource&&error&&retryable===false;
 return {noFirstMatch:Boolean(exhausted&&(!state.savedSource.ids.length||state.failedAction==='pick')),
  noMore:Boolean(exhausted&&state.failedAction==='more')};
}
