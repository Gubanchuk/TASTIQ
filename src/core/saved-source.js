import { createHash } from 'node:crypto';

export const invalidSavedSource = () => Object.assign(Error('Список сохранённых не удалось прочитать. Открой библиотеку и выбери список заново.'),{status:400});

export function normalizeSavedSource(source,domain) {
  if (!source || source.version !== 1 || source.domain !== domain || !Array.isArray(source.ids) ||
      source.ids.some(id=>typeof id !== 'string' || !/^[A-Za-z0-9:_-]{1,80}$/.test(id))) throw invalidSavedSource();
  return {version:1,domain,ids:[...new Set(source.ids)]};
}

export function savedSourceKey(source) {
  return createHash('sha256').update(JSON.stringify([source.domain,source.version,source.ids])).digest('hex');
}
