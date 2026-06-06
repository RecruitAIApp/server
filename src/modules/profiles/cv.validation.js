import { z } from "zod";

/**
 * Zod schema for parsing and validating CV data returned from the LLM.
 * Guarantees that the properties conform to standard expectations before saving.
 */
export const parsedCVSchema = z.object({
  skills: z.array(z.string()).default([]),
  experienceYears: z.number().min(0).default(0),
  jobTitles: z.array(z.string()).default([]),
  summary: z.string().default(""),
});
