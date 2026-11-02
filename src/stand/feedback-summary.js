import { normalizeFeedback } from '../server/public/shared/evening-feedback.js';

const fitCounts=()=>({accept:0,conditional:0,reject:0,unknown:0,unreviewed:0,decidable:0,strictAcceptance:null});
const rateFit=f=>{f.decidable=f.accept+f.conditional+f.reject;f.strictAcceptance=f.decidable?f.accept/f.decidable:null;};
export function summarizeFeedback(lines) {
  const groups=new Map();let invalid=0,duplicates=0;
  for(const line of lines) {
    if(line?.event!=='quality-feedback')continue;
    const r=normalizeFeedback(line.data);if(!r){invalid++;continue;}
    r.responses.sort((a,b)=>a.cardId.localeCompare(b.cardId));
    const identity=JSON.stringify({dialogueId:r.dialogueId,domain:r.domain,at:r.at,context:r.context,cards:r.cards});
    let group=groups.get(r.id);
    if(!group){group={identity,revisions:new Map(),conflict:false};groups.set(r.id,group);}
    if(group.identity!==identity)group.conflict=true;
    const previous=group.revisions.get(r.revision);
    if(previous) {if(JSON.stringify(previous)!==JSON.stringify(r))group.conflict=true;else duplicates++;}
    else group.revisions.set(r.revision,r);
  }
  const latest=[...groups.values()].filter(g=>!g.conflict).map(g=>g.revisions.get(Math.max(...g.revisions.keys())));
  const fit=fitCounts(),byOrigin=Object.fromEntries(['model','fill','engine'].map(x=>[x,{shown:0,fit:fitCounts(),chosen:0,started:0}]));
  const reasons={},outcomes={liked:0,mixed:0,disliked:0,not_started:0,unreported:0},choice={runs:0,dialogues:0,cards:0},started={runs:0,dialogues:0,cards:0};
  const chosenDialogues=new Set(),startedDialogues=new Set();
  for(const run of latest) {
    let chose=false,began=false;
    for(const card of run.cards) {
      const r=run.responses.find(x=>x.cardId===card.id),f=r?.fit??'unreviewed',origin=byOrigin[card.origin];
      fit[f]++;origin.shown++;origin.fit[f]++;
      if(r?.reason && ['reject','conditional'].includes(r.fit))reasons[r.reason]=(reasons[r.reason]??0)+1;
      if(r?.chosen){choice.cards++;origin.chosen++;chose=true;outcomes[r.outcome??'unreported']++;}
      if(r?.started){started.cards++;origin.started++;began=true;}
    }
    if(chose){choice.runs++;chosenDialogues.add(run.dialogueId);}
    if(began){started.runs++;startedDialogues.add(run.dialogueId);}
  }
  choice.dialogues=chosenDialogues.size;started.dialogues=startedDialogues.size;
  rateFit(fit);Object.values(byOrigin).forEach(x=>rateFit(x.fit));
  const decided=outcomes.liked+outcomes.mixed+outcomes.disliked;
  return {runs:latest.length,dialogues:new Set(latest.map(r=>r.dialogueId)).size,fit,choice,started,outcomes,
    afterUse:{decided,positiveRate:decided?outcomes.liked/decided:null},reasons,byOrigin,duplicates,invalid,conflicts:[...groups.values()].filter(g=>g.conflict).length};
}

export function feedbackTable(s) {
  const pct=(v)=>v==null?'нет оценок':`${Math.round(v*100)}%`;
  return ['### Реальные отзывы о вечере','',
    '| Показатель | Значение |','|---|---:|',
    `| Диалогов / показанных списков | ${s.dialogues} / ${s.runs} |`,
    `| Подходит / с оговоркой / не подходит | ${s.fit.accept} / ${s.fit.conditional} / ${s.fit.reject} |`,
    `| Пока не знаю / без оценки | ${s.fit.unknown} / ${s.fit.unreviewed} |`,
    `| Подходит среди определённых оценок | ${pct(s.fit.strictAcceptance)}; n=${s.fit.decidable} |`,
    `| Выбрали / начали: диалогов | ${s.choice.dialogues} / ${s.started.dialogues} |`,
    `| После знакомства: понравилось / нормально / не зашло | ${s.outcomes.liked} / ${s.outcomes.mixed} / ${s.outcomes.disliked} |`,
    `| Не начали / ещё не рассказали | ${s.outcomes.not_started} / ${s.outcomes.unreported} |`,
    `| Понравилось после знакомства | ${pct(s.afterUse.positiveRate)}; n=${s.afterUse.decided} |`,
    `| Дубликаты / неверные / конфликтующие снимки | ${s.duplicates} / ${s.invalid} / ${s.conflicts} |`,
    '', 'Один диалог может показать несколько списков. Bookmark, ссылка и «уже смотрел» не считаются выбором; неизвестные ответы и «не начал» не считаются отказами.'].join('\n');
}
