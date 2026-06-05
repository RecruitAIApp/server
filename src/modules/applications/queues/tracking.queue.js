import { trackingQueue } from "../../../config/queues.js";

/**
 * Enqueues a tracking agent workflow run in BullMQ.
 * @param {string} applicationId - The ID of the application to evaluate
 */
export const enqueueTracking = async (applicationId) => {
  if (!trackingQueue) {
    throw new Error("Tracking Queue is not initialized");
  }

  await trackingQueue.add("PROCESS_TRACKING", {
    applicationId,
  });
};
