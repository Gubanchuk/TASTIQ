const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function titleCopyHtml(title,year) {
 const text=year?`${title} (${year})`:title;
 return `<button type="button" class="game-title-copy" data-act="copy-title" data-copy-title="${esc(text)}" data-focus="copy-title:${esc(text)}" aria-label="Скопировать название: ${esc(text)}" title="Скопировать название"><span>${esc(title)}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg></button>`;
}

export async function copyText(text,status,{clipboard=globalThis.navigator?.clipboard,multiline=false,success='Скопировано',fieldLabel='Название для копирования'}={}) {
 if(!text||!status)return;
 try {
  if(!clipboard?.writeText)throw Error('Clipboard unavailable');
  await clipboard.writeText(text);
  status.textContent=success;
 }catch{
  status.textContent=multiline?'Не удалось скопировать автоматически. Скопируй текст из поля:':'Не удалось скопировать автоматически. Скопируй название из поля:';
  const input=status.ownerDocument.createElement(multiline?'textarea':'input');
  input.className='input game-copy-fallback';input.readOnly=true;input.value=text;
  if(multiline)input.rows=10;
  input.setAttribute('aria-label',fieldLabel);
  status.append(input);input.focus();input.select();input.scrollTop=0;input.scrollLeft=0;
 }
}

export function copyCardTitle(button,options) {
 return copyText(button.dataset.copyTitle,button.closest('.game-card-heading')?.querySelector('[data-copy-status]'),options);
}
