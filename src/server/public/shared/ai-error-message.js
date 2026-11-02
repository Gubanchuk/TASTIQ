// Keep actionable budget/access/validation details; translate only an opaque provider 5xx.
export function aiErrorMessage(error){
 return /^ошибка нейросети 5\d\d$/i.test(error??'')?'Помощник временно недоступен. Ответ сохранён. Нажми «Повторить».':error;
}
