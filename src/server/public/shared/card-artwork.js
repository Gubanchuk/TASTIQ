import {safeLibraryUrl} from './library-store.js';
import {steamArtwork} from './steam-artwork.js';

const failedUrls=new Set();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const illustrationBase='/assets/catalog-covers/';
const genreCovers=[
 [/documentary/,'documentary'],
 [/horror|thriller|mystery|crime|film.noir/,'suspense'],
 [/sci.fi|science fiction/,'science-fiction'],
 [/fantasy|adventure/,'fantasy'],
 [/romance|music/,'romance'],
 [/comedy|family/,'comedy'],
];

export function illustratedCoverUrl(card,domain=card.domain) {
 const genres=Array.isArray(card.genres)?card.genres.join(' ').toLowerCase():'';
 const genreCover=genreCovers.find(([pattern])=>pattern.test(genres))?.[1];
 const fallback=domain==='game'?'games':domain==='anime'||domain==='cartoon'?'animation':'drama';
 return `${illustrationBase}${genreCover??fallback}.webp`;
}

export function artworkUrls(card,domain=card.domain,extra) {
 const appId=domain==='game'?/^steam:(\d+)$/.exec(card.id)?.[1]:null;
 const storeHeader=appId?`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`:null;
 return [...new Set([appId&&steamArtwork(card.id),card.poster,card.image,extra,storeHeader,illustratedCoverUrl(card,domain)].map(safeLibraryUrl))]
  .filter(url=>url&&!failedUrls.has(url));
}

function imageHtml([src,...backups],eager) {
 if(!src)return '';
 return `<img src="${escapeHtml(src)}"${backups.length?` data-artwork-backups="${escapeHtml(backups.join(' '))}"`:''} alt="" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`;
}

export function artworkImageHtml(card,{domain=card.domain,extra,eager=false}={}) {
 return imageHtml(artworkUrls(card,domain,extra),eager);
}

export function resultArtworkHtml(card,{domain,title,eager=false,extra}={}) {
 const urls=artworkUrls(card,domain,extra);
 const image=imageHtml(urls,eager);
 const fallback=!urls[0]||urls[0].startsWith(illustrationBase);
 const label=escapeHtml(title);
 const illustration=illustratedCoverUrl(card,domain);
 return `<div class="game-poster${fallback?' game-poster-fallback':''}" data-title="${label}" aria-hidden="true"><span style="--cover-illustration:url('${illustration}')"><strong>${label}</strong></span>${image?`<picture>${image}</picture>`:''}</div>`;
}

export function retryArtworkImage(img) {
 failedUrls.add(img.getAttribute('src'));
 const backups=(img.dataset.artworkBackups??'').split(' ').map(safeLibraryUrl).filter(url=>url&&!failedUrls.has(url));
 const [next,...remaining]=backups;
 if(!next)return false;
 img.dataset.artworkBackups=remaining.join(' ');
 img.src=next;
 return true;
}

export function bindResultArtwork(root) {
 root.addEventListener('load',event=>{
  const img=event.target;
  if(img.matches?.('.game-poster img'))img.closest('.game-poster').classList.add('is-loaded');
 },true);
 root.addEventListener('error',event=>{
  const img=event.target;
  if(!img.matches?.('.game-poster img')||retryArtworkImage(img))return;
  const frame=img.closest('.game-poster');
  frame.classList.remove('is-loaded');
  frame.classList.add('game-poster-fallback');
  img.closest('picture').remove();
 },true);
}
