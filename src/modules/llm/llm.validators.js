import Joi from "joi";
import { LIMITS, ROLES } from "./llm.constants.js";
import { LLMValidationError } from "./llm.errors.js";

export const factoryConfigSchema = Joi.object({
  model: Joi.string().trim().optional(),
  temperature: Joi.number()
    .min(LIMITS.TEMPERATURE_MIN)
    .max(LIMITS.TEMPERATURE_MAX)
    .optional(),
  maxOutputTokens: Joi.number()
    .integer()
    .min(LIMITS.MAX_OUTPUT_TOKENS_MIN)
    .max(LIMITS.MAX_OUTPUT_TOKENS_MAX)
    .optional(),
  maxRetries: Joi.number()
    .integer()
    .min(LIMITS.MAX_RETRIES_MIN)
    .max(LIMITS.MAX_RETRIES_MAX)
    .optional(),
  maxHistoryMessages: Joi.number()
    .integer()
    .min(LIMITS.MAX_HISTORY_MESSAGES_MIN)
    .max(LIMITS.MAX_HISTORY_MESSAGES_MAX)
    .optional(),
  apiKey: Joi.string().trim().optional(),
})
  .unknown(false)
  .label("FactoryConfig");

export const chatSessionOptionsSchema = Joi.object({
  systemPrompt: Joi.string()
    .trim()
    .max(LIMITS.SYSTEM_PROMPT_MAX_LENGTH)
    .optional(),
  maxHistory: Joi.number()
    .integer()
    .min(LIMITS.MAX_HISTORY_MESSAGES_MIN)
    .max(LIMITS.MAX_HISTORY_MESSAGES_MAX)
    .optional(),
})
  .unknown(false)
  .label("ChatSessionOptions");

export const userMessageSchema = Joi.string()
  .trim()
  .min(1)
  .max(LIMITS.USER_MESSAGE_MAX_LENGTH)
  .required()
  .label("UserMessage");

export const messagesInputSchema = Joi.alternatives()
  .try(
    Joi.string().trim().min(1).max(LIMITS.USER_MESSAGE_MAX_LENGTH),
    Joi.array()
      .items(
        Joi.object({
          role: Joi.string()
            .valid(...Object.values(ROLES))
            .required(),
          content: Joi.string()
            .trim()
            .allow("")
            .max(LIMITS.USER_MESSAGE_MAX_LENGTH)
            .required(),
          tool_calls: Joi.array().items(Joi.object()).optional(),
          tool_call_id: Joi.string().optional(),
        }),
      )
      .min(1),
  )
  .required()
  .label("MessagesInput");

export const ChatHistorySchema = Joi.array()
  .items(
    Joi.object({
      role: Joi.string()
        .valid(...Object.values(ROLES))
        .required(),
      content: Joi.string()
        .trim()
        .allow("")
        .max(LIMITS.USER_MESSAGE_MAX_LENGTH)
        .required(),
      tool_calls: Joi.array().items(Joi.object()).optional(),
      tool_call_id: Joi.string().optional(),
    }),
  )
  .required()
  .label("ChatHistory");

export function validate(schema, value) {
  const { error, value: validated } = schema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new LLMValidationError(
      `Validation failed: ${error.details.map((d) => d.message).join("; ")}`,
    );
  }

  return validated;
}
