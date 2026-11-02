// Follow-ups on a finished run: result-screen corrections («Уже играл», «Не сейчас», fork) and "what if" variants of the
// today screen. Usage: node games-followup.mjs <run json> <json array of actions> [todayOverride json]
import { readFileSync } from 'node:fs';
import { api, describeResult } from './games-lib.mjs';

const [, , file, actionsJson = '[]', todayJson = ''] = process.argv;
const report = JSON.parse(readFileSync(file, 'utf8'));
let state = report.finalState;
if (todayJson) {
  const t = JSON.parse(todayJson);
  state = { ...state, session: { ...state.session, moods: t.values ?? [], avoid: t.avoid ?? [], asked: 0 }, preferences: [] };
  const out = await api('/api/dialogue', { state });
  state = out.state;
  console.log(`== today override ${todayJson}`);
  console.log(describeResult(out.screen.result).join('\n'));
}
for (const action of JSON.parse(actionsJson)) {
  const out = await api('/api/dialogue', { state, action });
  state = out.state;
  console.log(`== after ${JSON.stringify(action)}`);
  console.log(describeResult(out.screen.result).join('\n'));
}
const targets = process.env.TARGETS ? process.env.TARGETS.split(',') : [];
for (const id of targets) {
  const w = await api('/api/why', { state, id });
  console.log(`why ${id}: ${w.removedBy ? `sieve ${w.removedBy.sieve}: ${w.removedBy.reason}` : `rank ${w.rank}/${w.of} score ${w.score} (leader ${w.leaderScore}); matches ${w.matches.map((m) => `${m.label}${m.confirmed ? '*' : ''} ${m.contribution}`).join(', ')}; penalties ${w.penalties.map((p) => `${p.label} ${p.contribution}`).join(', ') || 'none'}`}`);
}
