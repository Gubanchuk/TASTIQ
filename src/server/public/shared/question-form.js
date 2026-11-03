const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const neutralAnswerLabels={unknown:'Пока не знаю',indifferent:'Неважно',none:'Ни один вариант не подходит'};
export function focusOwnAnswer(field){if(!field)return;const details=field.closest('details');if(details)details.open=true;field.focus();}
export function questionFormHtml(question,draft,{busy=false,neutralStatus=''}={}){
 const first=question.id==='direction',allowText=question.allowText!==false,options=question.options??[];
 const selected=o=>draft.kind==='answer'&&draft.selected.includes(o.id);
 const group=(list,label)=>list.length?`<div class="game-question-options" role="group" aria-label="${esc(label)}">${list.map(o=>`<button type="button" class="game-option" data-act="option" data-id="${esc(o.id)}" aria-pressed="${selected(o)}"${busy?' disabled':''}><span>${esc(o.label)}</span><svg class="game-option-check" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4.5 10 3.5 3.5 7.5-7.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`).join('')}</div>`:'';
 const details=(title,body,open=false,key='')=>`<details class="game-answer-extra"${key?` data-disclosure="${key}"`:''}${open?' open':''}><summary${key==='answer-own'?' data-act="own-answer"':''}>${title}</summary>${body}</details>`;
 const moods=options.filter(o=>o.id.startsWith('mood_')),avoids=options.filter(o=>o.id.startsWith('avoid_')),genres=options.filter(o=>!o.id.startsWith('mood_')&&!o.id.startsWith('avoid_'));
 const choices=first&&moods.length?group(moods,'Чего хочется сегодня'):group(options,question.multiple?'Можно выбрать несколько вариантов':'Варианты ответа');
 const extraChoices=first&&moods.length?details('Выбрать жанр',group(genres,'Жанры'),genres.some(selected),'answer-genres')+details('Что сегодня не подойдёт?',group(avoids,'Чего сегодня не хочется'),avoids.some(selected),'answer-avoids'):'';
 const own=allowText?`<label class="game-field" id="answer-field" for="answer-text"${draft.kind!=='answer'?' hidden':''}>${first?'Свой ответ или дополнение':'Своими словами'+(options.length?' — вместо вариантов или в дополнение':'')}<textarea class="input" id="answer-text" name="answer" maxlength="1600" rows="3" placeholder="${first?'Например: хочется приключения без спешки':'Что важно для сегодняшнего выбора?'}">${esc(draft.text)}</textarea></label>`:'';
 const controls=(question.controls??[]).filter(kind=>neutralAnswerLabels[kind]&&(kind!=='none'||options.length));
 return `<h1>${esc(question.title)}</h1>${question.why?`<p class="game-help">${esc(question.why)}</p>`:''}<form id="answer-form" data-form="answer">`
  +choices+(!first&&question.multiple&&options.length?'<p class="game-help">Можно выбрать несколько вариантов и добавить свои слова.</p>':'')
  +(first?`<div class="game-answer-extras">${extraChoices}${details('Добавить своими словами',own,Boolean(draft.text),'answer-own')}</div>`:own)
  +`<div class="game-neutral-options" role="group" aria-label="Пропустить или ответить иначе">${controls.map(kind=>`<button type="button" class="btn btn-secondary btn-s" data-act="neutral" data-kind="${kind}" aria-pressed="${draft.kind===kind}"${busy?' disabled':''}>${neutralAnswerLabels[kind]}</button>`).join('')}</div><div id="neutral-status" class="game-neutral-status" role="status">${neutralStatus}</div></form>`;
}
