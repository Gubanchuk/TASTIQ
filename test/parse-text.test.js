// Free text is shown back as chips to confirm; a wrong sign costs a lot (a «−смешно» chip from «ржали оба» turned
// a cartoon pick into 1990s Disney classics). The seven phrases are from the 2026-10-21 persona runs
// (research-vault/akinator-picker-2026-10/raw/persona-series-cartoons.md, «Разбор свободного текста»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_DICT } from '../src/aspects/index.js';
import { DOMAINS } from '../src/aspects/index.js';
import { parseFreeText } from '../src/core/parse-text.js';

const parse = (text) => {
  const r = parseFreeText(text, SCREEN_DICT);
  return { pos: r.positive.map((x) => x.f), neg: r.negative.map((x) => x.f), understood: r.understood };
};

test('a hard refusal stays in its clause; a tolerated flaw is not a complaint',()=>{
 const r=parseFreeText('никогда не хочу хоррор, гринд иногда терпим',DOMAINS.game.dict);
 assert.equal(r.negative.find(x=>x.f==='tone.creepy')?.hard,true);
 assert.equal(r.negative.some(x=>x.f==='progression.grind'),false);
 const second=parseFreeText('никогда не хочу хоррор; слишком затянуто',DOMAINS.game.dict);
 assert.equal(second.negative.find(x=>x.f==='pace.draggy')?.hard,false);
});

test('«ничего страшного» means not scary', () => {
  const r = parse('ничего страшного');
  assert.ok(r.neg.includes('tone.creepy'));
  assert.ok(!r.pos.includes('tone.creepy'));
});

test('a negation does not jump a comma: «драки не страшные, ржали оба»', () => {
  const r = parse('драки не страшные, ржали оба');
  assert.ok(r.neg.includes('tone.creepy'));
  assert.ok(r.pos.includes('humor.funny'));
  assert.ok(!r.neg.includes('humor.funny'));
});

test('a denied flaw is no complaint: «чтобы и мне не скучно было, смешно и добро»', () => {
  const r = parse('чтобы и мне не скучно было, смешно и добро');
  assert.ok(!r.neg.includes('pace.draggy'), '«не скучно» is not «затянуто»');
  assert.ok(r.pos.includes('humor.funny'));
  assert.ok(r.pos.includes('tone.feelgood'));
});

test('«бросила из-за жестокости» is a complaint about violence', () => {
  const r = parse('бросила из-за жестокости');
  assert.ok(r.neg.includes('content.violence'));
  assert.ok(!r.pos.includes('content.violence'));
});

test('«короткие серии по 20 минут» is episode length, not a short series', () => {
  assert.ok(!parse('короткие серии по 20 минут').pos.includes('length.short'));
  assert.ok(parse('короткий, на один вечер').pos.includes('length.short'));
});

test('«дочка подпевает песням» is about music', () => {
  assert.ok(parse('дочка подпевает песням').pos.includes('world.music'));
});

test('«слишком» makes a complaint: «слишком страшно для малыша»', () => {
  assert.ok(parse('слишком страшно для малыша').neg.includes('tone.creepy'));
});
