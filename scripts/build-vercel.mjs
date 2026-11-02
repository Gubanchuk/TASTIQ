import {cpSync,existsSync,lstatSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const runtimeData=['catalog.json','catalog-screen.json','quotes-ru.json','posters.json','verified-game-context.json','verified-game-releases.json'];
export function buildVercel({root=resolve(dirname(fileURLToPath(import.meta.url)),'..')}={}){
 root=resolve(root);
 for(const name of runtimeData)if(!existsSync(join(root,'data',name)))throw Error(`Required runtime data missing: data/${name}`);
 const parent=join(root,'.vercel'),output=resolve(parent,'output');
 if(dirname(output)!==parent||[parent,output].some(p=>existsSync(p)&&lstatSync(p).isSymbolicLink()))throw Error('Unsafe Vercel output path');
 // Only remove the verified, generated output folder; local settings and env files stay outside it.
 rmSync(output,{recursive:true,force:true});
 const fn=join(output,'functions/tastiq.func');mkdirSync(fn,{recursive:true});
 cpSync(join(root,'src/server/public'),join(output,'static'),{recursive:true});
 cpSync(join(root,'src'),join(fn,'src'),{recursive:true});
 mkdirSync(join(fn,'data'),{recursive:true});
 for(const name of runtimeData)cpSync(join(root,'data',name),join(fn,'data',name));
 writeFileSync(join(fn,'package.json'),JSON.stringify({private:true,type:'module'}));
 writeFileSync(join(fn,'handler.mjs'),"export {handler as default} from './src/server/app.js';\n");
 writeFileSync(join(fn,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'handler.mjs',launcherType:'Nodejs',shouldAddHelpers:false,maxDuration:60}));
 writeFileSync(join(output,'config.json'),JSON.stringify({version:3,routes:[{handle:'filesystem'},{src:'/(.*)',dest:'/tastiq'}]},null,2));
 return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.TASTIQ_CHECK_OPENAI==='1'){
  const {checkOpenAIConnection}=await import('./check-openai-connection.mjs');
  console.log('OpenAI connection check:',JSON.stringify(await checkOpenAIConnection()));
 }
 const output=buildVercel();console.log(`Vercel output ready: ${output}`);
}
