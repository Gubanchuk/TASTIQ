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

export function createMemoryView({memory, library, feedback, domains, escape, render, notice, fetchLabels, revealDomain}) {
  let draft=null, confirming=null, error='', openSources=true, saving=false;
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
    const reference=!d.id&&scoped&&d.source.title?`<blockquote class="memory-quote">${esc(d.source.title)}</blockquote>`:'';
    return `<form class="memory-editor" data-form="memory"><h4 tabindex="-1" data-focus="memory-form-heading">${d.id?'Изменить предпочтение':'Новое предпочтение'}</h4>${section}${reference}
      <label class="library-filter">Что учитывать в подборе<textarea name="text" id="memory-text" data-focus="memory-text" required maxlength="300" rows="3" placeholder="Например, люблю детективы без жестоких сцен">${esc(d.text)}</textarea></label>
      ${error?`<p role="alert" class="memory-error">${esc(error)}</p>`:''}
      <div class="memory-actions"><button type="submit" class="library-button primary">Сохранить</button>${button('Отмена','cancel')}</div></form>`;
  }
  function record(row) {
    if(draft?.id===row.id)return `<li>${editor()}</li>`;
    const ref=`data-id="${esc(row.id)}" data-revision="${esc(row.revision)}"`;
    const hasSource=row.source.title||row.source.evidence&&row.source.evidence!==row.text;
    const evidence=hasSource?`<details class="memory-origin"><summary>Источник записи</summary><p>${esc(row.source.title||'')}${row.source.title&&row.source.evidence?' · ':''}${esc(row.source.evidence||'')}</p></details>`:'';
    const deletion=confirming?.id===row.id;
    return `<li class="memory-record" data-enabled="${Boolean(row.enabled)}"><div class="memory-byline"><span>${esc(domains[row.domain])} · ${labels[row.source.kind]}</span><span class="memory-state">${row.enabled?'Учитывается':'Отключено'}</span></div>
      <p class="memory-wording">${esc(row.text)}</p>${evidence}<div class="memory-actions">
      ${deletion?`<span>Удалить это предпочтение из памяти?</span>${button('Удалить из памяти','confirm-remove',ref+' data-focus="memory-confirm-remove"')}${button('Оставить','cancel-remove',ref)}`
        :button('Изменить','edit',`${ref} data-focus="${esc(focusKey('edit',row.id))}" ${draft?'disabled':''}`)+button(row.enabled?'Отключить':'Включить','toggle',`${ref} data-enabled="${!row.enabled}" data-focus="${esc(focusKey('toggle',row.id))}"`)+button('Удалить','remove',ref+(draft?' disabled':''))}</div></li>`;
  }
  function sourceCard(source,state) {
    const {kind,domain,id}=source;
    if(draft&&!draft.id&&draft.source.kind===kind&&draft.source.id===id&&draft.domain===domain)return `<li>${editor()}</li>`;
    const version=state?.revision??0;
    const attrs=`data-kind="${kind}" data-domain="${esc(domain)}" data-id="${esc(id)}" data-version="${version}"`;
    const suppressed=state&&state.state!=='released';
    const status=kind==='answer'?'Ответ о произведении':suppressed?'Отзыв отключён'
      :memory.persistent?'Отзыв учитывается':'Ранее разрешённый отзыв';
    let controls=button('Добавить в предпочтения','from-source',attrs+` data-focus="${esc(focusKey('from-'+kind+'-'+domain,id))}" ${draft?'disabled':''}`);
    if(kind==='review'&&(!suppressed||state.state==='suppressed')){
      const action=suppressed?'restore-review':'suppress-review';
      controls+=button(suppressed?'Снова учитывать отзыв':'Не учитывать отзыв',action,`${attrs} data-focus="${esc(focusKey('source',id))}"`);
    }
    return `<li class="memory-record"><p class="library-meta">${esc(domains[domain])} · ${status}</p><p class="memory-wording">${esc(source.title)}</p>${source.evidence?`<p>${esc(source.evidence)}</p>`:''}<div class="memory-actions">${controls}</div></li>`;
  }
  function html(domain) {
    const saved=memory.all(),rows=saved.filter(row=>domain==='all'||row.domain===domain);
    const linked=new Set(saved.map(row=>JSON.stringify([row.domain,row.source.kind,row.source.id])));
    const available=sources(domain).filter(s=>!linked.has(JSON.stringify([s.domain,s.kind,s.id])));
    const origins=new Map(memory.sourceStates().map(s=>[JSON.stringify([s.domain,s.kind,s.id]),s]));
    const sourceDraft=draft&&!draft.id&&available.some(s=>s.domain===draft.domain&&s.id===draft.source.id&&s.kind===draft.source.kind);
    const inlineRecord=draft?.id&&rows.some(row=>row.id===draft.id);
    const newEditor=draft&&!sourceDraft&&!inlineRecord;
    const previous=available.length?`<details class="memory-sources"${openSources?' open':''} data-memory-sources><summary><span>Прошлые ответы и отзывы</span><span class="memory-count">${available.length}</span></summary>
      <div class="memory-source-body"><p>Если пожелание по-прежнему важно, добавь его в предпочтения.</p>
      <ul class="memory-list">${available.map(s=>sourceCard(s,origins.get(JSON.stringify([s.domain,s.kind,s.id])))).join('')}</ul></div></details>`:'';
    return `<section class="library-memory" aria-labelledby="memory-heading"><header class="memory-heading"><div><h2 id="memory-heading">Память предпочтений</h2>
      <p>Онлайн-подбор учитывает предпочтения из выбранного раздела. Пожелания на сегодня важнее.</p></div>
      <label class="library-filter">Раздел<select id="memory-domain" data-focus="memory-domain"${draft?' disabled':''}><option value="all">Все разделы</option>${options(domain)}</select></label></header>
      ${!memory.persistent?'<p role="status">Браузер не разрешает сохранять предпочтения. Проверь настройки данных сайта.</p>':''}
      ${error&&!draft?`<p role="alert" class="memory-error">${esc(error)}</p>`:''}
      <div class="memory-layout"><section class="memory-saved"><header class="memory-section-head"><h3>Мои предпочтения</h3>
      ${button('Добавить','new','aria-label="Добавить предпочтение" data-focus="memory-new"'+(draft?' disabled':''))}</header>
      ${newEditor?editor():''}${rows.length?`<ul class="memory-list">${rows.map(record).join('')}</ul>`:!newEditor?`<p class="memory-empty">${domain==='all'?'Здесь пока нет записей.':'Для этого раздела пока нет записей.'} Добавь то, что стоит запомнить, например любимый жанр.</p>`:''}
      </section>${previous}</div>${Object.hasOwn(domains,domain)?`<a class="memory-start" href="${esc(pickerUrl(domain,{choose:'1'}))}">Начать подбор · ${esc(domains[domain])} <span aria-hidden="true">→</span></a>`:''}</section>`;
  }
  function close() { draft=null;confirming=null;error=''; }
  function open(record,domain,source={kind:'manual'},text='',expectedRevision) {
    close();
    draft=record?{...record,expectedRevision:record.revision}
      :{domain:domain==='all'?'':domain,source,text:text.slice(0,300),expectedRevision};
    render({focus:'memory-form-heading',reveal:true});
  }
  async function submit(form) {
    if(!draft||saving)return;
    draft.text=form.elements.text.value;
    if(form.elements.domain)draft.domain=form.elements.domain.value;
    const edited={...draft};
    saving=true;
    try{
      const row=await memory.mutate(()=>memory.save(edited));
      close();revealDomain?.(row.domain);render({focus:focusKey('edit',row.id),reveal:true});notice('Предпочтение сохранено.');
    }catch(err){error=err.message;render({focus:'memory-text'});}
    finally{saving=false;}
  }
  async function act(el,domain) {
    if(saving)return;
    const {act,id,kind}=el.dataset,action=act.slice('memory-'.length);
    const revision=Number(el.dataset.revision);
    try {
      if(action==='new'){open(null,domain);return;}
      if(action==='cancel'){
        const focus=draft?.id?focusKey('edit',draft.id):draft?.source.id?focusKey('from-'+draft.source.kind+'-'+draft.domain,draft.source.id):'memory-new';
        close();render({focus,reveal:true});return;
      }
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
