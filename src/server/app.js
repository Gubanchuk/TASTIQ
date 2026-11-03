// Prototype server: the step-by-step dialogue over in-memory catalogs, plus static pages (landing at /, picker at /pick/).
// The dialogue state lives in the browser and comes with every request; the server keeps nothing.
import { appendFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { catalogMeta, loadCatalogs } from '../core/catalog.js';
import { initialState, profileOf, reduce, screen, searchInDomain, sessionOf } from '../core/dialogue.js';
import { parseFreeText } from '../core/parse-text.js';
import { recommendIds, whyNot } from '../core/recommend.js';
import { ROOT } from '../lib/fsx.js';
import { aiAccess, aiSpend } from '../ai/access.js';
import { AI, aiPick } from '../ai/pick.js';
import { estimateCost } from '../ai/usage.js';
import { aiIntent, INTENT_VERSION } from '../ai/intent.js';
import {createFeedbackRepository,feedbackVerificationNamespace} from './feedback-repository.js';
import {createFeedbackService} from './feedback-service.js';
import { normalizeNote } from '../core/session-intent.js';
import { PaidBudget } from '../stand/paid-budget.js';
import { budgetTransport } from '../ai/budget-transport.js';
import { createConversationService } from './conversation-service.js';
import { createMediaConversationService } from './media-conversation-service.js';
import {journalPath} from './runtime-paths.js';
import {runQaRequest,qaReceipt,observeQaApi,isQaRequest} from './qa-observation.js';

const PUBLIC = resolve(ROOT, 'src', 'server', 'public');
const JOURNAL = journalPath();
const appendJournal=(content,encoding='utf8')=>{if(!isQaRequest())appendFileSync(JOURNAL,content,encoding);};
export const catalogs = loadCatalogs({ gamesPath: process.env.CATALOG_PATH, screenPath: process.env.SCREEN_CATALOG_PATH });
const feedbackService=createFeedbackService({catalogs,repository:createFeedbackRepository(),journal:row=>appendJournal(JSON.stringify(row)+'\n')});
const paidLedger = process.env.AI_EVAL_BUDGET_DIR ? new PaidBudget(resolve(process.env.AI_EVAL_BUDGET_DIR)) : null;
let aiOptions = {};
try {
  if (paidLedger) aiOptions = { api: budgetTransport({ ledger: paidLedger, batchId: process.env.AI_EVAL_BATCH_ID, cap: Number(process.env.AI_EVAL_BATCH_CAP) }) };
} catch (error) { paidLedger?.close(); throw error; }
if (paidLedger) {
  process.once('exit', () => paidLedger.close());
  process.once('SIGINT', () => process.exit(0));
  process.once('SIGTERM', () => process.exit(0));
}
aiOptions.api=observeQaApi(aiOptions.api);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  const billing=qaReceipt();
  res.end(JSON.stringify(billing&&body&&typeof body==='object'&&!Array.isArray(body)?{...body,qaBilling:billing}:body));
}

// The same AI request (dialogue, wish) within an hour is answered from memory: a reload or «Назад» costs nothing.
const aiCache = new Map();
const AI_CACHE_MS = 3_600_000;
const aiKey = (body) => JSON.stringify([body.state?.domain, body.state?.answers, body.state?.situation, body.state?.stops,
  body.state?.preferences, body.state?.corrections, body.state?.session, body.state?.platform, body.wish ?? '', body.previous ?? []]);
const clientIp = (req) => req.socket.remoteAddress ?? null;

// A request still running is shared too: «Повторить» after the page stopped waiting (15 s) joins it instead of
// paying for a second call.
const aiRunning = new Map();
const intentCache = new Map(), intentRunning = new Map();
const conversationService = createConversationService({catalogs, ...aiOptions, access:aiAccess, spend:aiSpend,
  journal:row=>appendJournal(JSON.stringify(row)+'\n','utf8')});
const mediaConversationServices=Object.fromEntries(['film','series','cartoon'].filter(domain=>catalogs[domain]).map(domain=>[
  domain,createMediaConversationService({domain,catalogs,...aiOptions,access:aiAccess,spend:aiSpend,
    journal:row=>appendJournal(JSON.stringify(row)+'\n','utf8')}),
]));

async function intentRoute(req, body) {
  const catalog = typeof body.domain === 'string' && Object.hasOwn(catalogs, body.domain) ? catalogs[body.domain] : null, text = normalizeNote(body.text);
  if (!catalog || !text) return { error: 'выбери раздел и напиши пожелание' };
  const who = { uid: typeof body.uid === 'string' ? body.uid.slice(0, 64) : null, ip: clientIp(req) };
  const key = JSON.stringify([INTENT_VERSION, AI.model, body.domain, text]);
  const hit = intentCache.get(key);
  if (hit && Date.now() - hit.at < AI_CACHE_MS) return hit.out;
  if (intentRunning.has(key)) return intentRunning.get(key);
  const access = aiAccess(who);
  if (!access.allowed) return { error: access.reason, locked: Boolean(access.locked) };
  aiSpend(who);
  const run = (async () => {
    const out = await aiIntent(catalog, text, aiOptions);
    appendJournal( JSON.stringify({ at: new Date().toISOString(), event: 'ai-intent', data: {
      domain: body.domain, model: out.model ?? AI.model, ms: out.ms ?? null, error: out.error ?? null,
      usage: out.usage ? { in: out.usage.input_tokens, out: out.usage.output_tokens, cached: out.usage.input_tokens_details?.cached_tokens ?? 0, estimatedUsd: estimateCost(out.usage, AI.model) } : null,
    } }) + '\n', 'utf8');
    if (!out.error) {
      for (const [oldKey, entry] of intentCache) if (Date.now() - entry.at >= AI_CACHE_MS) intentCache.delete(oldKey);
      if (intentCache.size >= 200) intentCache.delete(intentCache.keys().next().value);
      intentCache.set(key, { at: Date.now(), out });
    }
    return out;
  })().finally(() => intentRunning.delete(key));
  intentRunning.set(key, run);
  return run;
}

async function aiRoute(req, body) {
  const who = { uid: typeof body.uid === 'string' ? body.uid.slice(0, 64) : null, ip: clientIp(req) };
  const key = aiKey(body);
  const hit = aiCache.get(key);
  if (hit && Date.now() - hit.at < AI_CACHE_MS) return hit.out;
  if (aiRunning.has(key)) return aiRunning.get(key);
  const run = aiCall(who, body, key).finally(() => aiRunning.delete(key));
  aiRunning.set(key, run);
  return run;
}

async function aiCall(who, body, key) {
  const access = aiAccess(who);
  if (!access.allowed) return { error: access.reason, locked: Boolean(access.locked) };
  aiSpend(who);
  const state = body.state;
  const ai = await aiPick(catalogs, state, { ...aiOptions, wish: body.wish ?? '', previous: Array.isArray(body.previous) ? body.previous.slice(0, 12) : [] });
  appendJournal( JSON.stringify({ at: new Date().toISOString(), event: 'ai', data: { domain: state?.domain, model: ai.model ?? AI.model, ms: ai.ms ?? null, error: ai.error ?? null, wish: Boolean(body.wish), picks: ai.picks?.map((p) => p.id) ?? [], own: ai.picks?.filter((p) => p.own).map((p) => p.id) ?? [], dropped: ai.dropped ?? 0, usage: ai.usage ? { in: ai.usage.input_tokens, out: ai.usage.output_tokens, cached: ai.usage.input_tokens_details?.cached_tokens ?? 0, estimatedUsd: estimateCost(ai.usage, AI.model) } : null } }) + '\n', 'utf8');
  if (ai.error) return { error: ai.error };
  // The first AI.picks are shown; the model's picks after them are spares for the place of a removed card.
  const ids = [...ai.picks.slice(0, AI.picks).map((p) => p.id), ...(ai.filled ?? []), ...ai.picks.slice(AI.picks).map((p) => p.id)];
  const all = recommendIds(catalogs[state.domain], profileOf(state), sessionOf(state), ids);
  if (!all) return { error: 'нейросеть выбрала то, что уже отсеяно' };
  const cards = [all.top, ...all.alternatives];
  const byId = new Map(ai.picks.map((p) => [p.id, p]));
  for (const p of cards) {
    const pick = byId.get(p.id);
    if (pick) p.ai = { reason: pick.reason, caveat: pick.caveat, likelySeen: pick.likelySeen, own: pick.own };
  }
  const result = { ...all, alternatives: cards.slice(1, AI.picks), spares: cards.slice(AI.picks) };
  const out = { result: { ...result, ai: { understood: ai.understood, wish: body.wish ?? '', model: ai.model ?? AI.model, shortlist: ai.shortlist } } };
  aiCache.set(key, { at: Date.now(), out });
  return out;
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2_000_000) throw new Error('body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

const routes = {
  'GET /api/meta': () => catalogMeta(catalogs),
  'POST /api/conversation': (_,body,req) => conversationService(body,{uid:typeof body.uid==='string'?body.uid.slice(0,64):null,ip:clientIp(req)}),
  'POST /api/media-conversation': (_,body,req) => {
    const service=typeof body?.domain==='string'&&Object.hasOwn(mediaConversationServices,body.domain)?mediaConversationServices[body.domain]:null;
    if(!service)throw Object.assign(new Error('Выбери раздел: фильмы, сериалы или мультфильмы.'),{status:400});
    return service(body,{uid:typeof body.uid==='string'?body.uid.slice(0,64):null,ip:clientIp(req)});
  },
  'POST /api/dialogue': (_, body) => {
    let state = body.state ?? initialState();
    if (body.action) state = reduce(state, body.action, catalogs);
    return { state, screen: screen(state, catalogs) };
  },
  'GET /api/search': (url) => {
    const domain = url.searchParams.get('domain');
    return searchInDomain({ domain }, catalogs, url.searchParams.get('q') ?? '');
  },
  'POST /api/parse': (_, body) => parseFreeText(body.text ?? '', catalogs[body.domain]?.dict ?? catalogs.game.dict),
  'POST /api/why': (_, body) => {
    const s = body.state;
    return whyNot(catalogs[s.domain], body.id, profileOf(s), sessionOf(s));
  },
  // The AI picker: who may use it (today everyone, later paid or granted by hand, src/ai/access.js) and its picks.
  'GET /api/ai/status': (url, _, req) => {
    const access = aiAccess({ uid: url.searchParams.get('uid'), ip: clientIp(req) });
    return { enabled: access.allowed, reason: access.reason ?? null, locked: Boolean(access.locked), model: AI.model };
  },
  'POST /api/ai/pick': (_, body, req) => aiRoute(req, body),
  'POST /api/ai/intent': (_, body, req) => intentRoute(req, body),
  'POST /api/feedback': (_, body,req) => feedbackService(body,{qa:isQaRequest(),namespace:feedbackVerificationNamespace({run:qaReceipt()?.run,signature:req.headers['x-tastiq-feedback-probe']})}),
  'POST /api/log': (_, body) => {
    appendJournal( JSON.stringify({ at: new Date().toISOString(), ...body }) + '\n', 'utf8');
    return { ok: true };
  },
};

export async function handler(req,res){return runQaRequest(req,()=>handleRequest(req,res));}
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (handler) return send(res, 200, await handler(url, req.method === 'POST' ? await readBody(req) : null, req));
    // "/" is the landing, "/pick/" the picker: a folder address serves its index.html.
    const path = resolve(PUBLIC, url.pathname.endsWith('/') ? `.${url.pathname}index.html` : `.${url.pathname}`);
    if (!path.startsWith(PUBLIC) || !existsSync(path)) return send(res, 404, { error: 'not found' });
    if (statSync(path).isDirectory()) { // "/pick" → "/pick/", so the page's relative links resolve
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(readFileSync(path));
  } catch (err) {
    if (err.status !== 400) console.error(err);
    const feedbackStatus=url.pathname==='/api/feedback'&&[409,503].includes(err.status)?err.status:null;
    send(res, feedbackStatus??(err.status === 400 ? 400 : 500), { error: err.message });
  }
}
