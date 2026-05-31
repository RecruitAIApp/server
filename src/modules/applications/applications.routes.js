import { Router } from "express";
import { validate } from "../../common/middlewares/validation.middleware.js";
import { createApplicationValidation, updateApplicationStageValidation } from "./applications.validation.js";
import * as ApplicationController from "./applications.controller.js";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR } from "../../common/middlewares/permissions.middleware.js";

const router = Router();

router.post('/apply', [protect, isCandidate, validate(createApplicationValidation)], ApplicationController.applyToJobController);
router.put('/update-stage/:applicationId', [protect, isEmployerOrHR], validate(updateApplicationStageValidation), ApplicationController.updateApplicationStageController);
export default router;