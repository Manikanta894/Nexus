// Rough per-provider cost model (USD per 1M tokens) — used for the AI Cost dashboard.
// These are approximations; costs are logged per call from real usage when available.

export const PRICES = {
  nvidia: { in: 0.5, out: 1.0 },
  openrouter: { in: 1.0, out: 3.0 },
  groq: { in: 0.3, out: 0.6 },
  openai: { in: 2.5, out: 10.0 },
  'demo-engine': { in: 0, out: 0 },
}

export function estimateCost(providerId, promptTokens, completionTokens) {
  const p = PRICES[providerId] || PRICES.openrouter
  return (promptTokens * p.in + completionTokens * p.out) / 1_000_000
}

export const DEFAULT_BUDGET_CAPS = {
  providers: { nvidia: 5, openrouter: 10, groq: 3, openai: 10 }, // USD per month
  modules: { social: 5, blog: 5, news: 2, seasonal: 2, engage: 2, newsletter: 2, repurpose: 2 },
}
