import {loadCatalogs} from '../../src/core/catalog.js';
import {applySieves} from '../../src/core/sieves.js';

const {anime} = loadCatalogs();
const taste = {consumed:new Set(),rejected:new Set(),hardNo:new Map()};
const session = {animeKind:'series'};
const candidates = applySieves(anime,taste,session).passed;
const now = applySieves(anime,taste,{...session,maxRuntime:30}).passed;
const gaps = candidates.filter(item => !item.runtimeSource || !Number.isFinite(item.runtime));
const sampleIds = ['tt1352421','tt11428586','tt7806844','tt1158671'];
console.log(JSON.stringify({
 eligibleBeforeTime:candidates.length,
 eligibleWithFirstEpisodeUnderOrEqual30:now.length,
 missingFirstEpisode:gaps.length,
 targeted:sampleIds.map(id => {
  const item=anime.byId.get(id);
  return {id,title:item.ru||item.name,minutes:item.runtime??null,source:item.runtimeSource??null,passes:now.some(row=>row.id===id)};
 }),
 next:gaps.slice().sort((a,b)=>(b.popularity-a.popularity)||a.id.localeCompare(b.id)).slice(0,20)
  .map(item=>({id:item.id,title:item.ru||item.name,year:item.year})),
},null,2));
