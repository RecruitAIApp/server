import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import config from "../../config/index.js";
import { LLMClient } from "./LLMProvider.js";
import {
  PROVIDERS,
  SUPPORTED_PROVIDERS,
  MODELS_BY_PROVIDER,
} from "./llm.constants.js";
import { factoryConfigSchema, validate } from "./llm.validators.js";
import { LLMConfigError } from "./llm.errors.js";
import { ChatOpenRouter } from "@langchain/openrouter";

const PROVIDER_BUILDERS = Object.freeze({
  [PROVIDERS.GOOGLE](merged) {
    return new ChatGoogleGenerativeAI({
      model: merged.model,
      temperature: merged.temperature,
      maxOutputTokens: merged.maxOutputTokens,
      maxRetries: merged.maxRetries,
      project: config.llm.google.project,
      apiKey: merged.apiKey,
    });
  },

  [PROVIDERS.GROQ](merged) {
    return new ChatGroq({
      model: merged.model,
      apiKey: merged.apiKey,
      temperature: merged.temperature,
      maxTokens: merged.maxOutputTokens,
      maxRetries: merged.maxRetries,
    });
  },
  [PROVIDERS.OPENROUTER](merged) {
    return new ChatOpenRouter({
      model: merged.model,
      apiKey: merged.apiKey,
      temperature: merged.temperature,
      maxTokens: merged.maxOutputTokens,
      maxRetries: merged.maxRetries,
    });
  },
});

export const LLMFactory = Object.freeze({
  create(providerName, userConfig = {}) {
    const provider = String(providerName).toLowerCase().trim();

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new LLMConfigError(
        `Unsupported provider "${providerName}". Choose one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
      );
    }

    const providerDefaults = config.llm[provider];
    const globalDefaults = config.llm.defaults;

    const parsedConfig = validate(factoryConfigSchema, userConfig);

    const merged = {
      model: parsedConfig.model ?? providerDefaults.defaultModel,
      temperature: parsedConfig.temperature ?? globalDefaults.temperature,
      maxOutputTokens:
        parsedConfig.maxOutputTokens ?? globalDefaults.maxOutputTokens,
      maxRetries: parsedConfig.maxRetries ?? globalDefaults.maxRetries,
      apiKey: parsedConfig.apiKey ?? providerDefaults.apiKey,
      maxHistoryMessages:
        parsedConfig.maxHistoryMessages ?? globalDefaults.maxHistoryMessages,
    };

    const allowedModels = MODELS_BY_PROVIDER[provider];
    if (!allowedModels.includes(merged.model)) {
      throw new LLMConfigError(
        `Model "${merged.model}" is not supported by provider "${provider}". ` +
        `Allowed models: ${allowedModels.join(", ")}`,
      );
    }

    if (provider !== PROVIDERS.GOOGLE && !merged.apiKey) {
      throw new LLMConfigError(
        `Missing API key for provider "${provider}". 
        Set the ${provider === PROVIDERS.GROQ ? "GROQ_API_KEY" : "OPENROUTER_API_KEY"}  
        environment variable or pass { apiKey } in the config.`,
      );
    }

    const builder = PROVIDER_BUILDERS[provider];
    const model = builder(merged);

    return new LLMClient(model, {
      provider,
      modelName: merged.model,
    });
  },
});
