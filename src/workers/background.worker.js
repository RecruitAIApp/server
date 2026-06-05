import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.config.js";
import { connectDB } from "../config/db.config.js";

import { handleEmbedding } from "./handlers/embedding.handler.js";
import { handleCVParse } from "./handlers/cv-parse.handler.js";

await connectDB();

// Initialize the tracking agent worker once DB connection is established
await import("../modules/applications/workers/tracking.worker.js");


const WORKER_CONFIG = {
  "EMBED_RESUME": handleEmbedding,
  "CV_PARSE": handleCVParse,
};


const worker = new Worker(
  "background-tasks",
  async (job) => {
    const { type, data } = job.data;
    const handler = WORKER_CONFIG[type];

    if (!handler) {
      console.warn(`[worker] No handler registered for job type: ${type}`);
      return;
    }

    console.log(`[worker] Job ${job.id} | Starting: ${type}`);
    await handler(data);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} [${job.data.type}] completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job.id} [${job.data.type}] failed:`, err.message);
});

console.log("[worker] background-worker process started (Unified Config Mode)");
