import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/recruitai",
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || "recruit_ai_secure_secret_key_12345!@#",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      `${process.env.JWT_SECRET || "recruit_ai_secure_secret_key_12345!@#"}_refresh`,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  llm: {
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      defaultModel: process.env.GOOGLE_DEFAULT_MODEL || "gemini-2.5-flash",
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: process.env.GROQ_DEFAULT_MODEL || "llama-3.3-70b-versatile",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultModel:
        process.env.OPENROUTER_DEFAULT_MODEL ||
        "nvidia/nemotron-3-super-120b-a12b:free",
    },
    defaults: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      maxRetries: 2,
      maxHistoryMessages: 50,
    },
  },
};

export default config;
