import {readFileSync,writeFileSync} from 'node:fs';
const base='src/server/public/';
const libraryIcon='<svg class="conversation-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.7"/></svg>';
const pickIcon='<svg class="conversation-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
for(const file of ['pick/game/index.html','pick/watch/index.html','library/index.html']){
 let s=readFileSync(base+file,'utf8');
 const isLibrary=file.startsWith('library/');
 const selection=isLibrary?'<div class="product-header-space"></div>':s.match(/<div class="selection-header">.*?<\/div>/)?.[0];
 if(!selection)throw Error('Missing domain header');
 if(!isLibrary)s=s.replace(selection,'');
 const header=`<header class="conversation-rail" aria-label="Навигация TASTIQ"><a class="conversation-brand" href="/" aria-label="TASTIQ — главная"><img class="site-logo" src="/assets/brand/tastiq-logo-cobalt.svg" alt="TASTIQ" width="148" height="36"></a>${selection}<nav class="conversation-links" aria-label="Основное">${isLibrary?`<a href="/#doors" class="product-new-pick">${pickIcon}Новый подбор</a>`:`<a href="/library/">${libraryIcon}Библиотека</a>`}</nav></header>`;
 s=s.replace(/<aside class="conversation-rail"[\s\S]*?<\/aside>/,header);
 s=s.replace('<body class="conversation-page','<body class="product-page conversation-page');
 s=s.replace('<div class="conversation-body game-workspace">','<div class="conversation-body game-workspace" id="picker-workspace">');
 s=s.replace('</head>','  <link rel="stylesheet" href="/shared/product.css?v=1">\n</head>');
 writeFileSync(base+file,s);
}
for(const file of ['pick/game/app.js','pick/watch/app.js']){
 const path=base+file;writeFileSync(path,readFileSync(path,'utf8').replace('Есть из чего выбрать.','Твои варианты на этот вечер'));
}
let qa=readFileSync('research-vault/brand-ui-2026-11-03/qa-server.mjs','utf8');
qa=qa.replaceAll('brand20261103','productstyle20261103').replaceAll('tastiq-brand-qa-','tastiq-product-qa-').replaceAll('Brand QA','Product QA');
writeFileSync('research-vault/product-style-2026-11-03/qa-server.mjs',qa);
