import {resultArtworkHtml} from './card-artwork.js';
import {cleanExampleDraft,exampleChoices,exampleKey,exampleLimit,exampleVotes} from './example-choices.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const draftKey='__ratedExamples';
const labels={liked:'Понравилось',disliked:'Не зашло'};
const thumb='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v10M3 10h4l5-7c2 0 3 1.4 2.5 3.3L13.6 10H20a1.7 1.7 0 0 1 1.6 2.2l-2.1 6.4A2 2 0 0 1 17.6 20H3z"/></svg>';
function read(client){
  const draft=client.draft(draftKey);
  return {...draft,ratedExamples:draft.ratedExamples??cleanExampleDraft(client.state.ratedExamples)};
}
export const currentExampleVotes=client=>exampleVotes(read(client).ratedExamples);

export function rememberExampleVotes(client,library,history,domain,votes){
  if(client.draft('__rememberExamples').text==='off')return;
  const already=client.draft('__rememberedExamples').selected;
  const stored=[],known=history.all(),rows=read(client).ratedExamples;
  for(const vote of votes){
    const key=JSON.stringify([exampleKey(vote),vote.rating]);
    if(already.includes(key)){stored.push(key);continue;}
    const card=rows.find(row=>exampleKey(row)===exampleKey(vote));
    const item=library.rememberRating({...card,...vote},vote.rating,domain);
    if(!item)continue;
    const prior=known.find(row=>row.id===item.id);
    if(!prior||prior.exposure==='unplayed')history.remember(item,{exposure:domain==='game'?'played':'seen'});
    stored.push(key);
  }
  client.saveDraft('__rememberedExamples',{selected:stored});
  client.saveDraft('__exampleMemoryNotice',{text:votes.length&&(!library.persistent||!history.persistent)?'Браузер не сохранил оценки для следующих подборов.':''});
}

export function mountRatedExamples(root,{client,screen,library,history,fetch,domain}){
  const options=screen.ratedExamples??{};
  const choices=exampleChoices(options,library,history,domain);
  const draft=read(client),rows=draft.ratedExamples;
  const depth=client.state.depth??'standard';
  const open=draft.text.startsWith(depth+':')?draft.text===depth+':open':depth==='deep'||rows.some(r=>r.rating);
  root.innerHTML=`<details class="game-examples" ${open?'open':''}>
    <summary><span class="example-closed-title">Уточнить на примерах</span><span class="example-open-title">${domain==='game'?'Во что из этого ты играл?':'Что из этого ты смотрел?'}</span><small data-count></small></summary>
    <div class="example-body">
    <p class="game-help">Отметь, что понравилось и что не зашло. Можно пропустить.</p>
    <div class="example-grid"></div><div data-example-reason></div>
    <div class="example-tools"><details class="example-search"><summary><svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>Добавить своё название</summary>
    <label>Название<input class="input" type="search" maxlength="160" autocomplete="off"></label>
    <div class="example-matches" aria-live="polite"></div></details>
    <label class="example-remember"><input type="checkbox" ${client.draft('__rememberExamples').text==='off'?'':'checked'}> Запомнить оценки для следующих подборов</label></div>
    <p class="example-status" role="status"></p></div></details>`;
  const panel=root.querySelector('.game-examples'),grid=root.querySelector('.example-grid'),reason=root.querySelector('[data-example-reason]');
  const search=root.querySelector('.example-search'),input=search.querySelector('input'),matches=search.querySelector('.example-matches');
  const status=root.querySelector('[role=status]');
  root.querySelector('.example-remember input').addEventListener('change',event=>{
    client.saveDraft('__rememberExamples',{text:event.target.checked?'on':'off'});
  });
  const findRow=key=>rows.find(row=>exampleKey(row)===key);
  const save=()=>client.saveDraft(draftKey,{text:depth+(panel.open?':open':':closed'),ratedExamples:rows});
  let cards=[],found=[],timer=null,ticket=0;
  function paint(){
    const merged=new Map(choices.map(card=>[exampleKey(card),card]));
    for(const row of rows)merged.set(exampleKey(row),{...merged.get(exampleKey(row)),...row});
    cards=[...merged.values()];
    root.querySelector('[data-count]').textContent=rows.some(r=>r.rating)?'Отмечено: '+rows.filter(r=>r.rating).length:'';
    grid.innerHTML=cards.map((card,i)=>{
      const key=exampleKey(card),title=esc(card.title);
      return `<article class="example-card" aria-label="${title}" data-rated="${findRow(key)?.rating??''}">${resultArtworkHtml(card,{domain,title:card.title})}
        <div class="example-caption"><strong>${title}</strong>${card.libraryRating?`<small>В библиотеке · ${labels[card.libraryRating]}</small>`:card.year?`<small>${esc(card.year)}</small>`:''}</div>
        <div class="example-votes" role="group" aria-label="Твоё впечатление от ${title}">${Object.entries(labels).map(([vote,label])=>
          `<button type="button" data-vote="${vote}" data-index="${i}" title="${label}" aria-pressed="${findRow(key)?.rating===vote}" aria-label="${label} · ${title}">${thumb}<span>${vote==='liked'?'Нравится':'Не зашло'}</span></button>`).join('')}</div>
        ${card.added&&!choices.some(c=>exampleKey(c)===key)?`<button type="button" class="example-remove" data-remove="${i}" aria-label="Убрать пример ${title}">Убрать</button>`:''}</article>`;
    }).join('');
    const target=rows.find(r=>r.rating&&r.reason)||rows.find(r=>r.rating&&!options.mentioned?.some(m=>m.id===r.id&&m.explained));
    reason.replaceChildren();
    if(target){
      reason.innerHTML=`<label class="example-why">${target.rating==='liked'?'Что из «'+esc(target.title)+'» хочется снова?':'Чего из «'+esc(target.title)+'» хочется избежать?'} <small>По желанию</small>
        <textarea class="input" rows="2" maxlength="300" placeholder="Своими словами"></textarea></label>`;
      const field=reason.querySelector('textarea');
      field.value=target.reason;
      field.addEventListener('input',()=>{target.reason=field.value;save();});
    }
  }
  function addRow(card){
    if(rows.length>=exampleLimit){
      status.textContent='Можно добавить до восьми примеров. Сними одну отметку или убери добавленное название.';
      return null;
    }
    const row={id:card.id??null,title:card.title,poster:card.poster,image:card.image,rating:null,reason:'',added:card.added===true};
    rows.push(row);return row;
  }
  grid.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(client.busy||!button)return;
    status.textContent='';
    const card=cards[Number(button.dataset.index??button.dataset.remove)],key=exampleKey(card);
    const vote=button.dataset.vote;
    let row=findRow(key);
    if(vote){
      row??=addRow(card);if(!row)return;
      row.rating=row.rating===vote?null:vote;row.reason='';
    }
    if(!vote||!row.rating&&!row.added)rows.splice(rows.indexOf(row),1);
    save();paint();
    const at=cards.findIndex(c=>exampleKey(c)===key);
    (grid.querySelector(`[data-index="${at}"][data-vote="${vote}"]`)??search.querySelector('summary')).focus({preventScroll:true});
  });
  panel.addEventListener('toggle',()=>{if(root.isConnected&&!client.busy)save();});
  function showMatches(query,items,message=''){
    found=items.map(item=>({id:item.id,title:item.ru||item.name,poster:item.poster,image:item.image,year:item.year}));
    if(query&&!found.some(r=>r.title.toLowerCase()===query.toLowerCase()))found.push({id:null,title:query});
    matches.innerHTML=(message?`<span>${esc(message)}</span>`:'')+found.map((row,i)=>
      `<button type="button" data-match="${i}">${row.id?'':'Добавить «'}${esc(row.title)}${row.id?(row.year?' · '+esc(row.year):''):'»'}</button>`).join('');
  }
  input.addEventListener('input',()=>{
    const query=input.value.trim(),version=++ticket;clearTimeout(timer);
    found=[];matches.replaceChildren();
    if(!query)return;
    if(query.length<2){showMatches(query,[]);return;}
    matches.textContent='Ищу в каталоге…';
    timer=setTimeout(async()=>{
      try{
        const response=await fetch('/api/search?domain='+domain+'&q='+encodeURIComponent(query));
        if(!response.ok)throw Error();
        const items=await response.json();
        if(version===ticket&&root.isConnected)showMatches(query,items.slice(0,5));
      }catch{
        if(version===ticket&&root.isConnected)showMatches(query,[],'Поиск недоступен. Можно добавить название вручную.');
      }
    },220);
  });
  matches.addEventListener('click',event=>{
    const button=event.target.closest('[data-match]');if(!button||client.busy)return;
    const chosen=found[Number(button.dataset.match)],key=exampleKey(chosen);
    let card=cards.find(c=>exampleKey(c)===key||(!c.id||!chosen.id)&&c.title.toLowerCase()===chosen.title.toLowerCase());
    if(!card){card=addRow({...chosen,added:true});if(!card)return;}
    input.value='';matches.replaceChildren();search.open=false;status.textContent='';
    save();paint();
    grid.querySelector(`[data-index="${cards.findIndex(c=>exampleKey(c)===exampleKey(card))}"][data-vote="liked"]`)?.focus();
  });
  paint();
}
