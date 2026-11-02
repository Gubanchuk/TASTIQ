// Local identity only: no fuzzy search, model memory, popularity or exposure inference.
const tokens=text=>[...String(text??'').matchAll(/\p{L}+(?:['’]\p{L}+)*|\p{N}+/gu)].map(m=>({key:m[0].toLowerCase().replace(/ё/g,'е').replace(/['’]/g,''),start:m.index,end:m.index+m[0].length}));
const generic=new Set(['it','her','us','up','home','love','life','one','dark','from','you','lost','soul','inside','beginning','оно','он','она','они','мы','ты','дом','жизнь','любовь','начало','вверх','душа','тьма','остаться']);
const workOf=item=>item.work??item.id;
// Unknown trailing words may belong to an absent compound title, in any case.
// Require a clear sentence boundary or a normal predicate/conjunction; a preceding
// «смотрел» establishes the start, never the end, of a title.
function unknownContinuation(suffix,before='') {
  const tail=suffix.replace(/^\s*[—–-]+\s*/u,'').trimStart();
  if(!/^[\p{L}\p{N}]/u.test(tail))return false;
  if(/^(?:и|но|а|или|зато|and|but|or)(?=$|[^\p{L}\p{N}])/iu.test(tail))return false;
  const priorClause=before.split(/[.!?;:\n]/u).at(-1)??'';
  const viewing=/(?:^|[^\p{L}\p{N}])(?:смотрел[аи]?|посмотрел[аи]?|пересмотрел[аи]?|досмотрел[аи]?|смотрю|смотреть|посмотреть|пересмотреть|посмотрю|пересмотрю|watched|watch|rewatch)(?=$|[^\p{L}\p{N}])/iu.test(priorClause);
  // Only bounded, complete temporal clauses after an actual viewing predicate.
  // A time word cannot license a further unknown title continuation.
  if(viewing&&/^(?:вчера|позавчера|сегодня|завтра|недавно|давно|раньше|на выходных|в детстве)(?=\s*(?:$|[.,;!?]|(?:и|но|а|или|зато)(?=$|[^\p{L}\p{N}])))/iu.test(tail))return false;
  const clause=tail.replace(/^(?:(?:я|мне|это|он|она|оно|очень|уже|только|давно|раньше|не|никогда|i|have|had|really|just)\s+){0,4}/iu,'');
  return !/^(?:смотрел[аи]?|посмотрел[аи]?|пересмотрел[аи]?|досмотрел[аи]?|просмотрен[аоы]?|смотрю|бросил[аи]?|забросил[аи]?|начал[аи]?|начинал[аи]?|понравил(?:ся|ась|ось|ись)|нравится|люблю|любил[аи]?|хочу|ищу|видел[аи]?|watched|finished|liked|was|is|seen)(?=$|[^\p{L}\p{N}])/iu.test(clause);
}
const quotedRanges=text=>[...text.matchAll(/«[^»]*»|“[^”]*”|„[^“”]*[“”]|"[^"]*"/gu)].map(match=>({start:match.index+1,end:match.index+match[0].length-1}));
function titleCue(text,start,end) {
  const before=text.slice(Math.max(0,start-55),start),after=text.slice(end,end+40);
  return /[«"“„]\s*$/.test(before)&&/^\s*[»"”]/.test(after)
    || /(?:смотрел[аи]?|посмотрел[аи]?|пересмотрел[аи]?|смотреть|пересмотреть|сериал|фильм|мультфильм|мультик|люблю|понравил[ао]сь|watched|finished|movie|series)\s+(?:фильм\s+|сериал\s+)?$/iu.test(before)
    || /^\s+(?:смотрел[аи]?|посмотрел[аи]?|пересмотрел[аи]?|просмотрен[ао]?|бросил[аи]?|начал[аи]?|понравил[ао]сь|watched|finished)(?:\s|[.;,!?]|$)/iu.test(after);
}

export function createConversationMediaIdentity(catalog) {
  const domain=catalog.domain.id,index=new Map();
  function add(item,name,aliasId) {
    if(typeof name!=='string')return;
    const parts=tokens(name).map(t=>t.key);if(!parts.length)return;
    const list=index.get(parts[0])??[];list.push({item,parts,aliasId});index.set(parts[0],list);
  }
  for(const item of catalog.items) {
    if(item.domain!==domain)continue;
    for(const field of ['name','ru','original'])if(item[field])add(item,item[field],`catalog:${domain}:${item.id}:${field}`);
    for(const [i,alias] of (Array.isArray(item.aliases)?item.aliases:[]).entries())add(item,alias,`catalog:${domain}:${item.id}:alias:${i}`);
  }
  function resolveText(answer,sourceId=null) {
    const text=String(answer??''),words=tokens(text),quotes=quotedRanges(text),spans=[];
    for(let at=0;at<words.length;at++)for(const row of index.get(words[at].key)??[]) {
      if(!row.parts.every((part,i)=>words[at+i]?.key===part))continue;
      const start=words[at].start,end=words[at+row.parts.length-1].end,aliasKey=row.parts.join(' '),suffix=text.slice(end);
      const year=suffix.match(/^\s*(?:\(\s*|,\s*)?((?:18|19|20)\d{2})(?:\s*\))?(?=$|[^\p{L}\p{N}])/u);
      const quoted=quotes.find(range=>start>=range.start&&end<=range.end);
      // A quoted title is one complete name, optionally qualified by its year.
      // An alias in its middle or at its start cannot identify a different work.
      if(quoted) {
        const inside=words.filter(word=>word.start>=quoted.start&&word.end<=quoted.end);
        if(inside[0]?.start!==start||inside.length!==row.parts.length+(year?1:0))continue;
      }
      if((generic.has(aliasKey)||row.parts.length===1&&aliasKey.length<4)&&!quoted&&!titleCue(text,start,end))continue;
      const tail=year?suffix.slice(year[0].length):suffix;
      if(!quoted&&(/^\s*:\s*\p{L}/u.test(tail)||unknownContinuation(tail,text.slice(Math.max(0,start-100),start))))continue;
      spans.push({start,end,year:year?Number(year[1]):null,evidenceEnd:year?end+year[0].length:end,row});
    }
    const longest=spans.filter(span=>!spans.some(other=>other.start<=span.start&&other.end>=span.end&&(other.start<span.start||other.end>span.end)));
    const groups=new Map();for(const span of longest){const k=`${span.start}:${span.end}`,group=groups.get(k)??[];group.push(span);groups.set(k,group);}
    const matches=[],ambiguous=[];
    for(let group of groups.values()) {
      const original=group,span=group[0];
      if(span.year!=null)group=group.filter(s=>s.row.item.year===span.year);
      const works=new Set(group.map(s=>workOf(s.row.item)));
      const quote=text.slice(span.start,span.evidenceEnd);
      if(works.size!==1){ambiguous.push({domain,sourceId,quote,candidateWorkIds:[...new Set(original.map(s=>workOf(s.row.item)))].sort(),aliasIds:[...new Set(original.map(s=>s.row.aliasId))]});continue;}
      group.sort((a,b)=>a.row.item.id.localeCompare(b.row.item.id));
      const chosen=group[0];matches.push({id:chosen.row.item.id,work:workOf(chosen.row.item),domain,sourceId,quote,aliasId:chosen.row.aliasId,start:span.start,end:span.evidenceEnd});
    }
    return {matches,ambiguous};
  }
  function resolve(state) {
    const bySource=new Map(),known=new Map(),ambiguous=[];
    if(state.domain!==domain)return {knownTitles:[],bySource,ambiguous};
    for(const turn of state.turns??[]) {
      if(turn.superseded)continue;
      const found=resolveText(turn.answer,turn.id);bySource.set(turn.id,found);ambiguous.push(...found.ambiguous);
      for(const match of found.matches) {
        const item=catalog.byId.get(match.id);let entry=known.get(match.work);
        if(!entry){entry={id:item.id,domain,name:item.name,ru:item.ru,year:item.year,aliases:[],evidence:[]};known.set(match.work,entry);}
        if(!entry.aliases.includes(match.quote))entry.aliases.push(match.quote);
        entry.evidence.push({sourceId:turn.id,quote:match.quote,aliasId:match.aliasId});
      }
    }
    return {knownTitles:[...known.values()],bySource,ambiguous};
  }
  function bindFacts(state,facts,resolved=resolve(state)) {
    if(!Array.isArray(facts))return {facts};
    const bound=[];
    for(const fact of facts) {
      if(!fact){bound.push(fact);continue;}
      const source=(state.turns??[]).find(t=>t.id===fact.sourceId&&!t.superseded);
      const quote=typeof fact.quote==='string'?fact.quote:'';
      if(!source||!quote.trim()||!String(source.answer).includes(quote))return {error:'Произведение не подтверждено точной цитатой действующего ответа.'};
      const ranges=[];
      for(let at=source.answer.indexOf(quote);at!==-1;at=source.answer.indexOf(quote,at+1))ranges.push({start:at,end:at+quote.length});
      const supported=(resolved.bySource.get(fact.sourceId)?.matches??[]).filter(match=>ranges.some(range=>match.start>=range.start&&match.end<=range.end));
      const sourceWorks=new Set(supported.map(m=>m.work));
      const quoteWorks=new Set(resolveText(quote).matches.map(m=>m.work));
      let id=fact.titleId;
      if(id!=null) {
        const title=catalog.byId.get(id),work=title&&workOf(title);
        if(!title||title.domain!==domain||!sourceWorks.has(work)||!quoteWorks.has(work))return {error:'Не удалось подтвердить произведение именно в источнике этого вывода. Уточни название.'};
      } else if(fact.exposure!=null||fact.titleIntent!=null||fact.stance==='exclude'&&fact.feature===null) {
        const textWorks=new Set(resolveText(fact.text).matches.map(m=>m.work));
        const candidates=supported.filter(m=>textWorks.size===1&&textWorks.has(m.work)&&quoteWorks.has(m.work));
        if(new Set(candidates.map(m=>m.work)).size===1)id=candidates[0].id;
      }
      bound.push({...fact,titleId:id??null});
    }
    return {facts:bound};
  }
  return {resolve,resolveText,bindFacts};
}
