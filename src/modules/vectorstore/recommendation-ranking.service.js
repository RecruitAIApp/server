import { z } from "zod";
import { LLMFactory } from "../llm/llm.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("recommendation-ranking-service");

// Zod schema for structured LLM output
const RankingSchema = z.object({
  rankings: z.array(
    z.object({
      jobId: z.string().describe("The MongoDB ID of the job"),
      score: z.number().min(0).max(100).describe("The compatibility score between 0 and 100"),
      reason: z.string().describe("A concise 1-sentence explanation of why this score was assigned")
    })
  )
});

/**
 * Re-ranks a subset of retrieved jobs against the candidate's profile using an LLM.
 * 
 * @param {object} profile - Candidate profile object populated with user name
 * @param {Array<object>} jobs - Array of populated MongoDB Job documents
 * @returns {Promise<Array<object>>} Array of ranked jobs with scores and justifications
 */
export async function rerankJobs(profile, jobs) {
  if (!jobs || jobs.length === 0) {
    return [];
  }

  logger.info(`Starting LLM re-ranking of ${jobs.length} jobs for profileId: ${profile._id}`);

  try {
    const provider = process.env.LLM_PROVIDER || "groq";
    const llm = LLMFactory.create(provider, {
      temperature: 0.1, // Low temperature for consistent ranking logic
    });

    // Format Candidate Profile summary
    const candidateSummary = [
      `Candidate Name: ${profile.fullName || "N/A"}`,
      `Headline: ${profile.basicInfo?.headline || "N/A"}`,
      `Bio/Summary: ${profile.basicInfo?.bio || "N/A"}`,
      `Skills: ${(profile.skills || []).join(", ") || "N/A"}`,
      `Technologies: ${(profile.technologies || []).join(", ") || "N/A"}`,
      `Preferred Roles: ${(profile.preferredRoles || []).join(", ") || "N/A"}`,
      `Experience Summary: ${(profile.experience || []).map(exp => {
        return `${exp.title} at ${exp.company} (${exp.currentlyWorking ? "Present" : "Past"}): ${exp.description || "No description"}`;
      }).join("; ") || "N/A"}`,
      `Education Summary: ${(profile.education || []).map(edu => {
        return `${edu.degree} in ${edu.field} from ${edu.institution}`;
      }).join("; ") || "N/A"}`,
      `Parsed Resume Data: Skills: ${(profile.resume?.parsedData?.skills || []).join(", ") || "N/A"}, Experience Years: ${profile.resume?.parsedData?.experienceYears || 0}, Job Titles: ${(profile.resume?.parsedData?.jobTitles || []).join(", ") || "N/A"}, Parsing Summary: ${profile.resume?.parsedData?.summary || "N/A"}`
    ].join("\n");

    // Format Jobs summary
    const jobsList = jobs.map((job, idx) => {
      return [
        `Job #${idx + 1} ID: ${job._id.toString()}`,
        `Title: ${job.title}`,
        `Company: ${job.company?.name || "N/A"}`,
        `Description: ${job.description}`,
        `Requirements: ${(job.requirements || []).join(", ") || "N/A"}`,
        `Skills Needed: ${(job.skills || []).join(", ") || "N/A"}`,
        `Experience Level: ${job.experienceLevel || "N/A"}`,
        `Employment Type: ${job.employmentType || "N/A"}`,
        `Location: ${job.location || "N/A"}`
      ].join("\n");
    }).join("\n---\n");

    const systemPrompt = `
You are an expert recruitment matching engine. You are provided with a candidate's complete profile and a list of job openings.
Your task is to re-rank the job openings according to their fit for the candidate.

Evaluate each job against the candidate profile based on these criteria:
1. Skills Match: Alignment between candidate's skills/technologies and the job requirements.
2. Experience Alignment: Compatibility between candidate's calculated/parsed years of experience and the job's expected seniority level.
3. Semantic Relevance: Overall career history alignment.
4. Role Compatibility: Match between past titles/preferred roles and the job title.

Assign a compatibility score (0-100) and provide a concise, professional 1-sentence reason for the score.
Only rank the jobs in the list. Do not invent new jobs. Return the rankings array in the specified structured schema.
`.trim();

    const userPrompt = `
CANDIDATE PROFILE:
${candidateSummary}

JOBS TO EVALUATE:
${jobsList}
`.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "human", content: userPrompt }
    ];

    logger.info(`Sending structured request to LLM using provider: ${provider}`);
    const response = await llm.sendStructured(messages, RankingSchema);
    
    const rankings = response.data?.rankings || [];
    logger.info(`Received ${rankings.length} ranked results from LLM`);
    return rankings;

  } catch (error) {
    logger.error(`Failed to re-rank jobs with LLM: ${error.message}`, error);
    // Safe fallback behavior: return empty array so that vector store ranking remains unchanged
    return [];
  }
}
