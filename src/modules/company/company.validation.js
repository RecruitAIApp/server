import Joi from "joi";

export const createCompanySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Name must be at least 2 characters",
    }),
    description: Joi.string().min(10).max(1000).required().messages({
      "string.min": "Description must be at least 10 characters",
    }),
    logo: Joi.string().uri().optional().messages({
      "string.uri": "Invalid logo URL",
    }),
    website: Joi.string().uri().optional().messages({
      "string.uri": "Invalid website URL",
    }),
    industry: Joi.string().min(2).max(100).required(),
    size: Joi.string()
      .valid("1-10", "11-50", "51-200", "201-500", "500+")
      .optional(),
    location: Joi.string().max(200).optional(),
  }).required(),
});

export const updateCompanySchema = Joi.object({
  params: Joi.object({
    id: Joi.string().length(24).required().messages({
      "string.length": "Invalid company ID",
    }),
  }).required(),
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().min(10).max(1000).optional(),
    logo: Joi.string().uri().optional().messages({
      "string.uri": "Invalid logo URL",
    }),
    website: Joi.string().uri().optional().messages({
      "string.uri": "Invalid website URL",
    }),
    industry: Joi.string().min(2).max(100).optional(),
    size: Joi.string()
      .valid("1-10", "11-50", "51-200", "201-500", "500+")
      .optional(),
    location: Joi.string().max(200).optional(),
  })
    .required()
    .external(async (data) => {
      if (Object.keys(data).length === 0) {
        throw new Error("At least one field must be provided for update");
      }
    }),
});

export const companyIdSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().length(24).required().messages({
      "string.length": "Invalid company ID",
    }),
  }).required(),
});

export const addHRSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().length(24).required(),
  }).required(),
  body: Joi.object({
    hrUserId: Joi.string().length(24).required().messages({
      "string.length": "Invalid HR user ID",
      "any.required": "hrUserId is required",
    }),
  }).required(),
});