import Job from "../jobs/job.model.js";
import profileService from "../profiles/profile.service.js";
import { VectorStoreService } from "../vectorstore/vectorstore.service.js";
import { buildCandidateEmbeddingText } from "../vectorstore/candidate-embedding.service.js";
import { rerankJobs } from "../vectorstore/recommendation-ranking.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("recommendation-service");

/**
 * Service to retrieve semantic job recommendations for a candidate.
 * 
 * Flow:
 * 1. Retrieve Candidate Profile
 * 2. Build Candidate Embedding Text
 * 3. Query Pinecone for top jobs using Cosine Similarity (default namespace 'jobs')
 * 4. Fetch Job details from MongoDB by IDs & apply filters (status='open', location, jobType, seniority)
 * 5. Score and sort jobs based on vector similarity
 * 6. (Optional) Re-rank the top jobs using the LLM for high-fidelity scoring/justifications.
 * 
 * @param {string} userId - User ID of the candidate
 * @param {object} options - Retrieval options (location, employmentType, seniority, limit, rerank)
 * @returns {Promise<object>} Recommendations list
 */
export async function getRecommendationsForCandidate(userId, options = {}) {
  const {
    location,
    employmentType,
    seniority,
    limit = 20,
    rerank = true
  } = options;

  logger.info(`Fetching recommendations for candidate user: ${userId}`);

  // 1. Get Candidate Profile
  const profile = await profileService.getProfile(userId);
  if (!profile) {
    logger.warn(`Profile not found for candidate user: ${userId}`);
    return { recommendations: [] };
  }

  // 2. Resolve Candidate Vector (Try finding existing vector, fallback to generating and saving once)
  let candidateVector = null;
  try {
    logger.info(`Checking if candidate vector exists in Pinecone for profileId: ${profile._id.toString()}`);
    candidateVector = await VectorStoreService.getVectorByMetadata(
      { profileId: profile._id.toString() },
      "resumes"
    );
  } catch (error) {
    logger.warn(`Error checking candidate vector for profileId ${profile._id}: ${error.message}`);
  }

  if (candidateVector) {
    logger.info(`Vector found in Pinecone for profileId: ${profile._id.toString()}. Reusing stored vector.`);
  } else {
    logger.info(`Vector not found for profileId: ${profile._id.toString()}. Falling back to generate embedding.`);
    const candidateText = buildCandidateEmbeddingText(profile);
    if (!candidateText) {
      logger.warn(`Candidate ${userId} profile is empty. Cannot generate semantic query.`);
      return { recommendations: [] };
    }

    try {
      candidateVector = await VectorStoreService.generateEmbedding(candidateText);
      logger.info(`Vector successfully generated for profileId: ${profile._id.toString()}`);
      
      logger.info(`Saving generated vector to Pinecone for profileId: ${profile._id.toString()}`);
      await VectorStoreService.upsertCandidateVector(
        candidateVector,
        candidateText,
        {
          profileId: profile._id.toString(),
          userId: profile.userId.toString(),
          type: "candidate"
        },
        "resumes"
      );
    } catch (error) {
      logger.error(`Error in fallback embedding generation/save for profileId ${profile._id}: ${error.message}`);
      throw error;
    }
  }

  // 3. Vector Similarity Search using stored/reused vector (Top 50 to allow room for filtering in DB)
  logger.info(`Retrieving top similar jobs using retrieveByVector from namespace "jobs"`);
  let vectorResults = [];
  try {
    vectorResults = await VectorStoreService.retrieveByVector(
      candidateVector,
      50, // Retrieve top 50 jobs
      "jobs",
      { type: "job" } // Safe filter that exists on all job vectors
    );
    logger.info(`Successfully retrieved ${vectorResults.length} matching jobs from Vector Store.`);
  } catch (error) {
    logger.error(`Error searching vector store by vector for candidate: ${error.message}`);
    throw error;
  }

  if (!vectorResults || vectorResults.length === 0) {
    logger.info("No semantic job matches found in Vector Store.");
    return { recommendations: [] };
  }

  const jobIds = vectorResults.map(res => res.metadata.jobId).filter(Boolean);
  
  // 4. DB Filtering
  // We query MongoDB to get job status and perform precise filter matching
  const dbQuery = {
    _id: { $in: jobIds },
    status: "open"
  };

  if (location) {
    dbQuery.location = { $regex: new RegExp(location.trim(), "i") };
  }
  if (employmentType) {
    dbQuery.employmentType = employmentType.trim();
  }
  if (seniority) {
    dbQuery.experienceLevel = seniority.trim();
  }

  logger.info(`Querying database for job IDs and applying filters`);
  const jobs = await Job.find(dbQuery).populate("company", "name logo industry description");

  // 5. Score & Sort
  // Map similarity scores back to DB results and sort by score descending
  let recommendations = jobs.map(job => {
    const vectorMatch = vectorResults.find(v => v.metadata.jobId === job._id.toString());
    
    // Convert cosine score (usually 0.0 - 1.0) to percentage scale (0 - 100)
    let score = 70; // fallback default
    if (vectorMatch && typeof vectorMatch.score === "number") {
      score = Math.round(vectorMatch.score * 100);
      // Clamp between 0 and 100
      score = Math.max(0, Math.min(100, score));
    }

    return {
      job,
      score,
      reason: "Semantically matched based on skills, profile text, and experience alignment."
    };
  }).sort((a, b) => b.score - a.score);

  // 6. Optional LLM Re-ranking (Only send the top retrieved jobs, up to 15)
  if (rerank && recommendations.length > 0) {
    const topCount = 15;
    const topForRerank = recommendations.slice(0, topCount);
    const remaining = recommendations.slice(topCount);

    logger.info(`Sending top ${topForRerank.length} jobs for LLM re-ranking`);
    const rerankedData = await rerankJobs(profile, topForRerank.map(r => r.job));

    const rerankedRecommendations = topForRerank.map(rec => {
      const llmResult = rerankedData.find(item => item.jobId === rec.job._id.toString());
      if (llmResult) {
        return {
          job: rec.job,
          score: llmResult.score,
          reason: llmResult.reason
        };
      }
      return rec; // Fallback to vector score if LLM fails or skips
    });

    // Re-sort reranked items by score and combine with the rest
    recommendations = [...rerankedRecommendations, ...remaining].sort((a, b) => b.score - a.score);
  }

  // Slice final list to requested limit
  return {
    recommendations: recommendations.slice(0, limit)
  };
}
