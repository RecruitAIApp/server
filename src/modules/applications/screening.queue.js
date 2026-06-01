import { aiAutomationQueue } from "../../config/queues.js";
import { AppError } from "../../utils/error.js";

/**
 * Enqueues a resume screening task in BullMQ.
 * @param {object} application - The created application document
 */
export const enqueue = async (application) => {
  if (!application.appliedResume?.url) {
    throw new AppError("CV file is required to apply", 400);
  }

  if (!aiAutomationQueue) {
    throw new Error("AI Automation Queue is not initialized");
  }

  await aiAutomationQueue.add("PROCESS_SCREENING", {
    applicationId: application._id,
    jobId: application.jobId,
    cvUrl: application.appliedResume.url,
  });
};

