// One-time migration of the former warm UI to the approved cobalt palette.
import {readFileSync,writeFileSync} from 'node:fs';
const base='src/server/public/';
const files=['shared/conversation.css','pick/game/conversation.css','library/style.css','pick/conversation.css'];
const roles={
 '#b84025':'primary','#a43620':'hover','#9d351f':'hover','#9d331e':'hover','#872c1a':'press','#8e2d19':'press',
 '#a4351e':'primary','#96371f':'primary','#a43b23':'primary','#81341f':'press','#70412c':'primary',
 '#282a2c':'dark','#37393a':'ink','#3c3d3e':'ink','#2b2b2a':'ink',
 '#f5ece2':'paper','#fbf4ec':'surface','#e7dcd1':'context',
 '#d9cec4':'line','#c9bbae':'line','#f5dfd1':'selected','#f3dacc':'selected','#f3ddd0':'selected',
 '#f2d9ca':'selected','#edc6b1':'selected','#eabda0':'selected',
 '#b9775d':'error-line','#6e2c1c':'error','#a43724':'error','#96331f':'error',
 '#d8d1c8':'inverse','#d1c9bf':'inverse','#bcb5ac':'accent','#f9f2e8':'inverse','#fff8ee':'inverse',
 '#53524e':'muted','#257eaa':'primary',
};
const roleOf=hex=>{
 if(roles[hex])return roles[hex];
 if(hex.length!==7||hex==='#3e6246'||hex==='#6c8070')return null;
 const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16));
 const l=rgb.reduce((a,b)=>a+b)/3;
 if(l>=244)return 'surface';if(l>=228)return 'context';if(l>=210)return 'fill';
 if(l>=186)return 'line';if(l>=140)return 'strong-line';if(l>=85)return 'muted';return 'ink';
};
for(const file of files){let s=readFileSync(base+file,'utf8');s=s.replace(/#[0-9a-fA-F]{3,8}\b/g,hex=>{const role=roleOf(hex.toLowerCase());return role?`var(--brand-${role})`:hex;});writeFileSync(base+file,s);}
for(const file of ['pick/game/index.html','pick/watch/index.html','pick/index.html','library/index.html']){
 let s=readFileSync(base+file,'utf8').replace('content="#282a2c"','content="#15213D"').replace('href="data:,"','type="image/svg+xml" href="/assets/brand/favicon.svg"');
 s=s.replace(/(<a class="conversation-brand"[^>]*>).*?(<\/a>)/,'$1<img class="site-logo" src="/assets/brand/tastiq-logo-inverse.svg" alt="TASTIQ" width="128" height="32">$2');
 s=s.replace('</head>','  <link rel="stylesheet" href="/shared/brand.css">\n</head>');writeFileSync(base+file,s);
}
for(const file of ['pick/game/card-view.js','pick/watch/card-view.js']){
 let s=readFileSync(base+file,'utf8').replace('class="game-card game-proposal"','class="game-card game-proposal${index===0?\' game-proposal-featured\':\'\'}"');
 s=s.replace('return `<article class="game-card game-proposal', 'return `${index===1?\'<h2 class="game-alternatives-heading">Ещё варианты на этот вечер</h2>\':\'\'}<article class="game-card game-proposal');
 writeFileSync(base+file,s);
}
