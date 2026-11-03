import {copyText} from './title-copy.js';

const clean=value=>typeof value==='string'?value.trim():'';
const labels={game:'игры',film:'фильма',series:'сериала',cartoon:'мультфильма'};
const stances={want:'Хочется',avoid:'Не хочется',require:'Обязательно',exclude:'Исключено',indifferent:'Не принципиально',unknown:'Неясно',conditional:'При условии',history:'Прошлый опыт'};
const safeLink=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}};

function conditions(state,domain) {
 const c=state.context??{},lines=[];
 const platform={windows:'Windows',mac:'macOS',linux:'Linux',deck:'Steam Deck',pc:'ПК',ps:'PlayStation',xbox:'Xbox',switch:'Nintendo Switch',any:'Любая платформа'}[c.platform];
 if(domain==='game'&&platform)lines.push(`Платформа: ${platform}`);
 const company={solo:'Один',friend:'Вдвоём',group:'Компания',adults:'Со взрослыми',children:'С детьми',kids:'С детьми'}[c.company];
 if(company)lines.push(`Компания: ${company}`);
 if(domain==='game'&&Number.isInteger(c.partySize))lines.push(`Игроков: ${c.partySize}`);
 if(['children','kids'].includes(c.company)&&Number.isInteger(c.childAge))lines.push(`Возраст младшего ребёнка: ${c.childAge}`);
 if(c.onlyEnded===true)lines.push('Только завершённые сериалы');
 else if(c.onlyEnded===false)lines.push('Продолжающиеся сериалы допустимы');
 const commitment={single:'На один просмотр',short:'Короткая история',long:'Можно надолго',open:'Длина истории не важна'}[c.commitment];
 if(commitment)lines.push(`История: ${commitment}`);
 const format={movie:'Одна история',episodic:'Эпизоды'}[c.format];
 if(format)lines.push(`Формат: ${format}`);
 const minutes=state.sessionTime?.minutes;
 if(Number.isFinite(minutes)&&minutes>0){const timeLabel=c.timeMode==='episode'?'Лимит одного эпизода':c.timeMode==='runtime'?'Лимит длительности':'Время на сегодня';lines.push(`${timeLabel}: ${minutes} мин`);}
 return lines;
}

// Export only explicit fields from this selection; no stores, drafts, undo results or identifiers.
export function selectionCopyText({state={},screen={}}={}) {
 const domain=state.domain??'game',result=screen.result??state.result;
 if(!labels[domain]||!result?.top)return '';
 const turns=state.turns??[],retractions=state.retractions??[],hidden=new Set(retractions.map(r=>r.sourceId));
 // Context/time removals can retract older sources as well as their original source.
 for(const r of retractions)if(['context','session_time'].includes(r.kind)){
  const at=turns.findIndex(t=>t.id===r.at);for(let i=0;i<=at;i++)hidden.add(turns[i].id);
 }
 const answers=turns.filter(t=>!t.superseded&&!hidden.has(t.id)&&t.question?.id!=='context').map(t=>{
  const question=clean(t.question?.title??t.question),answer=clean(t.answer)||clean(t.text);
  return answer?`${question?`${question}\n`:''}${answer}`:'';
 }).filter(Boolean);
 const facts=(screen.facts??state.facts??[]).map(f=>`${f.scope==='history'?'Прошлый опыт':stances[f.stance]??'Пожелание'}: ${clean(f.text)}`).filter(text=>!text.endsWith(': '));
 const uncertainties=(screen.uncertainties??state.uncertainties??[]).map(clean).filter(Boolean);
 const summary=clean(screen.summary??state.summary),context=conditions(state,domain);
 const lines=[`TASTIQ — подбор ${labels[domain]}`,'Копия текущей выдачи.'];
 if(answers.length)lines.push('\nКак уточнялся запрос:',answers.join('\n\n'));
 if(retractions.length)lines.push('Часть ответов изменена после удаления условий. Ниже — актуальное понимание.');
 lines.push('\nКак понят запрос:',summary||'Сводка не указана.');
 if(facts.length)lines.push(facts.join('\n'));
 if(context.length)lines.push('\nУсловия:',context.join('\n'));
 if(uncertainties.length)lines.push('\nПока неясно:',uncertainties.map(text=>`- ${text}`).join('\n'));
 if(screen.provisional||state.provisional||result.ai?.error)lines.push('\nПредварительный подбор по каталогу: уточнение моделью недоступно.');
 lines.push('\nПредложенные варианты:');
 for(const [index,card] of [result.top,...(result.alternatives??[]).slice(0,3)].entries()){
  const title=clean(card.ru)||clean(card.name)||clean(card.title)||'Название не указано';
  lines.push(`\n${index+1}. ${title}${card.year?` (${card.year})`:''}`);
  const meta=[...(domain!=='game'?[card.runtime?`${card.runtime} мин${card.kind==='series'?' · эпизод':''}`:'',...(card.kind==='series'?[card.seasons?`${card.seasons} сез.`:'',card.episodes?`${card.episodes} эп.`:'']:[])]:[]),...(card.genres??[]).slice(0,2)].filter(Boolean);
  if(meta.length)lines.push(meta.join(' · '));
  const reason=clean(card.ai?.reason)||clean(card.reason),caveat=clean(card.ai?.caveat)||clean(card.caveat),link=safeLink(card.link);
  if(reason)lines.push(`Почему предложено (${card.ai?.reason?'мнение модели':'данные каталога'}): ${reason}`);
  if(caveat)lines.push(`Учти: ${caveat}`);
  const checks={unknown:'Не подтверждено',conditional:'Есть условие',no:'Не подходит по условию'};
  for(const check of Array.isArray(card.feasibility)?card.feasibility:[])if(checks[check?.status]&&clean(check.text))lines.push(`${checks[check.status]}: ${clean(check.text)}`);
  if(link)lines.push(link);
 }
 return lines.join('\n');
}

export function copySelection(button,{state,screen,...options}={}) {
 const status=button.closest('.game-result-heading')?.querySelector('[data-selection-copy-status]');
 return copyText(selectionCopyText({state,screen}),status,{...options,multiline:true,success:'Подбор скопирован',fieldLabel:'Подбор для копирования'});
}
