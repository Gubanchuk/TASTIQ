import { IMDB_GENRE_FEATURES } from '../aspects/genome-tags.js';
import { animePilot, animeFirstEpisodes } from '../server/public/shared/anime-pilot.js';

const ghibli = 'https://www.ghibli.jp/works/';
const hosoda = 'https://gkids.com/hosoda/';
// Independently checked release facts. Genre labels and short summaries are editorial.
const films = new Map([
 ['tt0087544',['Nausicaä of the Valley of the Wind',1984,116,'Adventure Sci-Fi',ghibli,'Принцесса ищет способ остановить войну в мире, где люди боятся ядовитого леса.']],
 ['tt0092067',['Castle in the Sky',1986,124,'Adventure Fantasy',ghibli,'Двое подростков ищут летающий город и пытаются опередить военных.']],
 ['tt0095327',['Grave of the Fireflies',1988,88,'Drama War',ghibli,'Брат и сестра пытаются выжить в Японии в последние месяцы войны.']],
 ['tt0096283',['My Neighbor Totoro',1988,86,'Fantasy Family',ghibli,'Две сестры знакомятся с лесным духом после переезда в деревню.']],
 ['tt0097814',["Kiki’s Delivery Service",1989,102,'Fantasy Family',ghibli,'Молодая ведьма начинает доставлять посылки в приморском городе.']],
 ['tt0102587',['Only Yesterday',1991,119,'Drama Romance',ghibli,'Поездка из Токио в деревню заставляет героиню вспомнить детство и переосмыслить свою жизнь.']],
 ['tt0104652',['Porco Rosso',1992,93,'Adventure Comedy',ghibli,'Лётчик с обликом свиньи сражается с воздушными пиратами над Адриатикой.']],
 ['tt0113824',['Whisper of the Heart',1995,111,'Drama Romance',ghibli,'Школьница замечает одну и ту же фамилию в библиотечных книгах и находит повод попробовать писать.']],
 ['tt0119698',['Princess Mononoke',1997,133,'Adventure Fantasy',ghibli,'Путник оказывается между жителями железного города и духами леса.']],
 ['tt0245429',['Spirited Away',2001,125,'Adventure Fantasy',ghibli,'Девочка устраивается в купальню для духов, чтобы спасти родителей.']],
 ['tt0347149',["Howl’s Moving Castle",2004,119,'Adventure Fantasy',ghibli,'Заколдованная девушка отправляется в ходячий замок волшебника.']],
 ['tt0876563',['Ponyo',2008,101,'Fantasy Family',ghibli,'Мальчик подружился с рыбкой, которая хочет стать человеком.']],
 ['tt1568921',['The Secret World of Arrietty',2010,94,'Fantasy Family',ghibli,'Крошечная героиня добывает необходимое в доме людей и неожиданно находит друга.']],
 ['tt2576852',['The Tale of The Princess Kaguya',2013,137,'Drama Fantasy',ghibli,'Семья находит девочку в бамбуковом стебле. Со временем от неё ждут жизни при дворе.']],
 ['tt1474276',['Summer Wars',2009,114,'Adventure Sci-Fi',hosoda,'Семейный праздник прерывается, когда сбой виртуального мира начинает влиять на реальный.']],
 ['tt2140203',['Wolf Children',2012,117,'Drama Fantasy',hosoda,'Молодая мать воспитывает двоих детей, которые могут превращаться в волков.']],
 ['tt5311514',['Your Name.',2016,null,'Romance Fantasy',null,'Подростки из Токио и небольшого города начинают просыпаться в телах друг друга.']],
 ['tt5323662',['A Silent Voice',2016,null,'Drama',null,'Бывший школьный задира пытается загладить вину перед девочкой, которую травил.']],
 ['tt9426210',['Weathering With You',2019,113,'Romance Fantasy','https://www.bbfc.co.uk/release/weathering-with-you-q29sbgvjdglvbjpwwc00otyyodg','В дождливом Токио подросток знакомится с девушкой, которая может ненадолго разгонять облака.']],
 ['tt1288461',["Gurren Lagann the Movie: Childhood’s End",2008,null,'Action Sci-Fi',null,'Двое друзей покидают подземное поселение на боевой машине.']],
 ['tt3666024',['The Red Turtle',2016,81,'Drama Fantasy','https://www.ghibli.jp/works/red-turtle/','После кораблекрушения человек оказывается на необитаемом острове и встречает красную черепаху.']],
]);

const series = new Map([
 ['tt16969708',['Scott Pilgrim Takes Off',2023,'Comedy Fantasy',null,'Знакомство Скотта и Рамоны меняет привычную историю о семи бывших.']],
 ['tt0213338',['Cowboy Bebop',1998,'Adventure Sci-Fi','Ended','Команда охотников за головами ищет работу по всей Солнечной системе.']],
 ['tt0877057',['Death Note',2006,'Thriller Mystery','Ended','Школьник получает тетрадь, способную убивать, и вступает в противостояние с детективом.']],
 ['tt14134550',['Odd Taxi',2021,'Mystery Drama','Ended','Поездки с разными пассажирами втягивают таксиста в историю об исчезновении девушки.']],
 ['tt5249462',['Erased',2016,'Mystery Thriller','Ended','Герой возвращается в своё детство и пытается предотвратить исчезновение одноклассницы.']],
 ['tt5897304',['Mob Psycho 100',2016,'Comedy Fantasy','Ended','Подросток с необычной силой работает у самозваного экстрасенса и пытается понять себя.']],
 ['tt0417299',['Avatar: The Last Airbender',2005,'Adventure Fantasy','Ended','Аанг и его друзья путешествуют по миру четырёх стихий и пытаются остановить войну.']],
 ['tt6517102',['Castlevania',2017,'Horror Fantasy','Ended','Охотник, волшебница и сын Дракулы объединяются против армии чудовищ.']],
 ['tt14833612',['Castlevania: Nocturne',2023,'Horror Fantasy',null,'Наследник охотников на вампиров собирает союзников во время Французской революции.']],
 ['tt10009170',['Blood of Zeus',2020,'Action Fantasy','Ended','Юноша узнаёт о своём родстве с Зевсом и оказывается между враждующими богами.']],
]);

const corrections = {
 tt0382932:['Ratatouille','Рататуй',2007,111,'Comedy Family','https://movies.disney.com/ratatouille','Крыса с талантом повара помогает новичку на парижской кухне.'],
 tt0120587:['Antz','Муравей Антц',1998,83,'Adventure Comedy','https://www.dreamworks.com/movies/antz','Рабочий муравей меняется местами с солдатом и неожиданно оказывается в центре заговора.'],
};

function editorialItem({id,domain,kind,name,ru,aliases,year,runtime,runtimeSource,genre,link,status,summary,source='editorial'}) {
 const genres = [...(Array.isArray(genre)?genre:genre.split(' ')),'Animation'];
 const features = {};
 for(const label of genres)for(const [feature,strength] of IMDB_GENRE_FEATURES[label]??[]){
  if((features[feature]?.r??0)>=strength)continue;
  features[feature]={r:strength,c:.65,src:[source],ev:[{id:`${source}:${label}`,kind:'genre',q:label,url:link}]};
 }
 return {id,work:id,domain,kind,name,ru,aliases,year,runtime,runtimeSource,genres,features,link,status,summary,
  released:true,reviews:{total:0,ratio:null,desc:null},quality:.75,popularity:0};
}

export function animeReleaseItem(id) {
 const entry=animePilot[id];
 const film=films.get(id),serial=series.get(id);
 if(!entry||(!film&&!serial))return null;
 const [ru,...aliases]=entry.names;
 const [name,year]=film??serial;
 const first=animeFirstEpisodes[id];
 const item=editorialItem({id,domain:'anime',kind:film?'film':'series',name,ru,aliases,year,
  runtime:film?film[2]:first?.minutes??null,runtimeSource:film?film[4]:first?.source,genre:film?film[3]:serial[2],
  link:entry.source,status:serial?.[3]??null,summary:film?film[5]:serial[4]});
 return {...item,...(first?{firstEpisodeMinutes:first.minutes}:{}),animeOrigin:entry.origin,standalone:entry.standalone};
}

export function cartoonCorrection(id) {
 if(!Object.hasOwn(corrections,id))return null;
 const [name,ru,year,runtime,genre,link,summary]=corrections[id];
 return editorialItem({id,domain:'cartoon',kind:'film',name,ru,aliases:[],year,runtime,runtimeSource:link,genre,link,status:null,summary});
}

// Alternate spellings of the original titles, verified against the release identities.
const verifiedAnimeAliases=new Map([
 ['tt11428586',['Somali to Mori no Kamisama','Somari to Mori no Kamisama']],
 ['tt1158671',['Ookami to Koushinryou','Ōkami to Kōshinryō']],
 ['tt1352421',['Natsume Yuujinchou','Natsume Yūjin-chō','Natsume Yujin-cho']],
]);

// A numbered title can still be an independent story. Only annotate releases
// whose distributor identifies the viewing order; leave all other rows unknown.
const viewingOrder=new Map([
 ['tt0169858',{standalone:false,priorTitleId:'tt0112159',viewingOrderSource:'https://gkids.com/films/end-of-evangelion/'}],
 ['tt0988824',{standalone:false,priorTitleId:'tt0409591',viewingOrderSource:'https://naruto-official.com/en/news/01_1296'}],
 ['tt11032374',{standalone:false,priorTitleId:'tt9335498',viewingOrderSource:'https://aniplexusa.com/pdf/PR_031621_DSKY.pdf'}],
 ['tt0347246',{standalone:true,viewingOrderSource:'https://gkids.com/2024/04/17/gkids-acquires-theatrical-rights-to-renowned-director-mamoru-oshiis-ghost-in-the-shell-2-innocence/'}],
]);

export function verifiedAnimeItem(row) {
 if(!row)return null;
 const {id,qid,source,kind,name,ru,original,year,runtime,genres}=row;
 const fromWikidata=/^Q[1-9]\d*$/.test(qid??'');
 const link=fromWikidata?`https://www.wikidata.org/wiki/${qid}`:source;
 if(typeof link!=='string'||!URL.canParse(link))return null;
 const origin=new URL(link);
 if(origin.protocol!=='https:'||origin.username||origin.password)return null;
 const first=kind==='series'?animeFirstEpisodes[id]:null;
 const suppliedAliases=Array.isArray(row.aliases)?row.aliases.filter(alias=>typeof alias==='string'):[];
 const aliases=[...new Set([original,...suppliedAliases,...(verifiedAnimeAliases.get(id)??[])].filter(Boolean))];
 const item=editorialItem({id,domain:'anime',kind,name,ru,aliases,year,runtime:first?.minutes??runtime,
  runtimeSource:first?.source??(runtime?link:null),genre:genres,link,status:null,summary:null,source:fromWikidata?'wikidata':'editorial'});
 const release=Object.fromEntries(['releaseDate','releaseMonth','releaseSeason','releasePrecision']
   .filter(field=>typeof row[field]==='string').map(field=>[field,row[field]]));
 // These records have less evidence than the manually reviewed titles.
 return {...item,...release,...(first?{firstEpisodeMinutes:first.minutes}:{}),animeOrigin:'japanese',standalone:null,...viewingOrder.get(id),quality:.69};
}
