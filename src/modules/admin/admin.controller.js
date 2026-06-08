import * as adminService from "./admin.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const data = await adminService.getAllUsersService(req.query);
    return sendResponse(res, 200, true, "Users fetched successfully", data);
  } catch (err) {
    next(err);
  }
};

export const banUser = async (req, res, next) => {
  try {
    const user = await adminService.banUserService(
      req.params.userId,
      req.body.reason,
    );
    return sendResponse(res, 200, true, "User banned successfully", user);
  } catch (err) {
    next(err);
  }
};

export const unbanUser = async (req, res, next) => {
  try {
    const user = await adminService.unbanUserService(req.params.userId);
    return sendResponse(res, 200, true, "User unbanned successfully", user);
  } catch (err) {
    next(err);
  }
};

// export const approveEmployer = async (req, res, next) => {
//   try {
//     const user = await adminService.approveEmployerService(req.params.userId);
//     return sendResponse(res, 200, true, "Employer approved successfully", user);
//   } catch (err) {
//     next(err);
//   }
// };

export const deleteJob = async (req, res, next) => {
  try {
    await adminService.deleteJobService(req.params.jobId);
    return sendResponse(res, 200, true, "Job deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getPlatformStats = async (req, res, next) => {
  try {
    const data = await adminService.getPlatformStatsService();
    return sendResponse(res, 200, true, "Platform stats fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getPendingCompanies = async (req, res, next) => {
  try {
    const data = await adminService.getPendingCompaniesService();
    return sendResponse(res, 200, true, "Pending companies fetched", data);
  } catch (err) {
    next(err);
  }
};

export const approveCompany = async (req, res, next) => {
  try {
    const company = await adminService.approveCompanyService(
      req.params.companyId,
    );
    return sendResponse(
      res,
      200,
      true,
      "Company approved successfully",
      company,
    );
  } catch (err) {
    next(err);
  }
};

export const rejectCompany = async (req, res, next) => {
  try {
    const company = await adminService.rejectCompanyService(
      req.params.companyId,
      req.body.reason,
    );
    return sendResponse(res, 200, true, "Company rejected", company);
  } catch (err) {
    next(err);
  }
};
