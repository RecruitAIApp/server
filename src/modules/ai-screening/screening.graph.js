import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import Application from "../applications/application.model.js";
import CandidateProfile from "../auth/candidateProfile.model.js";
import Job from "../jobs/job.model.js";
import Company from "../company/company.model.js";
import { cvParseHandler } from "../../workers/handlers/cv-parse.handler.js";
import { LLMFactory } from "../llm/llm.service.js";
import { buildScreeningPrompt } from "./screening.prompts.js";
import { aiScreeningOutputSchema } from "./screening.schemas.js";
import { QueueService } from "../../common/services/queue.service.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("screening-graph");
const llm = LLMFactory.create(process.env.LLM_PROVIDER || "groq");

export const ScreeningState = Annotation.Root({
  applicationId: Annotation(),
  application: Annotation(),
  candidate: Annotation(),
  job: Annotation(),
  company: Annotation(),
  cvText: Annotation(),
  screeningResult: Annotation(),
});

async function loadApplicationNode(state) {
  logger.info(`Loading application ${state.applicationId}`);
  const application = await Application.findById(state.applicationId);
  if (!application) throw new Error(`Application ${state.applicationId} not found`);
  return { application };
}

async function loadCandidateNode(state) {
  logger.info(`Loading candidate for user ${state.application.candidateId}`);
  const candidate = await CandidateProfile.findOne({ userId: state.application.candidateId });
  if (!candidate) throw new Error(`Candidate profile not found for user ${state.application.candidateId}`);
  return { candidate };
}

async function loadJobNode(state) {
  logger.info(`Loading job ${state.application.jobId}`);
  const job = await Job.findById(state.application.jobId);
  if (!job) throw new Error(`Job ${state.application.jobId} not found`);
  return { job };
}

async function loadCompanyNode(state) {
  logger.info(`Loading company ${state.application.companyId}`);
  const company = await Company.findById(state.application.companyId);
  if (!company) throw new Error(`Company ${state.application.companyId} not found`);
  return { company };
}

async function extractCvNode(state) {
  logger.info(`Extracting CV text for application ${state.applicationId}`);
  const cvUrl = state.application.appliedResume?.url;
  const publicId = state.application.appliedResume?.publicId || cvParseHandler.publicIdFromUrl(cvUrl);
  
  if (!cvUrl || !publicId) {
    logger.warn(`No CV URL or publicId found for application ${state.applicationId}. Will screen without raw CV text.`);
    return { cvText: "" };
  }

  try {
    const text = await cvParseHandler.fetchPDFText(publicId, cvUrl);
    
    if (text) {
      // Queue job for embedding the CV text to vector store
      await QueueService.addJob("background-tasks", "EMBED_RESUME", {
        type: "EMBED_RESUME",
        data: {
          text,
          metadata: {
            candidateId: state.application.candidateId.toString(),
            jobId: state.application.jobId.toString(),
            type: "cv_embedding"
          },
          namespace: "resumes"
        }
      });
      logger.info(`Enqueued CV embedding job for application ${state.applicationId}`);
    }

    return { cvText: text };
  } catch (e) {
    logger.error(`Failed to extract CV text: ${e.message}`);
    // We return empty string on error so we can still screen based on parsed data in profile
    return { cvText: "" };
  }
}

async function screenCandidateNode(state) {
  logger.info(`Screening candidate for application ${state.applicationId}`);
  const prompt = buildScreeningPrompt({
    job: state.job,
    candidate: state.candidate,
    application: state.application,
    company: state.company,
    cvText: state.cvText
  });

  const MAX_RETRIES = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await llm.send([{ role: "human", content: prompt }]);
      const content = response.content ?? "";
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("LLM returned no JSON");
      
      const parsedJson = JSON.parse(jsonMatch[0]);
      const validatedResult = aiScreeningOutputSchema.parse(parsedJson);
      
      return { screeningResult: validatedResult };
    } catch (e) {
      lastError = e;
      logger.warn(`LLM attempt ${attempt}/${MAX_RETRIES} failed`, { error: e.message });
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

async function saveResultNode(state) {
  logger.info(`Saving screening result for application ${state.applicationId}`);
  const result = state.screeningResult;
  const breakdown = result.scoreBreakdown;
  
  // Formula: overallScore = Math.round(skillsScore*0.4 + experienceScore*0.4 + educationScore*0.2)
  const overallScore = Math.round(
    (breakdown.skills * 0.4) + 
    (breakdown.experience * 0.4) + 
    (breakdown.education * 0.2)
  );

  await Application.findByIdAndUpdate(state.applicationId, {
    "aiScreening.status": "completed",
    "aiScreening.overallScore": overallScore,
    "aiScreening.confidence": result.confidence,
    "aiScreening.scoreBreakdown": breakdown,
    "aiScreening.matchedSkills": result.matchedSkills,
    "aiScreening.missingSkills": result.missingSkills,
    "aiScreening.summary": result.summary,
    "aiScreening.redFlags": result.redFlags,
    "aiScreening.processedAt": new Date()
  });

  return {};
}

// Define the Graph
const workflow = new StateGraph(ScreeningState)
  .addNode("loadApplication", loadApplicationNode)
  .addNode("loadCandidate", loadCandidateNode)
  .addNode("loadJob", loadJobNode)
  .addNode("loadCompany", loadCompanyNode)
  .addNode("extractCv", extractCvNode)
  .addNode("screenCandidate", screenCandidateNode)
  .addNode("saveResult", saveResultNode)
  .addEdge(START, "loadApplication")
  .addEdge("loadApplication", "loadCandidate")
  .addEdge("loadCandidate", "loadJob")
  .addEdge("loadJob", "loadCompany")
  .addEdge("loadCompany", "extractCv")
  .addEdge("extractCv", "screenCandidate")
  .addEdge("screenCandidate", "saveResult")
  .addEdge("saveResult", END);

export const screeningGraph = workflow.compile();
