const key = 'tastiq.film-to-game';
const lifetime = 30 * 60 * 1000;

export function selectedFilmMoods(turns) {
 const first = turns?.find(turn => turn.question?.id === 'direction');
 return (first?.selected ?? []).filter(option => option.id?.startsWith('mood_')).map(option => option.label).filter(Boolean).join(', ');
}

export function saveGameWish(storage, text, token, now = Date.now()) {
 const wish = typeof text === 'string' ? text.trim().slice(0, 400) : '';
 if (!wish || !storage) return false;
 try { storage.setItem(key, JSON.stringify({token, wish, created: now})); return true; }
 catch { return false; }
}

export function takeGameWish(storage, token, now = Date.now()) {
 if (!token || !storage) return '';
 try {
  const record = JSON.parse(storage.getItem(key));
  if (!record || record.token !== token) return '';
  storage.removeItem(key);
  if (!Number.isFinite(record.created) || now < record.created || now - record.created > lifetime) return '';
  return typeof record.wish === 'string' ? record.wish.slice(0, 400) : '';
 } catch { return ''; }
}

export function bindFilmToGame(panel, storage) {
 const form = panel.querySelector('form'), input = form.elements.wish;
 let selectionId;
 form.addEventListener('submit', event => {
  event.preventDefault();
  if (!input.value.trim()) { input.focus(); return; }
  const token = crypto.randomUUID();
  if (!saveGameWish(storage, input.value, token)) {
   form.querySelector('[role="status"]').textContent = 'Браузер не смог перенести пожелание. Скопируй его и открой подбор игры.';
   form.querySelector('a').hidden = false;
   return;
  }
  location.assign('/pick/game/?choose=1&fromFilm=' + encodeURIComponent(token));
 });
 return function update(state, visible, busy) {
  panel.hidden = !visible;
  panel.inert = busy;
  if (visible && state?.id !== selectionId) {
   selectionId = state.id;
   input.value = selectedFilmMoods(state.turns);
   const original = state.turns?.find(turn => turn.question?.id === 'direction')?.text?.trim();
   const reference = form.querySelector('[data-film-wish]');
   reference.hidden = !original;
   reference.querySelector('span').textContent = original || '';
   panel.open = false;
   form.querySelector('[role="status"]').textContent = '';
   form.querySelector('a').hidden = true;
  }
 };
}
