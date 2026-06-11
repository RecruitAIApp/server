import { VectorStoreService } from "../../modules/vectorstore/vectorstore.service.js";
import { createLogger } from "../../utils/logger.js";
import { runAgentAndSave } from "../../modules/interviewRecommendations/interviewRecommendation.service.js";

const logger = createLogger("recommendation-handler");

/**
 * BullMQ job processor for EMBED_RESUME.
 * Generates vector embedding for candidate profiles, manages Pinecone storage,
 * and executes duplicate prevention.
 * 
 * @param {object} data - Job data object containing text, metadata, namespace, and chunkOptions
 */
export async function handleResumeEmbedding(data) {
  const { text, metadata, namespace = "resumes", chunkOptions = {} } = data;

  if (!metadata || !metadata.profileId) {
    throw new Error("Missing profileId in resume embedding metadata");
  }

  logger.info(`Starting resume embedding processing for profile: ${metadata.profileId}`);

  // 1. Duplicate Prevention: Delete existing candidate vectors for this profile
  try {
    logger.info(`Deleting existing Pinecone vectors for profileId: ${metadata.profileId}`);
    await VectorStoreService.deleteByFilter(namespace, { profileId: metadata.profileId.toString() });
  } catch (error) {
    // If no existing vectors or error, we log a warning but proceed to embed.
    logger.warn(`Could not delete previous vector for profileId ${metadata.profileId}: ${error.message}`);
  }

  // 2. Embed and Save to Vector Database
  try {
    await VectorStoreService.embedAndSave(text, metadata, namespace, chunkOptions);
    logger.info(`Successfully generated and saved vector embedding for profileId: ${metadata.profileId}`);
  } catch (error) {
    logger.error(`Error saving candidate embedding for profileId ${metadata.profileId}: ${error.message}`, error);
    throw error; // Rethrow to let BullMQ handle attempts/retries
  }
}

/**
 * BullMQ job processor for GENERATE_RECOMMENDATIONS.
 * Runs LangGraph to generate interview recommendations, saves to MongoDB, and caches in Redis.
 * 
 * @param {object} data - Job data object containing applicationId
 */
export async function handleGenerateRecommendations(data) {
  const { applicationId } = data;
  if (!applicationId) {
    throw new Error("Missing applicationId in recommendations generation job");
  }

  logger.info(`Starting AI Interview Recommendation generation for application: ${applicationId}`);
  try {
    await runAgentAndSave(applicationId);
    logger.info(`Successfully finished AI Interview Recommendation for application: ${applicationId}`);
  } catch (error) {
    logger.error(`Error generating AI recommendations for application ${applicationId}: ${error.message}`, error);
    throw error;
  }
}
