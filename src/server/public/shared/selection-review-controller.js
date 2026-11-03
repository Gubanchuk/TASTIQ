import {createSelectionReviewDrafts,selectionReviewHtml,selectionReviewStatus} from './selection-review.js';
import {selectionCopyText} from './selection-copy.js';
export function canReviewSnapshot(run,snapshot){
 const result=snapshot?.screen?.result??snapshot?.state?.result;
 return Boolean(run&&snapshot?.state?.id===run.dialogueId&&(snapshot?.state?.domain??'game')===run.domain&&snapshot.screen?.type==='result'&&result?.top
  &&JSON.stringify(run.cards.map(c=>c.id))===JSON.stringify([result.top,...(result.alternatives??[]).slice(0,3)].map(c=>c.id)));
}
export function createSelectionReviewController({storage,feedback,getSnapshot,getRunId,isBusy,onChange,root=document}={}){
 const drafts=createSelectionReviewDrafts({storage});
 const current=()=>feedback.get(getRunId());
 const draft=run=>drafts.has(run.id)?drafts.get(run.id):undefined;
 const fields=form=>({issue:form.elements.issue.value||null,note:form.elements.note.value,learn:form.elements.learn.checked});
 const set=(run,value)=>drafts.set(run.id,{...(draft(run)??run.selectionReview??{}),...value});
 const notice=text=>{const element=root.querySelector('[data-selection-review-status]');if(element)element.textContent=text;};
 const api={
  render(){const element=root.querySelector('[data-selection-review]');if(!element)return;const run=current();element.innerHTML=selectionReviewHtml(run,{draft:run?draft(run):undefined,status:feedback.status(run?.id),persistent:feedback.persistent});if(isBusy())element.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);},
  refreshStatus(){const run=current();if(run){const status=feedback.status(run.id);notice(selectionReviewStatus(run,{draft:draft(run),status,persistent:feedback.persistent}));const retry=root.querySelector('[data-act="selection-retry"]');if(retry)retry.hidden=status==='sent'||Boolean(draft(run));}},
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-act]');if(!button||button.disabled||isBusy())return;
  if(button.dataset.act==='selection-retry'){void feedback.flush();return;}
  if(button.dataset.act!=='selection-verdict')return;
  const run=current();if(!run||button.dataset.run!==run.id)return;set(run,{verdict:button.dataset.v});onChange();
 });
 for(const type of ['input','change'])root.addEventListener(type,event=>{
  const form=event.target.closest('[data-form="selection-review"]'),run=current();if(!form||!run||form.dataset.run!==run.id||isBusy())return;
  set(run,fields(form));api.refreshStatus();
 });
 root.addEventListener('submit',event=>{
  const form=event.target;if(form.dataset.form!=='selection-review')return;event.preventDefault();if(isBusy())return;
  const run=current(),snapshot=getSnapshot();if(!run||form.dataset.run!==run.id||!canReviewSnapshot(run,snapshot)){notice('Показанные варианты изменились. Оцени текущий подбор.');return;}
  const text=selectionCopyText(snapshot),transcript=text.length<=48000?text:text.slice(0,47950)+'\n[Длинная копия сокращена]';
  const submittedDraft=JSON.stringify(draft(run));
  const value={...(draft(run)??run.selectionReview??{}),...fields(form),requestSummary:String(snapshot.screen.summary??snapshot.state.summary??'').slice(0,1600),transcript};
  void feedback.review(run.id,value).then(ok=>{if(!ok){notice('Выбери оценку подбора. Текст сохранён в черновике.');return;}if(JSON.stringify(draft(run))===submittedDraft)drafts.delete(run.id);onChange();void feedback.flush();});
 });
 return api;
}
