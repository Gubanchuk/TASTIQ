const japanese = /(?:^|\s)(?:только|строго)\s+японск(?:ое|ие|их|ий|ую|ая)(?!\p{L})/u;
const western = /(?:^|\s)(?:только|строго)\s+западн(?:ый|ое|ые|ых|ую|ая)(?!\p{L})/u;
const either = /(?:и японск\p{L}*,?\s+и западн|происхождение не важно|без ограничений по происхождению|как японск\p{L}*,?\s+так и западн)/u;
const standalone = /(?:без знания (?:предыдущих|прошлых|других)|без (?:предыдущих|прошлых) (?:частей|сезонов)|самостоятельн(?:ая история|ый фильм|ое аниме)|можно (?:с нуля|смотреть с нуля))/u;
const noStandalone = /(?:можно продолжени[ея]|можно (?:и )?сиквел|самостоятельность не важна)/u;
const everyEpisode = /(?:кажд\p{L}*\s+(?:серия|серии|серию|эпизод)|все\s+(?:эпизоды|серии)|никак\p{L}*\s+(?:серия|эпизод))/u;
const firstEpisode = /(?:перв(?:ый|ая|ую|ого|ой|ом)\s+(?:эпизод\p{L}*|сери[яиюй]))/u;

const ageSubject=String.raw`(?:возрастн\p{L}*\s+(?:рейтинг\p{L}*|ограничени\p{L}*)|(?:возрастн\p{L}*\s+)?пригодност\p{L}*\s+для\s+ребенка)`;
const verified=String.raw`(?:подтвержден\p{L}*|проверен\p{L}*)`;
const optional=String.raw`не\s*(?:важ\p{L}*|обязател\p{L}*|нуж\p{L}*|требуется|принципиал\p{L}*)`;
const subjectWithProof=String.raw`(?:${verified}\s+)?${ageSubject}`;
const optionalAge=new RegExp([
 String.raw`(?:можно|допустимо?)\s+(?:и\s+)?без\s+${subjectWithProof}`,
 String.raw`(?:${optional}|не\s+(?:только|хочу|требую))\s+(?:мне\s+)?(?:с\s+)?${subjectWithProof}`,
 String.raw`${subjectWithProof}\s*[-—:]?\s*(?:мне\s+)?(?:(?:уже|больше)\s+)?${optional}`,
].join('|'),'u');
const requiredAge=new RegExp([
 String.raw`(?<!\p{L})(?:только|строго|обязател\p{L}*|нужен|нужно|нужна)\s+(?:с\s+)?${subjectWithProof}`,
 String.raw`(?<!\p{L})${verified}\s+${ageSubject}`,
 String.raw`${ageSubject}\s*[-—:]?\s*(?:долж\p{L}*\s+(?:быть\s+)?)?(?:обязател\p{L}*|${verified})`,
].join('|'),'u');
const mentionsAge=new RegExp(ageSubject,'u');

// These are narrow explicit preferences. Later answers and corrections take precedence.
export function animeRequestOptions(state,allowClause=()=>true) {
 if(state.domain!=='anime'&&!state.savedSource)return {};
 let animeOrigin=null, standaloneOnly=false, verifiedAge=false;
 for(const turn of state.turns??[]){
  if(turn.kind!=='answer'||turn.superseded)continue;
  const answer=String(turn.answer??'').toLowerCase().replace(/ё/g,'е');
  const active=(pattern,key)=>answer.split(/[.!?;\n]/u).some(clause=>pattern.test(clause)
   && !(state.retractions??[]).some(r=>r.sourceId===turn.id&&pattern.test(String(r.quote??'').toLowerCase().replace(/ё/g,'е')))
   && !new RegExp('(?:не обязательно|не только|не строго|не нужн[оаы])\\s+'+key,'u').test(clause));
  if(either.test(answer))animeOrigin=null;
  else if(active(japanese,'(?:только\\s+)?японск'))animeOrigin='japanese';
  else if(active(western,'(?:только\\s+)?западн'))animeOrigin='western';
  if(noStandalone.test(answer))standaloneOnly=false;
  else if(active(standalone,'самостоятельн'))standaloneOnly=true;
  const removedAgeQuotes=(state.retractions??[]).filter(r=>r.sourceId===turn.id)
   .map(r=>String(r.quote??'').toLowerCase().replace(/ё/g,'е')).filter(quote=>mentionsAge.test(quote));
  for(const raw of String(turn.answer??'').split(/[.!?;,\n]/u)){
   if(!allowClause(raw,turn))continue;
   const clause=raw.toLowerCase().replace(/ё/g,'е');
   if(optionalAge.test(clause))verifiedAge=false;
   else if(requiredAge.test(clause)&&!removedAgeQuotes.some(quote=>clause.includes(quote)||quote.includes(clause.trim())))verifiedAge=true;
  }
 }
 const {format,timeMode}=state.context??{};
 const durationSources=[state.sessionTime?.sourceId,state.contextEvidence?.timeMode?.sourceId].filter(Boolean);
 const durationTurns=(state.turns??[]).filter(turn=>!turn.superseded&&durationSources.includes(turn.id));
 const refersTo=pattern=>durationTurns.some(turn=>pattern.test(String(turn.answer??'').toLowerCase().replace(/ё/g,'е')));
 const allAnimeEpisodes=refersTo(everyEpisode);
 const firstEpisodeRequested=Boolean(state.savedSource)&&refersTo(firstEpisode);
 if(state.domain!=='anime')return {verifiedAge,allEpisodesRequested:allAnimeEpisodes,firstEpisodeRequested};
 return {animeOrigin,standaloneOnly,verifiedAge,
  allAnimeEpisodes,firstEpisodeRequested,
  animeKind:format==='movie'||timeMode==='runtime'?'film':format==='episodic'||timeMode==='episode'?'series':null};
}
