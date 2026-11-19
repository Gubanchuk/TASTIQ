import {randomInt,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {buildReviewQueue} from '../../src/stand/review-queue.js';

const systems=['baseline','sameAnswers','extraAnswers'];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const [input,output]=process.argv.slice(2);
if(!input||!output) throw Error('Передай файл случая *.private.json и новую папку результата.');
const record=JSON.parse(await readFile(input,'utf8'));
if(!['game','film','series','cartoon','anime'].includes(record.domain)||!record.wish?.trim())throw Error('Нужны раздел и пожелание.');
for(const system of systems){
 const list=record[system];
 if(!Array.isArray(list)||list.some(card=>typeof card?.id!=='string'||!card.id||typeof card.title!=='string'||!card.title.trim()))throw Error('Проверь список '+system);
}
const caseId=randomUUID(),seed=randomUUID();
const {queue,key}=buildReviewQueue([{caseId,domain:record.domain,context:{},systems:systems.map(name=>({name,cards:record[name]}))}],seed);
const cards=new Map(queue.map(card=>[card.reviewId,card]));
const ordered=[...key.lists];
for(let i=ordered.length-1;i>0;i--){const j=randomInt(i+1);[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}
const names=['А','Б','В'];
function listHtml(list,i){
 const name=names[i],items=list.entries.map(({reviewId})=>{const card=cards.get(reviewId);
  return '<label><input required type="radio" name="pick'+i+'" value="'+reviewId+'"> '+escape(card.title)+(card.year?' ('+escape(card.year)+')':'')+'</label>';
 }).join('');
 return '<fieldset><legend>Список '+name+'</legend>'+items+'<label><input required type="radio" name="pick'+i+'" value="none"> Ничего на сегодня</label></fieldset>';
}
const template=await readFile(new URL('./blind-evening.html',import.meta.url),'utf8');
const html=template.replace(/@@(CASE|WISH|LISTS)@@/g,(_,slot)=>({CASE:caseId,WISH:escape(record.wish),LISTS:ordered.map(listHtml).join('')})[slot]);
await mkdir(output); // Refuse to overwrite an existing participant or its key.
await writeFile(join(output,'participant.html'),html,{flag:'wx'});
await writeFile(join(output,'key.private.json'),JSON.stringify({caseId,conditions:record.conditions??null,lists:ordered.map((list,i)=>({label:names[i],...list})),cards:queue.map(({reviewId,title,year})=>({reviewId,title,year}))},null,2),{flag:'wx'});
console.log(join(output,'participant.html'));
