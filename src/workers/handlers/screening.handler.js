import Application from "../../modules/applications/application.model.js";
import { screeningGraph } from "../../modules/ai-screening/screening.graph.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("screening-handler");

export async function handleScreening(data) {
  const { applicationId } = data;
  if (!applicationId) throw new Error("Missing applicationId in job data");

  logger.info(`Starting screening for application ${applicationId}`);

  // Mark status as processing
  await Application.findByIdAndUpdate(applicationId, {
    "aiScreening.status": "processing"
  });

  try {
    await screeningGraph.invoke({ applicationId });
    logger.info(`Screening completed successfully for application ${applicationId}`);
  } catch (error) {
    logger.error(`Screening failed for application ${applicationId}`, error);
    
    // Mark status as failed and add error as a red flag or summary
    await Application.findByIdAndUpdate(applicationId, {
      "aiScreening.status": "failed",
      "aiScreening.summary": `AI screening failed to process: ${error.message}`,
      "aiScreening.processedAt": new Date()
    });
    
    throw error;
  }
}
