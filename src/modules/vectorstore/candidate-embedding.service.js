import { QueueService } from "../../common/services/queue.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("candidate-embedding-service");

/**
 * Builds a normalized, space-cleaned string representation of the candidate profile
 * for embedding purposes.
 * 
 * @param {object} profile - Candidate profile document from MongoDB (populated as needed)
 * @returns {string} Cleaned text for vector embeddings
 */
export function buildCandidateEmbeddingText(profile) {
  if (!profile) return "";

  const parts = [];

  // 1. Basic Info & Bio/Summary
  if (profile.basicInfo?.headline?.trim()) {
    parts.push(`Headline: ${profile.basicInfo.headline.trim()}`);
  }
  
  const bio = profile.basicInfo?.bio?.trim();
  const cvSummary = profile.resume?.parsedData?.summary?.trim();
  const summary = bio || cvSummary;
  if (summary) {
    parts.push(`Summary: ${summary}`);
  }

  // 2. Skills & Technologies
  const skillsList = profile.skills || [];
  const cvSkillsList = profile.resume?.parsedData?.skills || [];
  const techList = profile.technologies || [];
  
  const allSkills = new Set(
    [...skillsList, ...cvSkillsList, ...techList]
      .map(s => s?.trim())
      .filter(Boolean)
  );

  if (allSkills.size > 0) {
    parts.push(`Skills and Technologies: ${Array.from(allSkills).join(", ")}`);
  }

  // 3. Experience & Job Titles
  const expTitles = (profile.experience || []).map(e => e.title?.trim()).filter(Boolean);
  const cvTitles = (profile.resume?.parsedData?.jobTitles || []).map(t => t?.trim()).filter(Boolean);
  const preferredRoles = (profile.preferredRoles || []).map(r => r?.trim()).filter(Boolean);

  const allTitles = new Set([...expTitles, ...cvTitles, ...preferredRoles]);
  if (allTitles.size > 0) {
    parts.push(`Job Titles and Roles: ${Array.from(allTitles).join(", ")}`);
  }

  if (preferredRoles.length > 0) {
    parts.push(`Preferred Roles: ${preferredRoles.join(", ")}`);
  }

  // Experience Years calculation
  let experienceYears = Number(profile.resume?.parsedData?.experienceYears) || 0;
  if (profile.experience && profile.experience.length > 0) {
    let calculatedYears = 0;
    profile.experience.forEach(exp => {
      if (!exp.startDate) return;
      const start = new Date(exp.startDate);
      const end = exp.currentlyWorking ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        calculatedYears += diffMs / (1000 * 60 * 60 * 24 * 365.25);
      }
    });
    calculatedYears = Math.round(calculatedYears * 10) / 10;
    if (calculatedYears > experienceYears) {
      experienceYears = calculatedYears;
    }
  }

  if (experienceYears > 0) {
    parts.push(`Years of Experience: ${experienceYears}`);
  }

  // Experience Details
  if (profile.experience && profile.experience.length > 0) {
    const expDescriptions = profile.experience
      .map(e => {
        const company = e.company?.trim();
        const title = e.title?.trim();
        const desc = e.description?.trim();
        return `${title || "Role"} at ${company || "Company"}${desc ? ` (${desc})` : ""}`;
      })
      .filter(Boolean);
    
    if (expDescriptions.length > 0) {
      parts.push(`Work History: ${expDescriptions.join("; ")}`);
    }
  }

  // 4. Education
  if (profile.education && profile.education.length > 0) {
    const eduDescriptions = profile.education
      .map(edu => {
        const inst = edu.institution?.trim();
        const deg = edu.degree?.trim();
        const field = edu.field?.trim();
        return `${deg || "Degree"} in ${field || "Field"} from ${inst || "Institution"}`;
      })
      .filter(Boolean);

    if (eduDescriptions.length > 0) {
      parts.push(`Education: ${eduDescriptions.join("; ")}`);
    }
  }

  // 5. Raw PDF parsed CV text fallback context (up to 1000 chars)
  const rawText = profile.resume?.parsedData?.rawText?.trim();
  if (rawText) {
    parts.push(`Additional CV Context: ${rawText.slice(0, 1000)}`);
  }

  // Combine and normalize spaces
  const combined = parts.join(" | ");
  return combined.replace(/\s+/g, " ").trim();
}

/**
 * Safely enqueues a background job to update the candidate's vector embedding.
 * Keeps request lifecycle non-blocking and handles Redis errors gracefully.
 * 
 * @param {object} profile - Candidate profile document from MongoDB
 */
export async function enqueueResumeEmbedding(profile) {
  try {
    if (!profile) {
      logger.warn("No profile provided for resume embedding enqueue.");
      return;
    }

    const text = buildCandidateEmbeddingText(profile);
    if (!text) {
      logger.warn(`Candidate profile ${profile._id} has no indexable content. Skipping embedding.`);
      return;
    }

    // Add job to 'background-tasks' queue with EMBED_RESUME type
    await QueueService.addJob("background-tasks", "EMBED_RESUME", {
      type: "EMBED_RESUME",
      data: {
        text,
        metadata: {
          profileId: profile._id.toString(),
          userId: profile.userId.toString(),
          type: "candidate"
        },
        namespace: "resumes"
      }
    });

    logger.info(`Enqueued resume embedding job for profileId: ${profile._id}`);
  } catch (error) {
    // Safe fallback behavior: do not crash the request lifecycle (e.g. if Redis connection fails)
    logger.error(`Failed to enqueue resume embedding for profileId ${profile?._id}: ${error.message}`, error);
  }
}
