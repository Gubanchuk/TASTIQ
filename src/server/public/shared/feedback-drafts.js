import {REASONS} from './evening-feedback.js';
export const FEEDBACK_DRAFTS_KEY='tastiq.feedback-drafts.v1';
const validId=id=>typeof id==='string'&&id.includes(':')&&/^[a-zA-Z0-9:_.-]{1,240}$/.test(id);
function normalize(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 return {reason:typeof value.reason==='string'&&Object.hasOwn(REASONS,value.reason)?value.reason:'',note:typeof value.note==='string'?value.note.slice(0,300):''};
}
// Unsent local words are separate from feedback delivery. Every operation reads
// the latest envelope so game/watch/library instances preserve disjoint drafts.
export function createFeedbackDrafts({storage,key=FEEDBACK_DRAFTS_KEY}={}){
 let snapshot=new Map(),persistent=Boolean(storage?.getItem&&storage?.setItem);
 function read(){
  if(!persistent)return;
  try{
   const saved=JSON.parse(storage.getItem(key)??'null'),fresh=new Map();
   if(saved?.version===1&&Array.isArray(saved.entries))for(const entry of saved.entries){
    if(!Array.isArray(entry)||!validId(entry[0]))continue;const value=normalize(entry[1]);if(value)fresh.set(entry[0],value);
   }
   snapshot=fresh;
  }catch(error){if(error instanceof SyntaxError)snapshot=new Map();else persistent=false;}
 }
 function write(){if(persistent)try{storage.setItem(key,JSON.stringify({version:1,entries:[...snapshot]}));}catch{persistent=false;}}
 const api={
  get persistent(){return persistent;},
  get size(){read();return snapshot.size;},
  get(id){read();const value=snapshot.get(id);return value?{...value}:undefined;},
  has(id){read();return snapshot.has(id);},
  set(id,value){const draft=normalize(value);if(!validId(id)||!draft)return api;read();snapshot.set(id,draft);write();return api;},
  delete(id){read();const deleted=snapshot.delete(id);if(deleted)write();return deleted;},
  keys(){read();return [...snapshot.keys()][Symbol.iterator]();},
  values(){read();return [...snapshot.values()].map(value=>({...value}))[Symbol.iterator]();},
  entries(){read();return [...snapshot].map(([id,value])=>[id,{...value}])[Symbol.iterator]();},
  [Symbol.iterator](){return api.entries();},
 };
 read();return api;
}
