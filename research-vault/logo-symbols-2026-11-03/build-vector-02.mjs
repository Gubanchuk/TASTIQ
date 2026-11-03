import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Deterministic vector conversion of the selected generated artwork.
// The source image is read for contour analysis and is never modified.
const root = new URL('./', import.meta.url);
const source = JSON.parse(await readFile(new URL('selected-02-mask.json', root), 'utf8'));
const { width: width, height: height } = source;
const mask = new Uint8Array(width * height);
source.rows.forEach((runs, y) => {
  for (let i = 0; i < runs.length; i += 2) mask.fill(1, y * width + runs[i], y * width + runs[i] + runs[i + 1]);
});
const labels = new Int16Array(mask.length);
const queue = new Int32Array(mask.length);
const components = [];
for (let seed = 0; seed < mask.length; seed++) {
  if (!mask[seed] || labels[seed]) continue;
  const id = components.length + 1;
  let head = 0, tail = 1;
  queue[0] = seed;
  labels[seed] = id;
  const pixels = [];
  const bounds = { x: width, y: height, right: 0, bottom: 0 };
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width, y = Math.floor(pixel / width);
    pixels.push(pixel);
    bounds.x = Math.min(bounds.x, x); bounds.y = Math.min(bounds.y, y);
    bounds.right = Math.max(bounds.right, x + 1); bounds.bottom = Math.max(bounds.bottom, y + 1);
    const neighbors = [];
    if (x) neighbors.push(pixel - 1);
    if (x + 1 < width) neighbors.push(pixel + 1);
    if (y) neighbors.push(pixel - width);
    if (y + 1 < height) neighbors.push(pixel + width);
    for (const neighbor of neighbors) if (mask[neighbor] && !labels[neighbor]) { labels[neighbor] = id; queue[tail++] = neighbor; }
  }
  components.push({ id, pixels, bounds, area: pixels.length });
}
const selected = components.filter(component => component.area >= 30).sort((a,b) => a.bounds.x - b.bounds.x);
if (selected.length !== 7) throw new Error(`Expected a bear and six letters, received ${selected.length}`);
const add = (a,b) => [a[0]+b[0], a[1]+b[1]];
const sub = (a,b) => [a[0]-b[0], a[1]-b[1]];
const mul = (a,s) => [a[0]*s, a[1]*s];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const length = a => Math.hypot(...a);
const normalize = a => length(a) > 1e-10 ? mul(a, 1/length(a)) : [1,0];
const distanceSq = (a,b) => dot(sub(a,b),sub(a,b));
const fmt = n => Number(n.toFixed(3));
const point = p => `${fmt(p[0])} ${fmt(p[1])}`;

function contourLoops(component) {
  const edges = [], outgoing = new Map(), stride = width + 1;
  const edge = (x,y,nx,ny,direction) => {
    const from = y*stride+x, to = ny*stride+nx, index = edges.length;
    edges.push({ from, to, direction, used: false });
    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from).push(index);
  };
  const same = (x,y) => x>=0 && x<width && y>=0 && y<height && labels[y*width+x] === component.id;
  for (const pixel of component.pixels) {
    const x=pixel%width, y=Math.floor(pixel/width);
    if (!same(x,y-1)) edge(x,y,x+1,y,0);
    if (!same(x+1,y)) edge(x+1,y,x+1,y+1,1);
    if (!same(x,y+1)) edge(x+1,y+1,x,y+1,2);
    if (!same(x-1,y)) edge(x,y+1,x,y,3);
  }
  const loops=[];
  for (let index=0;index<edges.length;index++) {
    if (edges[index].used) continue;
    const start=edges[index].from, points=[];
    let current=index;
    for (let steps=0;steps<=edges.length;steps++) {
      const item=edges[current];
      if (item.used) throw new Error('Repeated contour edge');
      item.used=true;
      points.push([item.from%stride,Math.floor(item.from/stride)]);
      if (item.to===start) break;
      const options=(outgoing.get(item.to)||[]).filter(next=>!edges[next].used);
      if (!options.length) throw new Error('Open source contour');
      const preference=[(item.direction+1)%4,item.direction,(item.direction+3)%4,(item.direction+2)%4];
      options.sort((a,b)=>preference.indexOf(edges[a].direction)-preference.indexOf(edges[b].direction));
      current=options[0];
      if (steps===edges.length) throw new Error('Contour did not close');
    }
    const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
    if (Math.abs(area)>=10) loops.push({ points, area });
  }
  return loops;
}
function simplifyOpen(points, tolerance=.55) {
  if (points.length<=2) return points;
  const start=points[0], end=points.at(-1), delta=sub(end,start), denominator=dot(delta,delta);
  let greatest=0, split=0;
  for (let i=1;i<points.length-1;i++) {
    const u=denominator ? Math.max(0,Math.min(1,dot(sub(points[i],start),delta)/denominator)) : 0;
    const distance=distanceSq(points[i],add(start,mul(delta,u)));
    if (distance>greatest) {greatest=distance;split=i;}
  }
  if (greatest<=tolerance*tolerance) return [start,end];
  return [...simplifyOpen(points.slice(0,split+1),tolerance).slice(0,-1),...simplifyOpen(points.slice(split),tolerance)];
}
function simplifyLoop(points) {
  let far=1;
  for (let i=2;i<points.length;i++) if (distanceSq(points[i],points[0])>distanceSq(points[far],points[0])) far=i;
  return [...simplifyOpen(points.slice(0,far+1)).slice(0,-1),...simplifyOpen([...points.slice(far),points[0]]).slice(0,-1)];
}
function smoothLoop(points) {
  const weights=[1,4,7,10,13,10,7,4,1],total=weights.reduce((a,b)=>a+b,0);
  return points.map((_,index)=>{
    const averaged=[0,0];
    weights.forEach((weight,offset)=>{
      const p=points[(index+offset-4+points.length)%points.length];
      averaged[0]+=p[0]*weight/total;averaged[1]+=p[1]*weight/total;
    });
    return averaged;
  });
}
function bezier(control,t) {
  let points=control;
  while (points.length>1) points=points.slice(0,-1).map((p,i)=>add(mul(p,1-t),mul(points[i+1],t)));
  return points[0];
}
function parameters(points) {
  const values=[0];
  for (let i=1;i<points.length;i++) values.push(values.at(-1)+length(sub(points[i],points[i-1])));
  return values.map(value=>value/values.at(-1));
}
function generateBezier(points,values,left,right) {
  const first=points[0],last=points.at(-1);
  let c00=0,c01=0,c11=0,x0=0,x1=0;
  points.forEach((p,i)=>{
    const t=values[i],s=1-t,b0=s*s*s,b1=3*t*s*s,b2=3*t*t*s,b3=t*t*t;
    const a0=mul(left,b1),a1=mul(right,b2);
    const residual=sub(p,add(mul(first,b0+b1),mul(last,b2+b3)));
    c00+=dot(a0,a0);c01+=dot(a0,a1);c11+=dot(a1,a1);x0+=dot(a0,residual);x1+=dot(a1,residual);
  });
  const determinant=c00*c11-c01*c01, chord=length(sub(last,first));
  let alpha0=determinant ? (x0*c11-x1*c01)/determinant : 0;
  let alpha1=determinant ? (c00*x1-c01*x0)/determinant : 0;
  if (!Number.isFinite(alpha0+alpha1)||alpha0<1e-6*chord||alpha1<1e-6*chord) alpha0=alpha1=chord/3;
  return [first,add(first,mul(left,alpha0)),add(last,mul(right,alpha1)),last];
}
function fittingError(points,curve,values) {
  let error=0,split=Math.floor(points.length/2);
  for (let i=1;i<points.length-1;i++) {
    const candidate=distanceSq(bezier(curve,values[i]),points[i]);
    if (candidate>error) {error=candidate;split=i;}
  }
  // Point interpolation alone can accept long excursions between sparse points.
  // Also check the fitted curve against the full source polyline corridor.
  for (let sample=1;sample<64;sample++) {
    const p=bezier(curve,sample/64);
    let nearest=Infinity,nearestSegment=0;
    for (let i=0;i<points.length-1;i++) {
      const segment=sub(points[i+1],points[i]),denominator=dot(segment,segment);
      const u=denominator ? Math.max(0,Math.min(1,dot(sub(p,points[i]),segment)/denominator)) : 0;
      const distance=distanceSq(p,add(points[i],mul(segment,u)));
      if (distance<nearest) {nearest=distance;nearestSegment=i;}
    }
    if (nearest>error) {error=nearest;split=Math.max(1,Math.min(points.length-2,nearestSegment+1));}
  }
  return {error,split};
}
function newParameter(curve,p,t) {
  const derivative=curve.slice(0,-1).map((q,i)=>mul(sub(curve[i+1],q),3));
  const second=derivative.slice(0,-1).map((q,i)=>mul(sub(derivative[i+1],q),2));
  const delta=sub(bezier(curve,t),p),q1=bezier(derivative,t),q2=bezier(second,t);
  const denominator=dot(q1,q1)+dot(delta,q2);
  return Math.abs(denominator)<1e-10 ? t : Math.max(0,Math.min(1,t-dot(delta,q1)/denominator));
}
function fit(points,left,right,tolerance=1,depth=0) {
  if (points.length===2) {
    const delta=sub(points[1],points[0]);
    return [[points[0],add(points[0],mul(delta,1/3)),add(points[0],mul(delta,2/3)),points[1]]];
  }
  let values=parameters(points),curve=generateBezier(points,values,left,right);
  let assessment=fittingError(points,curve,values);
  if (assessment.error<=tolerance*tolerance) return [curve];
  if (assessment.error<=tolerance*tolerance*4) for (let attempt=0;attempt<4;attempt++) {
    const next=points.map((p,i)=>newParameter(curve,p,values[i]));
    if (next.some((value,i)=>i&&value<=next[i-1])) break;
    values=next;curve=generateBezier(points,values,left,right);assessment=fittingError(points,curve,values);
    if (assessment.error<=tolerance*tolerance) return [curve];
  }
  if (depth>32) throw new Error('Curve fitting recursion exceeded');
  const split=assessment.split,center=normalize(sub(points[split-1],points[split+1]));
  return [...fit(points.slice(0,split+1),left,center,tolerance,depth+1),...fit(points.slice(split),mul(center,-1),right,tolerance,depth+1)];
}
function pathForLoop(loop) {
  const points=simplifyLoop(smoothLoop(loop.points)),count=points.length,corners=[];
  for (let i=0;i<count;i++) {
    const incoming=sub(points[i],points[(i+count-1)%count]),outgoing=sub(points[(i+1)%count],points[i]);
    const cosine=dot(normalize(incoming),normalize(outgoing));
    if (Math.min(length(incoming),length(outgoing))>4&&cosine<Math.cos(55*Math.PI/180)) corners.push(i);
  }
  const cuts=[...corners];
  if (!cuts.length) cuts.push(0);
  if (cuts.length===1) {
    let far=(cuts[0]+1)%count;
    for(let i=0;i<count;i++) if(distanceSq(points[i],points[cuts[0]])>distanceSq(points[far],points[cuts[0]]))far=i;
    cuts.push(far);
  }
  cuts.sort((a,b)=>a-b);
  const curves=[];
  for(let i=0;i<cuts.length;i++) {
    const start=cuts[i],end=cuts[(i+1)%cuts.length],span=[points[start]];
    for(let next=(start+1)%count;next!==end;next=(next+1)%count) span.push(points[next]);
    span.push(points[end]);
    const tangent=(index,backward)=>{
      const previous=points[(index+count-1)%count],next=points[(index+1)%count];
      const direction=corners.includes(index) ? (backward?sub(previous,points[index]):sub(next,points[index])) : (backward?sub(previous,next):sub(next,previous));
      return normalize(direction);
    };
    curves.push(...fit(span,tangent(start,false),tangent(end,true)));
  }
  return { data:`M${point(curves[0][0])} ${curves.map(curve=>`C${point(curve[1])} ${point(curve[2])} ${point(curve[3])}`).join(' ')} Z`, curves:curves.length, points:loop.points.length };
}
selected.forEach((component,index)=>{
  component.name=index===0?'bear':'TASTIQ'[index-1];
  component.loops=contourLoops(component).map(pathForLoop);
  component.path=component.loops.map(loop=>loop.data).join(' ');
});
const exported=new URL('exports/',root);
await mkdir(exported,{recursive:true});
function svg(title,viewBox,content,color='#000') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${title}</title><g fill="${color}" fill-rule="evenodd">${content}</g></svg>\n`;
}
const path=(component,transform='')=>`<path${transform?` transform="${transform}"`:''} d="${component.path}"/>`;
const bear=selected[0],letters=selected.slice(1);
const bearWidth=bear.bounds.right-bear.bounds.x,bearHeight=bear.bounds.bottom-bear.bounds.y;
const firstX=letters[0].bounds.x,wordTop=Math.min(...letters.map(letter=>letter.bounds.y));
const wordRight=Math.max(...letters.map(letter=>letter.bounds.right));
const wordBottom=Math.max(...letters.map(letter=>letter.bounds.bottom));
const capBottom=letters[4].bounds.bottom;
const symbolHeight=232,symbolScale=symbolHeight/bearHeight,symbolWidth=bearWidth*symbolScale;
const padding=10,gap=40,adjustments=[0,-2,-1,1,2,5];
const symbolTop=padding,baseline=padding+symbolHeight;
const wordShiftY=baseline-capBottom;
const wordShiftX=padding+symbolWidth+gap-firstX;
const content=path(bear,`translate(${fmt(padding-bear.bounds.x*symbolScale)} ${fmt(symbolTop-bear.bounds.y*symbolScale)}) scale(${fmt(symbolScale)})`)+letters.map((letter,i)=>path(letter,`translate(${fmt(wordShiftX+adjustments[i])} ${fmt(wordShiftY)})`)).join('');
const logoWidth=Math.ceil(wordRight+wordShiftX+adjustments.at(-1)+padding),logoHeight=Math.ceil(Math.max(baseline,wordBottom+wordShiftY)+padding);
const symbolSize=Math.ceil(Math.max(bearWidth,bearHeight)+24),symbolShiftX=(symbolSize-bearWidth)/2-bear.bounds.x,symbolShiftY=(symbolSize-bearHeight)/2-bear.bounds.y;
const symbolContent=path(bear,`translate(${fmt(symbolShiftX)} ${fmt(symbolShiftY)})`);
const wordContent=letters.map((letter,i)=>path(letter,`translate(${fmt(10-firstX+adjustments[i])} ${fmt(10-wordTop)})`)).join('');
const wordWidth=wordRight-firstX+adjustments.at(-1)+20,wordHeight=wordBottom-wordTop+20;
for(const [suffix,color] of [['','#000'],['-white','#fff']]) {
  await writeFile(new URL(`tastiq-logo${suffix}.svg`,exported),svg('TASTIQ',`0 0 ${logoWidth} ${logoHeight}`,content,color));
  await writeFile(new URL(`tastiq-symbol${suffix}.svg`,exported),svg('TASTIQ — медведь',`0 0 ${symbolSize} ${symbolSize}`,symbolContent,color));
  await writeFile(new URL(`tastiq-wordmark${suffix}.svg`,exported),svg('TASTIQ',`0 0 ${wordWidth} ${wordHeight}`,wordContent,color));
}
const report={source:source.source,sourceRegion:source.sourceRegion,threshold:source.threshold,components:selected.map(({name,area,bounds,loops})=>({name,area,bounds,contours:loops.length,curves:loops.reduce((sum,loop)=>sum+loop.curves,0)})),fit:{boundarySmoothingRadius:4,polygonTolerance:.55,curveTolerance:1},layout:{symbolHeight,gap,letterOffsets:adjustments,logoViewBox:[0,0,logoWidth,logoHeight]},status:'Owner selected symbol5B and uppercase02; final vector composition requires visual review.'};
await writeFile(new URL('vector-build-report.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
