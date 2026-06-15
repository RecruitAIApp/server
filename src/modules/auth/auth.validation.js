import Joi from "joi";

// Register payload validations
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email address is required.",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long.",
    "any.required": "Password is required.",
  }),
  role: Joi.string()
    .valid("candidate", "employer")
    .default("candidate")
    .messages({
      "any.only": "Role must be either candidate or employer.",
    }),
  fullName: Joi.string().trim().required().messages({
    "string.empty": "Full name cannot be empty.",
  }),
  employerType: Joi.when("role", {
    is: "employer",
    then: Joi.string().valid("owner", "hr").default("owner"),
    otherwise: Joi.forbidden(),
  }),
});

export const ownerCompanyOnboardSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  industry: Joi.string().min(2).max(100).required(),
  size: Joi.string()
    .valid("1-10", "11-50", "51-200", "201-500", "500+")
    .optional(),
  location: Joi.string().max(200).optional().allow(""),
  website: Joi.string().uri().optional().allow(""),
});

// Forgot password payload validations
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email address is required.",
    "string.empty": "Email address is required.",
  }),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required.",
    "string.empty": "Refresh token is required.",
  }),
});

// Login payload validations
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email address is required.",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required.",
  }),
});

// Generic middleware validator
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    req.validatedBody = value;
    next();
  };
};

export const acceptHRInviteSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Invitation token is required.",
    "string.empty": "Invitation token is required.",
  }),
  password: Joi.string().min(8).optional().messages({
    "string.min": "Password must be at least 8 characters long.",
  }),
  fullName: Joi.string().trim().required().messages({
    "string.empty": "Full name cannot be empty.",
  }),
});
