import InterviewRecommendation from "./interviewRecommendation.model.js";
import Application from "../applications/application.model.js";
import Interview from "../interviews/interview.model.js";
import { recommendationGraph } from "./interviewRecommendation.ai.js";
import { AppError } from "../../utils/error.js";
import {
  getCachedRecommendation,
  setCachedRecommendation,
  deleteCachedRecommendation,
} from "./interviewRecommendation.cache.js";
import { sendPrepGuideReadyEmail } from "../interviews/interview.email.js";

/**
 * Helper: generates a fresh recommendation using the LangGraph agent,
 * saves it to the DB, updates cache, and sends candidate email notice.
 */
export const runAgentAndSave = async (applicationId) => {
  console.log(`[Prep Agent] Running AI recommendation agent for application: ${applicationId}`);

  // Invoke LangGraph workflow
  const finalState = await recommendationGraph.invoke({ applicationId });
  const result = finalState.recommendations;

  const application = await Application.findById(applicationId).populate("candidateId");
  if (!application) {
    throw new AppError("Application not found during recommendation generation", 404);
  }

  // Look up interview ID if scheduled
  const interview = await Interview.findOne({ applicationId }).sort({ createdAt: -1 });

  // Save to DB
  const doc = await InterviewRecommendation.findOneAndUpdate(
    { applicationId },
    {
      applicationId,
      candidateId: application.candidateId?._id || application.candidateId,
      companyId: application.companyId?._id || application.companyId,
      interviewId: interview?._id || null,
      generatedByAI: true,
      recommendations: result,
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Write to Redis cache
  await setCachedRecommendation(applicationId, result);

  // Send notification email to candidate
  if (application.candidateId?.email) {
    try {
      await sendPrepGuideReadyEmail({
        to: application.candidateId.email,
        candidateName: application.candidateId.fullName || application.candidateId.name || "Candidate",
        companyName: application.companyId?.name || "Company",
        jobTitle: application.jobId?.title || "Position",
      });
      console.log(`[Prep Agent] Sent email notification to candidate: ${application.candidateId.email}`);
    } catch (emailErr) {
      console.error(`[Prep Agent] Failed to send email alert: ${emailErr.message}`);
    }
  }

  return doc;
};

/**
 * Fetch recommendation: Redis-first with DB fallback
 */
export const getRecommendationService = async (applicationId, userRole, userId) => {
  // 1. Security Check: Candidate can only access their own, Company can only access their company's
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (userRole === "candidate" && application.candidateId.toString() !== userId.toString()) {
    throw new AppError("Access denied. Candidates can only access their own preparation guides.", 403);
  }

  // 2. Check Redis cache first
  const cached = await getCachedRecommendation(applicationId);
  if (cached) {
    return { recommendations: cached, source: "cache" };
  }

  // 3. Check MongoDB
  const dbResult = await InterviewRecommendation.findOne({ applicationId });
  if (dbResult) {
    // Write back to cache
    await setCachedRecommendation(applicationId, dbResult.recommendations);
    return { recommendations: dbResult.recommendations, source: "db" };
  }

  // 4. Cache and DB miss -> Trigger synchronous generation
  console.log(`[Prep Agent] Cache and DB miss. Generating synchronously for application: ${applicationId}`);
  const freshDoc = await runAgentAndSave(applicationId);
  return { recommendations: freshDoc.recommendations, source: "ai_generated" };
};

/**
 * Force regenerate recommendations: evicts cache, runs LangGraph, updates DB/cache
 */
export const regenerateRecommendationService = async (applicationId, userRole, userId) => {
  // Security checks
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (userRole === "candidate" && application.candidateId.toString() !== userId.toString()) {
    throw new AppError("Access denied. Candidates can only regenerate their own preparation guides.", 403);
  }

  // Evict cache
  await deleteCachedRecommendation(applicationId);

  // Generate fresh
  const freshDoc = await runAgentAndSave(applicationId);
  return freshDoc.recommendations;
};
