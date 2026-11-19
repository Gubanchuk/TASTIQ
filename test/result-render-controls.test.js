import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {isLibrarySaved} from '../src/server/public/shared/library-store.js';
import {mediaLibraryDomain} from '../src/server/public/shared/anime-pilot.js';

const source=await readFile(new URL('../src/server/public/pick/app.js',import.meta.url),'utf8');
const from=source.indexOf('function resultLink(')>=0?source.indexOf('function resultLink('):source.indexOf('function conversationProposal(');
const renderer=source.slice(from,source.indexOf('function resultBody('));
function render(card,items=[]){
 const context={URL,isLibrarySaved,mediaLibraryDomain,library:{items},state:{domain:card.domain},esc:s=>String(s??'').replaceAll('"','&quot;'),poster:()=>'<span class="poster"></span>',pickMeta:()=>'',icon:()=>'',feasibilityHint:()=>'',eveningHtml:()=>'',feedback:{get:()=>null},activeEveningId:null,detail:()=>'',seenButton:()=>'<button data-act="seen">Уже смотрел</button>',nameOf:p=>p.name,linkLabel:()=> 'Открыть фильм'};
 vm.createContext(context);
 vm.runInContext(renderer+'\nthis.output=conversationProposal('+JSON.stringify(card)+');',context);return context.output;
}
test('a restored result distinguishes an old bookmark from an explicitly removed one',()=>{
 const card={id:'tt1',domain:'film',name:'История'};
 const old={id:'tt1',domain:'film',lane:'want',status:'liked'};
 assert.match(render(card,[old]),/data-act="take"[^>]+aria-pressed="true"/);
 assert.match(render(card,[{...old,saved:false}]),/data-act="take"[^>]+aria-pressed="false"/);
});
test('every screen-media proposal retains not-now and its real external destination',()=>{
 for(const domain of ['film','series','cartoon']){
  const html=render({id:'tt1',domain,name:'История',link:'https://www.imdb.com/title/tt1/',explanation:{reasons:[],risks:[]}});
  assert.match(html,/data-act="not-now"[^>]*data-id="tt1"/);
  assert.match(html,/href="https:\/\/www\.imdb\.com\/title\/tt1\/"[^>]*target="_blank"/);
  assert.ok(html.includes('Не сейчас'));
 }
});
test('an absent or unsafe external destination never becomes a clickable outgoing link',()=>{
 for(const link of [null,'javascript:alert(1)','data:text/html,wrong'])assert.ok(!render({id:'tt2',name:'Без ссылки',link,explanation:{reasons:[],risks:[]}}).includes('target="_blank"'));
});
