export function pickerEntryRoute({hash='',search=''}={}){
 if(hash==='#my')return '/library/';
 const params=new URLSearchParams(search),domain=params.get('start');
 if(['film','series','cartoon'].includes(domain)&&params.get('legacy')!=='1')return `/pick/watch/?domain=${domain}`;
 return null;
}
