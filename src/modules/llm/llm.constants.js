export const PROVIDERS = Object.freeze({
  GOOGLE: "google",
  GROQ: "groq",
});

export const SUPPORTED_PROVIDERS = Object.freeze(Object.values(PROVIDERS));

export const GOOGLE_MODELS = Object.freeze([
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
]);

export const GROQ_MODELS = Object.freeze([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
]);

export const MODELS_BY_PROVIDER = Object.freeze({
  [PROVIDERS.GOOGLE]: GOOGLE_MODELS,
  [PROVIDERS.GROQ]: GROQ_MODELS,
});

export const LIMITS = Object.freeze({
  TEMPERATURE_MIN: 0,
  TEMPERATURE_MAX: 2,
  MAX_OUTPUT_TOKENS_MIN: 1,
  MAX_OUTPUT_TOKENS_MAX: 65_536,
  MAX_RETRIES_MIN: 0,
  MAX_RETRIES_MAX: 5,
  MAX_HISTORY_MESSAGES_MIN: 1,
  MAX_HISTORY_MESSAGES_MAX: 200,
  SYSTEM_PROMPT_MAX_LENGTH: 10_000,
  USER_MESSAGE_MAX_LENGTH: 50_000,
});

export const ROLES = Object.freeze({
  SYSTEM: "system",
  HUMAN: "human",
  AI: "ai",
  TOOL: "tool",
});
