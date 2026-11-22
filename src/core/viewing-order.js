// Reading order belongs to this request, not to a permanent preference.
export function viewingOrderOf(state, returnToIds) {
  const priorIds = new Set();
  for (const fact of state.facts) {
    if (!fact.titleId) continue;
    if (fact.exposure === 'finished' ||
      (fact.scope === 'today' && ['want','require'].includes(fact.stance) &&
       /(?:хочу|ищу|нужен|нужно|посоветуй)\s+(?:посмотреть\s+)?(?:продолжение|сиквел)(?!\p{L})/iu.test(fact.quote) &&
       !/(?:^|\s)(?:не|раньше|если)(?!\p{L})/iu.test(fact.quote))) priorIds.add(fact.titleId);
  }
  let allowContinuations=false;
  for(const turn of state.turns){
    if(turn.kind!=='answer'||turn.superseded)continue;
    for(const raw of (turn.text||turn.answer).split(/[.!;\n]/u)){
      const words=raw.trim().toLowerCase().replace(/ё/g,'е');
      const removed=state.retractions.some(r=>{
        if(r.sourceId!==turn.id || ['context','session_time'].includes(r.kind) || !r.quote)return false;
        const quote=r.quote.toLowerCase().replace(/ё/g,'е').replace(/[.!;]+$/u,'').trim();
        return quote && (words.includes(quote) || quote.includes(words));
      });
      if(removed)continue;
      if(/^(?:можно|подойдут|хочу)\s+(?:и\s+)?(?:продолжения|сиквелы)$/u.test(words))allowContinuations=true;
      if(/^(?:(?:без|не хочу)\s+(?:продолжений|сиквелов)|(?:хочу|нужно|только)\s+(?:смотреть\s+)?с нуля|только самостоятельн\p{L}*\s+\p{L}+)$/u.test(words))allowContinuations=false;
    }
  }
  return {priorIds:[...priorIds], returnToIds,allowContinuations};
}

export function needsEarlierWork(item, order) {
  return Boolean(order && !order.allowContinuations && item?.standalone === false && !order.returnToIds.includes(item.id)
    && !order.priorIds.includes(item.priorTitleId));
}

export function acceptsViewingStart(item, start, order) {
  if (needsEarlierWork(item, order)) return false;
  if (item?.standalone === true || order.returnToIds.includes(item?.id)) return true;
  if (item?.standalone === false) return order.allowContinuations || order.priorIds.includes(item.priorTitleId);
  return start === 'independent' || order.allowContinuations && start === 'requires_prior' || order.priorIds.some(id => start === 'after:' + id);
}
