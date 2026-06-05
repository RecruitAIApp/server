import { Worker } from 'bullmq';
import { redisConnection } from '../../../config/redis.config.js';
import { trackingAgent } from '../agents/tracking.agent.js';

/**
 * 
*/

export const trackingWorker = new Worker('TRACKING_QUEUE', async(job) => {
  const { applicationId } = job.data;

  console.log(`⚙️ [Tracking Worker] Started processing for application: ${applicationId}`);
  try {
    const finalState = await trackingAgent.invoke({
      applicationId: applicationId,
    })

    console.log(`[Tracking Worker] Completed processing for application: ${applicationId}`);
    return finalState;
  } catch (error) {
    console.error(`[Tracking Worker] Error processing application ${applicationId}:`, error.message);
    throw error;
  }
}, {connection: redisConnection});
