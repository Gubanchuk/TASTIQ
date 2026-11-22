const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const labels={conditional:'Есть условие',unknown:'Не подтверждено',no:'Не подходит по условию'};

// Catalog checks remain visible independently from a model's recommendation or caveat.
export function feasibilityHtml(feasibility=[],{label='Условия игры'}={}) {
 const warnings=Array.isArray(feasibility)?feasibility.filter(f=>Object.hasOwn(labels,f?.status)&&typeof f.text==='string'&&f.text.trim()):[];
 if(!warnings.length)return '';
 return `<section class="game-feasibility" aria-label="${esc(label)}"><p>Проверь перед выбором</p><ul>`
  +warnings.map(f=>{
   const detail=f.status==='unknown'?f.text.replace(/^(?:Услови(?:е требует|я требуют) проверки|Нужно проверить):\s*/u,''):f.text;
   return `<li><b>${labels[f.status]}:</b> ${esc(detail)}</li>`;
  }).join('')+'</ul></section>';
}
