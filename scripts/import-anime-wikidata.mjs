// Run from the project root. Candidate IDs come from the legacy snapshot.
// Every exported title, kind, release date, genre and duration comes from Wikidata (CC0).
import {writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {animePilot} from '../src/server/public/shared/anime-pilot.js';
import {readScreenCatalog} from '../src/lib/screen-catalog.js';

const src=new URL('../data/catalog-screen.json',import.meta.url);
const target=new URL('../data/anime-wikidata.json',import.meta.url);
const candidates=readScreenCatalog(src).items.filter(row=>
 row.domain==='anime'&&!Object.hasOwn(animePilot,row.id)&&!['tt0382932','tt0120587'].includes(row.id)).map(row=>row.id).sort();
const ua='TASTIQ/1.0 (https://github.com/Gubanchuk/TASTIQ; public anime catalog data)';
const genres=new Map([
 ['Q8253','Fiction'],['Q157394','Fantasy'],['Q1054574','Romance'],['Q24925','Sci-Fi'],
 ['Q188473','Action'],['Q130232','Drama'],['Q157443','Comedy'],['Q471839','Adventure'],
 ['Q200092','Horror'],['Q959790','Crime'],['Q234460','Mystery'],['Q182015','Thriller'],
]);
function query(ids){
 return `SELECT ?id ?item ?kind (MIN(?published) AS ?release) (SAMPLE(?ru) AS ?ruLabel) (SAMPLE(?en) AS ?enLabel)
 (SAMPLE(?ja) AS ?jaLabel) (GROUP_CONCAT(DISTINCT STR(?genre);separator="|") AS ?genres)
 (GROUP_CONCAT(DISTINCT STR(?minute);separator="|") AS ?minutes) WHERE {
  VALUES ?id { ${ids.map(id=>JSON.stringify(id)).join(' ')} }
  VALUES (?kind ?class) { ("film" wd:Q20650540) ("film" wd:Q202866) ("series" wd:Q63952888) ("series" wd:Q581714) }
  ?item wdt:P345 ?id; wdt:P31 ?class; wdt:P495 wd:Q17.
  FILTER NOT EXISTS { ?item wdt:P495 ?country FILTER(?country!=wd:Q17) }
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q24862 }
  FILTER NOT EXISTS { ?item wdt:P136 wd:Q25110269 }
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q100269041 }
  ?item (wdt:P577|wdt:P580) ?published.
  FILTER(?published <= NOW())
  OPTIONAL { ?item rdfs:label ?ru FILTER(LANG(?ru)="ru") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
  OPTIONAL { ?item rdfs:label ?ja FILTER(LANG(?ja)="ja") }
  OPTIONAL { ?item wdt:P136 ?genre }
  OPTIONAL { ?item p:P2047/psv:P2047 ?duration.
   ?duration wikibase:quantityAmount ?minute; wikibase:quantityUnit wd:Q7727. FILTER(?minute>=15 && ?minute<=600) }
 } GROUP BY ?id ?item ?kind`;
}
async function fetchBatch(ids){
 const url='https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query(ids));
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{headers:{'User-Agent':ua,Accept:'application/sparql-results+json'},signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   return (await response.json()).results.bindings;
  }catch(error){
   if(attempt===2)throw error;
   await delay(1200*(attempt+1));
  }
 }
}

const rows=[];
for(let index=0;index<candidates.length;index+=100){
 const ids=candidates.slice(index,index+100);
 const batch=await fetchBatch(ids);
 rows.push(...batch);
 console.log(`${index+ids.length}/${candidates.length} queried, ${rows.length} result rows`);
 await delay(750);
}
const byId=new Map();
for(const row of rows){
 const data=Object.fromEntries(Object.entries(row).map(([key,field])=>[key,field.value]));
 const list=byId.get(data.id)??[];
 list.push(data);
 byId.set(data.id,list);
}
const byEntity=new Set();
const items=[];
for(const [id,list] of [...byId].sort(([a],[b])=>a.localeCompare(b))){
 if(list.length!==1)continue;
 const row=list[0],qid=row.item.split('/').at(-1),year=Number(row.release?.slice(0,4));
 const ru=/\p{Script=Cyrillic}/u.test(row.ruLabel??'')?row.ruLabel:null;
 const name=row.enLabel??ru??row.jaLabel;
 if(!name||!/^Q\d+$/.test(qid)||year<1900||!Number.isInteger(year)||byEntity.has(qid))continue;
 byEntity.add(qid);
 const rawMinutes=(row.minutes??'').split('|').filter(Boolean).map(Number);
 const runtime=row.kind==='film'&&rawMinutes.length===1?Math.ceil(rawMinutes[0]):null;
 items.push({id,qid,kind:row.kind,name,ru,original:row.jaLabel??null,year,runtime,
  genres:[...new Set((row.genres??'').split('|').map(url=>genres.get(url.split('/').at(-1))).filter(g=>g&&g!=='Fiction'))].sort()});
}
const output={source:'https://www.wikidata.org/wiki/Wikidata:Licensing',retrievedAt:new Date().toISOString(),queried:candidates.length,items};
if(items.length<700)throw Error(`Received only ${items.length} independently classified works, leaving the release snapshot alone`);
writeFileSync(target,JSON.stringify(output,null,1)+'\n');
console.log(JSON.stringify({queried:candidates.length,accepted:items.length,films:items.filter(row=>row.kind==='film').length}));
