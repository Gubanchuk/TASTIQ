const entries = document.querySelectorAll('[data-anime-entry]');
if (entries.length) {
 fetch('/api/meta').then(response => response.ok ? response.json() : null).then(meta => {
  if (!meta?.domains?.anime?.newSelections) return;
  const count = document.querySelector('[data-catalog-count="anime"]');
  if (count) {
   const items=meta.domains.anime.items,form=new Intl.PluralRules('ru-RU').select(items);
   count.textContent=new Intl.NumberFormat('ru-RU').format(items)+' '+({one:'произведение',few:'произведения',many:'произведений'}[form]??'произведений');
  }
  for (const entry of entries) entry.hidden=false;
  document.querySelector('.doors')?.classList.add('with-anime');
 }).catch(()=>{/* Existing sections remain available. */});
}
