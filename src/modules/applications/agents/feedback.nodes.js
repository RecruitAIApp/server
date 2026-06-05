import { AppError } from '../../../utils/error.js';
import Application from '../application.model.js';
import { LLMFactory } from '../../llm/llm.service.js';

export const fetchMissingSkillsNode = async(state) => {
  const { applicationId } = state;

  const application = await Application.findById({_id: applicationId})
    .populate('candidateId')
    .populate('jobId');

  if(!application) {
    throw new AppError(`Application with ID ${applicationId} not found in DB`, 404);
  }

  const stageKey = application.stage?.key || 'applied';
  const decision = stageKey === 'rejected' ? 'rejected' : 'accepted';

  console.log(`[Feedback Node 1] Fetched context for: ${application.candidateId?.fullName || application.candidateId?.name || "Candidate"}. Stage: ${stageKey}, Decision: ${decision}`);

  return {
    candidateName: application.candidateId?.fullName || application.candidateId?.name || "Candidate",
    candidateEmail: application.candidateId?.email,
    missingSkills: application.aiScreening?.missingSkills || [], 
    jobTitle: application.jobId?.title || "the position",
    stageKey: stageKey,
    decision: decision
  };
}

export const generateEmailWithLLMNode = async(state) => {
  const { candidateName, missingSkills, hrNotes, jobTitle, stageKey, decision } = state;

  console.log(`[Feedback Node 2] Generating ${decision} email for: ${candidateName} (Stage: ${stageKey})`);

  const hrDirections = hrNotes && hrNotes.trim() !== "" 
    ? `Incorporate this specific feedback/notes from the HR team: "${hrNotes}"`
    : `Provide professional encouragement/details based purely on the technical context.`;

  let prompt = "";
  if (decision === "rejected") {
    prompt = `
      You are an empathetic and professional Talent Acquisition Specialist. Write a constructive, polite, and supportive rejection email to a candidate.
      
      Candidate Name: ${candidateName}
      Applied Position: ${jobTitle}
      Key Skills to Improve: ${missingSkills && missingSkills.length > 0 ? missingSkills.join(", ") : "General profile alignment"}
      
      HR Context / Directions:
      ${hrDirections}

      Guidelines:
      - Start with a warm greeting and thank them sincerely for applying and taking the time.
      - Deliver the decision gently and with dignity.
      - Mention the "Key Skills to Improve" as constructive feedback to help them grow and succeed in future opportunities.
      - If HR Context notes are provided, weave them in naturally without sounding robotic.
      - End on an encouraging note, wishing them the absolute best in their job search.
      - Keep the tone highly professional, warm, supportive, and human. Do NOT sound like a cold AI machine.
    `;
  } else {
    prompt = `
      You are an enthusiastic and professional Talent Acquisition Specialist. Write a warm, congratulatory email to a candidate who has advanced in the recruitment pipeline.
      
      Candidate Name: ${candidateName}
      Applied Position: ${jobTitle}
      Current Stage: ${stageKey}
      
      HR Context / Directions:
      ${hrDirections}

      Guidelines:
      - Start with an enthusiastic greeting and congratulate them on moving to the "${stageKey}" stage of the application process.
      - Express excitement about their profile and what they bring to the table.
      - If HR Context notes are provided (such as scheduling info or preparation tips), weave them in naturally.
      - Outline next steps (e.g., our team will reach out to schedule the next steps, or review offer details).
      - Keep the tone highly professional, warm, engaging, and human. Do NOT sound like a cold AI machine.
    `;
  }

  let response;
  try {
    console.log(`[Feedback Node 2] Attempting email generation using Google Gemini...`);
    const llm = LLMFactory.create("google");
    response = await llm.send(prompt);
  } catch (err) {
    console.warn(`[Feedback Node 2] Google Gemini failed (${err.message}). Falling back to Groq...`);
    try {
      console.log(`[Feedback Node 2] Attempting email generation using Groq...`);
      const llm = LLMFactory.create("groq", { model: "llama-3.1-8b-instant" });
      response = await llm.send(prompt);
    } catch (groqErr) {
      console.warn(`[Feedback Node 2] Groq failed (${groqErr.message}). Falling back to OpenRouter...`);
      try {
        console.log(`[Feedback Node 2] Attempting email generation using OpenRouter...`);
        const llm = LLMFactory.create("openrouter", { model: "nvidia/nemotron-3-super-120b-a12b:free" });
        response = await llm.send(prompt);
      } catch (orErr) {
        console.error(`[Feedback Node 2] All LLM providers failed (${orErr.message}). Using static fallback template...`);
        const fallbackText = decision === "rejected"
          ? `Dear ${candidateName},\n\nThank you for taking the time to apply and interview for the ${jobTitle} position. We appreciate your interest in our company.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.${hrNotes ? `\n\nHere is some feedback from our team: ${hrNotes}` : ""}\n\nWe wish you the best of luck in your job search and future professional endeavors.\n\nBest regards,\nTalent Acquisition Team`
          : `Dear ${candidateName},\n\nCongratulations! We are pleased to inform you that you have advanced to the next stage (${stageKey}) for the ${jobTitle} position.\n\n${hrNotes ? `Here are the details/next steps from our team: ${hrNotes}` : "Our team will reach out to you shortly with the next steps."}\n\nWe look forward to speaking with you soon.\n\nBest regards,\nTalent Acquisition Team`;
        
        return {
          generatedEmail: fallbackText
        };
      }
    }
  }

  const emailBody = response.content;

  return {
    generatedEmail: emailBody
  };
}