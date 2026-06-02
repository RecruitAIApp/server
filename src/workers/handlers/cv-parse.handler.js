import CandidateProfile from "../../modules/auth/candidateProfile.model.js";
import profileService from "../../modules/profiles/profile.service.js";
import { getSignedCVDownloadUrl } from "../../modules/auth/cv.service.js";
import { LLMFactory } from "../../modules/llm/llm.service.js";

const llm = LLMFactory.create("google");

function publicIdFromUrl(cvUrl) {
  if (!cvUrl) return null;
  const match = cvUrl.match(/\/raw\/upload\/(?:v\d+\/)?(.+?)\.pdf(?:\?.*)?$/i);
  return match?.[1] ?? null;
}

async function fetchPDFText(publicId, cvUrl) {
  const resolvedPublicId = publicId || publicIdFromUrl(cvUrl);
  if (!resolvedPublicId) throw new Error("Missing Cloudinary publicId.");

  const downloadUrl = getSignedCVDownloadUrl(resolvedPublicId);
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to fetch CV: ${res.status}`);

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer)
    .toString("latin1")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s{3,}/g, "\n")
    .slice(0, 12000);
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


export async function handleCVParse(data) {
  const { profileId, cvUrl, publicId: jobPublicId } = data;
  const profile = await CandidateProfile.findById(profileId);
  const publicId = jobPublicId || profile?.resume?.publicId;

  await CandidateProfile.findByIdAndUpdate(profileId, { "resume.parseStatus": "processing" });

  let rawText = "";
  try {
    rawText = await fetchPDFText(publicId, cvUrl);
  } catch (e) {
    await CandidateProfile.findByIdAndUpdate(profileId, { "resume.parseStatus": "failed", "resume.parseError": e.message });
    throw e;
  }

  let parsed;
  try {
    const response = await llm.send([{ role: "human", content: parsePrompt(rawText) }]);
    const jsonMatch = String(response.content ?? "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("LLM returned no JSON");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    await CandidateProfile.findByIdAndUpdate(profileId, { "resume.parseStatus": "failed", "resume.parseError": e.message, "resume.parsedData.rawText": rawText });
    throw e;
  }

  await CandidateProfile.findByIdAndUpdate(profileId, {
    "resume.parseStatus": "done",
    "resume.parsedAt": new Date(),
    "resume.parsedData": {
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 30) : [],
      jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles.slice(0, 10) : [],
      experienceYears: Number(parsed.experienceYears) || 0,
      summary: String(parsed.summary || "").slice(0, 800),
      rawText: rawText.slice(0, 5000),
    },
  });

  await profileService.syncProfileCompletion(profileId);
}
