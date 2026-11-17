const ghibli = 'https://www.ghibli.jp/works/';
const crunchyroll = 'https://www.crunchyroll.com/news/guides/2023/6/20/anime-for-beginners-to-watch-crunchyroll';
const avatar = 'https://keyframemagazine.org/2025/02/08/bending-the-rules/';

// Editorial index of existing IDs. Sources establish classification and the viewing entry point.
// Only explicit overlaps keep both entry points. JP is an origin, not a language or voice track.
export const animePilot = Object.freeze(Object.fromEntries([
 ['tt0087544','japanese',ghibli,true,['Навсикая из Долины ветров','Kaze no Tani no Naushika']],
 ['tt0092067','japanese',ghibli,true,['Небесный замок Лапута','Tenkū no Shiro Rapyuta']],
 ['tt0095327','japanese',ghibli,true,['Могила светлячков','Hotaru no Haka']],
 ['tt0096283','japanese',ghibli,true,['Мой сосед Тоторо','Tonari no Totoro']],
 ['tt0097814','japanese',ghibli,true,['Ведьмина служба доставки','Majo no Takkyūbin']],
 ['tt0102587','japanese',ghibli,true,['Ещё вчера','Omohide Poro Poro']],
 ['tt0104652','japanese',ghibli,true,['Порко Россо','Kurenai no Buta']],
 ['tt0113824','japanese',ghibli,true,['Шёпот сердца','Mimi wo Sumaseba']],
 ['tt0119698','japanese',ghibli,true,['Принцесса Мононоке','Mononoke Hime']],
 ['tt0245429','japanese',ghibli,true,['Унесённые призраками','Sen to Chihiro no Kamikakushi']],
 ['tt0347149','japanese',ghibli,true,['Ходячий замок','Hauru no Ugoku Shiro']],
 ['tt0876563','japanese',ghibli,true,['Рыбка Поньо на утёсе','Gake no Ue no Ponyo']],
 ['tt1568921','japanese',ghibli,true,['Ариэтти из страны лилипутов','Karigurashi no Arrietty']],
 ['tt2576852','japanese',ghibli,true,['Сказание о принцессе Кагуя','Kaguya-hime no Monogatari']],
 ['tt1474276','japanese','https://gkids.com/2025/03/25/gkids-to-release-wolf-children-summer-wars-and-the-girl-who-leapt-through-time-in-theaters-nationwide-this-year/',true,['Летние войны','Samā Wōzu']],
 ['tt2140203','japanese','https://gkids.com/2025/03/25/gkids-to-release-wolf-children-summer-wars-and-the-girl-who-leapt-through-time-in-theaters-nationwide-this-year/',true,['Волчьи дети Амэ и Юки','Ōkami Kodomo no Ame to Yuki']],
 ['tt5311514','japanese','https://gkids.com/2026/07/29/tickets-on-sale-and-trailer-released-for-your-name/',true,['Твоё имя','Kimi no Na wa']],
 ['tt5323662','japanese','https://gkids.com/films/a-silent-voice/',true,['Форма голоса','Koe no Katachi']],
 ['tt9426210','japanese','https://gkids.com/films/weathering-with-you/',true,['Дитя погоды','Tenki no Ko']],
 ['tt1288461','japanese','https://gurrenlagannthemovieusa.com/introduction/',null,['Гуррен-Лаганн: На прорыв!']],
 ['tt3666024','coproduction','https://www.ghibli.jp/info/009894/',true,['Красная черепаха','La Tortue rouge']],
 ['tt16969708','coproduction','https://about.netflix.com/en/news/all-new-anime-series-based-on-scott-pilgrim-coming-soon-to-netflix',null,['Скотт Пилигрим жмёт на газ']],
 ['tt0213338','japanese','https://img.sunrise-inc.co.jp/images/news/19186_0knuh96gmrl1_pdf.pdf',true,['Ковбой Бибоп']],
 ['tt0877057','japanese','https://www.viz.com/death-note',true,['Тетрадь смерти']],
 ['tt14134550','japanese',crunchyroll,true,['Необычное такси']],
 ['tt5249462','japanese','https://aniplexusa.com/pdf/PR_120915_Erased.pdf',true,['Город, в котором меня нет','Boku dake ga Inai Machi']],
 ['tt5897304','japanese',crunchyroll,true,['Моб Психо 100']],
 ['tt0417299','western',avatar,true,['Аватар: Легенда об Аанге','Аватар Легенда об Аанге'],'cartoon'],
 ['tt6517102','western','https://www.netflix.com/title/80095241',true,['Кастлвания'],'cartoon'],
 ['tt14833612','western','https://media.netflix.com/en/only-on-netflix/81436901',null,['Кастлвания: Ноктюрн'],'cartoon'],
 ['tt10009170','western','https://www.netflix.com/title/81001988',true,['Кровь Зевса']],
].map(([id,origin,source,standalone,names,otherDomain])=>[id,{origin,source,standalone,names,otherDomain}])));

export const animeCatalogCorrections = Object.freeze({tt0382932:'cartoon',tt0120587:'cartoon'});

// The published length of S1E1 in the cited edition, rounded up to a whole minute.
export const animeFirstEpisodes = Object.freeze({
 tt0213338:{minutes:24,source:'https://www.netflix.com/title/80001305'},
 tt0877057:{minutes:23,source:'https://tubitv.com/tv-shows/319042/s01-e01-rebirth'},
 tt14134550:{minutes:24,source:'https://www.bbfc.co.uk/release/oddtaxi-q29sbgvjdglvbjpwwc0xmdmxodc4'},
 tt0417299:{minutes:23,source:'https://www.paramountplus.com/shows/video/Ei3gjTFVW3XTLupP9bMwVhbMQEcjZojT/'},
 tt6517102:{minutes:25,source:'https://www.netflix.com/title/80095241?s=i'},
 tt14833612:{minutes:28,source:'https://www.netflix.com/title/81436901'},
 tt10009170:{minutes:27,source:'https://www.netflix.com/title/81001988'},
});

export function animeStyleLabel(id) {
 return Object.hasOwn(animePilot,id)&&animePilot[id].origin==='western'?'В аниме-стиле':'';
}

// For shared screen titles preserve the existing cartoon storage key.
export function mediaLibraryDomain(domain,id) {
 return domain==='anime'&&Object.hasOwn(animePilot,id)?animePilot[id].otherDomain??domain:domain;
}

export function inLibraryDomain(row,domain) {
 return row.domain===domain || domain==='anime'&&Object.hasOwn(animePilot,row.id)&&animePilot[row.id].otherDomain===row.domain;
}
