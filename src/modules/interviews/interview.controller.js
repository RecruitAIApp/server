import * as interviewService from "./interview.service.js";
import EmployerProfile from "../auth/employerProfile.model.js";
import { sendResponse } from "../../utils/responseHandler.js";

/**
 * Schedule / Create a new interview
 */
export const createInterviewController = async (req, res, next) => {
  try {
    const schedulerId = req.user.id;
    // Verify user is an employer/HR
    const profile = await EmployerProfile.findOne({ userId: schedulerId });
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only active company staff can schedule interviews.",
      });
    }

    const newInterview = await interviewService.createInterview(req.body, schedulerId);

    return sendResponse(
      res,
      201,
      true,
      "Interview scheduled successfully and email invitation sent to candidate",
      newInterview
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged-in candidate interviews
 */
export const getCandidateInterviewsController = async (req, res, next) => {
  try {
    const candidateId = req.user.id;
    const interviews = await interviewService.getCandidateInterviews(candidateId);

    return sendResponse(
      res,
      200,
      true,
      "Candidate interviews fetched successfully",
      interviews
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all company interviews (pagination, filtering, sorting supported)
 */
export const getCompanyInterviewsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await EmployerProfile.findOne({ userId });
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not belong to a company.",
      });
    }

    const companyId = profile.companyId;
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      status: req.query.status,
      type: req.query.type,
      search: req.query.search,
      sortBy: req.query.sortBy || "interviewDate",
      sortOrder: req.query.sortOrder || "asc",
    };

    const result = await interviewService.getCompanyInterviews(companyId, options);

    return sendResponse(
      res,
      200,
      true,
      "Company interviews fetched successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get details of a single interview
 */
export const getInterviewDetailsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await interviewService.getInterviewDetails(id, req.user);

    return sendResponse(
      res,
      200,
      true,
      "Interview details fetched successfully",
      interview
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule / Update an interview
 */
export const updateInterviewController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check permission - must belong to same company
    const profile = await EmployerProfile.findOne({ userId });
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not belong to a company.",
      });
    }

    const updated = await interviewService.updateInterview(id, req.body, userId);

    return sendResponse(
      res,
      200,
      true,
      "Interview rescheduled successfully and candidate notified by email",
      updated
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an interview
 */
export const cancelInterviewController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    // Check permission - must belong to same company
    const profile = await EmployerProfile.findOne({ userId });
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not belong to a company.",
      });
    }

    const cancelled = await interviewService.cancelInterview(id, notes, userId);

    return sendResponse(
      res,
      200,
      true,
      "Interview cancelled successfully and candidate notified by email",
      cancelled
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Complete an interview
 */
export const completeInterviewController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const completed = await interviewService.completeInterview(id, userId);

    return sendResponse(
      res,
      200,
      true,
      "Interview marked as completed",
      completed
    );
  } catch (error) {
    next(error);
  }
};
