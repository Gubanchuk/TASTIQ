// Shared client for every prototype page: keeps the dialogue state in the browser, posts each answer
// to /api/dialogue and hands the next screen to the page's own renderer. Pages differ only in design.
//
//   const client = createClient({ storageKey: 'tastiq.board', onScreen: (screen, state) => render(screen) });
//   client.start();                      // resumes a saved dialogue or opens step one
//   client.send({ type: 'choose', value: 'film' });
//   client.back(); client.restart();
//   await client.search('ведьмак 3');    // titles of the chosen domain
//   await client.parse('за атмосферу');  // free text → { positive, negative, understood }
//   await client.whyNot(id);             // which sieve removed a title, or its rank and score
//   client.log('take', { id });          // journal event
//   await client.aiStatus();             // { enabled, reason, locked }: may this browser use the AI picker
//   await client.aiPick({ wish });       // { result } with the model's four picks, or { error }

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

const MAX_HISTORY = 40;

// An anonymous id of this browser: AI access will later be granted per id (src/ai/access.js).
const UID_KEY = 'tastiq.uid';
function uidOf() {
  try {
    let id = localStorage.getItem(UID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(UID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function createClient({ storageKey, onScreen, onError = (e) => console.error(e) }) {
  let state = null;
  let screen = null;
  let busy = false;
  let history = [];
  let dialogueId = null;
  const historyKey = `${storageKey}.history`;

  // History is saved next to the state so «Назад» still works after a page reload.
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      localStorage.setItem(historyKey, JSON.stringify(history.slice(-MAX_HISTORY)));
      localStorage.setItem(`${storageKey}.dialogue-id`, JSON.stringify(dialogueId));
    } catch { /* private mode: memory only */ }
  };
  const load = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };

  // Returns true when the server answered; errors go to onError unless quiet.
  // onAnswer runs before the screen is rendered, so the page sees the updated history.
  async function post(action, { quiet = false, onAnswer } = {}) {
    if (busy) return false;
    busy = true;
    try {
      const out = await api('/api/dialogue', { state, action });
      const from = screen;
      onAnswer?.();
      if (!dialogueId || action?.type === 'restart') dialogueId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      state = out.state;
      screen = out.screen;
      save();
      // «from» is the screen the action was taken on; src/stand/journal-summary.js sums the journal by it.
      if (action) {
        const data = { from: from?.step, qid: from?.qid, step: screen.step, domain: state.domain, asked: state.asked?.length ?? 0, action };
        api('/api/log', { event: action.type, data }).catch(() => {});
      }
      onScreen(screen, state);
      return true;
    } catch (err) {
      if (!quiet) onError(err);
      return false;
    } finally {
      busy = false;
    }
  }

  return {
    get state() { return state; },
    get dialogueId() { return dialogueId; },
    get screen() { return screen; },
    get canGoBack() { return history.length > 0 && screen?.step !== 'domain'; },
    updateNote(text) {
      if(state?.step!=='anchors')return;
      const note=String(text??'').replace(/\s+/g,' ').trim().slice(0,300);
      const update=(s)=>({...s,note,intent:s?.intent?.sourceText===note?s.intent:null});
      state.situation=update(state.situation);
      // This describes tonight across screens, not an answer that Back should silently undo.
      for(const previous of history)if(previous?.domain===state.domain)previous.situation=update(previous.situation);
      save();
    },
    async confirmIntent(intent) {
      if (state?.step !== 'anchors') return;
      if (!await post({ type: 'confirm_intent', intent })) return;
      // Back must not resurrect an earlier interpretation of the same evening.
      for (const previous of history) if (previous?.domain === state.domain && previous.situation?.note === state.situation.note) {
        previous.situation = { ...previous.situation, intent: state.situation.intent };
      }
      save();
    },
    async start() {
      state = load(storageKey);
      const savedId = load(`${storageKey}.dialogue-id`);
      dialogueId = typeof savedId === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(savedId) ? savedId : null;
      const savedHistory = load(historyKey);
      history = state && Array.isArray(savedHistory) ? savedHistory : [];
      // A saved dialogue the server no longer accepts (e.g. after an engine change) starts over.
      if (state && (await post(null, { quiet: true }))) return;
      state = null;
      dialogueId = null;
      history = [];
      await post(null);
    },
    async send(action) {
      if (busy) return;
      // Result-screen actions (played, not now, fork) recompute in place and are not a step back target.
      // Only a step that went through becomes a back target: a failed send and its retry add one entry.
      const prev = state;
      const fromResult = screen?.step === 'result';
      await post(action, { onAnswer: () => { if (!fromResult) history.push(prev); } });
    },
    async back() {
      if (!history.length || busy) return;
      const prev = state;
      state = history.pop();
      if (!(await post(null))) {
        history.push(state);
        state = prev;
      }
    },
    async restart() {
      history = [];
      await post({ type: 'restart' });
    },
    search: (q) => api(`/api/search?domain=${state?.domain}&q=${encodeURIComponent(q)}`),
    parse: (text) => api('/api/parse', { text, domain: state?.domain }),
    whyNot: (id) => api('/api/why', { state, id }),
    log: (event, data) => api('/api/log', { event, data }).catch(() => {}),
    aiStatus: () => api(`/api/ai/status?uid=${encodeURIComponent(uidOf() ?? '')}`),
    aiPick: ({ wish = '', previous = [] } = {}) => api('/api/ai/pick', { state, wish, previous, uid: uidOf() }),
    aiIntent: () => api('/api/ai/intent', { domain: state?.domain, text: state?.situation?.note, uid: uidOf() }),
    feedback: (run) => api('/api/feedback', { run }),
  };
}
