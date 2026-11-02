import {CONVERSATION_GAME_ALIASES} from './conversation-game-aliases.js';

// Whole lexical tokens, preserving original offsets for exact source quotes. No fuzzy matching.
const tokens=text=>[...String(text??'').matchAll(/\p{L}+(?:['’]\p{L}+)*|\p{N}+/gu)].map(m=>({key:m[0].toLowerCase().replace(/ё/g,'е').replace(/['’]/g,''),start:m.index,end:m.index+m[0].length}));
const key=text=>tokens(text).map(t=>t.key).join(' ');
const generic=new Set(['control','portal','портал','контрол','inside','home','life','love','one','journey','rust','raft','stray','grounded','distance','heroes','horizon','dead','story','stories','fear','prey','a way out']);
const workOf=g=>g.work??g.id;
function titleCue(text,start,end) {
 const before=text.slice(Math.max(0,start-45),start),after=text.slice(end,end+35);
 return /[«"“„]\s*$/.test(before)&&/^\s*[»"”]/.test(after)
  || /(?:играл[аи]?|играть|игр[аыу]|played|finished|прош[её]л|прошла|проходил[аи]?|бросил[аи]?|пробовал[аи]?|люблю|понравил[ао]сь)\s+(?:в\s+)?$/iu.test(before)
  || /^\s+(?:прош[её]л|прошла|пройден[ао]?|проходил[аи]?|бросил[аи]?|играл[аи]?|finished|played)(?:\s|[.;,!?]|$)/iu.test(after);
}

export function createConversationGameIdentity(catalog,{curatedAliases=CONVERSATION_GAME_ALIASES}={}) {
 const index=new Map(),rules=[];
 function add(item,name,aliasId) {
  const parts=tokens(name).map(t=>t.key);if(!parts.length)return;
  const row={item,parts,aliasId};const list=index.get(parts[0])??[];list.push(row);index.set(parts[0],list);
  if(parts[0]==='the'&&parts.length>2)add(item,parts.slice(1).join(' '),`${aliasId}:article`);
 }
 for(const item of catalog.items) {
  for(const field of ['name','ru','original'])if(item[field])add(item,item[field],`catalog:${item.id}:${field}`);
  for(const [i,alias] of (item.aliases??[]).entries())if(typeof alias==='string')add(item,alias,`catalog:${item.id}:alias:${i}`);
 }
 for(const rule of curatedAliases) {
  const targets=catalog.items.filter(g=>rule.targets.some(name=>key(name)===key(g.name)));
  if(!targets.length)continue;
  rules.push({id:rule.id,targets:targets.map(g=>({id:g.id,name:g.name,work:workOf(g)}))});
  for(const item of targets)for(const alias of rule.aliases)add(item,alias,`curated:${rule.id}:catalog:${item.id}:name`);
 }
 function resolveText(answer,sourceId=null) {
  const text=String(answer??''),words=tokens(text),spans=[];
  for(let at=0;at<words.length;at++)for(const row of index.get(words[at].key)??[]) {
   if(!row.parts.every((part,i)=>words[at+i]?.key===part))continue;
   const end=words[at+row.parts.length-1].end,start=words[at].start;
   const aliasKey=row.parts.join(' ');
   if((generic.has(aliasKey)||row.parts.length===1&&aliasKey.length<4)&&!titleCue(text,start,end))continue;
   spans.push({start,end,row});
  }
  // A longer title owns its span: Portal 2 is not Portal; RDR2 is not RDR1; Skyrim VR stays distinct.
  const longest=spans.filter(span=>!spans.some(other=>other.start<=span.start&&other.end>=span.end&&(other.start<span.start||other.end>span.end)));
  const groups=new Map();for(const span of longest){const k=`${span.start}:${span.end}`,group=groups.get(k)??[];group.push(span);groups.set(k,group);}
  const matches=[],ambiguous=[];
  for(const group of groups.values()) {
   const works=new Set(group.map(s=>workOf(s.row.item))),span=group[0],quote=text.slice(span.start,span.end);
   if(works.size!==1){ambiguous.push({sourceId,quote,candidateWorkIds:[...works].sort(),aliasIds:[...new Set(group.map(s=>s.row.aliasId))]});continue;}
   // All alternatives here are editions of the same work, never a popularity-based choice of different games.
   group.sort((a,b)=>key(a.row.item.name).length-key(b.row.item.name).length||a.row.item.id.localeCompare(b.row.item.id));
   const chosen=group[0];matches.push({id:chosen.row.item.id,work:workOf(chosen.row.item),sourceId,quote,aliasId:chosen.row.aliasId,start:span.start,end:span.end});
  }
  return {matches,ambiguous};
 }
 function resolve(state) {
  const bySource=new Map(),known=new Map(),ambiguous=[];
  for(const turn of state.turns??[]) {
   if(turn.superseded)continue;
   const found=resolveText(turn.answer,turn.id);bySource.set(turn.id,found);ambiguous.push(...found.ambiguous);
   for(const match of found.matches) {
    const item=catalog.byId.get(match.id);let entry=known.get(match.work);
    if(!entry){entry={id:item.id,name:item.name,ru:item.ru,year:item.year,aliases:[],evidence:[]};known.set(match.work,entry);}
    if(!entry.aliases.includes(match.quote))entry.aliases.push(match.quote);
    entry.evidence.push({sourceId:turn.id,quote:match.quote,aliasId:match.aliasId});
   }
  }
  return {knownGames:[...known.values()],bySource,ambiguous};
 }
 function bindFacts(state,facts,resolved=resolve(state)) {
  if(!Array.isArray(facts))return {facts};
  const bound=[];
  for(const fact of facts) {
   if(!fact){bound.push(fact);continue;}
   const source=(state.turns??[]).find(t=>t.id===fact.sourceId&&!t.superseded);
   const quote=typeof fact.quote==='string'?fact.quote.replace(/\s+/g,' ').trim():'';
   if(!source||!quote||!source.answer.includes(quote))return {error:'Игра не подтверждена точной цитатой действующего ответа.'};
   const supported=resolved.bySource.get(fact.sourceId)?.matches??[],sourceWorks=new Set(supported.map(m=>m.work));
   const quoteWorks=new Set(resolveText(quote).matches.map(m=>m.work));
   let id=fact.gameId;
   if(id!=null) {
    const game=catalog.byId.get(id),work=game&&workOf(game);
    if(!game||!sourceWorks.has(work)||quoteWorks.size&&!quoteWorks.has(work)||sourceWorks.size>1&&!quoteWorks.size)return {error:'Не удалось подтвердить игру именно в источнике этого вывода. Уточни название.'};
   } else if(fact.exposure!=null||fact.gameIntent!=null||fact.stance==='exclude'&&fact.feature===null) {
    const textWorks=new Set(resolveText(fact.text).matches.map(m=>m.work));
    const candidates=supported.filter(m=>textWorks.size===1&&textWorks.has(m.work)&&quoteWorks.has(m.work));
    const works=new Set(candidates.map(m=>m.work));
    if(works.size===1)id=candidates[0].id;
   }
   bound.push({...fact,gameId:id??null});
  }
  return {facts:bound};
 }
 return {resolve,resolveText,bindFacts,rules};
}
