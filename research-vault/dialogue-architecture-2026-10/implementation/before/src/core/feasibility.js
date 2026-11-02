import verified from '../../data/verified-game-context.json' with { type: 'json' };

export const playerFact = (item) => item.kind === 'game' ? verified.games[String(item.appid ?? item.id).replace(/^steam:/, '')] ?? null : null;
export function playerFactText(item) {
  const fact = playerFact(item);
  return fact ? `${fact.mode}: ${fact.min === fact.max ? fact.max : `${fact.min}–${fact.max}`} игроков; проверено ${fact.checkedAt}; ${fact.coverage === 'mode-only' ? 'остальные режимы неизвестны' : 'без модов'}` : 'число игроков в каталоге не проверено';
}

export function playerFeasibility(item, session = {}) {
  if (item.kind !== 'game' || !['2', '3', '4', '5+'].includes(session.partySize)) return null;
  const size = session.partySize === '5+' ? 5 : Number(session.partySize);
  const fact = (session.platform ?? 'windows') === 'windows' ? playerFact(item) : null;
  if (!fact) return { key: 'players', status: 'unknown', text: `Не проверено, можно ли играть всей компанией (${session.partySize}).` };
  const evidence = { source: fact.source, checkedAt: fact.checkedAt, scope: fact.mode };
  if (size > fact.max || size < fact.min) return { key: 'players', ...evidence,
    status: fact.coverage === 'standard' ? 'no' : 'unknown',
    text: fact.coverage === 'standard' ? `${fact.mode}: ${fact.min}–${fact.max} игроков, а вас ${session.partySize}.`
      : `${fact.mode}: до ${fact.max} игроков. Для ${session.partySize} другой режим не проверен.`,
  };
  if (session.partySize === '5+') return { key: 'players', status: 'conditional', ...evidence, text: `Подойдёт по числу игроков, если вас не больше ${fact.max}.` };
  return { key: 'players', status: 'yes', ...evidence, text: `${fact.mode}: ваша компания из ${size} игроков помещается (без модов).` };
}

export function feasibilityOf(item, session = {}) {
  const checks = [], players = playerFeasibility(item, session);
  if (players) checks.push(players);
  if (session.minutes || session.maxRuntime) {
    const minutes = Math.min(session.minutes ?? Infinity, session.maxRuntime ?? Infinity);
    if (item.kind === 'game') checks.push({ key: 'minutes', status: 'unknown', text: `Не проверено, удобно ли прерваться через ${minutes} мин.` });
    else checks.push({ key: 'minutes', status: item.runtime == null ? 'unknown' : item.runtime <= minutes ? 'yes' : 'no',
      text: item.runtime == null ? `Длительность не проверена; сегодня есть ${minutes} мин.` : `${item.kind === 'series' ? 'Серия' : 'Фильм'} идёт ${item.runtime} мин; сегодня есть ${minutes} мин.` });
  }
  if (session.childAge) checks.push({ key: 'age', status: 'unknown', text: 'Возрастная пригодность по проверенному источнику пока не подтверждена.' });
  return checks;
}
