import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripTitleNote } from '../src/lib/text.js';

test('a Wikidata disambiguation note is cut from a Russian title', () => {
  assert.equal(stripTitleNote('Приключения Тома Сойера (фильм, 1938)'), 'Приключения Тома Сойера');
  assert.equal(stripTitleNote('Граф Монте-Кристо (фильм 1934 года)'), 'Граф Монте-Кристо');
  assert.equal(stripTitleNote('Падение дома Ашеров (фильм, 1928, Франция)'), 'Падение дома Ашеров');
  assert.equal(stripTitleNote('Тони (фильм)'), 'Тони');
  assert.equal(stripTitleNote('Спецназ (телесериал, США, 1975)'), 'Спецназ');
  assert.equal(stripTitleNote('Матадор (сериал, 1978—1982)'), 'Матадор');
  assert.equal(stripTitleNote('Робокоп (мультсериал)'), 'Робокоп');
  assert.equal(stripTitleNote('Серые сады (документальный фильм)'), 'Серые сады');
  assert.equal(stripTitleNote('Оргазмо (1969)'), 'Оргазмо');
});

test('brackets that belong to the title stay', () => {
  for (const title of [
    'Граница пустоты: Сад грешников (фильм первый)',
    'Т2 Трейнспоттинг (На игле 2)',
    'Монти Пайтон живьём (почти)',
    '(500) дней лета',
    'Убийца(ы)',
  ]) assert.equal(stripTitleNote(title), title);
  assert.equal(stripTitleNote(null), null);
});
