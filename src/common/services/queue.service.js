import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";

const initializedQueues = new Map();

export const QueueService = {
  getQueue(name) {
    if (!initializedQueues.has(name)) {
      const queue = new Queue(name, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: { age: 24 * 3600 },
        },
      });
      initializedQueues.set(name, queue);
    }
    return initializedQueues.get(name);
  },

  async addJob(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName);
    return await queue.add(jobName, data, options);
  },

  async closeAll() {
    for (const queue of initializedQueues.values()) {
      await queue.close();
    }
    initializedQueues.clear();
  }
};
