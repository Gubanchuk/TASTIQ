// A regional age label is not evidence of particular scenes, language or audience tags.
const rating = /(?<![\p{L}\d])18\s*\+(?!\d|\s*(?:сери[йиюя]|эпизод|сезон|минут|час))/iu;
const content = new Map([
  ['content.sexual', /эрот|постельн|откровенн|обнаж|нагота|секс/iu],
  ['content.profanity', /(?<!\p{L})(?:мат(?:а|ом)?|брань|ругатель\p{L}*|нецензур\p{L}*|матер\p{L}*)(?!\p{L})/iu],
  ['content.violence', /жесток|насили|кров|убийств/iu],
  ['content.disturbing', /тяж[её]л\p{L}* тем|пытк|суицид/iu],
  ['content.family', /семейн|с детьми|для детей/iu],
  ['audience.adult', /для взросл|взросл\p{L}* (?:аудитори|анимаци|тем)/iu],
]);

export function groundedRatingFacts(facts,state) {
  const sources = new Set();
  let changed = false;
  const grounded = facts.flatMap(fact => {
    if (!rating.test(fact.quote)) return [fact];
    const evidence = content.get(fact.feature);
    const inventedDetail=!fact.feature&&[...content.values()].some(pattern=>pattern.test(fact.text)&&!pattern.test(fact.quote));
    const source=state.turns.find(turn=>turn.id===fact.sourceId)?.answer??fact.quote;
    const words=source.split(/[.!?;,\n]/u).find(clause=>clause.includes(fact.quote))??fact.quote;
    const permission = /(?<!\p{L})(?:можно|подойд[её]т|допустим\p{L}*|не против|не смущает)\s+(?:и\s+)?18\s*\+|18\s*\+\s+(?:подойд[её]т|допустим\p{L}*|не смущает)/iu.test(words);
    const hardPermission=permission&&['require','exclude'].includes(fact.stance)
      &&pureRatingRequirement({...fact,quote:fact.text,stance:'require'});
    if (!hardPermission&&!inventedDetail&&(!evidence||evidence.test(fact.quote))) return [fact];
    changed = true;
    const key = JSON.stringify([fact.sourceId, fact.quote]);
    if (sources.has(key)) return [];
    sources.add(key);
    if(state.retractions?.some(row=>row.kind==='untyped_source'&&row.sourceId===fact.sourceId))return [];
    return [{...fact, text:fact.quote, feature:null, stance:permission?'conditional':fact.stance}];
  });
  return {facts:grounded, changed};
}

export function watchingWithChildren(state){
  if(state.context?.company==='children')return true;
  if(['adults','solo'].includes(state.context?.company))return false;
  return state.turns.some(turn=>turn.kind==='answer'&&!turn.superseded
    &&/(?:с детьми|с реб[её]нком|для (?:детей|реб[её]нка)|вместе с (?:дочерью|сыном))(?!\p{L})/iu.test(turn.answer));
}

export function ratingSummary(state,facts) {
  const wish=state.turns.find(turn=>!turn.superseded&&turn.question.id==='direction'&&turn.kind==='answer')?.answer;
  return [...new Set([wish,...facts.filter(f=>f.scope==='today'&&!wish?.includes(f.text)).map(f=>f.text)].filter(Boolean))].join(' ').slice(0,1000);
}

function ratingOnly(text){
  const words=String(text??'').toLowerCase().replace(/ё/g,'е').trim();
  return /(?:18\s*\+|рейтинг|маркировк)/u.test(words)&&/^(?:(?:мне|только|строго|обязател\p{L}*|нужен|нужна|нужно|требуется|с|у|для|этого|этой|фильм\p{L}*|сериал\p{L}*|аниме|подтвержден\p{L}*|проверен\p{L}*|возрастн\p{L}*|официальн\p{L}*|рейтинг\p{L}*|маркировк\p{L}*|18\s*\+)[ ,.:!—-]*)+$/u.test(words);
}
export function pureRatingRequirement(fact){
  if(fact.feature||fact.titleId||fact.scope!=='today'||fact.stance==='exclude')return false;
  // The exact source may say nothing but "18+" in two sentences. A model's
  // paraphrase ("именно этот рейтинг") cannot add another independent wish.
  return ratingOnly(fact.quote)&&(rating.test(fact.quote)||ratingOnly(fact.text));
}

// For a compound requirement, keep the other clause with its exact words from
// the same source. Do not rewrite ambiguous prose or independently typed facts.
export function withoutRating(fact){
  if(pureRatingRequirement(fact))return null;
  if(fact.feature||fact.titleId||fact.scope!=='today'||fact.stance!=='require')return fact;
  const clauses=fact.quote.split(/\s*(?:[,;]|\s+и\s+)\s*/iu);
  if(clauses.length<2)return fact;
  let rest='';
  if(ratingOnly(clauses[0]))rest=fact.quote.slice(fact.quote.indexOf(clauses[1],clauses[0].length)).trim();
  else if(ratingOnly(clauses.at(-1))){
    const last=clauses.at(-2),end=fact.quote.lastIndexOf(last,fact.quote.lastIndexOf(clauses.at(-1))-1)+last.length;
    rest=fact.quote.slice(0,end).trim();
  }
  if(!rest)return fact;
  // Match both the independent requirement and its polarity in the user's words.
  const stance=/^(?:без|исключить|никак\p{L}*)\s/iu.test(rest)?'exclude':fact.stance;
  return {...fact,quote:rest,text:rest,stance};
}

export function hasUnresolvedRating(fact){
  return fact.scope==='today'&&fact.stance==='require'&&!fact.feature&&!fact.titleId&&rating.test(fact.quote)
    &&/(?:18\s*\+|возрастн\p{L}*\s+рейтинг|маркировк)/iu.test(fact.text);
}
