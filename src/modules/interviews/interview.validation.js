import Joi from "joi";
import { INTERVIEW_TYPES } from "./interview.constants.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createInterviewValidation = Joi.object({
  body: Joi.object({
    applicationId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base": "Invalid application ID format",
      "any.required": "Application ID is required",
    }),
    interviewDate: Joi.date().iso().required().messages({
      "date.format": "Interview date must be a valid ISO Date",
      "any.required": "Interview date is required",
    }),
    duration: Joi.number().min(5).max(480).required().messages({
      "number.min": "Duration must be at least 5 minutes",
      "number.max": "Duration cannot exceed 480 minutes (8 hours)",
      "any.required": "Duration is required",
    }),
    timezone: Joi.string().required().messages({
      "any.required": "Timezone is required",
    }),
    interviewType: Joi.string().valid(...INTERVIEW_TYPES).required().messages({
      "any.only": `Interview type must be one of: ${INTERVIEW_TYPES.join(", ")}`,
      "any.required": "Interview type is required",
    }),
    meetingLink: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Meeting link must be a valid URL",
    }),
    location: Joi.string().allow("").max(200).optional(),
    notes: Joi.string().allow("").max(1000).optional(),
  }).required(),
});

export const updateInterviewValidation = Joi.object({
  params: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base": "Invalid interview ID format",
    }),
  }).required(),
  body: Joi.object({
    interviewDate: Joi.date().iso().optional(),
    duration: Joi.number().min(5).max(480).optional(),
    timezone: Joi.string().optional(),
    interviewType: Joi.string().valid(...INTERVIEW_TYPES).optional(),
    meetingLink: Joi.string().uri().allow("").optional(),
    location: Joi.string().allow("").max(200).optional(),
    notes: Joi.string().allow("").max(1000).optional(),
  }).required(),
});

export const interviewIdValidation = Joi.object({
  params: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base": "Invalid interview ID format",
    }),
  }).required(),
});
