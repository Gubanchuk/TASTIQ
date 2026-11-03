// Present validated media conditions once; source facts remain in the conversation.
function formatOnly(text,format,domain){
 const t=String(text??'').toLowerCase().replace(/ё/g,'е').trim().replace(/[.!?]+$/u,'');
 if(domain!=='cartoon'&&/анимационн|мультипликационн|мультфильм/u.test(t))return false;
 const start='(?:(?:хочу|хочется|нужен|нужна|нужно|только)\\s+)?(?:один\\s+)?(?:(?:полнометражный|анимационный|мультипликационный)\\s+){0,3}';
 return new RegExp('^'+start+(format==='movie'?'(?:мультфильм|фильм)(?:,?\\s+не\\s+сериал)?':'(?:мини[- ]?)?сериал(?:,?\\s+не\\s+(?:мульт)?фильм)?')+'$','u').test(t);
}
export function mediaRequestPresentation(screen={}) {
 const context=screen.context??{},facts=screen.facts??[],rows=[];
 const known=new Set(['company','childAge','timeMode','commitment','onlyEnded','format']);
 const sources=new Map(facts.filter(f=>f.key?.startsWith('context:')).map(f=>[f.key.slice(8),f]));
 const add=(key,text)=>{if(text)rows.push({text,key:sources.has(key)?`context:${key}`:null});};
 add('format',context.format==='movie'?(screen.domain==='cartoon'?'Полнометражный мультфильм':'Полнометражный фильм'):context.format==='episodic'?(screen.domain==='cartoon'?'Мультсериал':'Сериал'):null);
 add('company',context.company==='children'&&Number.isInteger(context.childAge)?`С ребёнком ${context.childAge} ${context.childAge===1?'года':'лет'}`:{solo:'Смотрю один',adults:'Со взрослыми',children:'С детьми'}[context.company]);
 if(context.company!=='children'&&context.childAge!=null)add('childAge',`Возраст младшего: ${context.childAge} лет`);
 if(!(context.format==='movie'&&context.commitment==='single'))add('commitment',{single:'На один вечер',short:'Короткая история',long:'Готов к длинной истории',open:'Длина истории не важна'}[context.commitment]);
 if(context.onlyEnded!=null)add('onlyEnded',context.onlyEnded?'Только завершённый сериал':'Можно продолжающийся сериал');
 if(!screen.sessionTime)add('timeMode',{episode:'Ограничение длительности эпизода',runtime:'Ограничение длительности фильма',session:'Время просмотра сегодня'}[context.timeMode]);
 // A short format label must not remove extra meaning held in a compound fact.
 const formatSource=sources.get('format');
 if(formatSource&&facts.some(f=>!f.key?.startsWith('context:')&&f.sourceId===formatSource.sourceId&&f.quote===formatSource.quote&&(f.conditionKey==='format'||f.feature===null&&f.stance==='require')&&!formatOnly(f.text,context.format,screen.domain))){
  const row=rows.find(r=>r.key==='context:format');if(row)row.key=null;
 }
 const represented=new Set(rows.filter(r=>r.key).map(r=>r.key.slice(8)));
 return {conditions:rows,facts:facts.filter(f=>{
  if(f.key?.startsWith('context:')&&known.has(f.key.slice(8)))return false;
  return !(f.scope==='today'&&['want','require'].includes(f.stance)&&represented.has(f.conditionKey)&&formatOnly(f.text,context.format,screen.domain));
 })};
}
