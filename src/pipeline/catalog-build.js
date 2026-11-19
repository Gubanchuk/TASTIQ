import { randomUUID } from 'node:crypto';
import { mkdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { DATA, RAW, readJson } from '../lib/fsx.js';

// Only stage the artifact. The versioned runtime snapshot is the accepted baseline;
// old downloads can omit whole batches, carry an old value, or include a rejected ID.
export function catalogBuildOptions(filename, argv = process.argv.slice(2)) {
  const {values} = parseArgs({args:argv, options:{
    'out-dir':{type:'string',default:join(RAW,'catalog-build')},
    baseline:{type:'string',default:join(DATA,filename)},
    decisions:{type:'string'},
  }});
  const output = resolve(values['out-dir']);
  const baseline = realpathSync(values.baseline);
  mkdirSync(output,{recursive:true});
  const destination = realpathSync(output);
  if (relative(realpathSync(DATA),destination) === '' || relative(baseline,join(destination,filename)) === '') {
    throw Error('Choose a staging directory separate from data/ and the baseline');
  }
  return {output, baseline, decisions:values.decisions ? readJson(values.decisions) : {}};
}

function indexItems(items) {
  const byId = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id || byId.has(item.id)) throw Error('Missing or duplicate catalog ID: '+item?.id);
    byId.set(item.id,item);
  }
  return byId;
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = values => Array.isArray(values) && new Set(values).size === values.length && values.every(v=>typeof v === 'string' && v.length);

export function mergeCatalogBuild(released, compiled, decisions = {}) {
  if (!object(decisions) || Object.keys(decisions).some(k=>!['add','remove','update'].includes(k))) throw Error('Unknown catalog decision');
  const {add = [], remove = [], update = {}} = decisions;
  if (!strings(add) || !strings(remove) || !object(update)) throw Error('Invalid catalog decisions');
  const previous = indexItems(released), raw = indexItems(compiled);
  const removed = new Set(remove);
  for (const id of add) if (previous.has(id) || !raw.has(id)) throw Error('Not a new source ID: '+id);
  for (const id of remove) if (!previous.has(id)) throw Error('Cannot remove an unknown release ID: '+id);
  for (const [id, fields] of Object.entries(update)) {
    if (!previous.has(id) || !raw.has(id) || removed.has(id) || !strings(fields) || !fields.length ||
        fields.some(f=>['id','__proto__','constructor','prototype'].includes(f) || !Object.hasOwn(raw.get(id),f))) {
      throw Error('Invalid fields selected for update: '+id);
    }
  }
  const report = {availableAdditions:compiled.filter(row=>!previous.has(row.id)).map(row=>row.id),releaseOnly:[],updates:{}};
  const items = [];
  for (const row of released) {
    const source = raw.get(row.id);
    if (!source) report.releaseOnly.push(row.id);
    else {
      const fields = Object.keys(source).filter(f=>!isDeepStrictEqual(source[f],row[f]));
      if (fields.length) report.updates[row.id] = fields;
    }
    if (removed.has(row.id)) continue;
    if (!Object.hasOwn(update,row.id)) items.push(row);
    else items.push({...row,...Object.fromEntries(update[row.id].map(f=>[f,source[f]]))});
  }
  for (const id of add) items.push(raw.get(id));
  return {items,report};
}

export function catalogSnapshot(release, fields) {
  const changed = Object.entries(fields).some(([key,value])=>!isDeepStrictEqual(value,release[key]));
  if (!changed) return release;
  const timestamp = process.env.SOURCE_DATE_EPOCH;
  const builtAt = timestamp === undefined ? new Date() : new Date(Number(timestamp)*1000);
  return {...release,...fields,builtAt:builtAt.toISOString()};
}

export function writeBuildJson(path,value) {
  const pending = join(dirname(path),'.catalog-build-'+randomUUID()+'.tmp');
  try {
    writeFileSync(pending,JSON.stringify(value)+'\n',{flag:'wx'});
    renameSync(pending,path);
  } finally {
    rmSync(pending,{force:true});
  }
}
