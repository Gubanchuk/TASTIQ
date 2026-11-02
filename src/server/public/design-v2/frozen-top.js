// The real landing header and first section are displayed unchanged, in an isolated document.
const reportHeight=()=>{
 const first=document.querySelector('.first');
 if(first){
  // The original desktop section fills its viewport. Feeding its bottom back
  // into that viewport adds the header border on every ResizeObserver turn.
  const fillsViewport=parseFloat(getComputedStyle(first).minHeight)>0;
  const height=fillsViewport?innerHeight:Math.ceil(first.getBoundingClientRect().bottom+scrollY);
  parent.postMessage({type:'tastiq-frozen-height',height},location.origin);
 }
};
document.addEventListener('click',event=>{
 const link=event.target.closest('a');if(!link)return;
 event.preventDefault();event.stopImmediatePropagation();
 parent.postMessage({type:'tastiq-frozen-navigation',domain:link.dataset.domain??null,library:link.id==='my-link',pick:link.id==='pick-btn'},location.origin);
},true);
addEventListener('load',reportHeight);
new ResizeObserver(reportHeight).observe(document.documentElement);
reportHeight();
