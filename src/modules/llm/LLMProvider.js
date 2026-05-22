import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import {
  LLMProviderError,
  LLMConfigError,
  LLMSessionError,
  LLMValidationError,
} from "./llm.errors.js";
import { LIMITS, ROLES } from "./llm.constants.js";
import {
  chatSessionOptionsSchema,
  userMessageSchema,
  messagesInputSchema,
  validate,
  ChatHistorySchema,
} from "./llm.validators.js";

function toMessages(input) {
  if (typeof input === "string") {
    return [new HumanMessage(input)];
  }

  return input.map(({ role, content }) => {
    switch (role) {
      case ROLES.SYSTEM:
        return new SystemMessage(content);
      case ROLES.HUMAN:
        return new HumanMessage(content);
      case ROLES.AI:
        return new AIMessage(content);
      default:
        throw new LLMValidationError(`Unknown message role: "${role}"`);
    }
  });
}

export class LLMClient {
  #model;

  #provider;

  #modelName;

  constructor(model, meta) {
    this.#model = model;
    this.#provider = meta.provider;
    this.#modelName = meta.modelName;

    Object.freeze(this);
  }

  get provider() {
    return this.#provider;
  }

  get modelName() {
    return this.#modelName;
  }

  async send(messages) {
    const validatedMessages = validate(messagesInputSchema, messages);

    const langchainMessages = toMessages(validatedMessages);

    try {
      const response = await this.#model.invoke(langchainMessages);

      return {
        content: response.content,
        meta: {
          provider: this.#provider,
          model: this.#modelName,
          usage: response.usage_metadata ?? null,
        },
      };
    } catch (err) {
      throw this.#wrapError(err);
    }
  }

  async sendStructured(messages, schema) {
    if (!schema || typeof schema.parse !== "function") {
      throw new LLMConfigError(
        "sendStructured() requires a valid Zod schema as the second argument.",
      );
    }

    const validatedMessages = validate(messagesInputSchema, messages);

    const langchainMessages = toMessages(validatedMessages);

    try {
      const structuredModel = this.#model.withStructuredOutput(schema);
      const data = await structuredModel.invoke(langchainMessages);

      return {
        data,
        meta: {
          provider: this.#provider,
          model: this.#modelName,
        },
      };
    } catch (err) {
      throw this.#wrapError(err);
    }
  }

  createChatSession(options = {}) {
    const validated = validate(chatSessionOptionsSchema, options);
    return new ChatSession(this, validated);
  }

  _getModel() {
    return this.#model;
  }

  #wrapError(err) {
    const message = err?.message ?? "Unknown error";

    const sanitised = message
      .replace(/key[=:]\s*\S+/gi, "key=***")
      .replace(/Bearer\s+\S+/gi, "Bearer ***");

    return new LLMProviderError(
      `[${this.#provider}/${this.#modelName}] ${sanitised}`,
      {
        provider: this.#provider,
        model: this.#modelName,
        original: message,
      },
    );
  }
}

export class ChatSession {
  #client;

  #history = [];

  #systemPrompt;

  #maxHistory;

  constructor(client, options = {}) {
    if (!(client instanceof LLMClient)) {
      throw new LLMSessionError("ChatSession requires a valid LLMClient instance.");
    }

    this.#client = client;
    this.#systemPrompt = options.systemPrompt ?? null;
    this.#maxHistory = options.maxHistory ?? LIMITS.MAX_HISTORY_MESSAGES_MAX;
  }

  async send(userMessage) {
    const validatedMessage = validate(userMessageSchema, userMessage);

    const messages = this.#buildMessages(validatedMessage);

    try {
      const model = this.#client._getModel();
      const response = await model.invoke(messages);

      this.#history.push(new HumanMessage(validatedMessage));
      this.#history.push(new AIMessage(response.content));
      this.#trimHistory();

      return {
        content: response.content,
        meta: {
          provider: this.#client.provider,
          model: this.#client.modelName,
          historyLength: this.#history.length,
          usage: response.usage_metadata ?? null,
        },
      };
    } catch (err) {
      throw new LLMProviderError(`ChatSession send failed: ${err.message}`, {
        provider: this.#client.provider,
        model: this.#client.modelName,
      });
    }
  }

  getHistory() {
    return this.#history.map((msg) => ({
      role: msg._getType(),
      content: msg.content,
    }));
  }

  get historyLength() {
    return this.#history.length;
  }

  clearHistory() {
    this.#history = [];
  }

  get systemPrompt() {
    return this.#systemPrompt;
  }

  loadHistory(history) {
    const validatedHistory = validate(ChatHistorySchema, history);
    this.#history = toMessages(validatedHistory);
  }

  #buildMessages(userMessage) {
    const messages = [];

    if (this.#systemPrompt) {
      messages.push(new SystemMessage(this.#systemPrompt));
    }

    messages.push(...this.#history);
    messages.push(new HumanMessage(userMessage));

    return messages;
  }

  #trimHistory() {
    while (this.#history.length > this.#maxHistory * 2) {
      this.#history.splice(0, 2);
    }
  }
}
