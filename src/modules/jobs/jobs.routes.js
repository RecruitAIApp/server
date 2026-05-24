import { Router } from "express";
import * as jobController from "./jobs.controller.js";
import { validate } from "../../common/middlewares/validation.middleware.js";
import {
  isEmployerOrHR,
  isJobOwner,
  isCompanyOwnerOrHR,
  isJobDeleter
} from "../../common/middlewares/permissions.middleware.js";
import {
  createJobSchema,
  updateJobSchema,
  jobIdSchema,
  jobFilterSchema,
} from "./jobs.validation.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = Router();

router.get("/", validate(jobFilterSchema), jobController.getAllJobs);

router.get("/company/:companyId", validate(jobFilterSchema), jobController.getJobsByCompany);

router.get("/my", authenticate, isEmployerOrHR, validate(jobFilterSchema), jobController.getMyJobs);

router.get("/:id", validate(jobIdSchema), jobController.getJob);

router.post(
  "/",
  authenticate,
  isEmployerOrHR,
  isCompanyOwnerOrHR,    // confirms they belong to that specific company
  validate(createJobSchema),
  jobController.createJob
);

router.put(
  "/:id",
  authenticate,
  isEmployerOrHR,
  isJobOwner,          
  validate(updateJobSchema),
  jobController.updateJob
);

router.delete(
  "/:id",
  authenticate,
  isEmployerOrHR,
  isJobDeleter,
  validate(jobIdSchema),
  jobController.deleteJob
);

export default router;