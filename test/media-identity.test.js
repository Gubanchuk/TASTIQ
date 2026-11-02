import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCatalog} from '../src/core/catalog.js';
import {title} from './fixture.js';
import {createConversationMediaIdentity} from '../src/server/conversation-media-identity.js';

const item=(id,name,extra={})=>({...title(id,name,'film',{}),...extra});
const catalog=makeCatalog({items:[
  item('d1','Dune',{year:1984,work:'dune-1984',aliases:['Дюна']}),
  item('d2','Dune',{year:2021,work:'dune-2021',aliases:['Дюна']}),
  item('p1','Paddington',{aliases:['Паддингтон']}),
  item('p2','Paddington 2',{aliases:['Паддингтон 2']}),
  item('in','Inception',{ru:'Начало'}),
  item('up','Up',{ru:'Вверх'}),
  item('a','Shared Name',{work:'different-a',popularity:1}),
  item('b','Shared Name',{work:'different-b',popularity:10}),
],idf:{},df:{},stats:{}},'film');
const identity=createConversationMediaIdentity(catalog);
const state=turns=>({domain:'film',turns:turns.map(([id,answer,superseded])=>({id,answer,superseded}))});
const fact=(sourceId,quote,titleId=null,extra={})=>({key:'history',text:'Paddington 2 просмотрен',sourceId,quote,titleId,stance:'history',scope:'history',feature:null,exposure:'finished',titleIntent:null,...extra});

test('media identity binds exact catalog aliases and longest title, without inferring taste or exposure',()=>{
  const found=identity.resolve(state([['turn-1','Посмотрел Паддингтон 2, понравился стиль']]));
  assert.deepEqual(found.knownTitles.map(x=>x.id),['p2']);
  assert.equal(found.knownTitles[0].domain,'film');
  assert.deepEqual(found.knownTitles[0].evidence.map(e=>[e.sourceId,e.quote]),[['turn-1','Паддингтон 2']]);
  assert.equal(found.knownTitles[0].exposure,undefined);
  assert.equal(found.knownTitles[0].liked,undefined);
  assert.equal(found.knownTitles[0].stance,undefined);
  assert.deepEqual(identity.resolveText('Paddington 3 посмотрел').matches,[],'an absent sequel cannot become its parent');
  assert.deepEqual(identity.resolveText('Смотрел Paddington: Another Adventure').matches,[],'an absent subtitled work cannot become its parent');
  assert.deepEqual(identity.resolveText('Смотрел Paddington Part Two').matches,[],'a spelled sequel cannot become its parent');
});
test('same-name remakes stay ambiguous unless the user gives an exact release year',()=>{
  const ambiguous=identity.resolveText('Смотрел Дюна','t');
  assert.deepEqual(ambiguous.matches,[]);
  assert.equal(ambiguous.ambiguous.length,1);
  assert.deepEqual(ambiguous.ambiguous[0].candidateWorkIds,['dune-1984','dune-2021']);
  assert.deepEqual(identity.resolveText('Смотрел Дюна (2021)','t').matches.map(x=>x.id),['d2']);
  assert.deepEqual(identity.resolveText('Shared Name','t').matches,[]);
});
test('generic words need a title cue and titles from another media domain are never indexed',()=>{
  assert.deepEqual(identity.resolveText('Начало должно быть бодрым, затем вверх по настроению').matches,[]);
  assert.deepEqual(identity.resolveText('Смотрел «Начало»').matches.map(x=>x.id),['in']);
  assert.deepEqual(identity.resolveText('Up посмотрел').matches.map(x=>x.id),['up']);
  const scoped=createConversationMediaIdentity(makeCatalog({items:[item('foreign','Foreign',{domain:'series'}),item('local','Local')],idf:{},df:{},stats:{}},'film'));
  assert.deepEqual(scoped.resolveText('Foreign и Local').matches.map(x=>x.id),['local']);
});
test('title facts bind only to their own active source and exact title quote',()=>{
  const s=state([['one','Paddington 2 только начал'],['two','Inception посмотрел'],['old','Paddington посмотрел',true]]);
  assert.match(identity.bindFacts(s,[fact('two','Inception посмотрел','p2')]).error,/источник|источнике|цитат/iu);
  assert.ok(identity.bindFacts(s,[fact('old','Paddington посмотрел','p1')]).error);
  assert.ok(identity.bindFacts(s,[fact('one','Paddington 2 просмотрел','p2')]).error);
  assert.ok(identity.bindFacts(s,[fact('two','посмотрел','in')]).error);
  assert.equal(identity.bindFacts(s,[fact('one','Paddington 2 только начал','p2',{exposure:'started'})]).facts[0].exposure,'started');
});
test('null title identity is repaired only when proposed title and quote share one supported work',()=>{
  const s=state([['one','Paddington 2 только начал; Inception посмотрел']]);
  const repaired=identity.bindFacts(s,[fact('one','Paddington 2 только начал')]);
  assert.equal(repaired.facts[0].titleId,'p2');
  const unknown=identity.bindFacts(s,[fact('one','Inception посмотрел',null,{text:'Незнакомый фильм просмотрен'})]);
  assert.equal(unknown.facts[0].titleId,null);
  assert.deepEqual(identity.resolve({...s,turns:s.turns.map(t=>({...t,superseded:true}))}).knownTitles,[]);
});
test('an ambiguous title cannot be assigned by model or repaired by same-name popularity',()=>{
  const s=state([['one','Shared Name посмотрел']]);
  assert.ok(identity.bindFacts(s,[fact('one','Shared Name посмотрел','b',{text:'Shared Name просмотрен'})]).error);
  assert.equal(identity.bindFacts(s,[fact('one','Shared Name посмотрел',null,{text:'Shared Name просмотрен'})]).facts[0].titleId,null);
});
test('absent compound sequels do not bind their short parent or source-trimmed title fact',()=>{
  const items=[item('tangled','Tangled',{year:2010}),item('frozen','Frozen',{year:2013})];
  const local=createConversationMediaIdentity(makeCatalog({items,idf:{},df:{},stats:{}},'film'));
  for(const [answer,id,name] of [['Смотрел Tangled Ever After','tangled','Tangled'],['Смотрел Frozen Fever','frozen','Frozen']]){
    const s=state([['one',answer]]);
    assert.deepEqual(local.resolve(s).knownTitles,[]);
    assert.ok(local.bindFacts(s,[fact('one',name,id,{text:`${name} просмотрен`})]).error,'short quote cannot erase the full source title');
  }
  assert.deepEqual(local.resolveText('Tangled понравился').matches.map(x=>x.id),['tangled']);
  assert.deepEqual(local.resolveText('Смотрел «Frozen», понравился').matches.map(x=>x.id),['frozen']);
  const mixed=state([['one','Tangled понравился; Смотрел Tangled Ever After']]);
  assert.ok(local.bindFacts(mixed,[fact('one','Смотрел Tangled','tangled',{text:'Tangled просмотрен'})]).error,'another parent mention cannot ground a truncated sequel quote');
  const full=createConversationMediaIdentity(makeCatalog({items:[...items,item('fever','Frozen Fever',{year:2015})],idf:{},df:{},stats:{}},'film'));
  assert.deepEqual(full.resolveText('Смотрел Frozen Fever').matches.map(x=>x.id),['fever'],'known longer name still wins');
});
test('unknown compound titles stay unresolved regardless of case, quotation or dash separator',()=>{
  const local=createConversationMediaIdentity(makeCatalog({items:[item('tangled','Tangled',{year:2010}),item('frozen','Frozen',{year:2013})],idf:{},df:{},stats:{}},'film'));
  for(const [answer,id,name] of [
    ['Смотрел frozen fever','frozen','frozen'],
    ['Смотрел tangled ever after','tangled','tangled'],
    ['Смотрел «frozen fever»','frozen','frozen'],
    ['Смотрел Tangled — Ever After','tangled','Tangled'],
  ]){
    const s=state([['one',answer]]);
    assert.deepEqual(local.resolve(s).knownTitles,[],answer);
    assert.ok(local.bindFacts(s,[fact('one',name,id,{text:`${name} просмотрен`})]).error,answer);
  }
});
test('complete aliases are case insensitive while ordinary clause boundaries remain valid',()=>{
  const items=[item('tangled','Tangled',{year:2010}),item('frozen','Frozen',{year:2013}),item('matrix','The Matrix',{aliases:['Матрица']})];
  const local=createConversationMediaIdentity(makeCatalog({items,idf:{},df:{},stats:{}},'film'));
  for(const answer of ['Tangled понравился','tangled ПОНРАВИЛСЯ','Tangled — понравился','Tangled только начал'])assert.deepEqual(local.resolveText(answer).matches.map(x=>x.id),['tangled'],answer);
  assert.deepEqual(local.resolveText('Frozen но добрее').matches.map(x=>x.id),['frozen']);
  assert.deepEqual(local.resolveText('Tangled и Матрица').matches.map(x=>x.id),['tangled','matrix']);
  for(const name of ['Frozen','frozen','FROZEN','fRoZeN','«Frozen»','«frozen (2013)»'])assert.deepEqual(local.resolveText(name).matches.map(x=>x.id),['frozen'],name);
  const full=createConversationMediaIdentity(makeCatalog({items:[...items,item('fever','Frozen Fever',{year:2015})],idf:{},df:{},stats:{}},'film'));
  for(const answer of ['Смотрел frozen fever','Смотрел «frozen fever»','Смотрел Frozen Fever (2015)'])assert.deepEqual(full.resolveText(answer).matches.map(x=>x.id),['fever'],answer);
  for(const answer of ['Смотрел «Frozen Fever»','Смотрел “Frozen Fever”','Смотрел "Frozen Fever"','Смотрел «Frozen но добрее»','Смотрел «Frozen и Матрица»','Смотрел «Frozen (2013) Fever»'])assert.deepEqual(local.resolveText(answer).matches,[],answer);
});
test('ordinary viewing time clauses preserve an exact title without accepting unknown compound continuations',()=>{
  const local=createConversationMediaIdentity(makeCatalog({items:[item('frozen','Frozen',{year:2013}),item('tangled','Tangled',{year:2010})],idf:{},df:{},stats:{}},'film'));
  for(const answer of ['Смотрел Frozen вчера','Хочу пересмотреть Frozen сегодня','Смотрел Disney Frozen вчера',
    'Смотрел Frozen недавно','Смотрел Frozen давно','Смотрел Frozen на выходных','Смотрел Frozen в детстве'])assert.deepEqual(local.resolveText(answer).matches.map(x=>x.id),['frozen'],answer);
  for(const answer of ['Смотрел frozen fever','Смотрел tangled ever after','Смотрел «frozen fever»','Смотрел Tangled — Ever After'])assert.deepEqual(local.resolveText(answer).matches,[],answer);
  for(const answer of ['Смотрел Frozen вчера Fever','Смотрел Frozen на выходных Ever After'])assert.deepEqual(local.resolveText(answer).matches,[],answer);
});
