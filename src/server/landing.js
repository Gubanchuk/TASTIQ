export function animeSelectionsEnabled(env = process.env) {
  return env.TASTIQ_ANIME === 'on' || (env.VERCEL !== '1' && env.TASTIQ_ANIME !== 'off');
}

// The static deployment and local HTTP handler use the same first-paint state.
export function renderLanding(html, animeEnabled) {
  return html.replace('data-anime-enabled="true"', `data-anime-enabled="${animeEnabled}"`);
}
