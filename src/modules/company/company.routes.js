import { Router } from "express";
import rateLimit from "express-rate-limit";

import * as companyController from "./company.controller.js";

import {
  createCompanySchema,
  updateCompanySchema,
  companyIdSchema,
  inviteHRSchema,
} from "./company.validation.js";

import { validate } from "../../common/middlewares/validation.middleware.js";

import {
  authenticate,
  requireEmployerApproved,
} from "../../common/middlewares/auth.middleware.js";

import {
  isCompanyOwner,
  isEmployer,
} from "../../common/middlewares/permissions.middleware.js";

import { cloudUpload } from "../../config/multer.config.js";

const inviteLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

const router = Router();

router.get(
  "/my",
  authenticate,
  isEmployer,
  companyController.getMyCompanies,
);

router.get(
  "/:id",
  validate(companyIdSchema),
  companyController.getCompany,
);

router.post(
  "/",
  authenticate,
  // requireEmployerApproved,
  isEmployer,
  validate(createCompanySchema),
  companyController.createCompany,
);

router.put(
  "/:id",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(updateCompanySchema),
  companyController.updateCompany,
);

router.delete(
  "/:id",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(companyIdSchema),
  companyController.deleteCompany,
);

router.put(
  "/:id/licenses",
  authenticate,
  isEmployer,
  isCompanyOwner,
  cloudUpload([
    "image/png",
    "image/jpeg",
    "application/pdf",
  ]).single("license"),
  companyController.addLicenses,
);

router.post(
  "/:id/invite-hr",
  authenticate,
  isEmployer,
  isCompanyOwner,
  inviteLimit,
  validate(inviteHRSchema),
  companyController.inviteHR,
);

router.delete(
  "/:id/hrs/:hrId",
  authenticate,
  isEmployer,
  isCompanyOwner,
  companyController.removeHR,
);

// Restore a soft-deleted company (owner only — checks ActivationDate inside service)
router.patch(
  "/:id/restore",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(companyIdSchema),
  companyController.restoreCompany,
);
 
// Permanently delete a company that has already been soft-deleted (owner only)
router.delete(
  "/:id/hard",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(companyIdSchema),
  companyController.hardDeleteCompany,
);

export default router;