// The tagging instruction shared by every backend (Anthropic Batch API or a manual agent run),
// so that outputs are comparable between runs. Built from the dictionary, never edited by hand.
import { ASPECTS, DICTIONARY_VERSION, FEATURES } from '../aspects/games.js';

export function buildTaggingPrompt(dict = null, kind = 'games') {
  if (kind === 'screen') return buildScreenTaggingPrompt(dict);
  if (kind === 'games-wiki') return buildGamesWikiTaggingPrompt();
  const lines = [];
  lines.push(`You tag video games with experience features. Dictionary version: ${DICTIONARY_VERSION}.`);
  lines.push('');
  lines.push('Input: one game as JSON. It has a store description (evidence id "d"), a longer "about" text (id "a")');
  lines.push('and player reviews (ids like "r123456"; each with thumbs up/down and hours played at review).');
  lines.push('');
  lines.push('Task: return the features from the dictionary below that these texts support.');
  lines.push('');
  lines.push('Rules:');
  lines.push('1. Use only the provided texts. Do not use what you know about the game from elsewhere.');
  lines.push('2. Every feature needs evidence: 1–4 items, each {"id": <evidence id>, "q": <quote>}.');
  lines.push('   The quote is copied verbatim from that text, in its original language, 3–20 words. No paraphrase, no ellipsis inside.');
  lines.push('3. Relevance "r": 1 = present but minor or mentioned once; 2 = clearly part of the experience;');
  lines.push('   3 = one of the defining features, most texts that talk about this area mention it.');
  lines.push('4. Flaws (features marked RISK) count only when players complain about them; one complaint is r=1.');
  lines.push('5. If reviews contradict each other, tag what most of them support; do not tag both sides with r=3.');
  lines.push('6. Prefer specific features over generic praise. "Great game" is not evidence for anything.');
  lines.push('7. Skip features with no support. A typical game gets 8–20 features.');
  lines.push('');
  lines.push('Output: JSON only, exactly this shape:');
  lines.push('{"appid": <number>, "features": [{"f": "<feature id>", "r": 1|2|3, "ev": [{"id": "r123", "q": "..."}]}]}');
  lines.push('');
  lines.push('Dictionary (feature id: meaning):');
  for (const aspect of ASPECTS) {
    lines.push(`- ${aspect.id}`);
    for (const f of FEATURES.filter((x) => x.aspect === aspect.id)) {
      lines.push(`  - ${f.id}${f.risk ? ' [RISK]' : ''}: ${f.def}`);
    }
  }
  return lines.join('\n');
}

export const TAG_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['appid', 'features'],
  properties: {
    appid: { type: 'integer' },
    features: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['f', 'r', 'ev'],
        properties: {
          f: { type: 'string', enum: FEATURES.map((f) => f.id) },
          r: { type: 'integer', enum: [1, 2, 3] },
          ev: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'q'],
              properties: { id: { type: 'string' }, q: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

/** Films, series and cartoons tagged from Wikipedia paragraphs (lead, reception, style). */
function buildScreenTaggingPrompt(dict) {
  const lines = [];
  lines.push(`You tag films, TV series and cartoons with experience features. Dictionary version: ${dict.version}.`);
  lines.push('');
  lines.push('Input: one title as JSON. It has a short summary (evidence id "s", may be empty) and Wikipedia');
  lines.push('paragraphs (ids "p0", "p1", ...; each with the section it comes from: lead, Reception, Themes and so on).');
  lines.push('');
  lines.push('Task: return the features from the dictionary below that these texts support.');
  lines.push('');
  lines.push('Rules:');
  lines.push('1. Use only the provided texts. Do not use what you know about the title from elsewhere.');
  lines.push('2. Every feature needs evidence: 1–4 items, each {"id": <evidence id>, "q": <quote>}.');
  lines.push('   The quote is copied verbatim from that text, 3–20 words. No paraphrase, no ellipsis inside.');
  lines.push('3. Relevance "r": 1 = present but minor or mentioned once; 2 = clearly part of the experience;');
  lines.push('   3 = one of the defining features, the texts stress it.');
  lines.push('4. Flaws (features marked RISK) count only when critics or viewers complain about them; one complaint is r=1.');
  lines.push('5. Features marked SERIES apply only when "kind" is "series".');
  lines.push('6. Plot events are not features. "The hero takes revenge" supports story.revenge; "won an Emmy" supports nothing.');
  lines.push('7. Skip features with no support. A typical title gets 6–16 features.');
  lines.push('');
  lines.push('Output: JSON only, exactly this shape:');
  lines.push('{"id": "<title id>", "features": [{"f": "<feature id>", "r": 1|2|3, "ev": [{"id": "p3", "q": "..."}]}]}');
  lines.push('');
  lines.push('Dictionary (feature id: meaning):');
  for (const aspect of dict.aspects) {
    lines.push(`- ${aspect.id}`);
    for (const f of dict.features.filter((x) => x.aspect === aspect.id)) {
      lines.push(`  - ${f.id}${f.risk ? ' [RISK]' : ''}${f.series ? ' [SERIES]' : ''}: ${f.def}`);
    }
  }
  return lines.join('\n');
}

/** Games without Steam reviews, tagged from their Wikipedia article (gameplay, plot, reception). Same dictionary and output as games. */
function buildGamesWikiTaggingPrompt() {
  const lines = [];
  lines.push(`You tag video games with experience features. Dictionary version: ${DICTIONARY_VERSION}.`);
  lines.push('');
  lines.push('Input: one game as JSON. It has a short store description (evidence id "d", may be empty) and Wikipedia');
  lines.push('paragraphs (ids "p0", "p1", ...; each with the section it comes from: lead, Gameplay, Plot, Reception and so on).');
  lines.push('');
  lines.push('Task: return the features from the dictionary below that these texts support.');
  lines.push('');
  lines.push('Rules:');
  lines.push('1. Use only the provided texts. Do not use what you know about the game from elsewhere.');
  lines.push('2. Every feature needs evidence: 1–4 items, each {"id": <evidence id>, "q": <quote>}.');
  lines.push('   The quote is copied verbatim from that text, 3–20 words. No paraphrase, no ellipsis inside.');
  lines.push('3. Relevance "r": 1 = present but minor or mentioned once; 2 = clearly part of the experience;');
  lines.push('   3 = one of the defining features, the texts stress it.');
  lines.push('4. Flaws (features marked RISK) count only when critics or players complain about them; one complaint is r=1.');
  lines.push('5. Plot events are not features. "The hero takes revenge" supports story.revenge; "won Game of the Year" supports nothing.');
  lines.push('6. Skip features with no support. A typical game gets 6–16 features.');
  lines.push('');
  lines.push('Output: JSON only, exactly this shape:');
  lines.push('{"appid": <number>, "features": [{"f": "<feature id>", "r": 1|2|3, "ev": [{"id": "p3", "q": "..."}]}]}');
  lines.push('');
  lines.push('Dictionary (feature id: meaning):');
  for (const aspect of ASPECTS) {
    lines.push(`- ${aspect.id}`);
    for (const f of FEATURES.filter((x) => x.aspect === aspect.id)) {
      lines.push(`  - ${f.id}${f.risk ? ' [RISK]' : ''}: ${f.def}`);
    }
  }
  return lines.join('\n');
}
