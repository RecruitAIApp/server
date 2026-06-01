import Joi from "joi";
import { isValidId } from "../../utils/globalVariables.js";

export const companyIdSchema = Joi.object({
  params: Joi.object({
    companyId: Joi.custom(isValidId).required().messages({
      "any.required": "Company ID is required",
      "string.length": "Invalid company ID",
    }),
  }).required(),
  query: Joi.object().optional(),
  body: Joi.object().optional(),
});

export const inviteHrSchema = Joi.object({
  params: Joi.object({
    companyId: Joi.custom(isValidId).required().messages({
      "any.required": "Company ID is required",
      "string.length": "Invalid company ID",
    }),
  }).required(),
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address.",
      "any.required": "Email address is required.",
    }),
  }).required(),
  query: Joi.object().optional(),
});
