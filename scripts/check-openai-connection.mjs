// Read-only deployment diagnostic: one model GET, no generation or prompt data.
export async function checkOpenAIConnection({env=process.env,fetcher=globalThis.fetch}={}) {
 const model=(env.OPENAI_MODEL??'gpt-6.1-sol').trim(),key=env.OPENAI_API_KEY?.trim(),started=Date.now();
 if(!key)return {connected:false,reason:'missing_key',model};
 try {
  const response=await fetcher('https://api.openai.com/v1/models/'+encodeURIComponent(model),{
   headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000),
  });
  const body=await response.json().catch(()=>null);
  return {connected:response.ok&&body?.id===model,model,status:response.status,
   code:typeof body?.error?.code==='string'?body.error.code:null,
   requestId:response.headers.get('x-request-id'),ms:Date.now()-started};
 }catch(error){return {connected:false,model,reason:error.name==='TimeoutError'?'timeout':'network_error',ms:Date.now()-started};}
}
