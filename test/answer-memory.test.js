import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce } from '../src/core/dialogue.js';
import { fixtureCatalog } from './fixture.js';
import { describePerson } from '../src/ai/prompt.js';
import { hasAnswerContent } from '../src/server/public/shared/answer-memory.js';
const catalogs={game:fixtureCatalog()};

test('a saved text-only like survives a new dialogue and reaches the picker unchanged',()=>{
 const source={reaction:'like',reasons:[],issues:[],text:'история нравится, только когда влияю на отношения'};
 assert.equal(hasAnswerContent(source),true);
 assert.equal(hasAnswerContent({...source,text:'   '}),false);
 const state={...initialState(),domain:'game',step:'anchors'};
 const next=reduce(state,{type:'react',marks:[{id:'1',reaction:'like'},{id:'4',reaction:'unknown'}],known:{'1':source}},catalogs);
 assert.equal(next.answers['1'].text,source.text);
 assert.match(describePerson(next,catalogs.game),/только когда влияю на отношения/);
 assert.deepEqual(source.reasons,[]);
});
test('saved negative words survive, but do not follow a changed reaction',()=>{
 const state={...initialState(),domain:'game',step:'anchors'};
 const known={'1':{reaction:'dislike',issues:[],text:'слишком долго ждал развития истории'}};
 const next=reduce(state,{type:'react',marks:[{id:'1',reaction:'dislike'}],known},catalogs);
 assert.equal(next.answers['1'].text,known['1'].text);
 const changed=reduce(state,{type:'react',marks:[{id:'1',reaction:'love'}],known},catalogs);
 assert.equal(changed.answers['1'].text,undefined);
});
