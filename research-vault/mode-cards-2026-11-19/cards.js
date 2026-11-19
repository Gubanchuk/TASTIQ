import {setupSelectionMode as originalSetup} from '/shared/selection-mode.js?original=1';
export * from '/shared/selection-mode.js?original=1';

const examples = {
  film: ['Хочу детектив на вечер', 'Самому искать улики или следить за погоней?'],
  game: ['Хочу игру про исследование', 'Искать тайники или прокладывать свой маршрут?'],
  series: ['Хочу сериал про семью', 'Побольше юмора или семейных тайн?'],
  cartoon: ['Хочу доброе приключение', 'Больше чудес или смешных передряг?'],
  anime: ['Хочу аниме про путешествие', 'Интереснее новый мир или его герои?'],
};
const descriptions = {
  standard: 'Расскажи, чего хочется. Уточним главное и предложим варианты.',
  deep: 'Обсудим, что для тебя важнее. Уточнения можно закончить раньше.',
};

function presentCards(host, appearance) {
  const domain = location.pathname.startsWith('/pick/game/') ? 'game' : new URLSearchParams(location.search).get('domain');
  const [wish, question] = examples[domain] ?? examples.film;

  for (const button of host.querySelectorAll('[data-mode-option]')) {
    const depth = button.dataset.modeOption;
    const pace = button.querySelector('.mode-card-pace');
    const current = pace.textContent.includes('Текущий режим');
    button.classList.toggle('mode-card-current', current);
    pace.textContent = current ? 'Текущий режим' : '';
    pace.hidden = !current;

    const description = button.querySelector('.mode-card-description');
    description.textContent = descriptions[depth];
    const art = button.querySelector('.mode-card-art');
    if (appearance === 'objects') {
      description.textContent = depth === 'standard'
        ? 'Уточним главное и перейдём к вариантам.'
        : 'Разберём, что для тебя важнее. Уточнения можно закончить раньше.';
      art.className = 'studio-object';
      art.replaceChildren();
      button.setAttribute('aria-describedby', [current && pace.id, description.id].filter(Boolean).join(' '));
      continue;
    }
    art.className = 'conversation-sample';
    art.removeAttribute('aria-hidden');
    art.id = 'example-' + depth;
    // Only editorial samples below. A sample never becomes an answer to a question.
    art.innerHTML = '<span class="sample-caption">Пример</span>'
      + '<span class="sample-line sample-wish"><span class="sample-speaker">Ты</span>' + wish + '</span>'
      + (depth === 'deep' ? '<span class="sample-line sample-question"><span class="sample-speaker">TASTIQ</span>' + question + '</span>' : '');
    button.setAttribute('aria-describedby', [current && pace.id, description.id, art.id].filter(Boolean).join(' '));
  }
}

export function setupPresentedMode(options, appearance) {
  const controller = originalSetup(options);
  const host = document.getElementById('selection-mode');
  return {
    get choosing() { return controller.choosing; },
    newSelection: controller.newSelection,
    draw(screen) {
      const choosing = controller.draw(screen);
      if (choosing && host.querySelector('.mode-card-art')) presentCards(host, appearance);
      return choosing;
    },
  };
}

export const setupSelectionMode = options => setupPresentedMode(options, 'conversation');
