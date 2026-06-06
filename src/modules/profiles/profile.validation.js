import Joi from "joi";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

const experienceItemSchema = Joi.object({
  company: Joi.string().required().trim().messages({
    "string.empty": "Company name is required",
  }),
  title: Joi.string().required().trim().messages({
    "string.empty": "Job title is required",
  }),
  startDate: Joi.date().required().messages({
    "any.required": "Start date is required",
  }),
  endDate: Joi.date().allow(null, "").optional(),
  currentlyWorking: Joi.boolean().default(false),
  description: Joi.string().max(2000).allow(null, "").optional(),
}).custom((value, helpers) => {
  if (!value.currentlyWorking && value.startDate && value.endDate) {
    if (new Date(value.endDate) < new Date(value.startDate)) {
      return helpers.message({ custom: "End date must be after start date" });
    }
  }
  return value;
});

const educationItemSchema = Joi.object({
  institution: Joi.string().required().trim().messages({
    "string.empty": "Institution name is required",
  }),
  degree: Joi.string().required().trim().messages({
    "string.empty": "Degree is required",
  }),
  field: Joi.string().required().trim().messages({
    "string.empty": "Field of study is required",
  }),
  startYear: Joi.number()
    .integer()
    .min(1950)
    .max(new Date().getFullYear() + 10)
    .required()
    .messages({
      "number.min": "Start year must be after 1950",
    }),
  endYear: Joi.number()
    .integer()
    .min(1950)
    .max(new Date().getFullYear() + 10)
    .allow(null, "")
    .optional(),
}).custom((value, helpers) => {
  if (value.startYear && value.endYear) {
    if (value.endYear < value.startYear) {
      return helpers.message({ custom: "End year must be after start year" });
    }
  }
  return value;
});

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(100).optional().trim().messages({
      "string.min": "Full name must be at least 2 characters",
    }),
    basicInfo: Joi.object({
      headline: Joi.string().max(200).allow(null, "").optional().trim(),
      bio: Joi.string().max(1500).allow(null, "").optional().trim(),
      phone: Joi.string().pattern(phoneRegex).allow(null, "").optional().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g. +201234567890)",
      }),
      location: Joi.object({
        country: Joi.string().max(100).allow(null, "").optional().trim(),
        city: Joi.string().max(100).allow(null, "").optional().trim(),
      }).optional(),
      socialLinks: Joi.object({
        linkedin: Joi.string().uri().allow(null, "").optional().messages({
          "string.uri": "LinkedIn link must be a valid URL",
        }),
        github: Joi.string().uri().allow(null, "").optional().messages({
          "string.uri": "GitHub link must be a valid URL",
        }),
        portfolio: Joi.string().uri().allow(null, "").optional().messages({
          "string.uri": "Portfolio link must be a valid URL",
        }),
      }).optional(),
    }).optional(),
    skills: Joi.array().items(Joi.string().trim()).optional(),
    experience: Joi.array().items(experienceItemSchema).optional(),
    education: Joi.array().items(educationItemSchema).optional(),
    onboardingCompleted: Joi.boolean().optional(),
  }).required(),
  query: Joi.object().optional(),
  params: Joi.object().optional(),
});
