import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const round2=process.argv[2]==='2';
const html=await readFile(new URL(round2?'palettes-v2.html':'palettes.html',root),'utf8');
const marker='<script type="module">';
const code=html.slice(html.indexOf(marker)+marker.length,html.indexOf('</script>',html.indexOf(marker)));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction(code);
const palettes=JSON.parse(await readFile(new URL(round2?'palette-options-v2.json':'palette-options.json',root),'utf8'));
assert.deepEqual(palettes.map(palette=>palette.id),round2?['02','05','06','07','08']:['01','02','03','04']);
if(round2){
  const original=JSON.parse(await readFile(new URL('palette-options.json',root),'utf8')).find(palette=>palette.id==='02');
  const {reference,...retained}=palettes[0];
  assert.equal(reference,true);
  assert.deepEqual(retained,original,'Cobalt02 must retain its original colors');
}
function luminance(hex){
  const values=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return Number(((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2));}
const results=palettes.map(palette=>{
  for(const key of ['primary','ink','paper','dark','inverse','accent'])assert.match(palette[key],/^#[0-9A-F]{6}$/);
  return {id:palette.id,name:palette.name,primaryOnPaper:contrast(palette.primary,palette.paper),inkOnPaper:contrast(palette.ink,palette.paper),inverseOnDark:contrast(palette.inverse,palette.dark)};
});
const master=await readFile(new URL('exports/tastiq-logo.svg',root),'utf8');
const geometry=[...master.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map(match=>match[1]).join('|');
let geometryHash=2166136261;
for(const character of geometry)geometryHash=Math.imul(geometryHash^character.charCodeAt(0),16777619)>>>0;
const report={status:'Palette preview syntax and color data checked; browser review recorded separately.',sourceGeometryFNV32:geometryHash.toString(16),method:'sRGB relative luminance; (lighter + 0.05) / (darker + 0.05). Ratios do not establish approval of a palette.',results};
await writeFile(new URL(round2?'palette-check-v2.json':'palette-check.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
