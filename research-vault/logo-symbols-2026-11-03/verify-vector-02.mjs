import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const report = JSON.parse(await readFile(new URL('vector-build-report.json',root),'utf8'));
const source = JSON.parse(await readFile(new URL('selected-02-mask.json',root),'utf8'));
const mask = new Uint8Array(source.width*source.height);
source.rows.forEach((runs,y)=>{for(let i=0;i<runs.length;i+=2)mask.fill(1,y*source.width+runs[i],y*source.width+runs[i]+runs[i+1]);});
const stride=source.width+1,boundary=new Uint8Array(stride*(source.height+1));
const ink=(x,y)=>x>=0&&x<source.width&&y>=0&&y<source.height&&mask[y*source.width+x];
for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(ink(x,y)){
  if(!ink(x,y-1)||!ink(x-1,y))boundary[y*stride+x]=1;
  if(!ink(x,y-1)||!ink(x+1,y))boundary[y*stride+x+1]=1;
  if(!ink(x,y+1)||!ink(x-1,y))boundary[(y+1)*stride+x]=1;
  if(!ink(x,y+1)||!ink(x+1,y))boundary[(y+1)*stride+x+1]=1;
}
function nearBoundary(point,radius=3){
  const cx=Math.round(point[0]),cy=Math.round(point[1]);
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const x=cx+dx,y=cy+dy;
    if(x<0||x>source.width||y<0||y>source.height||!boundary[y*stride+x])continue;
    if((x-point[0])**2+(y-point[1])**2<=radius*radius)return true;
  }
  return false;
}
const svg=await readFile(new URL('exports/tastiq-logo.svg',root),'utf8');
const paths=[...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map(match=>match[1]);
assert.equal(paths.length,7,'Bear and six outlined letters must remain separate');
let samples=0;
const findings=[];
paths.forEach((data,index)=>{
  const component=report.components[index];
  let previous;
  for(const match of data.matchAll(/([MCZ])([^MCZ]*)/g)){
    const values=(match[2].match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
    if(match[1]==='M'){previous=values;continue;}
    if(match[1]!=='C')continue;
    const start=previous,end=values.slice(4,6);
    for(let step=0;step<=128;step++){
      const t=step/128,s=1-t;
      const p=[0,1].map(axis=>s*s*s*start[axis]+3*s*s*t*values[axis]+3*s*t*t*values[axis+2]+t*t*t*end[axis]);
      samples++;
      if(!nearBoundary(p)&&findings.filter(item=>item.index===index).length<3)findings.push({index,name:component.name,point:p.map(value=>Number(value.toFixed(2)))});
    }
    previous=end;
  }
});
for(const name of ['logo','symbol','wordmark'])for(const suffix of ['','-white']){
  const content=await readFile(new URL(`exports/tastiq-${name}${suffix}.svg`,root),'utf8');
  assert.ok(!/<image|<text|font-family|NaN|Infinity/.test(content),'Exports must contain valid paths without fonts or raster');
  assert.match(content,/viewBox="0 0 [\d.]+ [\d.]+"/);
}
console.log(JSON.stringify({samples,maximumPermittedContourDistance:3,findings},null,2));
assert.equal(findings.length,0,'A curve escaped the source contour by more than three source pixels');
