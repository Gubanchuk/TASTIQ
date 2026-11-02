// Standard text-token rates per million, checked 2026-10-31. Keep unknown models unpriced, not free.
// https://developers.openai.com/api/docs/models/gpt-6.1-sol
const RATES = { 'gpt-6.1-sol': { input: 2, cached: 0.1, output: 10 } };

export function estimateCost(usage, model) {
  const rates = RATES[model];
  if (!rates || !usage) return null;
  const input = usage.input_tokens;
  const output = usage.output_tokens;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  if (![input, output, cached].every((n) => Number.isInteger(n) && n >= 0) || cached > input) return null;
  // Reasoning tokens are already included in output_tokens.
  return ((input - cached) * rates.input + cached * rates.cached + output * rates.output) / 1e6;
}

// Conservative per-request reserve for the offline comparison runner: count every UTF-8 byte of the whole
// payload as an input token, plus framing headroom, and reserve the entire allowed output. Actual usage settles it.
export function reserveCost(request) {
  if (!Number.isInteger(request.max_output_tokens) || request.max_output_tokens <= 0) return null;
  return estimateCost({ input_tokens: Buffer.byteLength(JSON.stringify(request), 'utf8') + 4096, output_tokens: request.max_output_tokens }, request.model);
}
