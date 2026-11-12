// Keep actionable budget/access/validation details; translate only an opaque provider 5xx.
// Readable copy for both new responses and error strings in older saved selections.
const unavailable=/^(?:нейросеть (?:не подключена|выключена)|помощник недоступен|ключ OpenAI не принят|нет доступа к модели OpenAI|проверь баланс или лимит оплаты OpenAI)(?=\.|$)/i;
const interrupted=/^(?:нейросеть (?:перегружена|не закончила .+|не ответила(?: вовремя)?|отказалась отвечать|ответила не по форме.*|выбрала .+)|не удалось связаться с нейросетью|ошибка (?:обращения к нейросети|нейросети \d{3}))[.!]?$/i;
const budget=/^(?:доступный лимит нейросети исчерпан|новые обращения к нейросети временно остановлены|запрос не (?:запущен|отправлен): оставшийся бюджет недостаточен или цена модели неизвестна)(?=[.!?]|$)/i;

export function aiErrorMessage(error){
 if(!error)return error;
 if(unavailable.test(error))return error.replace(unavailable,'Подбор по пожеланию сейчас недоступен').replace(/[^.!?]$/,'$&.');
 if(interrupted.test(error))return 'Не получилось продолжить подбор. Твои ответы сохранены.';
 if(budget.test(error))return 'Подбор по пожеланию временно недоступен. Твои ответы сохранены.';
 if(error==='Предыдущий запрос ещё не подтверждён. Повтор временно недоступен; ответы сохранены.')return 'Повтор пока недоступен. Твои ответы сохранены.';
 return error;
}

export function replacementNotice(notice){
 return notice?.replace('Он подобран по каталогу без нового обращения к модели.','Он подобран по каталогу.');
}
