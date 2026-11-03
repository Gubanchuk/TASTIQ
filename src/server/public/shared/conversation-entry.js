// Shared by browser and server: the first question never needs a network round trip.
const genres={
 game:[['rpg','RPG'],['action','Экшен'],['shooter','Шутер','loop.shooting'],['strategy','Стратегия'],['simulation','Симулятор'],['racing','Гонки','loop.driving'],['puzzle','Головоломки','loop.puzzles'],['adventure','Приключения'],['survival','Выживание','loop.survival'],['horror','Хоррор','tone.creepy'],['open_world','Открытый мир','freedom.open_world'],['sandbox','Песочница','freedom.sandbox']],
 watch:[['comedy','Комедия'],['drama','Драма'],['thriller','Триллер'],['adventure','Приключения'],['fantasy','Фантастика'],['detective','Детектив']],
};
export const gameGenreDirections=genres.game.map(([id,label])=>[id,label,null,({rpg:'RPG',action:'Action',strategy:'Strategy',simulation:'Simulation',adventure:'Adventure'})[id]]);
export function initialDirectionQuestion(domain='game'){
 const game=domain==='game';
 const moods=[['mood_action','Хочется движухи'],['mood_relax','Расслабиться и отвлечься'],['mood_story','Погрузиться в историю'],['mood_explore',game?'Исследовать мир':'Перенестись в другой мир'],['mood_thought','Подумать о сложном']];
 const avoids=game?[['avoid_stress','Не хочу напрягаться','tension.high'],['avoid_learning','Не хочу разбираться в новых механиках'],['avoid_grind','Без однообразного фарма','progression.grind']]:[['avoid_stress','Не хочу напрягаться'],['avoid_dark','Без тяжёлых тем'],['avoid_slow','Без медленного начала']];
 return {id:'direction',title:game?'Во что тянет сегодня?':domain==='series'?'Какой сериал хочется сегодня?':domain==='cartoon'?'Какую анимацию хочется сегодня?':'Какой фильм хочется сегодня?',
  why:'Выбери, чего хочется. Можно отметить несколько вариантов или написать своё.',multiple:true,controls:['unknown','indifferent','none'],
  options:[...moods,...genres[game?'game':'watch'],...avoids].map(([id,label,feature])=>({id,label,...(feature?{feature}:{})}))};
}
export function initialConversation({domain='game',id=crypto.randomUUID(),mode}={}){
 if(!['game','film','series','cartoon'].includes(domain))throw TypeError('Неизвестный раздел подбора.');
 const media=domain!=='game';
 return {version:1,...(media?{domain}:{}),id,revision:0,mode:mode==='free'?'free':'guided',phase:'direction',
  context:media?{company:null,childAge:null,minutes:null,timeMode:null,commitment:null,onlyEnded:null,format:null}:{platform:null,company:null,partySize:null},
  ...(media?{contextEvidence:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null}}:{}),
  turns:[],facts:[],question:initialDirectionQuestion(domain),summary:'',uncertainties:[],retractions:[],sessionTime:null,factRemovalUndo:null,result:null,provisional:false,needsPlan:false,
  ...(media?{failedAction:null}:{}),familiar:{marked:[],keep:[],hidden:[],excluded:[],undo:null},replacement:null};
}
export function initialConversationSnapshot(options={}){
 const state=initialConversation(options),media=options.domain&&options.domain!=='game';
 return {state,screen:{...(media?{domain:state.domain}:{}),summary:'',facts:[],uncertainties:[],context:state.context,sessionTime:null,canUndoFactRemoval:false,canBack:false,provisional:false,turns:[],type:'question',question:state.question}};
}
