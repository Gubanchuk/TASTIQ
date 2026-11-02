// Session interpretation is a proposal until the person confirms it. It never writes the taste profile.
export const normalizeNote = (text) => typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 300) : '';

export function intentProposal(value, text, dict) {
  const sourceText = normalizeNote(text);
  if (!sourceText || !value || typeof value !== 'object' || !dict) return null;
  const quote = (s) => {
    const evidence = normalizeNote(s);
    return evidence && sourceText.includes(evidence) ? evidence : null;
  };
  const signals = (list) => {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).flatMap((x) => {
      const evidence = quote(x?.evidence);
      if (!dict.featureById.has(x?.f) || !evidence || seen.has(x.f)) return [];
      seen.add(x.f);
      return [{ f: x.f, evidence }];
    }).slice(0, 6);
  };
  let wants = signals(value.wants), avoids = signals(value.avoids);
  const conflict = new Set(wants.filter((x) => avoids.some((a) => a.f === x.f)).map((x) => x.f));
  wants = wants.filter((x) => !conflict.has(x.f));
  avoids = avoids.filter((x) => !conflict.has(x.f));
  const minutes = value.time?.minutes, evidence = quote(value.time?.evidence);
  const time = Number.isInteger(minutes) && minutes >= 5 && minutes <= 1440 && evidence ? { minutes, evidence } : null;
  return { version: 1, sourceText, wants, avoids, time };
}

export function confirmedIntent(situation, dict) {
  const intent = situation?.intent;
  if (intent?.source !== 'confirmed' || intent.sourceText !== normalizeNote(situation.note)) return null;
  const checked = intentProposal(intent, situation.note, dict);
  return checked ? { ...checked, source: 'confirmed' } : null;
}

export function withNote(situation = {}, text) {
  const note = normalizeNote(text);
  return { ...situation, note, intent: situation.intent?.sourceText === note ? situation.intent : null };
}
