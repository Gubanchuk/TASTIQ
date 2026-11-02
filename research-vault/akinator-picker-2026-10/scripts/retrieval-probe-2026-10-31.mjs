// Offline comparison of general retrieval signals; no API calls and no changes to the engine.
import { readFileSync } from 'node:fs';
import { loadCatalogs } from '../../../src/core/catalog.js';
import { candidatesOf } from '../../../src/ai/pick.js';
const catalogs=loadCatalogs();
const audits=JSON.parse(readFileSync(new URL('../eval/2026-10-31-input-audit.json',import.meta.url),'utf8'));
const cosine=(a,b)=>{let n=0,aa=0,bb=0;for(const [f,v]of Object.entries(a)){aa+=v*v;n+=v*(b[f]??0)}for(const v of Object.values(b))bb+=v*v;return aa&&bb?n/Math.sqrt(aa*bb):0};
const vec=g=>Object.fromEntries(Object.entries(g.features).filter(([f])=>!f.startsWith('social.')).map(([f,v])=>[f,v.r*v.c]));
for(const a of audits){
 const c=catalogs[a.state.domain],{rows,ranked}=candidatesOf(c,a.state);
 const confirmed=new Set(Object.values(a.state.answers).filter(x=>['love','like'].includes(x.reaction)).flatMap(x=>x.reasons??[]));
 const loved=Object.entries(a.state.answers).filter(([,x])=>x.reaction==='love').map(([id])=>c.byId.get(id)).filter(Boolean);
 const vectors=loved.map(vec);
 const channels={
  confirmed:r=>r.matches.filter(x=>x.confirmed).reduce((n,x)=>n+x.contribution,0),
  coverage:r=>[...confirmed].reduce((n,f)=>n+Math.min(1,(r.game.features[f]?.r??0)*(r.game.features[f]?.c??0)/0.5),0),
  nearest:r=>Math.max(0,...vectors.map(v=>cosine(vec(r.game),v))),
 };
 const out={persona:a.persona,mode:a.mode};
 const seen=new Set(),portfolio=[];
 const take=(list,n)=>{let added=0;for(const r of list){if(seen.has(r.game.id))continue;seen.add(r.game.id);portfolio.push(r);if(++added>=n)break;}};
 take(rows,24);
 if(confirmed.size)take([...ranked].sort((x,y)=>channels.confirmed(y)-channels.confirmed(x)||y.score-x.score),8);
 const positive=Object.entries(a.state.answers).filter(([,x])=>['love','like'].includes(x.reaction)).map(([id])=>c.byId.get(id)).filter(Boolean).map(vec);
 if(positive.length)take([...ranked].sort((x,y)=>Math.max(...positive.map(v=>cosine(vec(y.game),v)))-Math.max(...positive.map(v=>cosine(vec(x.game),v)))||y.score-x.score),8);
 take(ranked,40-portfolio.length);
 out.portfolio=a.targets.map(t=>({name:t.name,inList:portfolio.some(r=>r.game.id===t.id)}));
 for(const[name,score]of Object.entries(channels)){
  const ordered=[...ranked].sort((x,y)=>score(y)-score(x)||y.score-x.score);
  out[name]=a.targets.map(t=>({name:t.name,rank:ordered.findIndex(r=>r.game.id===t.id)+1}));
 }
 console.log(JSON.stringify(out));
}
