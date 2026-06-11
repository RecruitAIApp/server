import * as recommendationService from "./interviewRecommendation.service.js";
import Application from "../applications/application.model.js";
import EmployerProfile from "../auth/employerProfile.model.js";
import { sendResponse } from "../../utils/responseHandler.js";

/**
 * Generate preparation guide for an application
 */
export const generateRecommendationController = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const result = await recommendationService.runAgentAndSave(applicationId);

    return sendResponse(
      res,
      201,
      true,
      "AI Interview recommendations generated successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get prep guide for Candidate (Only candidate who applied)
 */
export const getCandidateRecommendationController = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const result = await recommendationService.getRecommendationService(
      applicationId,
      "candidate",
      userId
    );

    return sendResponse(
      res,
      200,
      true,
      "Candidate preparation guide fetched successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get prep guide for Company Users (Employer / HR associated with the job)
 */
export const getCompanyRecommendationController = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    // Security check: Must belong to the company that posted the job
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const profile = await EmployerProfile.findOne({ userId });
    if (!profile || profile.companyId.toString() !== application.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view recommendations for this application.",
      });
    }

    const result = await recommendationService.getRecommendationService(
      applicationId,
      "employer",
      userId
    );

    return sendResponse(
      res,
      200,
      true,
      "Company preparation guide fetched successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Force clear cache and regenerate preparation guide
 */
export const regenerateRecommendationController = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "employer" || userRole === "hr") {
      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      const profile = await EmployerProfile.findOne({ userId });
      if (!profile || profile.companyId.toString() !== application.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to regenerate recommendations for this application.",
        });
      }
    }

    const result = await recommendationService.regenerateRecommendationService(
      applicationId,
      userRole,
      userId
    );

    return sendResponse(
      res,
      200,
      true,
      "AI recommendations regenerated successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};
