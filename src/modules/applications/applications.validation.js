import Joi from "joi";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createApplicationSchema = Joi.object({
  body: Joi.object({
    jobId: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid job ID format',
      'any.required': 'Job ID is required'
    }),
    candidateId: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid candidate ID format',
      'any.required': 'Candidate ID is required'
    }),
    companyId: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid company ID format',
      'any.required': 'Company ID is required'
    }),
    appliedResume: Joi.object({
      url: Joi.string().uri().required().messages({
        'string.uri': 'Resume URL must be a valid link'
      }),
      publicId: Joi.string().required(),
      fileName: Joi.string().required()
    }).required()
  }).required()
});

export const createApplicationValidation = createApplicationSchema;

export const updateStageSchema = Joi.object({
  params: Joi.object({
    applicationId: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid application ID format',
      'any.required': 'Application ID is required'
    }),
  }),
  body: Joi.object({
    stage: Joi.object({
      key: Joi.string().valid('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected').required().messages({
        'any.only': 'Stage must be one of: applied, shortlisted, interview, offer, hired, rejected'
      })
    }).required(),
    notes: Joi.string().max(500).optional().messages({
      'string.max': 'Notes must be at most 500 characters long'
    })
  }).required()
});

export const updateApplicationStageValidation = updateStageSchema;

export const addNoteSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid application ID format',
      'any.required': 'Application ID is required'
    }),
  }),
  body: Joi.object({
    content: Joi.string().min(1).max(1000).required().messages({
      'string.empty': 'Note content cannot be empty'
    }),
    ratingScore: Joi.number().min(1).max(5).optional()
  }).required()
});

export const applicationIdSchema = Joi.object({
  params: Joi.object({
    applicationId: Joi.string().regex(objectIdRegex).required().messages({
      'string.pattern.base': 'Invalid application ID format',
      'any.required': 'Application ID is required'
    }),
  }).required()
});