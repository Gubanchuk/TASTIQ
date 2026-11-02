// Free, deterministic question diagnostics. Synthetic context is never sent to a live user journal or model.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogs } from '../core/catalog.js';
import { initialState, applyAnswer, profileOf, sessionOf } from '../core/dialogue.js';
import { nextQuestion, rankQuestions } from '../core/ask.js';
import { rankAll, choose } from '../core/recommend.js';

const dir=resolve('research-vault/taste-quality-strategy-2026-10/eval/questions-v1');
mkdirSync(dir,{recursive:true});
const path=resolve(dir,'cases.frozen.json');
if(!existsSync(path)) {
  const cases=['story','coop','runs'].map(id=>{
    const captured=JSON.parse(readFileSync(resolve(dir,`../journey-v1/${id}.live.json`),'utf8'));
    const event=captured.events.find(e=>e.path==='/api/dialogue'&&e.output.state.step==='ask');
    return {id,source:'actual browser state before its first adaptive question, journey-v1',state:event.output.state};
  });
  const authored=(id,domain,situation)=>({id,source:'authored offline context, frozen before implementation',state:{...initialState(),seed:42,domain,step:'ask',situation:{...initialState().situation,...situation}}});
  cases.push(authored('no-taste','game',{company:'solo'}));
  const note='Хочу спокойный фильм. Сегодня есть 100 минут';
  cases.push(authored('calm-film','film',{company:'pair',note,intent:{version:1,source:'confirmed',sourceText:note,wants:[{f:'tension.low',evidence:'спокойный фильм'}],avoids:[],time:{minutes:100,evidence:'100 минут'}}}));
  cases.push(authored('short-series','series',{company:'solo',episodeLength:'short'}));
  writeFileSync(path,JSON.stringify({frozenAt:new Date().toISOString(),cases},null,2)+'\n');
}
const catalogs=loadCatalogs();
const {cases}=JSON.parse(readFileSync(path,'utf8'));
const label=process.argv[2]??'check';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Invalid output label');
const target=resolve(dir,`${label}.json`);
if(existsSync(target))throw new Error('Evidence exists; choose a new label');
const result=[];
for(const c of cases){
  const state=structuredClone(c.state),cat=catalogs[state.domain],questions=[];
  const ranking=s=>rankAll(cat,profileOf(s),sessionOf(s));
  const ids=r=>choose(r.ranked).picked.map(x=>x.game.id);
  for(let i=0;i<4;i++){
    const before=ranking(state),context={asked:state.asked,rank:before};
    const q=nextQuestion(cat,profileOf(state),sessionOf(state),context);
    if(!q)break;
    const outcomes=q.options.map(o=>{
      const s=structuredClone(state);applyAnswer(s,q,o.value);const after=ranking(s);
      return{value:o.value,label:o.label,leader:after.ranked[0]?.game.id,leaderChanged:after.ranked[0]?.game.id!==before.ranked[0]?.game.id,shown:ids(after)};
    });
    questions.push({id:q.id,kind:q.kind,text:q.text,options:q.options,estimatedChanges:q.changes??null,gain:q.gain,leader:before.ranked[0]?.game.id,shown:ids(before),outcomes});
    state.asked.push(q.id); // deterministic neutral path; positive answer effects separately evaluated above
  }
  const final=ranking(state);
  result.push({id:c.id,source:c.source,questions,final:ids(final),eligible:final.ranked.length,remainingQuestions:rankQuestions(cat,profileOf(state),sessionOf(state),{asked:state.asked}).questions.length});
  console.log(JSON.stringify({id:c.id,questions:questions.map(q=>({text:q.text,id:q.id,anyAnswerChangesLeader:q.outcomes.some(o=>o.leaderChanged)}))}));
}
writeFileSync(target,JSON.stringify({at:new Date().toISOString(),cases:result,paidCalls:0},null,2)+'\n');
