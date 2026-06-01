import { Router } from "express";
import * as employerController from "./employer.controller.js";
import { companyIdSchema, inviteHrSchema } from "./employer.validation.js";
import { validate } from "../../common/middlewares/validation.middleware.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import {
  requireEmployer,
  requireCompanyMember,
  requireCompanyOwner,
} from "../../common/middlewares/permissions.middleware.js";

const router = Router();

// GET /api/employer/memberships
router.get(
  "/memberships",
  authenticate,
  requireEmployer,
  employerController.getMemberships
);

// GET /api/employer/active-company/:companyId/dashboard
router.get(
  "/active-company/:companyId/dashboard",
  authenticate,
  requireEmployer,
  validate(companyIdSchema),
  requireCompanyMember,
  employerController.getDashboard
);

// GET /api/employer/company/:companyId/team
router.get(
  "/company/:companyId/team",
  authenticate,
  requireEmployer,
  validate(companyIdSchema),
  requireCompanyMember,
  employerController.getTeam
);

// POST /api/employer/company/:companyId/invite-hr
router.post(
  "/company/:companyId/invite-hr",
  authenticate,
  requireEmployer,
  validate(inviteHrSchema),
  requireCompanyOwner,
  employerController.inviteHR
);

export default router;
