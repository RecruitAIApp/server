import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { z } from "zod";
import Application from "../applications/application.model.js";
import CandidateProfile from "../auth/candidateProfile.model.js";
import Job from "../jobs/job.model.js";
import Interview from "../interviews/interview.model.js";
import { LLMFactory } from "../llm/llm.service.js";
import { createLogger } from "../../utils/logger.js";
import { AppError } from "../../utils/error.js";

const logger = createLogger("recommendation-agent");

// Zod Schema to validate the recommendations structure
export const recommendationOutputSchema = z.object({
  overview: z.string().describe("Brief overview of the role, responsibilities, and interviewer focus area"),
  topics: z.array(z.string()).describe("List of core technical concepts/topics likely to appear"),
  technicalQuestions: z.array(z.string()).min(10).describe("List of at least 10 expected technical interview questions"),
  behavioralQuestions: z.array(z.string()).min(5).describe("List of at least 5 behavioral questions"),
  hrQuestions: z.array(z.string()).min(5).describe("List of at least 5 HR questions"),
  skillGapAnalysis: z.object({
    missingSkills: z.array(z.string()).describe("Required job skills candidate does not seem to have"),
    weakAreas: z.array(z.string()).describe("Areas candidate might be weak in based on experience"),
    suggestedImprovements: z.array(z.string()).describe("Actionable advice to address gaps"),
  }),
  preparationTips: z.array(z.string()).describe("Personalized preparation tips (e.g. revise aggregation, practice hooks)"),
  recommendations: z.array(z.string()).describe("Documentation/concepts to study and focus on"),
});

// Graph State Annotation
export const RecommendationState = Annotation.Root({
  applicationId: Annotation(),
  application: Annotation(),
  candidateProfile: Annotation(),
  job: Annotation(),
  interview: Annotation(),
  recommendations: Annotation(),
});

/**
 * Node: Gathers all application, candidate, job, and interview data from the DB
 */
async function fetchContextNode(state) {
  const { applicationId } = state;
  logger.info(`[Recommendation Node 1] Fetching context for application: ${applicationId}`);

  const application = await Application.findById(applicationId)
    .populate("candidateId")
    .populate("jobId")
    .populate("companyId");

  if (!application) {
    throw new AppError(`Application ${applicationId} not found`, 404);
  }

  // Load Candidate Profile
  const candidateProfile = await CandidateProfile.findOne({ userId: application.candidateId?._id || application.candidateId });
  
  // Load Interview
  // Find the latest active/scheduled interview for this application
  const interview = await Interview.findOne({ applicationId }).sort({ createdAt: -1 });

  return {
    application,
    candidateProfile,
    job: application.jobId,
    interview,
  };
}

/**
 * Node: Builds the prompt, calls LLM (Google -> Groq -> OpenRouter), parses & validates output
 */
async function generateRecommendationNode(state) {
  const { application, candidateProfile, job, interview } = state;

  const candidateName = application.candidateId?.fullName || application.candidateId?.name || "Candidate";
  const jobTitle = job?.title || "Target Role";
  const jobDescription = job?.description || "";
  const requiredSkills = job?.skills || [];
  const seniorityLevel = job?.experienceLevel || "Mid";
  const employmentType = job?.employmentType || "Full-time";
  
  const candidateSkills = candidateProfile?.skills || [];
  const candidateExperience = candidateProfile?.experience?.map(exp => 
    `${exp.title} at ${exp.company} (${exp.currentlyWorking ? "Present" : exp.endDate?.getFullYear()})`
  ) || [];
  
  const interviewType = interview?.interviewType || "online";
  const interviewNotes = interview?.notes || "";

  logger.info(`[Recommendation Node 2] Generating preparation recommendations for: ${candidateName}`);

  const prompt = `
    You are an expert AI Interview Coach and Senior Recruiter. Generate a comprehensive and personalized preparation plan for the candidate.
    
    JOB DETAILS:
    - Job Title: ${jobTitle}
    - Seniority Level: ${seniorityLevel}
    - Employment Type: ${employmentType}
    - Required Skills: ${requiredSkills.join(", ")}
    - Description: ${jobDescription}

    CANDIDATE DETAILS:
    - Name: ${candidateName}
    - Candidate Skills: ${candidateSkills.join(", ")}
    - Professional Experience: ${candidateExperience.join(" | ")}

    INTERVIEW DETAILS:
    - Interview Type: ${interviewType}
    - Context / Recruiter Notes: ${interviewNotes}

    Your goal is to compare the job requirements with the candidate profile to perform a skill gap analysis and generate study topics, questions, tips, and guidelines.

    You MUST return a JSON object containing the following keys. Do not include any code block syntax, markdown formatting, or prefix text. Just return raw valid JSON.

    Required keys and structure:
    {
      "overview": "Brief overview of the role, responsibilities, and interviewer focus area",
      "topics": ["React Hooks", "REST APIs", "etc"],
      "technicalQuestions": [
        "Provide at least 10 highly relevant technical questions with answer hints",
        ...
      ],
      "behavioralQuestions": [
        "Provide at least 5 behavioral questions",
        ...
      ],
      "hrQuestions": [
        "Provide at least 5 HR/culture questions",
        ...
      ],
      "skillGapAnalysis": {
        "missingSkills": ["List of skills the candidate lacks relative to the job requirements"],
        "weakAreas": ["Areas the candidate might struggle in or has less experience"],
        "suggestedImprovements": ["Actionable preparation steps to improve"]
      },
      "preparationTips": [
        "Specific practices e.g. review MongoDB aggregations, STAR method"
      ],
      "recommendations": [
        "Learning resources, documentation, concepts to study"
      ]
    }
  `;

  // Dynamic LLM execution with fallbacks
  let response;
  const providers = [
    { name: "google", config: {} },
    { name: "groq", config: { model: "llama-3.3-70b-versatile" } },
    { name: "openrouter", config: { model: "google/gemma-4-31b-it:free" } }
  ];

  let lastError;
  for (const provider of providers) {
    try {
      logger.info(`[Recommendation AI] Attempting recommendation generation using provider: ${provider.name}`);
      const llm = LLMFactory.create(provider.name, provider.config);
      response = await llm.send([{ role: "human", content: prompt }]);
      
      const content = response.content ?? "";
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("LLM response did not contain JSON");

      const parsedJson = JSON.parse(jsonMatch[0]);
      
      // Clean lists to ensure minimum question counts
      if (!parsedJson.technicalQuestions || parsedJson.technicalQuestions.length < 10) {
        parsedJson.technicalQuestions = [
          ...(parsedJson.technicalQuestions || []),
          "Explain the Virtual DOM and React reconciliation.",
          "How does Node.js handle asynchronous I/O operations?",
          "What are indexes in MongoDB and how do they optimize queries?",
          "How do you secure a REST API (JWT, cookies, CORS, etc.)?",
          "Discuss React state management alternatives (Context API, Redux, Zustand).",
          "What is the event loop in JavaScript and how does it work?",
          "Explain the difference between SQL and NoSQL databases.",
          "What are HTTP request methods and status codes?",
          "How do you optimize front-end loading and rendering performance?",
          "What is system design scaling (horizontal vs vertical scalability)?"
        ].slice(0, 10);
      }
      if (!parsedJson.behavioralQuestions || parsedJson.behavioralQuestions.length < 5) {
        parsedJson.behavioralQuestions = [
          ...(parsedJson.behavioralQuestions || []),
          "Tell me about a time you faced a technical disagreement with a team member.",
          "Describe a challenging bug you fixed under a tight deadline.",
          "How do you prioritize tasks when working on multiple projects?",
          "Give an example of a mistake you made and what you learned from it.",
          "Describe how you handled adapting to a new codebase or tool stack."
        ].slice(0, 5);
      }
      if (!parsedJson.hrQuestions || parsedJson.hrQuestions.length < 5) {
        parsedJson.hrQuestions = [
          ...(parsedJson.hrQuestions || []),
          "Why are you interested in joining our company?",
          "Where do you see yourself in the next 3 to 5 years?",
          "What is your ideal work environment (remote, hybrid, onsite)?",
          "How do you handle workplace stress and maintain work-life balance?",
          "What are your salary expectations for this role?"
        ].slice(0, 5);
      }

      const validatedResult = recommendationOutputSchema.parse(parsedJson);
      
      return { recommendations: validatedResult };
    } catch (e) {
      lastError = e;
      logger.warn(`[Recommendation AI] Provider ${provider.name} failed: ${e.message}`);
    }
  }

  // Final Fallback if all AI queries fail
  logger.error(`[Recommendation AI] All LLM providers failed. Returning static fallback plan. Error: ${lastError?.message}`);
  
  const fallback = {
    overview: `This interview will evaluate your fit for the ${jobTitle} position. Recruiters will focus on your skills in ${requiredSkills.slice(0, 5).join(", ") || "software engineering"} and matching your background to company culture.`,
    topics: requiredSkills.length > 0 ? requiredSkills : ["Software Architecture", "Data Structures", "System Design"],
    technicalQuestions: [
      "Explain the key architectural components of your previous project.",
      "How do you handle state management in complex applications?",
      "What is your approach to writing clean, maintainable, and self-documenting code?",
      "How do you optimize API response times and database query latency?",
      "Discuss a time you had to optimize UI performance (bundle size, lazy loading, caching).",
      "How do you manage environment configurations across development, staging, and production?",
      "What testing strategies do you employ (unit, integration, end-to-end)?",
      "How do you address common web security vulnerabilities (XSS, CSRF, Injection)?",
      "Describe how Git merge conflicts are handled in your workflow.",
      "What is your process for reviewing a colleague's pull request?"
    ],
    behavioralQuestions: [
      "Tell me about a time you had to learn a new technology quickly.",
      "Describe a situation where a project requirement changed midway and how you responded.",
      "How do you handle receiving critical feedback about your work?",
      "Tell me about a time you went above and beyond to deliver a project.",
      "Describe a time you collaborated successfully with cross-functional teams."
    ],
    hrQuestions: [
      "Walk me through your resume and career history.",
      "What motivated you to apply for this job?",
      "How do you handle conflict or differences of opinion in team environments?",
      "What are your core strengths and areas you seek to improve?",
      "What questions do you have for our team or company leadership?"
    ],
    skillGapAnalysis: {
      missingSkills: requiredSkills.filter(s => !candidateSkills.includes(s)),
      weakAreas: ["Project-specific tooling details"],
      suggestedImprovements: ["Review the job description thoroughly and build mock prototypes matching requirements."]
    },
    preparationTips: [
      "Prepare your setup 10 minutes early if online.",
      "Use the STAR method (Situation, Task, Action, Result) for behavioral answers.",
      "Ask clarifying questions before coding or designing solutions."
    ],
    recommendations: [
      "Review official documentation for key technologies listed in requirements.",
      "Prepare standard examples from your past experience."
    ],
  };

  return { recommendations: fallback };
}

// Build and compile LangGraph workflow
const workflow = new StateGraph(RecommendationState)
  .addNode("fetchContext", fetchContextNode)
  .addNode("generateRecommendation", generateRecommendationNode)
  .addEdge(START, "fetchContext")
  .addEdge("fetchContext", "generateRecommendation")
  .addEdge("generateRecommendation", END);

export const recommendationGraph = workflow.compile();
