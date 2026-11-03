export const resultBatchHelp='До четырёх вариантов за раз. «Показать ещё» продолжает этот же подбор.';
export function resultSectionHeading(index){
 return index===0?'<h2 class="game-choice-heading">Главный вариант под твой запрос</h2>':index===1?'<h2 class="game-alternatives-heading">Другие варианты</h2>':'';
}
