import {seedItems} from '../core/questions.js';

const titleOf=item=>item.ru||item.name;
const card=item=>({id:item.id,title:titleOf(item),year:item.year??null,poster:item.poster??null,image:item.image??null});
const invalid=()=>Object.assign(Error('Проверь отметки знакомых произведений и попробуй ещё раз.'),{status:400});

// Only an explicit vote goes into the picker. Resolve catalog titles on the server.
export function checkedRatedExamples(rows,catalog){
  if(!Array.isArray(rows)||rows.length>8)throw invalid();
  const seen=new Set();
  return rows.map(row=>{
    if(!row||!['liked','disliked'].includes(row.rating))throw invalid();
    const item=row.id==null?null:catalog.byId.get(row.id);
    if(row.id!=null&&(typeof row.id!=='string'||row.id.length>100))throw invalid();
    const title=item?titleOf(item):typeof row.title==='string'?row.title.trim():'';
    if(typeof title!=='string'||!title||(!item&&title.length>160))throw invalid();
    const key=item?.id??'title:'+title.toLowerCase();
    if(seen.has(key))throw invalid();
    seen.add(key);
    if(row.reason!=null&&(typeof row.reason!=='string'||row.reason.length>300))throw invalid();
    const reason=row.reason?.trim();
    return {id:item?.id??null,title,rating:row.rating,...(reason?{reason}:{})};
  });
}

const moodFeatures={mood_action:'pace.fast',mood_relax:'tension.low',mood_story:'story.central',mood_explore:'loop.exploration',mood_thought:'cognitive.high'};

export function reviewRatedExamples(state,catalog,identities,legacy){
  const resolved=identities.resolve(state);
  const known=resolved.knownGames??resolved.knownTitles;
  const mentioned=known.map(entry=>{
    const item=catalog.byId.get(entry.id);
    const explained=state.facts.some(f=>(f.gameId??f.titleId)===item.id&&f.feature&&['want','avoid','require','exclude','conditional'].includes(f.stance));
    return {...card(item),explained};
  });
  const direction=state.turns.find(t=>!t.superseded&&t.question.id==='direction');
  const mediaGenres={comedy:'Comedy',drama:'Drama',thriller:'Thriller',adventure:'Adventure',fantasy:'Fantasy',detective:'Mystery'};
  const genres=[...legacy.session.genreWants.map(g=>'genre:'+g),...legacy.session.goalWants.map(x=>x.f),
    ...(direction?.selected??[]).map(o=>state.domain&&mediaGenres[o.id]?'genre:'+mediaGenres[o.id]:moodFeatures[o.id]).filter(Boolean)];
  if(!genres.length&&['friend','group'].includes(state.context.company))genres.push('social.coop');
  const seed=Array.from(state.id).reduce((hash,ch)=>(Math.imul(hash,31)+ch.charCodeAt(0))>>>0,1);
  const kind=state.context.format==='movie'?'film':state.context.format==='episodic'?'series':null;
  const family=state.context.company==='children';
  const pool=kind||family?{...catalog,items:catalog.items.filter(item=>(!kind||item.kind===kind)&&(!family||item.features?.['content.family']?.r>=0.5))}:catalog;
  const suggested=seedItems(pool,{platform:state.context.platform,genres,strict:true,n:6,seed,answered:mentioned.map(r=>r.id)});
  return {mentioned,suggested:suggested.map(card)};
}
