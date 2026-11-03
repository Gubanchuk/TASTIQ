import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const root=new URL('./',import.meta.url),kit=new URL('brand-cobalt-v1/',root);
const palette=JSON.parse(await readFile(new URL('palette.json',kit),'utf8'));
assert.equal(palette.primary,'#3154D6');assert.equal(palette.inverse,'#DFE8FF');
const geometry=svg=>({viewBox:svg.match(/viewBox="([^"]+)"/)[1],paths:[...svg.matchAll(/<path\b([^>]+)>/g)].map(match=>({d:match[1].match(/\bd="([^"]+)"/)[1],transform:match[1].match(/\btransform="([^"]+)"/)?.[1]||''}))});
const files=await readdir(new URL('svg/',kit));
assert.equal(files.length,14);
for(const filename of files){
  const kind=filename==='favicon.svg'?'symbol':filename.split('-')[1];
  const source=await readFile(new URL(`exports/tastiq-${kind}.svg`,root),'utf8');
  const candidate=await readFile(new URL(`svg/${filename}`,kit),'utf8');
  assert.deepEqual(geometry(candidate),geometry(source),`Geometry changed in ${filename}`);
  assert.ok(!/<image|<text|font-family|NaN|Infinity/.test(candidate));
  const color=filename.includes('-cobalt')||filename==='favicon.svg'?'#3154D6':filename.includes('-inverse')?'#DFE8FF':filename.includes('-white')?'#FFFFFF':filename.includes('-black')?'#000000':null;
  if(color)assert.ok(candidate.includes(`fill="${color}"`),`Wrong fill in ${filename}`);
}
const html=await readFile(new URL('cobalt.html',root),'utf8'),marker='<script type="module">';
const code=html.slice(html.indexOf(marker)+marker.length,html.indexOf('</script>',html.indexOf(marker)));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;new AsyncFunction(code);
const pngFiles=await readdir(new URL('png/',kit));
if(process.argv.includes('--complete')){
  const expected={
    'tastiq-logo-cobalt.png':[4560,1108],'tastiq-logo-inverse.png':[4560,1108],'tastiq-logo-white.png':[4560,1108],'tastiq-logo-accent.png':[4560,1108],
    'tastiq-symbol-cobalt.png':[1024,1024],'tastiq-symbol-white.png':[1024,1024],
    'favicon-16.png':[16,16],'favicon-32.png':[32,32],'apple-touch-icon.png':[180,180],
    'preview-light.png':[2600,874],'preview-dark.png':[2600,874]
  };
  assert.deepEqual([...pngFiles].sort(),Object.keys(expected).sort());
  for(const [name,dimensions]of Object.entries(expected)){
    const buffer=await readFile(new URL(`png/${name}`,kit));
    assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.deepEqual([buffer.readUInt32BE(16),buffer.readUInt32BE(20)],dimensions,`Wrong PNG dimensions: ${name}`);
  }
}
const report={selected:{symbol:'5B',wordmark:'02',palette:'02 — Кобальт'},svgFiles:files.length,allSvgGeometryMatchesSelectedMaster:true,noRasterOrFontDependencies:true,pngFiles:pngFiles.length,status:pngFiles.length===11?'SVG and PNG set present; browser render and ZIP checked separately.':'SVG checked; PNG rendering pending.'};
await writeFile(new URL('cobalt-kit-check.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
