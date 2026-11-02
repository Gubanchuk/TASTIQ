import fs from 'node:fs';
import path from 'node:path';
const root = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/shots/b';
const latin = (s) => (s.match(/\b[A-Za-z][A-Za-z\-']{2,}\b/g) ?? []);
for (const dir of fs.readdirSync(root)) {
  const f = path.join(root, dir, 'log.json');
  if (!fs.existsSync(f)) continue;
  const log = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`\n######## ${dir}  taps=${log.taps} screens=${log.screens.length} consoleErrors=${JSON.stringify(log.consoleErrors)} failed=${JSON.stringify(log.failedRequests)} notes=${JSON.stringify(log.notes)}`);
  for (const s of log.screens) {
    const over = s.contentScrollH && s.contentClientH && s.contentScrollH > s.contentClientH + 4 ? ` OVERFLOW content ${s.contentScrollH}/${s.contentClientH}` : '';
    const hs = s.hasHScroll ? ' HSCROLL!' : '';
    console.log(`\n[${path.basename(s.shot)}] taps=${s.taps} step=${s.state?.step} url=${s.url}${over}${hs}`);
    console.log(`  toolbar=${JSON.stringify(s.toolbar)} title=${JSON.stringify(s.title)} hint=${JSON.stringify(s.hint)}`);
    if (s.groupTitles?.length) console.log(`  groups=${JSON.stringify(s.groupTitles)}`);
    if (s.chips?.length) console.log(`  chips(${s.chips.length})=${JSON.stringify(s.chips)}`);
    if (s.cards?.length) console.log(`  cards(${s.cards.length})=${JSON.stringify(s.cards)}`);
    console.log(`  actionbar=${JSON.stringify(s.actionbar)} toolbarBtns=${JSON.stringify(s.toolbarBtns)} steps=${JSON.stringify(s.stepsSummary)}`);
    if (s.taste) console.log(`  taste=${JSON.stringify(s.taste.slice(0, 400))}`);
    if (s.hero) console.log(`  hero=${JSON.stringify(s.hero.slice(0, 600))}`);
    if (s.alts?.length) console.log(`  alts=${JSON.stringify(s.alts)}`);
    if (s.fork) console.log(`  fork=${JSON.stringify(s.fork)}`);
    if (s.sieves?.length) console.log(`  sieves=${JSON.stringify(s.sieves)}`);
    if (s.dialog) console.log(`  dialog=${JSON.stringify(s.dialog)}`);
    if (s.inspector) console.log(`  inspector=${JSON.stringify(s.inspector.slice(0, 700))}`);
    const lat = [...new Set([...latin(s.content ?? ''), ...latin(s.inspector ?? ''), ...latin((s.chips ?? []).join(' '))])];
    if (lat.length) console.log(`  LATIN=${JSON.stringify(lat)}`);
    if (['playback','today','result','why','why_not'].includes(s.state?.step) || /landing|my/.test(s.label)) console.log(`  content=${JSON.stringify((s.content ?? '').slice(0, 1200))}`);
  }
}
