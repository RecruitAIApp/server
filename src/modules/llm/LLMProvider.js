import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
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

  return input.map(({ role, content, tool_calls, tool_call_id }) => {
    switch (role) {
      case ROLES.SYSTEM:
        return new SystemMessage(content);
      case ROLES.HUMAN:
        return new HumanMessage(content);
      case ROLES.AI:
        return new AIMessage({
          content,
          tool_calls: tool_calls || [],
        });
      case ROLES.TOOL:
        return new ToolMessage({
          content,
          tool_call_id,
        });
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
        toolCalls: response.tool_calls || [],
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

  bindTools(tools) {
    if (!Array.isArray(tools)) {
      throw new LLMConfigError("bindTools() expects an array of tools.");
    }

    try {
      const boundModel = this.#model.bindTools(tools);
      return new LLMClient(boundModel, {
        provider: this.#provider,
        modelName: this.#modelName,
      });
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
    let validatedMessage = null;

    if (userMessage !== undefined && userMessage !== null) {
      validatedMessage = validate(userMessageSchema, userMessage);
      this.#history.push(new HumanMessage(validatedMessage));
    }

    const messages = this.#buildMessages();

    try {
      const model = this.#client._getModel();
      const response = await model.invoke(messages);

      this.#history.push(
        new AIMessage({
          content: response.content,
          tool_calls: response.tool_calls || [],
        }),
      );
      this.#trimHistory();

      return {
        content: response.content,
        toolCalls: response.tool_calls || [],
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
    return this.#history.map((msg) => {
      const res = {
        role: msg._getType(),
        content: msg.content,
      };

      if (msg instanceof AIMessage && msg.tool_calls?.length) {
        res.tool_calls = msg.tool_calls;
      }

      if (msg instanceof ToolMessage) {
        res.tool_call_id = msg.tool_call_id;
      }

      return res;
    });
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

  addToolResponse(toolCallId, content) {
    if (!toolCallId) {
      throw new LLMSessionError("toolCallId is required for addToolResponse.");
    }
    this.#history.push(
      new ToolMessage({
        content: String(content),
        tool_call_id: toolCallId,
      }),
    );
  }

  loadHistory(history) {
    const validatedHistory = validate(ChatHistorySchema, history);
    this.#history = toMessages(validatedHistory);
  }

  #buildMessages() {
    const messages = [];

    if (this.#systemPrompt) {
      messages.push(new SystemMessage(this.#systemPrompt));
    }

    messages.push(...this.#history);

    return messages;
  }

  #trimHistory() {
    while (this.#history.length > this.#maxHistory * 2) {
      this.#history.splice(0, 2);
    }
  }
}
