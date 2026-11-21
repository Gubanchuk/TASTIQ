import {mediaLibraryDomain} from '../shared/anime-pilot.js';
import {REVIEW_VERDICTS} from '../shared/selection-review.js';
import {hasAnswerContent} from '../shared/answer-memory.js';
import {pickerUrl} from '../shared/saved-source.js';

const reactions={like:'Понравилось',love:'Очень понравилось',dislike:'Не понравилось',tried:'Попробовал и бросил',not_mine:'Не моё',played:'Уже играл'};

function oldAnswerEvidence(answer,labels) {
  const label=id=>typeof id==='string'?(Object.hasOwn(labels,id)?labels[id]:id):'';
  const reasons=Array.isArray(answer.reasons)?answer.reasons.map(label).filter(Boolean):[];
  const issues=Array.isArray(answer.issues)?answer.issues.map(issue=>{const name=label(issue?.f);return name&&name+(issue.hard?' (никогда)':'');}).filter(Boolean):[];
  const reaction=Object.hasOwn(reactions,answer.reaction)?reactions[answer.reaction]:'';
  return [reaction,reasons.length?'Что понравилось — '+reasons.join(', '):'',issues.length?'Что помешало — '+issues.join(', '):'',
    answer.badQuality?'Такое люблю, но в этой работе плохо сделано':'',typeof answer.text==='string'?answer.text.trim():''].filter(Boolean).join('. ');
}

export function createMemoryView({memory, library, feedback, domains, escape, render, notice, fetchLabels}) {
  let draft=null, confirming=null, error='', openSources=false, saving=false;
  let labelsRequested=false, catalogLabels={};
  const esc=escape;
  const labels={manual:'Твоя запись',review:'Отзыв о подборе',answer:'Ответ о произведении'};
  const button=(text,action,attrs='')=>`<button type="button" class="library-button" data-act="memory-${action}" ${attrs}>${text}</button>`;
  const options=selected=>Object.entries(domains).map(([id,name])=>`<option value="${id}"${id===selected?' selected':''}>${name}</option>`).join('');
  const focusKey=(kind,id)=>`memory-${kind}:${id}`;
  function sources(domain) {
    const selected=Object.hasOwn(domains,domain)?[domain]:Object.keys(domains);
    const reviews=selected.flatMap(d=>feedback.learningEntries(d).map(entry=>{
      const c=entry.context;
      return {kind:'review',domain:d,id:entry.id,title:c.request||c.cards.map(r=>r.title).join(', ')||'Прошлый подбор',
        evidence:[REVIEW_VERDICTS[c.verdict],c.note].filter(Boolean).join(' · '),text:c.note||'',entry};
    }));
    const answers=library.all().filter(row=>selected.includes(mediaLibraryDomain(row.domain,row.id))&&hasAnswerContent(row.answer)).map(row=>{
      const text=typeof row.answer.text==='string'?row.answer.text.trim():'';
      const domain=mediaLibraryDomain(row.domain,row.id);
      if(!labelsRequested&&fetchLabels&&(row.answer.reasons?.length||row.answer.issues?.length)){
        labelsRequested=true;
        void fetchLabels().then(byDomain=>{catalogLabels=byDomain;render();}).catch(()=>{});
      }
      return {kind:'answer',domain,id:row.id,title:row.title||row.id,text,evidence:oldAnswerEvidence(row.answer,catalogLabels[domain]??{})};
    });
    return [...reviews,...answers];
  }
  function editor() {
    const d=draft,scoped=d.id||d.source.kind!=='manual';
    const section=scoped?`<p class="library-meta">${esc(domains[d.domain])} · ${labels[d.source.kind]}</p>`
      :`<label class="library-filter">Раздел<select name="domain" required data-focus="memory-editor-domain"><option value="">Выбери раздел</option>${options(d.domain)}</select></label>`;
    return `<form class="memory-editor" data-form="memory"><h3>${d.id?'Изменить предпочтение':'Новое предпочтение'}</h3>${section}
      <label class="library-filter">Что учитывать в следующих подборах<textarea name="text" id="memory-text" data-focus="memory-text" required maxlength="300" rows="3" placeholder="Например, люблю короткие детективы без жестоких сцен">${esc(d.text)}</textarea></label>
      <div class="memory-actions"><button type="submit" class="library-button primary">Сохранить</button>${button('Отмена','cancel')}</div></form>`;
  }
  function record(row) {
    const ref=`data-id="${esc(row.id)}" data-revision="${esc(row.revision)}"`;
    const evidence=row.source.title||row.source.evidence?`<details class="card-details"><summary>Источник записи</summary><p>${esc(row.source.title||'')}${row.source.title&&row.source.evidence?' · ':''}${esc(row.source.evidence||'')}</p></details>`:'';
    const deletion=confirming?.id===row.id;
    return `<li class="memory-record"><p class="library-meta">${esc(domains[row.domain])} · ${labels[row.source.kind]} · ${row.enabled?'Учитывается':'Отключено'}</p>
      <p class="memory-wording">${esc(row.text)}</p>${evidence}<div class="memory-actions">
      ${deletion?`<span>Удалить это предпочтение из памяти?</span>${button('Удалить из памяти','confirm-remove',ref+' data-focus="memory-confirm-remove"')}${button('Оставить','cancel-remove',ref)}`
        :button('Изменить','edit',`${ref} data-focus="${esc(focusKey('edit',row.id))}"`)+button(row.enabled?'Отключить':'Включить','toggle',`${ref} data-enabled="${!row.enabled}" data-focus="${esc(focusKey('toggle',row.id))}"`)+button('Удалить','remove',ref)}</div></li>`;
  }
  function sourceCard(source,state) {
    const {kind,domain,id}=source;
    const version=state?.revision??0;
    const attrs=`data-kind="${kind}" data-domain="${esc(domain)}" data-id="${esc(id)}" data-version="${version}"`;
    const suppressed=state&&state.state!=='released';
    const status=kind==='answer'?'Ответ из прежней библиотеки':suppressed?'Отзыв отключён'
      :memory.persistent?'Учитывается как отзыв о том вечере':'Ранее разрешённый отзыв';
    let controls=button('Добавить в предпочтения','from-source',attrs);
    if(kind==='review'&&(!suppressed||state.state==='suppressed')){
      const action=suppressed?'restore-review':'suppress-review';
      controls+=button(suppressed?'Снова учитывать отзыв':'Не учитывать отзыв',action,`${attrs} data-focus="${esc(focusKey('source',id))}"`);
    }
    return `<li class="memory-record"><p class="library-meta">${esc(domains[domain])} · ${status}</p><p class="memory-wording">${esc(source.title)}</p><p>${esc(source.evidence)}</p><div class="memory-actions">${controls}</div></li>`;
  }
  function html(domain) {
    const saved=memory.all(),rows=saved.filter(row=>domain==='all'||row.domain===domain);
    const linked=new Set(saved.map(row=>JSON.stringify([row.domain,row.source.kind,row.source.id])));
    const available=sources(domain).filter(s=>!linked.has(JSON.stringify([s.domain,s.kind,s.id])));
    const origins=new Map(memory.sourceStates().map(s=>[JSON.stringify([s.domain,s.kind,s.id]),s]));
    const previous=available.length?`<details class="memory-sources"${openSources?' open':''} data-memory-sources><summary>Прежние ответы и отзывы · ${available.length}</summary>
      <p>Отзыв можно отключить. Если пожелание из него важно и на будущее, добавь его в предпочтения.</p>
      <ul class="memory-list">${available.map(s=>sourceCard(s,origins.get(JSON.stringify([s.domain,s.kind,s.id])))).join('')}</ul></details>`:'';
    return `<section class="library-memory"><h2 class="library-view-title">Мои предпочтения</h2>
      <p>В онлайн-подборе учитываются включённые предпочтения этого раздела. Сегодняшнее пожелание важнее. Изменения действуют в этом браузере. Прежние отзывы остаются в истории.</p>
      <div class="memory-toolbar"><label class="library-filter">Показать раздел<select id="memory-domain" data-focus="memory-domain"${draft?' disabled':''}><option value="all">Все разделы</option>${options(domain)}</select></label>
      ${draft?'':button('Добавить предпочтение','new','data-focus="memory-new"')}</div>
      ${!memory.persistent?'<p role="status">Браузер не разрешает сохранять предпочтения. Проверь настройки данных сайта.</p>':''}
      ${error?`<p role="alert" class="memory-error">${esc(error)}</p>`:''}${draft?editor():''}
      ${rows.length?`<ul class="memory-list">${rows.map(record).join('')}</ul>`:'<p class="library-empty">Пока нет сохранённых предпочтений.</p>'}
      ${previous}${Object.hasOwn(domains,domain)?`<a class="library-button" href="${esc(pickerUrl(domain,{choose:'1'}))}">Начать подбор · ${esc(domains[domain])}</a>`:''}</section>`;
  }
  function close() { draft=null;confirming=null;error=''; }
  function open(record,domain,source={kind:'manual'},text='',expectedRevision) {
    close();
    draft=record?{...record,expectedRevision:record.revision}
      :{domain:domain==='all'?'':domain,source,text:text.slice(0,300),expectedRevision};
    render({focus:'memory-text'});
  }
  async function submit(form) {
    if(!draft||saving)return;
    draft.text=form.elements.text.value;
    if(form.elements.domain)draft.domain=form.elements.domain.value;
    const edited={...draft};
    saving=true;
    try{
      const row=await memory.mutate(()=>memory.save(edited));
      close();render({focus:focusKey('edit',row.id)});notice('Предпочтение сохранено.');
    }catch(err){error=err.message;render({focus:'memory-text'});}
    finally{saving=false;}
  }
  async function act(el,domain) {
    if(saving)return;
    const {act,id,kind}=el.dataset,action=act.slice('memory-'.length);
    const revision=Number(el.dataset.revision);
    try {
      if(action==='new'){open(null,domain);return;}
      if(action==='cancel'){close();render({focus:'memory-new'});return;}
      if(action==='from-source'||action==='suppress-review'||action==='restore-review'){
        const source=sources(el.dataset.domain).find(row=>row.kind===kind&&row.id===id);
        if(!source)throw Error('Источник изменился. Открой список ещё раз.');
        const version=Number(el.dataset.version);
        if(action==='from-source'){
          open(null,source.domain,{kind,id,title:source.title.slice(0,300),evidence:source.evidence.slice(0,4096)},source.text,version);
          return;
        }
        saving=true;
        await memory.mutate(()=>action==='restore-review'?memory.restoreReview(source.domain,source.entry,version):memory.suppressReview(source.domain,source.entry,version));
        error='';render({focus:focusKey('source',id)});notice(action==='restore-review'?'Отзыв снова учитывается.':'В следующих подборах этот отзыв учитываться не будет.');return;
      }
      const row=memory.all().find(item=>item.id===id);
      if(!row)throw Error('Эта запись уже удалена.');
      if(action==='edit'){open(row);return;}
      if(action==='remove'){confirming={id,revision};render({focus:'memory-confirm-remove'});return;}
      if(action==='confirm-remove'){
        saving=true;
        const shownRevision=confirming?.revision??revision;
        await memory.mutate(()=>memory.remove(id,shownRevision));close();render({focus:'memory-new'});notice('Предпочтение удалено из памяти.');return;
      }
      if(action==='toggle'){
        saving=true;
        await memory.mutate(()=>memory.setEnabled(id,el.dataset.enabled==='true',revision));
      }
      error='';confirming=null;render({focus:focusKey(action==='toggle'?'toggle':'edit',id)});
    }catch(err){error=err.message;confirming=null;render();}
    finally{saving=false;}
  }
  return {html,act,submit,close,rememberSources:open=>{openSources=open;},input(el){
    if(draft&&el.name==='text')draft.text=el.value;
    if(draft&&el.name==='domain')draft.domain=el.value;
  }};
}
