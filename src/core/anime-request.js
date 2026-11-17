const japanese = /(?:^|\s)(?:только|строго)\s+японск(?:ое|ие|их|ий|ую|ая)(?!\p{L})/u;
const western = /(?:^|\s)(?:только|строго)\s+западн(?:ое|ые|ых|ую|ая)(?!\p{L})/u;
const either = /(?:и японск\p{L}*,?\s+и западн|происхождение не важно|без ограничений по происхождению|как японск\p{L}*,?\s+так и западн)/u;
const standalone = /(?:без знания (?:предыдущих|прошлых|других)|без (?:предыдущих|прошлых) (?:частей|сезонов)|самостоятельн(?:ая история|ый фильм|ое аниме)|можно (?:с нуля|смотреть с нуля))/u;
const noStandalone = /(?:можно продолжени[ея]|можно (?:и )?сиквел|самостоятельность не важна)/u;
const everyEpisode = /(?:кажд\p{L}*\s+(?:серия|серии|серию|эпизод)|все\s+(?:эпизоды|серии)|никак\p{L}*\s+(?:серия|эпизод))/u;

// These are narrow explicit preferences. Later answers and corrections take precedence.
export function animeRequestOptions(state) {
 if(state.domain!=='anime')return {};
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
  if(/(?:можно|допустим)\s+(?:и\s+)?без (?:подтвержденного |проверенного )?возрастного рейтинга/u.test(answer))verifiedAge=false;
  else if(/(?:возраст\p{L}*\s+(?:рейтинг|ограничени\p{L}*)|пригодност\p{L}*\s+для\s+ребенка)/u.test(answer)
   && /(?:только|строго|обязательно)(?!\p{L})|подтвержден|проверенн/u.test(answer))verifiedAge=true;
 }
 const {format,timeMode}=state.context??{};
 const durationSources=[state.sessionTime?.sourceId,state.contextEvidence?.timeMode?.sourceId].filter(Boolean);
 const allAnimeEpisodes=(state.turns??[]).some(turn=>!turn.superseded&&durationSources.includes(turn.id)&&everyEpisode.test(String(turn.answer??'').toLowerCase().replace(/ё/g,'е')));
 return {animeOrigin,standaloneOnly,verifiedAge,
  allAnimeEpisodes,
  animeKind:format==='movie'||timeMode==='runtime'?'film':format==='episodic'||timeMode==='episode'?'series':null};
}
