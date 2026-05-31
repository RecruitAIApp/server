import Company from "../../modules/company/company.model.js";
import Job from "../../modules/jobs/job.model.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const isCompanyOwner = async (req, res, next) => {
  try {
    const companyId = req.params.id || req.body.company;

    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required");
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return sendResponse(res, 404, false, "Company not found");
    }

    if (company.owner.toString() !== req.user.id) {
      return sendResponse(res, 403, false, "Forbidden: you do not own this company");
    }

    req.company = company;
    next();
  } catch (error) {
    next(error);
  }
};

export const isCompanyOwnerOrHR = async (req, res, next) => {
  try {
    const companyId = req.body.company;

    if (!companyId) {
      return sendResponse(res, 400, false, "Company ID is required in the request body");
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return sendResponse(res, 404, false, "Company not found");
    }

    // ✅ status check — only active companies can have new jobs posted
    if (company.status !== "active") {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: company is not approved yet. Jobs can only be posted for active companies."
      );
    }

    const userId = req.user.id;
    const isOwner = company.owner.toString() === userId;
    const isHR = company.HRs.map((id) => id.toString()).includes(userId);

    if (!isOwner && !isHR) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: only the company owner or an assigned HR can post jobs for this company"
      );
    }

    req.company = company;
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

    const userId = req.user.id;

    // Fast path: they posted it
    if (job.postedBy.toString() === userId) {
      req.job = job;
      return next();
    }

    // Slower path: check if they're the company owner or an HR
    const company = await Company.findById(job.company);

    if (!company) {
      return sendResponse(res, 404, false, "Company for this job not found");
    }

    const isOwner = company.owner.toString() === userId;
    const isHR = company.HRs.map((id) => id.toString()).includes(userId);

    if (!isOwner && !isHR) {
      return sendResponse(
        res,
        403,
        false,
        "Forbidden: you do not have permission to modify this job"
      );
    }

    req.job = job;
    req.company = company;
    next();
  } catch (error) {
    next(error);
  }
};

export const isEmployer = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }

  if (req.user.role !== "employer") {
    return sendResponse(
      res,
      403,
      false,
      "Forbidden: only employers can perform this action"
    );
  }

  next();
};

export const isEmployerOrHR = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }

  if (req.user.role !== "employer" && req.user.role !== "hr") {
    return sendResponse(
      res,
      403,
      false,
      "Forbidden: only employers or HR users can perform this action"
    );
  }
  next();
};

export const isCandidate = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, "Unauthorized");
  }

  if (req.user.role !== "candidate") {
    return sendResponse(
      res,
      403,
      false,
      "Forbidden: only candidates can perform this action"
    );
  }

  next();
};