export class LLMError extends Error {

  constructor(message, code, meta = {}) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.meta = Object.freeze({ ...meta });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class LLMConfigError extends LLMError {
  constructor(message, meta = {}) {
    super(message, "LLM_CONFIG_ERROR", meta);
    this.name = "LLMConfigError";
  }
}

export class LLMProviderError extends LLMError {
  constructor(message, meta = {}) {
    super(message, "LLM_PROVIDER_ERROR", meta);
    this.name = "LLMProviderError";
  }
}

export class LLMValidationError extends LLMError {
  constructor(message, meta = {}) {
    super(message, "LLM_VALIDATION_ERROR", meta);
    this.name = "LLMValidationError";
  }
}

export class LLMSessionError extends LLMError {
  constructor(message, meta = {}) {
    super(message, "LLM_SESSION_ERROR", meta);
    this.name = "LLMSessionError";
  }
}

