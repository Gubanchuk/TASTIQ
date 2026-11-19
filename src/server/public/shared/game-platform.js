export const GAME_PLATFORM_KEY='tastiq.usual-game-platform.v1';
export const gamePlatformLabels={windows:'Windows',mac:'macOS',linux:'Linux',deck:'Steam Deck'};
const valid=id=>typeof id==='string'&&Object.hasOwn(gamePlatformLabels,id);

export function readUsualPlatform(storage){
 try{const id=storage?.getItem(GAME_PLATFORM_KEY);return valid(id)?id:null;}catch{return null;}
}
export function saveUsualPlatform(storage,id){
 if(!storage||id!==''&&!valid(id))return false;
 try{
  if(id)storage.setItem(GAME_PLATFORM_KEY,id);else storage.removeItem(GAME_PLATFORM_KEY);
  return readUsualPlatform(storage)===(id||null);
 }catch{return false;}
}

// If today's words mention hardware, ask the actual platform question. A
// reference to the old machine, a negation or a choice isn't an affirmative answer.
const devices=[
 /windows|винд\p{L}*|вин[0-9]+|mac(?:os|book)?|мак(?:е|а|ом|оси|бук\p{L}*)?|os\s*x/,
 /линукс\p{L}*|линух\p{L}*|linux|ubuntu|убунту|debian|mint|steam\s*deck|стим\s*д[еэ]к\p{L}*|дек[аеу]?/,
 /pc|пк|комп(?:[аеу]|ом|ьютер\p{L}*)?|ноут\p{L}*|платформ(?:[аыеу]|ой|ах)?|устройств\p{L}*|портатив\p{L}*/,
 /приставк\p{L}*|консол\p{L}*|xbox|playstation|плейстейш\p{L}*|ps\s*[345]|switch|nintendo|свитч\p{L}*/,
 /планшет\p{L}*|телефон\p{L}*|смартфон\p{L}*|android|андроид\p{L}*|ios|iphone|айфон\p{L}*/,
];
const deviceMention=new RegExp('(?<![\\p{L}\\p{N}])(?:'+devices.map(pattern=>pattern.source).join('|')+')(?![\\p{L}\\p{N}])','iu');
export function applicableGamePlatform(id,text=''){
 return valid(id)&&!deviceMention.test(text)?id:null;
}
