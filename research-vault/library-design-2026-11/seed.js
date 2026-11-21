// Each design has its own demo library on the local preview origin.
const concept = document.documentElement.dataset.concept;
sessionStorage.setItem('studio.concept',concept);
sessionStorage.setItem('tastiq.qa.run','library-studio-' + concept);
const {qaStorage} = await import('/shared/qa-session.js');
const {createLibraryStore} = await import('/shared/library-store.js');
const storage = qaStorage(localStorage);
const sample = [
  ['anime','tt0245429','Унесённые призраками',2001,'anime-chihiro','Spirited Away'],
  ['game','steam:1091500','Cyberpunk 2077',2020,'1091500'],
  ['film','tt0088763','Назад в будущее',1985,'tt0088763','Back to the Future'],
  ['cartoon','tt0910970','ВАЛЛ·И',2008,'tt0910970','WALL·E'],
  ['series','tt4574334','Очень странные дела',2016,'tt4574334','Stranger Things'],
  ['anime','tt0347149','Ходячий замок',2004,'anime-howl', "Howl’s Moving Castle"],
  ['game','steam:413150','Stardew Valley',2016,'413150'],
  ['film','tt0266697','Убить Билла',2003,'tt0266697','Kill Bill'],
  ['series','tt10986410','Тед Лассо',2020,'tt10986410','Ted Lasso'],
  ['cartoon','tt4633694','Человек-паук: Через вселенные',2018,'tt4633694','Spider-Man: Into the Spider-Verse'],
  ['anime','tt0096283','Мой сосед Тоторо',1988,'anime-totoro','My Neighbor Totoro'],
  ['film','tt0120737','Властелин колец: Братство Кольца',2001,'tt0120737','The Fellowship of the Ring'],
  ['game','steam:374320','Dark Souls III',2016,'374320'],
  ['cartoon','tt0126029','Шрек',2001,'tt0126029','Shrek'],
  ['series','tt0903747','Во все тяжкие',2008,'tt0903747','Breaking Bad'],
];
if (!storage.getItem('studio.seed.v1')) {
  let offset = 0;
  const now = () => new Date(Date.UTC(2026,10,20,18) - offset * 86400000).toISOString();
  const library = createLibraryStore({storage,now});
  for (const [domain,id,title,year,art,original] of sample) {
    const card = library.save({domain,id,title,year,original,aliases:[title,original || title],poster:'/assets/landing/' + art + '.webp'});
    if ([0,3,7,10,12].includes(offset)) library.rate(card.domain,id,'liked');
    offset++;
  }
  storage.setItem('studio.seed.v1','1');
}
if(!storage.getItem('studio.context.v1')) {
  const {createTasteMemory}=await import('/shared/taste-memory.js');
  const memory=createTasteMemory({storage});
  memory.save({domain:'anime',text:'Люблю рисованные миры, в которых интересно разглядывать детали.',source:{kind:'manual'}});
  storage.setItem('studio.context.v1','1');
}
if(!storage.getItem('studio.history.v1')) {
  const {createSelectionArchive}=await import('/shared/selection-archive.js');
  const cards=sample.filter(([group])=>group==='game').map(([domain,id,name,year,art])=>({
    domain,id,name,ru:name,year,poster:'/assets/landing/'+art+'.webp',facts:[],genres:[],parts:[],explanation:'Из демонстрационной игровой коллекции.'
  }));
  const result={top:cards[0],alternatives:cards.slice(1)};
  const context={platform:'pc',company:'solo'},summary='Игры на ПК для одного игрока.';
  const shared={context,summary,facts:[],uncertainties:[],turns:[],result};
  createSelectionArchive({storage}).capture({state:{...shared,version:1,id:'studio-game-sample',domain:'game',mode:'guided',phase:'result',interview:{depth:'quick'}},screen:{...shared,type:'result'}});
  storage.setItem('studio.history.v1','1');
}
if(concept==='applied')location.replace('/library/');
else await import(concept === 'original' ? '/library/app.js' : '/library/studio-app.js');
