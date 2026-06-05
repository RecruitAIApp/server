import { feedbackQueue } from "../../config/queues.js";

/**
 * Enqueues a feedback agent email drafting/sending workflow run in BullMQ.
 * @param {string} applicationId - The ID of the application
 * @param {string} hrNotes - The rejection reason/notes entered by the interviewer
 */
export const enqueueFeedback = async (applicationId, hrNotes) => {
  if (!feedbackQueue) {
    throw new Error("Feedback Queue is not initialized");
  }

  await feedbackQueue.add("PROCESS_FEEDBACK", {
    applicationId,
    hrNotes,
  });
};
