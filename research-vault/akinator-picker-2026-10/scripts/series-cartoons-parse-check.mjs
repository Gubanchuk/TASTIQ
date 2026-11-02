const API='http://localhost:5173';
const post=async(p,b)=>(await fetch(API+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})).json();
for (const [d,t] of [['series','смешно'],['series','лёгкий, смешной, можно смотреть фоном не напрягаясь, герои как родные'],['series','слишком жестоко, кровь, всех убивают, тяжело и мрачно, на нервах'],['cartoon','дочка испугалась, жуткие куклы, страшно; тупые шутки, скучно взрослому'],['cartoon','смешно и взрослому, и ребёнку, добрый, про дружбу, красиво нарисован'],['series','без напряга, ситком, чтобы не думать'],['game','весело']]) {
  console.log(d, '|', t, '=>', JSON.stringify(await post('/api/parse',{text:t,domain:d})));
}
for (const id of ['tt0165598','tt10638036']) {
  const s=await (await fetch(`${API}/api/search?domain=series&q=${id}`)).json();
  console.log(id, JSON.stringify(s.slice(0,1)));
}
