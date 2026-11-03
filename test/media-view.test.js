import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaCardHtml,saveMediaToLibrary,mediaLibraryState} from '../src/server/public/pick/watch/card-view.js';
import {mediaConfig,mediaJourneyStage,mediaLoadingPresentation,mediaContextDraftText,mediaContextEditorValues,mediaTimeBudgetHtml} from '../src/server/public/pick/watch/view-state.js';

test('media cards retain honest reasons, unknowns and viewed replacement without game terminology or unsafe links',()=>{
 const html=mediaCardHtml({id:'tt1',ru:'<script>x</script>',runtime:42,kind:'series',ai:{reason:'Причина',caveat:'Не проверено'},link:'javascript:bad()'},{domain:'series'});
 for(const value of ['Причина','Не проверено','Знакомо — заменить','42 мин'])assert.ok(html.includes(value),value);
 for(const value of ['<script>','javascript:','Уже играл','Открыть игру'])assert.ok(!html.includes(value),value);
 const marked=mediaCardHtml({id:'tt1',name:'Сериал'},{domain:'series',marked:true});
 for(const action of ['familiar-unmark','familiar-keep','data-history-block'])assert.ok(marked.includes(action));
});
test('saving and known labels use the requested media domain and leave opposite same-ID records separate',()=>{
 let call;saveMediaToLibrary({save:(card,options)=>{call={card,options};return card;}},{id:'tt1',name:'Название'},{domain:'cartoon',lane:'tonight'});
 assert.deepEqual(call.options,{domain:'cartoon',lane:'tonight'});
 assert.equal(mediaLibraryState({id:'tt1'},[{id:'tt1',domain:'film',lane:'known'}],'cartoon').known,false);
 assert.equal(mediaLibraryState({id:'tt1'},[{id:'tt1',domain:'cartoon',lane:'known'}],'cartoon').known,true);
});
test('each section names its own picker and pending state is truthful for media answer/pick/replace',()=>{
 for(const domain of ['film','series','cartoon']){assert.ok(mediaConfig(domain).label);assert.equal(mediaJourneyStage({}, {type:'question',question:{id:'direction'}}),0);assert.equal(mediaJourneyStage({}, {type:'result'}),3);}
 assert.equal(mediaLoadingPresentation({type:'answer'}).prominent,true);
 assert.ok(!mediaLoadingPresentation({type:'confirm'}).title.includes('игр'));
 assert.equal(mediaLoadingPresentation({type:'familiar_mark'}).prominent,false);
});
test('context drafts restore only to the same conversation and accepted context',()=>{
 const context={company:'solo',minutes:90},draft=mediaContextDraftText(context,{company:'adults',minutes:60},'one');
 assert.equal(mediaContextEditorValues(context,draft,'one').minutes,60);
 assert.deepEqual(mediaContextEditorValues(context,draft,'other'),context);
 assert.deepEqual(mediaContextEditorValues({...context,minutes:30},draft,'one'),{...context,minutes:30});
});
test('visible time distinguishes a whole film, an episode and todays viewing session',()=>{
 const time={minutes:45,sourceId:'one',quote:'Есть 45 минут'};
 assert.match(mediaTimeBudgetHtml(time,{timeMode:'episode'}),/На эпизод: 45 мин/);
 assert.match(mediaTimeBudgetHtml(time,{timeMode:'runtime'}),/На фильм: 45 мин/);
 assert.match(mediaTimeBudgetHtml(time,{timeMode:'session'}),/На сегодня: 45 мин/);
 assert.equal(mediaTimeBudgetHtml(null), '');
});
test('a scalar ended-status clarification saves locally while an own-word clarification still plans',()=>{
 const state={question:{id:'only_ended'}};
 assert.equal(mediaLoadingPresentation({type:'answer',selected:['yes'],text:'',kind:'answer'},state).prominent,false);
 assert.equal(mediaLoadingPresentation({type:'answer',selected:[],text:'',kind:'unknown'},state).prominent,false);
 assert.equal(mediaLoadingPresentation({type:'answer',selected:[],text:'Мне важен финал арки'},state).prominent,true);
});
