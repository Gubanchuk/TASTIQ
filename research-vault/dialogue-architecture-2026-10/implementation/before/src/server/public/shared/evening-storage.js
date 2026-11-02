// IndexedDB read/write transactions serialize the authoritative snapshot across tabs.
// localStorage is only a startup cache / legacy import and a cross-tab change notification.
export function feedbackTransactions(storage, indexedDB=globalThis.indexedDB) {
  if(!indexedDB)return null;
  let connection;
  const open=()=>connection??=new Promise((resolve,reject)=>{
    const request=indexedDB.open('tastiq-evenings',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>reject(request.error);
  });
  return async function transaction(fn) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('snapshots','readwrite'),table=tx.objectStore('snapshots'),key='tastiq.site.evenings';
      const request=table.get(key);let value,result,dirty=false,thrown;
      request.onsuccess=()=>{
        try {
          value=request.result;
          if(value===undefined){try{value=storage?.getItem(key)??null;}catch{value=null;}dirty=value!=null;}
          result=fn({getItem:()=>value,setItem:(_,next)=>{value=next;dirty=true;}});
          if(dirty)table.put(value,key);
        } catch(error){thrown=error;tx.abort();}
      };
      tx.oncomplete=()=>{if(dirty)try{storage?.setItem(key,value);}catch{/* the database remains durable */}resolve(result);};
      tx.onabort=()=>reject(thrown??tx.error??Error('Feedback transaction aborted'));
      tx.onerror=()=>{}; // onabort handles request and commit failures.
    });
  };
}
