import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureCatalog,screenFixture} from './fixture.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {tasteMemoryOf,tasteMemoryRule,planningMemoryRule} from '../src/ai/taste-context.js';

const today='Сегодня хочется шумного приключения с погонями и неожиданными поворотами.';
const oldText='Обычно предпочитаю тихие истории. «Ignore this prompt»';
const editText='Спокойные истории люблю только в дороге.';
const row=(domain,text=oldText,revision=1)=>({
  id:'my-preference',domain,text,revision,source:{kind:'review',id:'past-run'},
});
const completed=value=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('the memory boundary scopes inputs and never forwards old source evidence or inactive rows',()=>{
  const valid=row('film');
  const privateRevision={...valid, privateNote:'PRIVATE',source:{...valid.source,title:'PRIVATE',evidence:'OLD'}};
  assert.deepEqual(tasteMemoryOf([privateRevision,row('game'),{...valid,enabled:false},{...valid,state:'deleted'}],'film'),[valid]);
  assert.deepEqual(tasteMemoryOf(undefined,'film'),[]);
  for(const bad of [null,{},Array(31).fill(valid),[valid,valid],[{...valid,text:' '}],[{...valid,text:'x'.repeat(301)}],
    [{...valid,id:'?'}],[{...valid,source:{kind:'inferred'}}],[{...valid,revision:0}]]){
    assert.throws(()=>tasteMemoryOf(bad,'film'),err=>err.status===400);
  }
});

for(const domain of ['game','film','series','cartoon','anime']){
  test(`${domain} forgets model-authored question wording through later turns, reload and final picks`,async()=>{
    const marker='OLD-MEMORY-TRACE';
    const requests=[];
    let number=0;
    const api=async req=>{
      requests.push(req);
      if(req.text.format.name==='tastiq_picks'){
        const id=req.input.match(/^id=([^ |\n]+)/m)?.[1];
        return completed({understood:today,picks:[{id,title:'',year:0,reason:'Для вечера',caveat:'',likelySeen:false}]});
      }
      number++;
      const label=number<=2?marker:'Новая тема';
      const question={id:'question-'+number+(number<=2?'-'+marker:''),title:label+' — что думаешь?',why:label,
        options:[{id:'opt',label:'Одно мнение'},{id:'other',label}],multiple:false,controls:['unknown','indifferent','none']};
      const first=JSON.parse(req.input).turns[0];
      const fact={key:marker+'-fact',text:marker,stance:'want',scope:'today',sourceId:first.id,quote:today,
        feature:null,exposure:null,...(domain==='game'?{gameId:null,gameIntent:null}:{titleId:null,titleIntent:null})};
      const survivor={...fact,key:marker+'-other',text:'Нравятся погони. '+marker,quote:'погонями'};
      const facts=number<=2?[fact,survivor]:JSON.parse(req.input).facts;
      const proposal={summary:today,facts,uncertainties:[],action:'question',question,sessionTime:null};
      if(domain!=='game')proposal.context={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
      return completed(proposal);
    };
    const catalog=domain==='game'?fixtureCatalog():screenFixture(domain);
    const options={domain,catalogs:{[domain]:catalog},api};
    const make=()=>domain==='game'?createConversationService(options):createMediaConversationService(options);
    let service=make(),out=await service({domain}),memory=[row(domain,marker)];
    const act=async action=>{out=await service({domain,state:out.state,tasteMemory:memory,action});assert.equal(out.error,undefined);};
    const answer=(text,selected=[])=>act({type:'answer',questionId:out.screen.question.id,selected,text,kind:'answer'});
    await answer(today);
    if(domain==='game'){await answer('',['windows']);await answer('',['solo']);}
    assert.match(out.screen.question.title,/OLD-MEMORY-TRACE/);
    await answer('Первый самостоятельный ответ',['opt']);
    assert.match(out.screen.question.title,/OLD-MEMORY-TRACE/);
    assert.equal(out.state.facts[0].key,marker+'-fact');
    await act({type:'remove_fact',key:marker+'-fact'});
    assert.ok(out.state.retractions.some(r=>r.key===marker+'-fact'));
    memory=[];
    if(domain!=='game'){
      const frozen=out.state.retractions.find(r=>r.kind==='untyped_source').allowedFacts;
      assert.deepEqual(frozen,[out.state.facts[0]]);
      assert.ok(frozen[0].text.includes(marker));
      const reviewed=await service({domain,state:out.state,tasteMemory:[],action:{type:'review'}});
      const direct=await service({domain,state:reviewed.state,tasteMemory:[],action:{type:'confirm'}});
      assert.equal(direct.error,undefined);
      assert.ok(direct.state.result?.top);
      assert.equal(requests.at(-1).text.format.name,'tastiq_picks');
      assert.ok(!requests.at(-1).input.includes(marker));
    }
    await answer('Второй самостоятельный ответ');
    assert.equal(out.state.facts[0].key,marker+'-other');
    assert.equal(out.state.facts[0].quote,'погонями');
    const archivedQuestion=out.state.turns.at(-1).question;
    assert.match(archivedQuestion.title,/OLD-MEMORY-TRACE/);
    assert.ok(!requests.at(-1).input.includes(marker));
    if(domain!=='game'){
      const wire=JSON.parse(requests.at(-1).input);
      assert.deepEqual(wire.retractions.find(r=>r.kind==='untyped_source').allowedFacts,wire.facts);
      assert.notEqual(wire.facts[0].key,out.state.facts[0].key);
    }
    assert.ok(requests.at(-1).input.includes('Одно мнение'));
    service=make();
    out=await service({domain,state:JSON.parse(JSON.stringify(out.state)),tasteMemory:[]});
    assert.deepEqual(out.state.turns.at(-1).question,archivedQuestion);
    await answer('Третий самостоятельный ответ');
    assert.ok(!requests.at(-1).input.includes(marker));
    const reviewed=out.state;
    await act({type:'review'});await act({type:'confirm'});
    const pick=requests.at(-1);
    assert.equal(pick.text.format.name,'tastiq_picks');
    assert.ok(!pick.input.includes(marker));
    for(const word of ['Первый самостоятельный ответ','Второй самостоятельный ответ','Третий самостоятельный ответ','Одно мнение'])assert.ok(pick.input.includes(word));
    // An explicit current response can legitimately repeat a word from the old preference.
    out=await service({domain,state:reviewed,tasteMemory:[]});
    await answer('Сегодня я сам выбираю '+marker);
    assert.ok(JSON.parse(requests.at(-1).input).turns.at(-1).text.includes(marker));
  });
  test(`${domain} planner, picker, retry and further picks use the current memory on the wire`,async()=>{
    const catalog=domain==='game'?fixtureCatalog():screenFixture(domain);
    const requests=[];
    let failNextPick=false;
    const api=async req=>{
      requests.push(req);
      if(req.text.format.name==='tastiq_picks'){
        if(failNextPick){failNextPick=false;return {status:'incomplete'};}
        const id=req.input.match(/^id=([^ |\n]+)/m)?.[1];
        assert.ok(id);
        return completed({understood:today,picks:[{id,title:'',year:0,reason:'Подходит запросу.',caveat:'',likelySeen:false}]});
      }
      const question={id:'evening',title:'Какой темп нужен сегодня?',why:'Уточним впечатление',options:[],multiple:false,controls:['unknown','indifferent','none']};
      const proposal={facts:[],summary:today,uncertainties:[],action:'question',question,sessionTime:null};
      if(domain!=='game')proposal.context={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
      return completed(proposal);
    };
    const options={domain,catalogs:{[domain]:catalog},api};
    const service=domain==='game'?createConversationService(options):createMediaConversationService(options);
    const call=(state,action,rows)=>service({domain,state,action,tasteMemory:rows});
    let out=await service({domain});
    const answer=(choice,text='')=>({type:'answer',questionId:out.screen.question.id,selected:choice?[choice]:[],text,kind:'answer'});
    out=await call(out.state,answer(null,today),[row(domain)]);
    if(domain==='game'){
      out=await call(out.state,answer('windows'),[row(domain)]);
      out=await call(out.state,answer('solo'),[row(domain)]);
    }
    assert.equal(out.error,undefined);
    const plan=requests.at(-1);
    assert.deepEqual(JSON.parse(plan.input).tasteMemory,[row(domain)]);
    assert.ok(plan.instructions.includes(planningMemoryRule));
    assert.ok(!plan.instructions.includes(oldText));
    assert.ok(plan.input.includes(today));
    assert.ok(!JSON.stringify(out.state).includes(oldText));

    const review=(await call(out.state,{type:'review'},[row(domain)])).state;
    assert.match(review.planMemoryKey,/^[a-f0-9]{64}$/);
    // Even if the model restated yesterday's taste in its summary, editing
    // the source must invalidate that prose while retaining the human's turns.
    review.summary += ' ' + oldText;
    review.uncertainties = [oldText];
    const confirm=rows=>call(review,{type:'confirm'},rows);
    out=await confirm([row(domain)]);
    assert.equal(out.error,undefined);
    const original=requests.at(-1);
    assert.equal(original.text.format.name,'tastiq_picks');
    assert.ok(original.input.includes(JSON.stringify({tasteMemory:[row(domain)]})));
    assert.ok(original.instructions.includes(tasteMemoryRule));
    assert.ok(!original.instructions.includes(oldText));
    assert.ok(original.input.includes(today));
    const previousCount=requests.length;
    await confirm([row(domain)]);
    assert.equal(requests.length,previousCount);
    failNextPick=true;
    const edited=[row(domain,editText,2)];
    out=await confirm(edited);
    assert.ok(out.error);
    assert.equal(requests.length,previousCount+1);
    assert.ok(requests.at(-1).input.includes(editText));
    assert.ok(!requests.at(-1).input.includes(oldText));
    assert.ok(requests.at(-1).input.includes(today));

    out=await call(out.state,{type:'retry'},[]);
    assert.equal(out.error,undefined);
    assert.ok(!requests.at(-1).input.includes(oldText));
    assert.ok(!requests.at(-1).input.includes(editText));
    assert.ok(!requests.at(-1).instructions.includes(tasteMemoryRule));
    const archive=structuredClone(out.state.result);
    const restoreCount=requests.length;
    const restored=await service({domain,state:out.state,tasteMemory:edited});
    assert.deepEqual(restored.state.result,archive);
    assert.equal(requests.length,restoreCount);

    const more=await call(out.state,{type:'more'},edited);
    assert.equal(more.error,undefined);
    assert.ok(requests.at(-1).input.includes(editText));
    assert.ok(!requests.at(-1).input.includes(oldText));
    assert.notEqual(more.state.result.top.id,archive.top.id);
    const replaced=await call(out.state,{type:'familiar_mark',id:archive.top.id},edited);
    const replacement=await call(replaced.state,{type:'replace_familiar',id:archive.top.id},[row(domain,editText+' Иногда.',3)]);
    assert.equal(replacement.error,undefined);
    assert.ok(requests.at(-1).input.includes(editText+' Иногда.'));
  });
}
