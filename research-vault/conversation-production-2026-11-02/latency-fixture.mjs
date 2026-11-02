// QA-only loopback proxy over the AI_ACCESS=off server. Never contacts an external service.
import {createServer} from 'node:http';
let companyAttempts=0;
const server=createServer(async(req,res)=>{
 try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const body=Buffer.concat(chunks),path=new URL(req.url,'http://127.0.0.1:5181');
  if(path.pathname==='/api/conversation'&&req.method==='POST'){
   const payload=JSON.parse(body);
   if(payload.action?.type==='answer'&&payload.action.questionId==='company'){
    companyAttempts++;
    await new Promise(resolve=>setTimeout(resolve,5000));
    if(companyAttempts===1){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Проверка восстановления: тестовый обрыв соединения.'}));return;}
   }
  }
  const destination='http://127.0.0.1:5180'+path.pathname+path.search;
  const response=await fetch(destination,{method:req.method,headers:{'Content-Type':req.headers['content-type']??'application/json'},...(!['GET','HEAD'].includes(req.method)?{body}:{})});
  res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')??'application/octet-stream','Cache-Control':'no-store'});
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
server.listen(5181,'127.0.0.1',()=>process.stdout.write('QA latency fixture http://127.0.0.1:5181 (AI off upstream)\n'));
