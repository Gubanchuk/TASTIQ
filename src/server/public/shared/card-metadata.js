const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const genres={Action:'Боевик',Adventure:'Приключения',Animation:'Анимация',Biography:'Биография',Comedy:'Комедия',Crime:'Криминал',Documentary:'Документальный',Drama:'Драма',Family:'Семейный',Fantasy:'Фэнтези',History:'Исторический',Horror:'Ужасы',Music:'Музыка',Musical:'Мюзикл',Mystery:'Детектив',Romance:'Мелодрама','Sci-Fi':'Фантастика',Sport:'Спорт',Thriller:'Триллер',War:'Военный',Western:'Вестерн',Short:'Короткий метр',Indie:'Инди',RPG:'Ролевая игра',Strategy:'Стратегия',Casual:'Казуальная',Simulation:'Симулятор',Racing:'Гонки',Sports:'Спорт','Early Access':'Ранний доступ','Massively Multiplayer':'ММО'};
export function genreLabels(card,domain){
 return (Array.isArray(card.genres)?card.genres:[]).filter(label=>typeof label==='string'&&label.trim())
  .map(label=>domain==='game'&&label==='Action'?'Экшен':Object.hasOwn(genres,label)?genres[label]:label);
}
export function cardMetadataParts(card,{domain='game'}={}){
 const media=domain!=='game',episodic=media&&card.kind==='series';
 return [card.year?String(card.year):null,media&&card.runtime?`${card.runtime} мин${episodic?(domain==='anime'?' / 1-я серия':' / эпизод'):''}`:null,
  episodic?[card.seasons?`${card.seasons} сез.`:null,card.episodes?`${card.episodes} эп.`:null].filter(Boolean).join(' · '):null,
  ...genreLabels(card,domain).slice(0,2)].filter(Boolean);
}
export function cardMetadataHtml(card,options){const parts=cardMetadataParts(card,options);return parts.length?`<p class="game-meta">${parts.map(part=>`<span>${esc(part)}</span>`).join('')}</p>`:'';}
