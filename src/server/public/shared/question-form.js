import {directionChoiceMessage,hasDirectionChoice} from './conversation-entry.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const wishExamples={game:'Хочу строить свой город без спешки',film:'Хочу добрую комедию на полтора часа',series:'Хочу детектив, где за серию раскрывают одно дело',cartoon:'Хочу смешной мультфильм для вечера с ребёнком',anime:'Хочу аниме про путешествие, без боёв'};
const neutralLabels={unknown:'Пока не знаю',indifferent:'Неважно',none:'Ни один вариант не подходит'};
const nextIcon='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const checkIcon='<svg class="game-option-check" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4.5 10 3.5 3.5 7.5-7.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function focusOwnAnswer(field){
 if(!field)return;
 const details=field.closest('details');if(details)details.open=true;field.focus();
}
export function canSubmitQuestion(question,draft){
 if(!question||draft.kind!=='answer')return false;
 const selected=(question.options??[]).filter(option=>draft.selected.includes(option.id)).map(option=>option.id);
 if(question.id==='direction')return hasDirectionChoice(selected,draft.text);
 return selected.length>0||question.allowText!==false&&Boolean(draft.text.trim());
}
export function questionFormHtml(question,draft,{domain='game',busy=false,canReview=false,canChange=false,exampleHtml=''}={}){
 const first=question.id==='direction',required=first||question.allowText===false,options=question.options??[];
 const selected=option=>draft.kind==='answer'&&draft.selected.includes(option.id);
 const group=(list,label)=>list.length?`<div class="game-question-options" role="group" aria-label="${esc(label)}" aria-describedby="answer-instruction">${list.map(option=>`<button type="button" class="game-option" data-act="option" data-id="${esc(option.id)}" aria-pressed="${selected(option)}"${busy?' disabled':''}><span>${esc(option.label)}</span>${checkIcon}</button>`).join('')}</div>`:'';
 const details=(title,body,key,open=false)=>`<details class="game-answer-extra" data-disclosure="${key}"${open?' open':''}><summary>${title}</summary><div class="game-answer-extra-body">${body}</div></details>`;
 const moods=options.filter(option=>option.id.startsWith('mood_'));
 const avoids=options.filter(option=>option.id.startsWith('avoid_'));
 const genres=options.filter(option=>!moods.includes(option)&&!avoids.includes(option));
 const grouped=first&&moods.length>0;
 const choices=group(grouped?moods:options,first?'Настроение':'Варианты ответа');
 const genre=grouped&&genres.length?details('Выбрать жанр <small data-genre-count hidden></small>',group(genres,'Жанр'),'answer-genres',genres.some(selected)):'';
 const own=question.allowText!==false?`<label class="game-field" id="answer-field" for="answer-text">Своими словами<textarea class="input" id="answer-text" name="answer" maxlength="1600" rows="3" ${first?`placeholder="${wishExamples[domain]??wishExamples.game}"`:''}>${esc(draft.text)}</textarea></label>`:'';
 const avoid=first?`<fieldset class="game-answer-avoid"><legend>Чего хочется избежать</legend>${grouped?group(avoids,'Исключения'):''}<label class="game-field" for="answer-avoid">Своё исключение<input class="input" id="answer-avoid" name="avoidText" maxlength="240" placeholder="${domain==='game'?'Например, долгих обучающих заданий':'Например, любовных треугольников'}" value="${esc(draft.avoidText)}"></label></fieldset>`:'';
 const extra=first?(avoid||exampleHtml?details('Добавить детали',avoid+exampleHtml,'answer-own',avoids.some(selected)||Boolean(draft.avoidText)):'')
  :own&&options.length?details('Ответить своими словами',own+exampleHtml,`answer-own:${esc(question.id)}`,Boolean(draft.text)):'';
 const instruction=first?directionChoiceMessage:required?'Выбери один вариант.':options.length?(question.multiple?'Можно выбрать несколько вариантов или написать свой ответ.':'Выбери вариант или напиши свой ответ.'):'Ответь своими словами.';
 const hasDraft=Boolean(draft.text.trim()||draft.selected.length)&&draft.kind==='answer';
 return `<h1>${esc(question.title)}</h1><p id="answer-instruction" class="game-help">${instruction}</p>`
  +(!first&&question.why?`<p class="game-help game-question-why">${esc(question.why)}</p>`:'')
  +`<form id="answer-form" data-form="answer" data-multiple="${question.multiple===true}" aria-describedby="answer-instruction">${first?own:''}${choices}`
  +(genre||extra?`<div class="game-answer-extras">${genre}${extra}</div>`:first?'':own+exampleHtml)
  +`<div id="neutral-status" class="game-neutral-status"${draft.kind==='answer'?' hidden':''}>Сохранён прежний ответ «${esc(neutralLabels[draft.kind])}». <button type="button" class="game-text-action" data-act="resume-answer">Изменить ответ</button></div>`
  +'<div class="game-question-footer">'
  +(canReview?`<p class="game-draft-hint" id="review-draft-hint"${hasDraft?'':' hidden'}>Нажми «Дальше», чтобы учесть ответ.</p>`:'')
  +(canChange||canReview?`<div class="game-question-secondary">${canChange?`<button type="button" class="game-text-action" data-act="another-question"${busy?' disabled':''}>Другой вопрос</button>`:''}${canReview?`<button type="button" class="game-text-action" data-act="review"${busy||hasDraft?' disabled':''}>Пропустить уточнения</button>`:''}</div>`:'')
  +`<button type="submit" class="btn btn-primary" data-answer-next${first?' data-first-next':''}${busy||!canSubmitQuestion(question,draft)?' disabled':''}>Дальше${nextIcon}</button></div></form>`;
}
