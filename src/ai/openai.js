// A single Responses request, with no automatic paid retries. fetch is injected in offline transport tests.

export class OpenAIError extends Error {
  constructor(message) { super(message); this.name = 'OpenAIError'; }
}

export function publicApiError(error,fallback='ошибка обращения к нейросети') {
  if(!(error instanceof OpenAIError))return {error:fallback};
  return {error:error.publicMessage??error.message,
    ...(typeof error.retryable==='boolean'?{retryable:error.retryable}:{}),
    ...(typeof error.notRequested==='boolean'?{notRequested:error.notRequested}:{}),
    ...(typeof error.code==='string'?{code:error.code}:{})};
}

const timedOut = (err) => err?.name === 'TimeoutError' || err?.name === 'AbortError';
const httpMessage = (status, code) => {
  if (status === 401) return 'ключ OpenAI не принят';
  if (status === 403) return 'нет доступа к модели OpenAI';
  if (status === 429) return code === 'insufficient_quota' ? 'проверь баланс или лимит оплаты OpenAI' : 'нейросеть перегружена';
  return `ошибка нейросети ${status}`;
};

export async function requestResponse(body, { key = process.env.OPENAI_API_KEY, fetcher = globalThis.fetch, timeoutMs } = {}) {
  if (!key?.trim()) throw new OpenAIError('нейросеть не подключена');
  let response;
  try {
    response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Ordinary site requests wait for the provider within the hosting runtime window.
      ...(timeoutMs==null?{}:{signal:AbortSignal.timeout(timeoutMs)}),
    });
  } catch (err) {
    throw new OpenAIError(timedOut(err) ? 'нейросеть не ответила вовремя' : 'не удалось связаться с нейросетью');
  }
  let result;
  try {
    result = await response.json();
  } catch (err) {
    if (!response.ok) throw new OpenAIError(httpMessage(response.status));
    throw new OpenAIError(timedOut(err) ? 'нейросеть не ответила вовремя' : 'нейросеть ответила не по форме');
  }
  if (!response.ok) throw new OpenAIError(httpMessage(response.status, result?.error?.code));
  return result;
}
