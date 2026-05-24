import { Router } from "express";
import * as companyController from "./company.controller.js";
import { validate } from "../../common/middlewares/validation.middleware.js";
import {
  isCompanyOwner,
  isEmployer,
} from "../../common/middlewares/permision.middleware.js";
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdSchema,
  addHRSchema,
} from "./company.validation.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import { cloudUpload } from "../../config/multer.config.js"; // ✅ was missing in your file

const router = Router();

router.get("/:id", validate(companyIdSchema), companyController.getCompany);

router.get("/my", authenticate, isEmployer, companyController.getMyCompanies);

router.post(
  "/",
  authenticate,
  isEmployer,
  validate(createCompanySchema),
  companyController.createCompany
);

router.put(
  "/:id",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(updateCompanySchema),
  companyController.updateCompany
);

router.delete(
  "/:id",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(companyIdSchema),
  companyController.deleteCompany
);

router.put(
  "/:id/licenses",
  authenticate,
  isEmployer,
  isCompanyOwner,
  cloudUpload(["image/png", "image/jpeg", "application/pdf"]).single("license"),
  companyController.addLicenses
);

router.post(
  "/:id/hrs",
  authenticate,
  isEmployer,
  isCompanyOwner,
  validate(addHRSchema),
  companyController.addHR
);

router.delete(
  "/:id/hrs/:hrId",
  authenticate,
  isEmployer,
  isCompanyOwner,
  companyController.removeHR
);

export default router;