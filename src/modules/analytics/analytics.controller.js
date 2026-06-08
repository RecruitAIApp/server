import * as analyticsService from "./analytics.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const getHiringFunnel = async (req, res, next) => {
  try {
    const data = await analyticsService.getHiringFunnelService(
      req.query.companyId,
    );
    return sendResponse(res, 200, true, "Hiring funnel fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getApplicationsOverTime = async (req, res, next) => {
  try {
    const data = await analyticsService.getApplicationsOverTimeService(
      req.query.companyId,
      req.query.days,
    );
    return sendResponse(res, 200, true, "Applications over time fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getAIScoreDistribution = async (req, res, next) => {
  try {
    const data = await analyticsService.getAIScoreDistributionService(
      req.query.companyId,
    );
    return sendResponse(res, 200, true, "AI score distribution fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getTopJobs = async (req, res, next) => {
  try {
    const data = await analyticsService.getTopJobsService(
      req.query.companyId,
      req.query.limit,
    );
    return sendResponse(res, 200, true, "Top jobs fetched", data);
  } catch (err) {
    next(err);
  }
};

export const getUserGrowth = async (req, res, next) => {
  try {
    const data = await analyticsService.getUserGrowthService(req.query.days);
    return sendResponse(res, 200, true, "User growth fetched", data);
  } catch (err) {
    next(err);
  }
};
