import { Queue } from "bullmq";
import { redisConnection } from "./redis.config.js";

export const aiAutomationQueue = new Queue("AI_AUTOMATION_QUEUE", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // da 3shan law 7asl error proces el CV 3shan ya3ed 3shan mayeb3atsh error for the candidate
    backoff: { type: "exponential", delay: 5000 }, // ba3ad el error hay wait 5 seconds then try again
    removeOnComplete: 100, // el jobs elly tamam hayetshil min el queue after 100 job
    removeOnFail: 50, // el jobs elly failed hayetshil min el queue after 50 job
  },
});