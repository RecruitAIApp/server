import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.config.js";
import { connectDB } from "../config/db.config.js";
import { createLogger } from "../utils/logger.js";
import { handleScreening } from "./handlers/screening.handler.js";
import dotenv from "dotenv";

dotenv.config();

await connectDB();

const logger = createLogger("automation-worker");

const WORKER_CONFIG = {
  "PROCESS_SCREENING": handleScreening,
};

const worker = new Worker(
  "PROCESSING_QUEUE",
  async (job) => {
    const { name, data } = job;
    const handler = WORKER_CONFIG[name];

    if (!handler) {
      logger.warn(`No handler registered for job type: ${name}`);
      return;
    }

    logger.info(`Job ${job.id} | Starting: ${name}`);
    await handler(data);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  logger.info(`Job ${job.id} [${job.name}] completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job.id} [${job.name}] failed`, err);
});

logger.info("automation-worker process started (PROCESSING_QUEUE)");
