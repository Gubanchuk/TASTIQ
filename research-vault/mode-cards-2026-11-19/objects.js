import {setupPresentedMode} from '/design-study/cards.js';
export * from '/shared/selection-mode.js?original=1';
export const setupSelectionMode = options => setupPresentedMode(options, 'objects');
