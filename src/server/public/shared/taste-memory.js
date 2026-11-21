export const TASTE_MEMORY_PREFIX = 'tastiq.taste-memory.v1:';
const domains = new Set(['game', 'film', 'series', 'cartoon', 'anime']);
const states = new Set(['active', 'disabled', 'deleted', 'suppressed', 'released']);
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9:_.-]{1,160}$/.test(value);
const visible = row => row.state === 'active' || row.state === 'disabled';
const conflict = () => Error('Запись изменилась. Открой её ещё раз, чтобы увидеть текущую версию.');
const unavailable = () => Error('Память этого браузера недоступна. Изменение не сохранено.');
const activeLimit = 30;

function sourceOf(source = {kind:'manual'}) {
  if (!['manual', 'review', 'answer'].includes(source?.kind) ||
      source.kind !== 'manual' && !validId(source.id)) {
    throw Error('Не удалось определить источник записи.');
  }
  const result = source.kind === 'manual' ? {kind:'manual'} : {kind:source.kind, id:source.id};
  for (const [field, max] of [['title', 500], ['evidence', 4096]]) {
    if (source[field] == null) continue;
    if (typeof source[field] !== 'string' || source[field].length > max) {
      throw Error('Слишком длинное описание источника.');
    }
    if (source[field].trim()) result[field] = source[field].trim();
  }
  return result;
}

const origin = ({kind, id}) => id ? {kind, id} : {kind};
const sameSource = (row, domain, kind, id) =>
  row.domain === domain && row.source.kind === kind && row.source.id === id;
const sourceRow = (rows, domain, kind, id) => rows.find(row => sameSource(row, domain, kind, id));
const recordKey = (domain, source, id) =>
  TASTE_MEMORY_PREFIX + [domain, source.kind, source.id ?? id].join('/');
const publicRow = row => ({...structuredClone(row), enabled:row.state === 'active'});

function readRecord(raw, key) {
  if (raw === null) return null;
  const row = JSON.parse(raw);
  if (row?.version !== 1 || !domains.has(row.domain) || !validId(row.id)
    || !states.has(row.state) || !Number.isSafeInteger(row.revision) || row.revision < 1
    || typeof row.updatedAt !== 'string' || !row.source
    || recordKey(row.domain, sourceOf(row.source), row.id) !== key
    || visible(row) && (typeof row.text !== 'string' || !row.text.trim() || row.text.length > 300)) {
    throw unavailable();
  }
  return row;
}

function ensureRoom(rows, domain) {
  if (rows.filter(row => row.domain === domain && row.state === 'active').length >= activeLimit) {
    throw Error('В этом разделе уже 30 включённых записей. Сначала отключи одну из них.');
  }
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // getRandomValues also works on local HTTP origins that lack randomUUID.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// A readwrite transaction holds an exclusive lock across tabs. The auxiliary store never contains user data.
function withDatabaseLock(database, change) {
  return new Promise((resolve, reject) => {
    const request = database.open('tastiq-memory-lock', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mutex');
    request.onerror = () => reject(unavailable());
    request.onsuccess = () => {
      const db = request.result;
      let tx;
      try { tx = db.transaction('mutex', 'readwrite'); }
      catch { db.close(); reject(unavailable()); return; }
      let result, error;
      tx.objectStore('mutex').count().onsuccess = () => {
        try { result = change(); }
        catch (reason) { error = reason; tx.abort(); }
      };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = () => { db.close(); reject(error ?? unavailable()); };
    };
  });
}

export function createTasteMemory({storage, now = () => new Date().toISOString(), id = newId, locks, database} = {}) {
  let readable = Boolean(storage), writeFailed = false;
  function read(required = false) {
    try {
      const count = storage?.length;
      if (!Number.isSafeInteger(count) || typeof storage.key !== 'function') throw unavailable();
      const rows = [];
      for (let index = 0; index < count; index++) {
        const key = storage.key(index);
        if (!key?.startsWith(TASTE_MEMORY_PREFIX)) continue;
        const row = readRecord(storage.getItem(key), key);
        if (row) rows.push(row);
      }
      readable = true;
      return rows;
    } catch {
      readable = false;
      if (required) throw unavailable();
      return null;
    }
  }

  function write(prior, record) {
    const key = recordKey(record.domain, record.source, record.id);
    let current;
    try { current = readRecord(storage.getItem(key), key); }
    catch { readable = false; throw unavailable(); }
    if (current?.revision !== prior?.revision || current?.id !== prior?.id) throw conflict();
    const row = {...record, version:1, revision:(prior?.revision ?? 0) + 1, updatedAt:now()};
    try { storage.setItem(key, JSON.stringify(row)); }
    catch { writeFailed = true; throw unavailable(); }
    writeFailed = false;
    return publicRow(row);
  }

  function checkRevision(prior, expected) {
    if (expected !== undefined && expected !== (prior?.revision ?? 0)) throw conflict();
  }
  function editable(rows, id, expected) {
    const row = rows.find(item => item.id === id);
    if (!row || !visible(row)) throw conflict();
    checkRevision(row, expected);
    return row;
  }
  function reviewId(domain, entry) {
    const key = typeof entry === 'string' ? entry : entry?.id;
    if (!domains.has(domain) || !validId(key) || entry?.context?.domain && entry.context.domain !== domain) {
      throw Error('Не удалось определить отзыв и его раздел.');
    }
    return key;
  }
  return {
    get persistent() { return readable && !writeFailed; },
    // Pass a synchronous save/toggle/remove operation. Its revision check runs after the lock is acquired.
    async mutate(change) {
      let manager, fallback;
      try { manager = locks === undefined ? globalThis.navigator?.locks : locks; } catch {}
      if (manager?.request) return manager.request('tastiq.taste-memory.write', () => change());
      try { fallback = database === undefined ? globalThis.indexedDB : database; } catch {}
      if (fallback) return withDatabaseLock(fallback, change);
      if (typeof window === 'undefined') return change();
      throw unavailable();
    },
    all() {
      return (read() ?? []).filter(visible).sort((a,b) =>
        b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).map(publicRow);
    },
    save({id:recordId, domain, text, source, expectedRevision}) {
      const rows = read(true);
      if (!domains.has(domain)) throw Error('Выбери раздел для этой записи.');
      text = typeof text === 'string' ? text.trim() : '';
      if (!text || text.length > 300) throw Error('Напиши от 1 до 300 символов.');
      let prior;
      if (recordId !== undefined) {
        prior = editable(rows, recordId, expectedRevision);
        if (prior.domain !== domain || source &&
          !sameSource(prior, domain, source.kind, source.id)) throw conflict();
        return write(prior, {...prior, text});
      }
      source = sourceOf(source);
      if (source.id) prior = sourceRow(rows, domain, source.kind, source.id);
      checkRevision(prior, expectedRevision);
      if (prior && (visible(prior) || expectedRevision === undefined && prior.state !== 'released')) throw conflict();
      ensureRoom(rows, domain);
      if (source.kind === 'manual') source.evidence = text;
      return write(prior, {id:prior?.id ?? id(), domain, text, source, state:'active'});
    },
    setEnabled(recordId, enabled, expectedRevision) {
      const rows = read(true), row = editable(rows, recordId, expectedRevision);
      if (typeof enabled !== 'boolean') throw Error('Не удалось изменить использование записи.');
      if ((row.state === 'active') === enabled) return publicRow(row);
      if (enabled) ensureRoom(rows, row.domain);
      return write(row, {...row, state:enabled ? 'active' : 'disabled'});
    },
    remove(recordId, expectedRevision) {
      const row = editable(read(true), recordId, expectedRevision);
      // Keep just the origin and revision: an older review or edit must not revive erased text.
      return write(row, {id:row.id, domain:row.domain, source:origin(row.source), state:'deleted'});
    },
    context(domain) {
      const rows = (read() ?? []).filter(row => row.domain === domain && row.state === 'active');
      return rows.sort((a,b) => a.id.localeCompare(b.id)).map(({id, domain, text, revision, source}) =>
        ({id, domain, text, revision, source:origin(source)}));
    },
    filterReviews(domain, entries) {
      const rows = read();
      if (!rows) return [];
      return entries.filter(({id, context}) => {
        if (context?.domain !== domain) return false;
        const pref = sourceRow(rows, domain, 'review', id);
        return !pref || pref.state === 'released';
      });
    },
    sourceRevision(domain, kind, sourceId) {
      return sourceRow(read() ?? [], domain, kind, sourceId)?.revision ?? 0;
    },
    sourceStates() {
      return (read() ?? []).filter(row => row.source.id).map(({domain, source, revision, state}) =>
        ({domain, kind:source.kind, id:source.id, revision, state}));
    },
    isSourceSuppressed(domain, kind, sourceId) {
      const rows = read();
      if (!rows) return true;
      const row = sourceRow(rows, domain, kind, sourceId);
      return Boolean(row && row.state !== 'released');
    },
    reviewSuppression(domain, sourceId) {
      const row = sourceRow(read() ?? [], domain, 'review', sourceId);
      return row && row.state !== 'released' ? {revision:row.revision, restorable:row.state === 'suppressed'} : null;
    },
    suppressReview(domain, entry, expectedRevision) {
      const source = {kind:'review', id:reviewId(domain, entry)};
      const prior = sourceRow(read(true), domain, 'review', source.id);
      checkRevision(prior, expectedRevision);
      if (prior?.state === 'suppressed') return publicRow(prior);
      if (prior && prior.state !== 'released') throw conflict();
      return write(prior, {id:prior?.id ?? id(), domain, source, state:'suppressed'});
    },
    restoreReview(domain, entry, expectedRevision) {
      const sourceId = reviewId(domain, entry);
      const prior = sourceRow(read(true), domain, 'review', sourceId);
      if (prior?.state !== 'suppressed') throw conflict();
      checkRevision(prior, expectedRevision);
      return write(prior, {...prior, state:'released'});
    },
  };
}
