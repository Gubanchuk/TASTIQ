import {workKey} from '../lib/text.js';

// These original/remastered or regional Steam releases share the indicated legacy work.
// Membership is by exact AppID. Other apps with a similar name do not inherit it.
const editions = new Map([
  ['elder scrolls v skyrim',[72850,489830]],
  ['fallout new vegas',[22380,22490]],
  ['batman arkham asylum',[35140,35010]],
  ['sleeping dogs',[307690,202170]],
  ['batman arkham city',[200260,57400]],
  ['saints row the third',[55230,978300]],
  ['ori and the blind forest',[387290,261570]],
  ['total war shogun 2',[201270,34330]],
  ['bioshock',[409710,7670]],
  ['call of duty modern warfare 2 2009',[10180,10190]],
  ['rising storm 2 vietnam',[418460,418500]],
  ['mafia ii',[50130,1030830]],
  ['elder scrolls iv oblivion 2009',[22330,900883]],
  ['fallout 3',[22370,22300]],
  ['call of duty black ops ii',[202970,202990]],
  ['call of duty wwii',[476600,476620]],
  ['call of duty black ops',[42700,42710]],
  ['call of duty modern warfare 3 2011',[115300,42680]],
  ['life is strange before the storm',[554620,1265930]],
  ['borderlands',[8980,729040]],
  ['call of duty ghosts',[209160,209170]],
  ['divinity original sin',[373420,230230]],
  ['dragon age origins',[47810,17450]],
  ['bioshock 2',[409720,8850]],
  ['sniper elite v2',[63380,728740]],
  ['call of duty advanced warfare',[209650,209660]],
  ['ironsight',[783770,715220]],
  ['need for speed hot pursuit',[47870,1328660]],
  ['tiny bunny',[1421250,1249880]],
  ['devil may cry 4',[329050,45700]],
  ['company of heroes',[228200,4560]],
  ['mark of the ninja',[214560,860950]],
  ['assassins creed iii',[208480,911400]],
  ['crysis 2 maximum',[108800,99830]],
  ['crysis',[17300,1715130]],
  ['doom 3',[208200,9050]],
  ['postal',[232770,401680]],
  ['dark messiah of might magic',[2100,2130]],
  ['medal of honor',[47790,47830]],
  ['space hulk deathwing',[816090,298900]],
  ['final fantasy viii',[39150,1026680]],
  ['serious sam the first encounter',[41000,41050]],
  ['system shock 2 1999',[238210,336390]],
  ['dead rising',[427190,2527390]],
  ['evoland',[233470,1020470]],
  ['crysis 3',[2096610,1282690]],
  ['tom clancys splinter cell conviction',[33220,33229]],
  ['final fantasy vi',[1173820,382900]],
]);

export function distinctGameWorks(items) {
  const seen = new Set(), collisions = new Set();
  for (const item of items) {
    if (seen.has(item.work)) collisions.add(item.work);
    seen.add(item.work);
  }
  return items.map(item => {
    if (!item.work) return {...item,work:item.id};
    if (!collisions.has(item.work) || item.id !== 'steam:'+item.appid || item.work !== workKey(item.name)) return item;
    // Explicit source work identifiers (e.g. Wikidata P629) and non-colliding old keys stay intact.
    if (editions.get(item.work)?.includes(Number(item.appid))) return item;
    return {...item, work:item.id};
  });
}
