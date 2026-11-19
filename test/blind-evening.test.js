import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('a D4 participant receives three anonymous lists and the system key stays separate', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tastiq-d4-'));
 const input=join(dir,'case.private.json'),out=join(dir,'round');
 const card={id:'one',title:'Фильм <А>',year:2000};
 await writeFile(input,JSON.stringify({domain:'film',wish:'Вечер <дома>',baseline:[card],sameAnswers:[card],extraAnswers:[],conditions:{model:'private-model'}}));
 const generate=()=>spawnSync(process.execPath,[fileURLToPath(new URL('../research-vault/product-priorities-2026-11-19/blind-evening.mjs',import.meta.url)),input,out],{encoding:'utf8'});
 const first=generate();assert.equal(first.status,0,first.stderr);
 const html=await readFile(join(out,'participant.html'),'utf8'),key=JSON.parse(await readFile(join(out,'key.private.json'),'utf8'));
 assert.equal(key.lists.length,3);
 assert.deepEqual(new Set(key.lists.map(list=>list.system)),new Set(['baseline','sameAnswers','extraAnswers']));
 assert.equal(key.cards.length,1);
 assert.equal((html.match(/Фильм &lt;А&gt;/g)||[]).length,2);
 assert.doesNotMatch(html,/private-model|sameAnswers|extraAnswers|baseline|@@CASE@@/);
 assert.match(html,/Вечер &lt;дома&gt;/);
 assert.notEqual(generate().status,0);
});
