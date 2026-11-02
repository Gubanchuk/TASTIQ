import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {DATA} from '../lib/fsx.js';

// Vercel's deployment files are immutable. Its temporary journal is not durable analytics.
export function journalPath({env=process.env,dataDir=DATA,tempDir=tmpdir()}={}){
 return resolve(env.JOURNAL_PATH??(env.VERCEL==='1'?join(tempDir,'tastiq-journal.ndjson'):join(dataDir,'journal.ndjson')));
}
