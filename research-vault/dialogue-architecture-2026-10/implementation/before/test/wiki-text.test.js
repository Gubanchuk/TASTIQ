import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paragraphs, plainFromWikitext, GAME_SECTIONS } from '../src/pipeline/screen/wiki-text.js';

const long = (word) => `${word} `.repeat(30).trim();

const article = [
  long('Lead'),
  '== Premise ==',
  long('Premise'),
  '== Episodes ==',
  '=== Season 1 ===',
  long('Plot'),
  '== Reception ==',
  '=== Critical response ===',
  '==== Season 1 ====',
  long('Praise'),
  '==== Season 2 ====',
  long('Mixed'),
  '=== Awards and nominations ===',
  long('Award'),
  '== References ==',
  long('Cite'),
].join('\n');

test('a subsection takes its parent verdict: season reviews under Reception stay, season plots under Episodes go', () => {
  const sections = paragraphs(article).map((p) => `${p.section}:${p.text.split(' ')[0]}`);
  assert.deepEqual(sections, ['lead:Lead', 'Premise:Premise', 'Season 1:Praise', 'Season 2:Mixed']);
});

test('premise text is capped so reviews are not crowded out', () => {
  const synopsis = ['== Synopsis ==', ...[1, 2, 3, 4, 5].flatMap((n) => [`=== Season ${n} ===`, long(`Plot${n}`)])];
  const text = [long('Lead'), ...synopsis, '== Reception ==', long('Praise')].join('\n');
  const out = paragraphs(text).map((p) => p.text.split(' ')[0]);
  assert.deepEqual(out, ['Lead', 'Plot1', 'Plot2', 'Plot3', 'Praise']);
});

test('game sections: gameplay and plot are premise, "Release and reception" stays, development and ports go', () => {
  const text = [
    long('Lead'),
    '== Gameplay ==', long('Play'),
    '== Plot ==', long('Story'),
    '== Development ==', long('Dev'),
    '== Release and reception ==',
    '=== Critical response ===', long('Praise'),
    '=== Sales ===', long('Sold'),
    '== Ports ==', long('Port'),
    '== Legacy ==', long('Legacy'),
  ].join('\n');
  const out = paragraphs(text, GAME_SECTIONS).map((p) => `${p.section}:${p.text.split(' ')[0]}`);
  assert.deepEqual(out, ['lead:Lead', 'Gameplay:Play', 'Plot:Story', 'Critical response:Praise', 'Legacy:Legacy']);
});

test('templates that carry the article\'s own words keep them; the rest go', () => {
  const lead = "{{Short description|1997 video game}}{{Italic title}}'''{{Nihongo|Final Fantasy VII|ファイナルファンタジーVII|Fainaru Fantajī Sebun}}''' is a "
    + '{{vgy|1997}} [[role-playing video game|role-playing game]] by {{nowrap|Square}} set in {{lang|ja|Midgar}}.{{sfn|Smith|2001|p=3}}';
  assert.equal(plainFromWikitext(lead), 'Final Fantasy VII is a 1997 role-playing game by Square set in Midgar.');
  assert.equal(plainFromWikitext('{{Nihongo foot|Persona 4|ペルソナ4|lead=yes}} is'), 'Persona 4 is');
  assert.equal(plainFromWikitext('{{nihongo|{{nowrap|Ōkami}}|大神}} is'), 'Ōkami is', 'nested: the inner template is unwrapped first');
  assert.equal(plainFromWikitext('{{nihongo|[[Okami (video game)|Ōkami]]|大神}} is'), 'Ōkami is', 'a link inside an argument stays whole');
  assert.equal(plainFromWikitext('{{transl|ja|ALA-LC|Ōkami}} and {{transl|ja|Kami}}'), 'Ōkami and Kami');
});
