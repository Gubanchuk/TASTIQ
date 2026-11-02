// Free-text "другое" → candidate features, shown back as chips to confirm; nothing is written to the
// profile silently. A keyword parser stands in for the LLM parser from the research design (C6)
// until an API key is configured; both must return the same shape.
import { normalizeForMatch } from '../lib/text.js';

// Words before a feature that turn it into a complaint. Denials («ничего страшного», «не скучно») say the
// feature is absent: a wanted feature becomes a complaint, a flaw is simply denied. Complaint words («ненавижу
// гринд», «слишком страшно», «бросила из-за жестокости») always make a complaint.
const DENIALS = ['не', 'без', 'нет', 'ни', 'ничего', 'ничуть', 'not', 'no', "don't", 'dont', 'without'];
const COMPLAINTS = ['слишком', 'из-за', 'бросил', 'бросила', 'бросили', 'ненавижу', 'бесит', 'бесят', 'раздражает', 'надоел', 'надоели', 'устал', 'too', 'hate'];
const HARD_MARKERS = ['в любом виде', 'никогда', 'терпеть не могу', 'ни в коем случае', 'категорически', 'never'];

function wordStartIndex(text, keyword) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u');
  const m = re.exec(text);
  return m ? m.index + m[1].length : -1;
}

export function parseFreeText(input = '', dict) {
  const text = normalizeForMatch(input);
  const found = new Map();
  for (const feature of dict.features) {
    for (const kw of feature.keywords) {
      const at = wordStartIndex(text, normalizeForMatch(kw));
      if (at < 0) continue;
      // «Короткие серии» is the length of an episode, asked as a fact of its own, not a short series.
      if (feature.id === 'length.short' && /коротк\S*\s+сери/.test(text.slice(at))) continue;
      // The negation window stays inside the clause: «драки не страшные, ржали оба» keeps «ржали» positive.
      const prefix = text.slice(0, at).split(/[,.;:!?]/).pop();
      const clause = prefix + text.slice(at).split(/[,.;:!?]/)[0];
      const before = prefix.split(/\s+/).filter(Boolean).slice(-3);
      const denied = before.some((w) => DENIALS.includes(w));
      const complained = before.some((w) => COMPLAINTS.includes(w));
      const tolerated = /(?:^|\s)(?:терпим\p{L}*|могу потерпеть)(?=$|\s)/u.test(clause);
      if (tolerated && !denied && !complained) break;
      // Keywords like "без стресса" carry their own negation and describe a wanted feature.
      const selfNegated = /^(без|не) /.test(normalizeForMatch(kw));
      // Naming a flaw ("затянуто", "гринд") is a complaint; denying it («не скучно») says nothing.
      if (feature.risk && denied && !complained) break;
      const negative = feature.risk || (!selfNegated && (denied || complained));
      const hard = negative && HARD_MARKERS.some((m) => clause.includes(m));
      found.set(feature.id, { f: feature.id, label: feature.label, polarity: negative ? 'negative' : 'positive', keyword: kw, ...(negative ? { hard } : {}) });
      break;
    }
  }
  const items = [...found.values()];
  return {
    positive: items.filter((x) => x.polarity === 'positive'),
    negative: items.filter((x) => x.polarity === 'negative'),
    understood: items.length > 0,
  };
}
