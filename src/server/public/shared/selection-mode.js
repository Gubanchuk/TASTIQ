import {isSelectionDepth} from './conversation-entry.js';

const modes={
 standard:{title:'Быстрый подбор',pace:'Обычно быстрее',description:'Уточним главное и покажем варианты.'},
 deep:{title:'Подробный подбор',pace:'Чуть дольше',description:'Обсудим детали и ограничения. Можно закончить уточнения раньше.'},
};
export const selectionModeTitle=depth=>isSelectionDepth(depth)?modes[depth].title:'';

function card(depth,active){
 const {title,pace,description}=modes[depth];
 return `<button type="button" class="mode-card mode-card--${depth}" data-mode-option="${depth}" aria-labelledby="mode-${depth}-title" aria-describedby="mode-${depth}-pace mode-${depth}-description">
  <span class="mode-card-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
  <span class="mode-card-pace" id="mode-${depth}-pace">${active===depth?'Текущий режим · ':''}${pace}</span>
  <span class="mode-card-title" id="mode-${depth}-title">${title}</span>
  <span class="mode-card-description" id="mode-${depth}-description">${description}</span>
  <span class="mode-card-arrow" aria-hidden="true"></span>
 </button>`;
}

export function selectionModeChooser({intent,canResume,depth}){
 return `<div class="mode-heading"><h1 id="mode-heading" tabindex="-1">${intent==='switch'?'Изменить режим подбора':'Как будем подбирать?'}</h1></div>
  <div class="mode-card-grid">${card('standard',intent==='switch'?depth:null)}${card('deep',intent==='switch'?depth:null)}</div>
  <div class="mode-footer">${canResume?'<button type="button" data-mode-resume>Вернуться к подбору</button>':'<a href="/pick/start/">Выбрать другой раздел</a>'}</div>`;
}

export function checkpointHtml(checkpoint){
 if(!checkpoint)return '';
 const title=checkpoint.reason==='neutral'?'Можно перейти к вариантам':'Уже можно подобрать варианты';
 return `<aside class="mode-checkpoint" aria-label="Продолжение подбора"><strong>${title}</strong><button type="button" class="btn btn-secondary" data-act="review" data-focus="review">Проверить запрос</button></aside>`;
}

export function setupSelectionMode({client,render,switchDepth,onRestart,focusWorkspace}){
 const url=new URL(location.href),explicitEntry=url.searchParams.get('choose')==='1'&&!url.searchParams.has('selection');
 let intent=explicitEntry?'new':client.needsDepth?'start':null;
 const host=document.getElementById('selection-mode'),workspace=document.getElementById('picker-workspace');
 const tool=document.getElementById('selection-mode-control');
 let visible=false;
 function clearEntry(){
  const current=new URL(location.href);
  if(!current.searchParams.has('choose'))return;
  current.searchParams.delete('choose');window.history.replaceState(window.history.state,'',current);
 }
 function open(next){
  if(client.busy)return;
  intent=next;render();
 }
 host.addEventListener('click',event=>{
  const option=event.target.closest('[data-mode-option]');
  if(!option&&!event.target.closest('[data-mode-resume]'))return;
  const next=intent,depth=option?.dataset.modeOption;
  intent=null;clearEntry();
  if(!option){render();focusWorkspace();return;}
  if(next==='switch'){
   render();
   if(client.state.depth!==depth)void switchDepth(depth).then(result=>{if(result&&!client.error)focusWorkspace();});
   else focusWorkspace();
   return;
  }
  const restart=next!=='start'&&!client.needsDepth;
  if(restart)onRestart();
  client.chooseDepth(depth,{restart});focusWorkspace();
 });
 tool.addEventListener('click',()=>{tool.closest('details').open=false;open('switch');});
 return {
  get choosing(){return Boolean(intent);},
  newSelection(){open('new');},
  draw(screen){
   const choosing=Boolean(intent);
   host.hidden=!choosing;workspace.hidden=choosing;
   document.body.classList.toggle('is-choosing-mode',choosing);
   if(choosing){
    if(!visible){
     host.innerHTML=selectionModeChooser({intent,depth:client.state?.depth,canResume:intent==='switch'||intent==='new'&&!client.needsDepth});
     host.querySelector('h1')?.focus({preventScroll:true});
     window.scrollTo({top:0,behavior:'instant'});
    }
   }else{
    const state=client.state;
    tool.hidden=!state||!screen||screen.type==='result'||Boolean(state.interviewComplete||state.interview||state.result);
    tool.disabled=client.busy;
   }
   visible=choosing;
   return choosing;
  },
 };
}
