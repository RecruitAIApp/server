import { PDFParse } from "pdf-parse";
import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import profileService from "../../modules/profiles/profile.service.js";
import { getSignedCVDownloadUrl } from "../../modules/auth/cv.service.js";
import { LLMFactory } from "../../modules/llm/llm.service.js";
import { parsedCVSchema } from "../../modules/profiles/cv.validation.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("cv-parse-handler");
const llm = LLMFactory.create(process.env.LLM_PROVIDER || "groq");

const MAX_RETRIES = 3;

export function publicIdFromUrl(cvUrl) {
  if (!cvUrl) return null;
  const match = cvUrl.match(/\/raw\/upload\/(?:v\d+\/)?([^?#]+)/i);
  return match?.[1] ?? null;
}

/**
 * Download the PDF from Cloudinary and extract text using pdf-parse.
 */
export async function fetchPDFText(publicId, cvUrl) {
  const resolvedPublicId = publicId || publicIdFromUrl(cvUrl);
  if (!resolvedPublicId) throw new Error("Missing Cloudinary publicId.");

  const downloadUrl = getSignedCVDownloadUrl(resolvedPublicId);
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to fetch CV: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  // Use pdf-parse to extract real text from the PDF
  const parser = new PDFParse({ data: buffer });
  let text = "";
  try {
    const pdfData = await parser.getText();
    text = (pdfData.text || "")
      .replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F\u0600-\u06FF]/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 12000);
  } finally {
    await parser.destroy();
  }

  if (!text || text.length < 20) {
    throw new Error("Could not extract readable text from PDF. The file may be image-based or corrupted.");
  }

  return text;
}

const parsePrompt = (text) => `
You are an expert CV/resume parser. Extract structured data from the following CV text.
Return ONLY valid JSON with this exact schema:
{
  "skills": ["skill1", "skill2"],
  "jobTitles": ["title1", "title2"],
  "experienceYears": <number or 0>,
  "summary": "<2-4 sentence professional summary>"
}

CV TEXT:
${text}
`.trim();

/**
 * Try calling the LLM up to MAX_RETRIES times with exponential backoff.
 */
async function callLLMWithRetries(prompt) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await llm.send([{ role: "human", content: prompt }]);
      const jsonMatch = String(response.content ?? "").match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("LLM returned no JSON");
      const parsedJson = JSON.parse(jsonMatch[0]);
      return parsedCVSchema.parse(parsedJson);
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

export async function handleCVParse(data) {
  const { profileId, cvUrl, publicId: jobPublicId } = data;
  const profile = await CandidateProfile.findById(profileId);
  const publicId = jobPublicId || profile?.resume?.publicId;

  await CandidateProfile.findByIdAndUpdate(profileId, { "resume.parseStatus": "processing" });

  // Step 1: Extract text from PDF
  let rawText = "";
  try {
    rawText = await fetchPDFText(publicId, cvUrl);
  } catch (e) {
    await CandidateProfile.findByIdAndUpdate(profileId, {
      "resume.parseStatus": "failed",
      "resume.parseError": e.message,
    });
    throw e;
  }

  // Step 2: Call LLM with retries, fallback on total failure
  let parsed;
  try {
    parsed = await callLLMWithRetries(parsePrompt(rawText));
  } catch (e) {
    // All retries exhausted — save what we can and mark done with fallback
    logger.error(`All ${MAX_RETRIES} LLM attempts failed for profile ${profileId}. Saving fallback.`, e);
    await CandidateProfile.findByIdAndUpdate(profileId, {
      "resume.parseStatus": "done",
      "resume.parsedAt": new Date(),
      "resume.parseError": `AI parsing failed after ${MAX_RETRIES} attempts: ${e.message}. You can edit your profile manually.`,
      "resume.parsedData": {
        skills: [],
        jobTitles: [],
        experienceYears: 0,
        summary: "CV was uploaded but automatic parsing could not extract data. Please fill in your profile details manually.",
        rawText: rawText.slice(0, 5000),
      },
    });
    await profileService.syncProfileCompletion(profileId);
    return; // don't re-throw — the job is "done" with a fallback
  }

  // Step 3: Save parsed data
  await CandidateProfile.findByIdAndUpdate(profileId, {
    "resume.parseStatus": "done",
    "resume.parsedAt": new Date(),
    "resume.parseError": null,
    "resume.parsedData": {
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 30) : [],
      jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles.slice(0, 10) : [],
      experienceYears: Number(parsed.experienceYears) || 0,
      summary: String(parsed.summary || "").slice(0, 800),
      rawText: rawText.slice(0, 5000),
    },
  });

  await profileService.syncProfileCompletion(profileId);

  logger.info(`Successfully parsed CV for profile ${profileId}`);
}

export const cvParseHandler = {
  fetchPDFText,
  publicIdFromUrl,
  handleCVParse
};
