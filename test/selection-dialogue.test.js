import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerConversation, applyConversationProposal, conversationScreen, newConversation, normalizeConversation } from '../src/core/conversation.js';
import { answerMediaConversation, applyMediaConversationProposal, mediaConversationScreen, newMediaConversation, normalizeMediaConversation } from '../src/core/media-conversation.js';
import { aiConversation } from '../src/ai/conversation.js';
import { aiMediaConversation } from '../src/ai/media-conversation.js';
import { createConversationService } from '../src/server/conversation-service.js';
import { createMediaConversationService } from '../src/server/media-conversation-service.js';
import { completeInterview } from '../src/core/selection-dialogue.js';
import { screenFixture } from './fixture.js';

const controls = ['unknown', 'indifferent', 'none'];
const question = id => ({id,title:`Что важнее на этом шаге ${id}?`,why:'Ответ повлияет на поиск.',options:[],multiple:true,controls});
const context = {company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
const depthDecision = (state,reason,gapKey=null) => ({version:1,reason,gapKey,
  sourceIds:[state.turns[0].id],selectionImpact:gapKey?'Уточним, искать ли короткие истории или разветвлённый сюжет.':null,
  branches:gapKey?['Короткие истории: самостоятельные эпизоды.','Разветвлённый сюжет: последовательное развитие.']:[],remainingGap:null});

function harness(domain) {
  const game=domain==='game',catalog=screenFixture(domain);
  const reduce=game?answerConversation:answerMediaConversation;
  const apply=game?applyConversationProposal:applyMediaConversationProposal;
  const normalize=game?normalizeConversation:normalizeMediaConversation;
  const show=game?conversationScreen:mediaConversationScreen;
  const planner=game?aiConversation:aiMediaConversation;
  const reply=(state,text,extra={})=>reduce(state,{type:'answer',questionId:state.question.id,text,...extra});
  function ready(depth,text='Хочу спокойную историю') {
    const fresh=game?newConversation({id:'depth-game',depth}):newMediaConversation({id:`depth-${domain}`,domain,depth});
    let state=reply(fresh,text);
    if(game) {
      state=reply(state,'',{selected:['windows']});
      state=reply(state,'',{selected:['solo']});
    }
    return state;
  }
  const proposal=(state,reason,next=null,extra={})=>({summary:'Спокойная история.',facts:[],uncertainties:[],action:next?'question':'review',question:next,sessionTime:null,
    ...(game?{}:{context}),decision:depthDecision(state,reason,next?.id),...extra});
  function resolve(state,prop) {
    const output=apply(state,prop,catalog.dict);
    assert.equal(output.error,undefined);
    return output.state;
  }
  return {catalog,reduce,apply,normalize,show,planner,reply,ready,proposal,resolve};
}

for(const domain of ['game','film','series','cartoon']) {
  const {catalog,reduce,apply,normalize,show,planner,reply,ready,proposal,resolve}=harness(domain);
  test(`${domain}: a short specific request can finish early, while a valid refinement distinguishes the two modes`, async()=>{
    for(const depth of ['standard','deep']) {
      const state=ready(depth);
      assert.equal(state.depth,depth);
      assert.equal(resolve(state,proposal(state,'sufficient')).phase,'review');
      const prop=proposal(state,'refinement',question('story_shape'));
      const output=resolve(state,prop);
      assert.equal(output.phase,depth==='deep'?'talk':'review');
      assert.equal(resolve(state,proposal(state,'ambiguity',question('story_shape'))).phase,'talk');

      let request;
      const received=await planner(catalog,state,{api:async body=>{request=body;return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(prop)}]}]};}});
      assert.equal(received.error,undefined);
      assert.equal(JSON.parse(request.input).depth,depth);
      assert.ok(request.text.format.schema.required.includes('decision'));
      assert.match(request.instructions,depth==='deep'?/Depth deep/i:/Depth standard/i);
    }
  });

  test(`${domain}: offered questions survive replacement and Back, and a seventh useful question is optional`,()=>{
    let state=ready('deep');
    for(let number=1;number<=7;number++) {
      state=resolve(state,proposal(state,'ambiguity',question(`topic_${number}`)));
      assert.equal(Boolean(show(state).checkpoint),number===7);
      if(number===7)break;
      state=reply(state,`Мой ответ ${number}`);
    }
    const seventh=normalize(JSON.parse(JSON.stringify(state)));
    assert.equal(show(seventh).checkpoint.reason,'questions');
    assert.equal(show(seventh).checkpoint.offered,7);
    assert.equal(reduce(seventh,{type:'review'}).phase,'review');
    const replied=reply(seventh,'Можно обсуждать дальше');
    assert.equal(replied.needsPlan,true);
    const back=reduce(replied,{type:'back'});
    assert.equal(show(back).checkpoint.offered,7);
    const changed=reduce(back,{type:'another_question',questionId:back.question.id});
    assert.equal(show(changed).checkpoint.offered,8);
  });

  test(`${domain}: unsupported snapshot fails atomically, and repeated or invalid decisions retain accepted evidence`,()=>{
    let state=ready('deep');
    state=resolve(state,proposal(state,'ambiguity',question('story_shape')));
    state=reply(state,'',{kind:'indifferent'});
    state=resolve(state,proposal(state,'ambiguity',question('length')));
    state=reply(state,'',{kind:'unknown'});
    const next=resolve(state,proposal(state,'ambiguity',question('pace')));
    assert.equal(show(next).checkpoint.reason,'neutral');
    const fact={key:'wish',text:'Спокойная история',stance:'want',scope:'today',sourceId:state.turns[0].id,quote:state.turns[0].answer,feature:null,exposure:null,
      ...(domain==='game'?{gameId:null}:{titleId:null,titleIntent:null})};
    const repeat=proposal(state,'ambiguity',question('different_id'),{facts:[fact],decision:depthDecision(state,'ambiguity','story_shape')});
    const accepted=resolve(state,repeat);
    assert.equal(accepted.phase,'review');
    assert.equal(accepted.facts[0].key,'wish');
    const invalidSource={...repeat,decision:{...repeat.decision,gapKey:'different_id',sourceIds:['absent']}};
    assert.equal(resolve(state,invalidSource).facts[0].key,'wish');
    const rejected=apply(state,{...invalidSource,facts:[{...fact,quote:'Не говорил'}]},catalog.dict);
    assert.ok(rejected.error);
    assert.deepEqual(rejected.state,state);
  });

  test(`${domain}: switching depth is free, preserves the unanswered question and rejects an already completed interview`,()=>{
    const state=ready('standard');
    const before=resolve(state,proposal(state,'ambiguity',question('story_shape')));
    const next=reduce(before,{type:'setDepth',depth:'deep'});
    assert.equal(next.revision,before.revision+1);
    assert.equal(next.depth,'deep');
    assert.deepEqual(next.turns,before.turns);
    assert.deepEqual(next.question,before.question);
    assert.throws(()=>reduce({...next,interviewComplete:true},{type:'setDepth',depth:'standard'}),/новый подбор/i);
    const restarted=reduce(next,{type:'restart',depth:'standard'});
    assert.equal(restarted.depth,'standard');
    assert.equal(restarted.turns.length,0);
  });

  test(`${domain}: depth changes do not call the planner; an explicit deep continuation plans once on existing evidence`,async()=>{
    let calls=0;
    const plan=async(_catalog,state)=>{
      calls++;
      assert.equal(state.depth,'deep');
      return {proposal:proposal(state,'refinement',question('story_shape'))};
    };
    const settings={catalogs:{[domain]:catalog},plan};
    const service=domain==='game'?createConversationService(settings):createMediaConversationService({...settings,domain});
    const request=body=>service({...body,...(domain==='game'?{}:{domain})},{uid:'depth-qa'});
    const readyState=ready('standard');
    const review=resolve(readyState,proposal(readyState,'sufficient'));
    const switched=await request({state:review,action:{type:'setDepth',depth:'deep'}});
    assert.equal(calls,0);
    assert.equal(switched.state.phase,'review');
    const body={state:switched.state,action:{type:'continue'}};
    const [first,second]=await Promise.all([request(body),request(body)]);
    assert.equal(calls,1);
    assert.deepEqual(first,second);
    assert.equal(first.screen.question.id,'story_shape');
    assert.deepEqual(first.state.turns.map(turn=>turn.answer),review.turns.map(turn=>turn.answer));
  });

  test(`${domain}: long interviews reserve two correction turns and keep original answers`,()=>{
    let state=ready('deep');
    while(state.turns.length<22) {
      const topic=`next_${state.turns.length}`;
      state=resolve(state,proposal(state,'ambiguity',question(topic)));
      state=reply(state,`Ответ на ${topic}.`);
    }
    state=resolve(state,proposal(state,'ambiguity',question('over_capacity')));
    assert.equal(state.phase,'review');
    assert.equal(show(state).canContinue,false);
    assert.match(state.uncertainties[0],/Разговор получился длинным/);
    const original=state.turns.map(turn=>turn.answer);
    for(const text of ['Поправка про настроение','Поправка про тему'])state=reduce(state,{type:'correct',text});
    assert.equal(state.turns.length,24);
    assert.deepEqual(state.turns.slice(0,22).map(turn=>turn.answer),original);
    const {interview}=completeInterview(state);
    assert.equal(interview.answered,interview.offered);
    assert.throws(()=>reduce(state,{type:'correct',text:'Третий ответ'}),/длинным/i);
  });
}
