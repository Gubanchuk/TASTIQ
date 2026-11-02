// Unsubmitted title reactions belong to one dialogue, not to the permanent taste library.
export function createAnchorDraft(storage) {
  const key=(id,domain)=>typeof id==='string'&&/^[\w:-]{1,100}$/.test(id)&&['game','film','series','cartoon'].includes(domain)?`tastiq.site.anchor-draft:${id}:${domain}`:null;
  const clean=rows=>[...new Map(rows.filter(m=>m?.card&&typeof m.card.id==='string'&&typeof m.card.name==='string'&&['love','like','dislike','unknown'].includes(m.r)).map(m=>[m.card.id,{card:m.card,r:m.r}])).values()];
  return {
    load(id,domain){try{const k=key(id,domain);if(!k)return null;const x=JSON.parse(storage?.getItem(k)??'null');return x?.version===1&&Array.isArray(x.marks)?clean(x.marks):null;}catch{return null;}},
    save(id,domain,marks){try{const k=key(id,domain);if(k)storage?.setItem(k,JSON.stringify({version:1,marks:clean(marks)}));}catch{/* this visit still works in memory */}},
    clear(id,domain){try{const k=key(id,domain);if(k)storage?.removeItem(k);}catch{/* optional storage */}},
  };
}
