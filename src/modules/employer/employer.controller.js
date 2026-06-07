import * as employerService from "./employer.service.js";
import { inviteHRService } from "../company/company.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

/**
 * Fetch all company memberships of the current employer.
 */
export const getMemberships = async (req, res, next) => {
  try {
    console.log(`Fetching memberships for employer ID: ${req.user.id} , ${req.user.status}`);
    const data = await employerService.getMembershipsService(req.user.id);
    return sendResponse(res, 200, true, "Memberships fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch company-scoped dashboard data.
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await employerService.getCompanyDashboardService(req.params.companyId);
    return sendResponse(res, 200, true, "Dashboard data fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch team members (Owner and HRs) of a company.
 */
export const getTeam = async (req, res, next) => {
  try {
    const data = await employerService.getCompanyTeamService(req.params.companyId);
    return sendResponse(res, 200, true, "Team members fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

/**
 * Invite a user as HR to a company.
 */
export const inviteHR = async (req, res, next) => {
  try {
    const { email } = req.body;
    const companyId = req.params.companyId;
    const invitedBy = req.user.id;

    const result = await inviteHRService({
      companyId,
      invitedBy,
      email,
      origin: req.headers.origin || req.headers.referer || "http://localhost:5173",
    });

    const message = result.addedDirectly
      ? "HR member added directly and notified by email"
      : "HR invitation sent successfully";

    return sendResponse(res, 200, true, message, { email: result.email });
  } catch (error) {
    next(error);
  }
};
