import { Router } from "express";
import * as jobController from "./jobs.controller.js";
import { validate } from "../../common/middlewares/validation.middleware.js";
import {
  isEmployerOrHR,
  isJobOwner,
  isCompanyOwnerOrHR,
  isJobDeleter,
} from "../../common/middlewares/permissions.middleware.js";
import {
  createJobSchema,
  updateJobSchema,
  jobIdSchema,
  jobFilterSchema,
} from "./jobs.validation.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";

const router = Router();

//todo dashboard api for jobs
//todo dashboard Job Analytics API
//todo dashboard Employer dashboard
/** Backend
 Create Job
 Update Job
 Delete Job
 Get Job
 Search Job
 Filter Job
 Pagination
 Ownership Validation
 Dashboard Stats

Frontend
 Dashboard
 Job Table
 Create Job
 Edit Job
 Delete Job
 Search
 Filters
 Pagination
 
AI
 Job Embedding Generation
 Vector Storage
 Recommendation Service
 Recommendation Endpoint
  */

router.get("/", authenticate ,validate(jobFilterSchema), jobController.getAllJobs);

router.get(
  "/company/:companyId",
  authenticate,
  validate(jobFilterSchema),
  jobController.getJobsByCompany,
);

router.get(
  "/my",
  authenticate,
  isEmployerOrHR,
  validate(jobFilterSchema),
  jobController.getMyJobs,
);

router.get("/:id", validate(jobIdSchema), jobController.getJob);

router.post(
  "/",
  authenticate,
  isEmployerOrHR,
  isCompanyOwnerOrHR, // confirms they belong to that specific company
  validate(createJobSchema),
  jobController.createJob,
);

router.put(
  "/:id",
  authenticate,
  isEmployerOrHR,
  isJobOwner,
  validate(updateJobSchema),
  jobController.updateJob,
);

router.delete(
  "/:id",
  authenticate,
  isEmployerOrHR,
  isJobDeleter,
  validate(jobIdSchema),
  jobController.deleteJob,
);

export default router;
