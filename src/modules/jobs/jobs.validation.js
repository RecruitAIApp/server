import Joi from "joi";

const salaryRangeSchema = Joi.object({
  min: Joi.number().min(0).required().messages({
    "number.min": "Minimum salary must be >= 0",
  }),
  max: Joi.number().min(0).required().messages({
    "number.min": "Maximum salary must be >= 0",
  }),
}).external(async (data) => {
  if (data.max < data.min) {
    throw new Error("Maximum salary must be >= minimum salary");
  }
});

export const createJobSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
      "string.min": "Title must be at least 3 characters",
    }),
    description: Joi.string().min(20).max(5000).required().messages({
      "string.min": "Description must be at least 20 characters",
    }),
    requirements: Joi.array()
      .items(Joi.string().min(1))
      .min(1)
      .required()
      .messages({
        "array.min": "At least one requirement is needed",
      }),
    salaryRange: salaryRangeSchema.required(),
    location: Joi.string().min(2).max(200).required(),
    company: Joi.string().min(24).required().messages({
      "string.min": "Invalid company ID",
    }),
    jobType: Joi.string().valid("remote", "onsite", "hybrid").required(),
    employmentType: Joi.string()
      .valid("full-time", "part-time", "contract", "internship", "freelance")
      .required(),
    experienceLevel: Joi.string()
      .valid("entry", "mid", "senior", "lead", "executive")
      .optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    applicationDeadline: Joi.string().isoDate().optional(),
  }).required(),
});

export const updateJobSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().min(24).required().messages({
      "string.min": "Invalid job ID",
    }),
  }).required(),
  body: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(20).max(5000).optional(),
    requirements: Joi.array().items(Joi.string().min(1)).min(1).optional(),
    salaryRange: salaryRangeSchema.optional(),
    location: Joi.string().min(2).max(200).optional(),
    jobType: Joi.string().valid("remote", "onsite", "hybrid").optional(),
    employmentType: Joi.string()
      .valid("full-time", "part-time", "contract", "internship", "freelance")
      .optional(),
    experienceLevel: Joi.string()
      .valid("entry", "mid", "senior", "lead", "executive")
      .optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid("open", "closed", "pending").optional(),
    applicationDeadline: Joi.string().isoDate().optional(),
  })
    .required()
    .external(async (data) => {
      if (Object.keys(data).length === 0) {
        throw new Error("At least one field must be provided for update");
      }
    }),
});

export const jobIdSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().min(24).required().messages({
      "string.min": "Invalid job ID",
    }),
  }).required(),
});

export const jobFilterSchema = Joi.object({
  query: Joi.object({
    status: Joi.string().valid("open", "closed", "pending").optional(),
    jobType: Joi.string().valid("remote", "onsite", "hybrid").optional(),
    employmentType: Joi.string()
      .valid("full-time", "part-time", "contract", "internship", "freelance")
      .optional(),
    experienceLevel: Joi.string()
      .valid("entry", "mid", "senior", "lead", "executive")
      .optional(),
    location: Joi.string().optional(),
    company: Joi.string().optional(),
    search: Joi.string().optional(),
    minSalary: Joi.number().min(0).optional(),
    maxSalary: Joi.number().min(0).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(10),
    sortBy: Joi.string()
      .valid("createdAt", "title", "salaryRange.min")
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }).required(),
});
