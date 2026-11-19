export const FEEDBACK_KEY='tastiq.site.evenings';
export const OUTCOME_ARCHIVE_KEY='tastiq.site.evening-outcomes.v1';

// Both records commit in one IndexedDB transaction. Older tabs only know FEEDBACK_KEY.
// localStorage is only a startup cache / legacy import and a cross-tab change notification.
export function feedbackTransactions(storage, indexedDB=globalThis.indexedDB, databaseName='tastiq-evenings') {
  if(!indexedDB)return null;
  let connection;
  const open=()=>connection??=new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>reject(request.error);
  });
  return async function transaction(fn) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('snapshots','readwrite'),table=tx.objectStore('snapshots');
      const keys=[FEEDBACK_KEY,OUTCOME_ARCHIVE_KEY], values=new Map(), dirty=new Set();
      let result,thrown;
      for(const key of keys){
        const request=table.get(key);
        request.onsuccess=()=>{
          try{
            let value=request.result;
            if(value===undefined){
              try{value=storage?.getItem(key)??null;}catch{value=null;}
              if(value!==null)dirty.add(key);
            }
            values.set(key,value);
            if(values.size<keys.length)return;
            result=fn({
              getItem:key=>values.get(key)??null,
              setItem:(key,value)=>{values.set(key,value);dirty.add(key);},
            });
            for(const key of dirty)table.put(values.get(key),key);
          }catch(error){thrown=error;tx.abort();}
        };
      }
      tx.oncomplete=()=>{
        for(const key of dirty)try{storage?.setItem(key,values.get(key));}catch{/* IndexedDB remains authoritative. */}
        resolve(result);
      };
      tx.onabort=()=>reject(thrown??tx.error??Error('Feedback transaction aborted'));
      tx.onerror=()=>{}; // onabort handles request and commit failures.
    });
  };
}
