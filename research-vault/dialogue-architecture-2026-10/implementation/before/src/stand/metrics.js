export function hiddenKnownIds(persona, state) {
  const known = [...(persona.loved ?? []), ...(persona.disliked ?? []), ...(persona.alsoSeen ?? [])];
  const reported = new Set(Object.entries(state.answers ?? {}).filter(([,a])=>a.reaction && a.reaction!=='unknown').map(([id])=>id));
  return new Set(known.map(x=>x.id).filter(id=>!reported.has(id)));
}
export function median(values) {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b), middle=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
}
