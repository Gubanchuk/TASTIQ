const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const clarificationKey=(state,text)=>`__clarification:${state.id}:${encodeURIComponent(text)}`;
export function clarificationHtml({state,uncertainties=[],draft=()=>({text:''}),busy=false}) {
 return (uncertainties.length?'<div class="clarification-list"><p>Пока неясно</p>'+uncertainties.map((text,index)=>{
  const key=clarificationKey(state,text),value=draft(key),id=`clarification-${index}`;
  return `<div class="clarification-item"><p class="clarification-question" id="${id}-question">${esc(text)}</p><button type="button" class="btn btn-secondary btn-s" data-act="clarify" data-key="${esc(key)}" aria-controls="${id}" aria-expanded="${value.kind==='none'}"${busy?' disabled':''}>Уточнить</button><form id="${id}" class="clarification-form" data-form="clarification" data-key="${esc(key)}" data-revision="${state.revision}" data-conversation="${esc(state.id)}"${value.kind==='none'?'':' hidden'}><label class="game-field" for="${id}-text">Твоё уточнение<textarea class="input" id="${id}-text" name="clarification" maxlength="1600" rows="3" placeholder="Напиши, что ты имел в виду и что нужно учесть" aria-describedby="${id}-question ${id}-help" required>${esc(value.text)}</textarea></label><p class="game-help" id="${id}-help">Поясни этот момент своими словами. Затем проверим понимание с учётом поправки.</p><div class="clarification-actions"><button type="submit" class="btn btn-secondary"${busy?' disabled':''}>Применить уточнение</button><button type="button" class="btn btn-plain" data-act="cancel-clarification"${busy?' disabled':''}>Отмена</button></div></form></div>`;
 }).join('')+'</div>':'');
}
export function clarificationAction(form,state,text) {
 return form.conversation===state.id&&Number(form.revision)===state.revision&&text.trim()?{type:'correct',text:text.trim()}:null;
}

export function shouldClearCorrection(action,origin,currentText) {
 return action.type==='correct'&&origin==='correction'&&currentText.trim()===action.text.trim();
}
