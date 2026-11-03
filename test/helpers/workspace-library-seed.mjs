// Offline QA fixture builder. Returns namespaced storage entries; never writes user storage.
export function workspaceLibrarySeed(catalogs,{run='workspace-usability',count=128}={}){
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(run))throw TypeError('QA run is required');
 const domains=['game','film','series','cartoon'],queues=Object.fromEntries(domains.map(domain=>[domain,(catalogs[domain]??[]).filter(row=>typeof row?.id==='string'&&/^[a-zA-Z0-9:_.-]{1,80}$/.test(row.id))]));
 const items=[],familiar=[],seen=new Set();let turn=0,misses=0;
 while(items.length<count&&misses<4){
  const domain=domains[turn++%4],card=queues[domain].shift();if(!card){misses++;continue;}misses=0;
  const key=`${domain}:${card.id}`;if(seen.has(key))continue;seen.add(key);
  const index=items.length,at=new Date(Date.UTC(2026,10,3,0,index)).toISOString(),group=Math.floor(index/4)%8,lane=group<6?'want':group===6?'tonight':'known';
  const item={id:card.id,domain,title:String(card.ru||card.name||card.title||card.id).slice(0,300),year:card.year??null,poster:card.poster??null,image:card.image??null,kind:card.kind??null,link:card.link??null,lane,status:index%7===0?'liked':index%7===1?'disliked':lane==='known'?'known':'want',addedAt:at,updatedAt:at};
  items.push(item);
  if(index%9===0)familiar.push({version:1,id:item.id,title:item.title,domain,exposure:domain==='game'?'played':'seen',blocked:index%18===0,updatedAt:at,poster:item.poster,image:item.image,year:item.year,kind:item.kind,link:item.link});
 }
 const prefix=`tastiq.qa.${run}:`,entries={};
 entries[prefix+'tastiq.site.library']=JSON.stringify({version:1,items,history:domains.map(domain=>items.find(row=>row.domain===domain)).filter(Boolean).map(row=>({domain:row.domain,topId:row.id,title:row.title,at:row.addedAt,year:row.year,poster:row.poster,image:row.image,alternatives:[]}))});
 for(const row of familiar){const key=row.domain==='game'?`tastiq.game-history.v1:${row.id}`:`tastiq.media-history.${row.domain}.v1:${row.id}`;entries[prefix+key]=JSON.stringify(row);}
 return {run,entries,counts:{items:items.length,lanes:Object.fromEntries(['want','tonight','known'].map(lane=>[lane,items.filter(row=>row.lane===lane).length])),familiar:familiar.length}};
}
