import Company from "../../modules/company/company.model.js";
import Job from "../../modules/jobs/job.model.js";
import EmployerProfile from "../../modules/auth/employerProfile.model.js";
import { sendResponse } from "../../utils/responseHandler.js";

// Helper to extract companyId from request
const getCompanyId = (req) => {
  return (
    req.params.companyId ||
    req.params.id ||
    req.body.companyId ||
    req.body.company ||
    req.query.companyId
  );
};

// 1. requireEmployer
export const requireEmployer = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }
  if (req.user.role !== "employer") {
    return sendResponse(res, 403, false, "Forbidden: Employer access required");
  }
  next();
};

// 2. requireCompanyOwner
export const requireCompanyOwner = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const userId = req.user.userId || req.user.id;
    const profile = await EmployerProfile.findOne({
      userId,
      companyId,
      role: "owner",
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: Only the company owner can perform this action",
      );
    }

    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// 3. requireCompanyHR
export const requireCompanyHR = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const userId = req.user.userId || req.user.id;
    const profile = await EmployerProfile.findOne({
      userId,
      companyId,
      role: "hr",
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: Only HR members of this company can perform this action",
      );
    }

    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// 4. requireCompanyMember
export const requireCompanyMember = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const userId = req.user.userId || req.user.id;
    const profile = await EmployerProfile.findOne({
      userId,
      companyId,
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: You must be a member of this company to perform this action",
      );
    }

    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// --- BACKWARD COMPATIBILITY MIDDLEWARES ---

export const isEmployer = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }
  if (req.user.role !== "employer") {
    return sendResponse(
      res,
      403,
      false,
      "Forbidden: only employers can perform this action",
    );
  }
  next();
};

export const isEmployerOrHR = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }
  // The User.role is "employer" for both owners and HRs. We do not support a fake "hr" user role.
  if (req.user.role !== "employer") {
    return sendResponse(
      res,
      403,
      false,
      "Forbidden: only employers can perform this action",
    );
  }
  next();
};

export const isCompanyOwner = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return sendResponse(res, 404, false, "Company not found");
    }

    const userId = req.user.userId || req.user.id;
    const profile = await EmployerProfile.findOne({
      userId,
      companyId,
      role: "owner",
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: you do not own this company",
      );
    }

    req.company = company;
    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

export const isCompanyOwnerOrHR = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return sendResponse(res, 404, false, "Company not found");
    }

    if (company.status !== "active") {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: company is not approved yet. Jobs can only be posted for active companies.",
      );
    }

    const userId = req.user.userId || req.user.id;
    const profile = await EmployerProfile.findOne({
      userId,
      companyId,
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: only the company owner or an assigned HR can post jobs for this company",
      );
    }

    req.company = company;
    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

export const isJobOwner = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return sendResponse(res, 404, false, "Job not found");
    }

    const userId = req.user.userId || req.user.id;

    // Fast path: they posted it
    if (job.postedBy.toString() === userId) {
      req.job = job;
      return next();
    }

    // Slower path: check if they belong to the company
    const profile = await EmployerProfile.findOne({
      userId,
      companyId: job.company,
    });

    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: you do not have permission to modify this job",
      );
    }

    const company = await Company.findById(job.company);
    req.job = job;
    req.company = company;
    req.employerProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// Only the poster or company owner can delete
export const isJobDeleter = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return sendResponse(res, 404, false, "Job not found");
    }
    const userId = req.user.userId || req.user.id;
    if (job.postedBy.toString() === userId) {
      req.job = job;
      return next();
    }
    const profile = await EmployerProfile.findOne({
      userId,
      companyId: job.company,
      role: "owner",
    });
    if (!profile) {
      return sendResponse(
        res,
        403,
        false,
        "Only the job poster or company owner can delete jobs",
      );
    }
    req.job = job;
    next();
  } catch (error) {
    next(error);
  }
};
