import { z } from "zod";

export const aiScreeningOutputSchema = z.object({
  confidence: z.number().min(0).max(100).describe("Confidence score of the AI assessment (0-100)"),
  scoreBreakdown: z.object({
    skills: z.number().min(0).max(100).describe("Score based on matched skills vs required skills (0-100)"),
    experience: z.number().min(0).max(100).describe("Score based on years of experience vs required experience (0-100)"),
    education: z.number().min(0).max(100).describe("Score based on education level vs required education (0-100)"),
    cultureFit: z.number().min(0).max(100).describe("Score based on culture fit, soft skills, and work style (0-100)"),
  }),
  matchedSkills: z.array(z.string()).describe("List of skills the candidate has that match the job requirements"),
  missingSkills: z.array(z.string()).describe("List of required skills the candidate is missing"),
  summary: z.string().describe("A professional 3-4 sentence summary of the candidate's fit for the role"),
  redFlags: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    message: z.string(),
  })).describe("Any red flags or concerns found in the candidate's profile or CV"),
});
