import * as jobService from "./job.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const createJob = async (req, res, next) => {
  try {
    const job = await jobService.createJobService(req.body, req.user.id);
    return sendResponse(res, 201, true, "Job created successfully", job);
  } catch (error) {
    next(error);
  }
};

export const getAllJobs = async (req, res, next) => {
  try {
    const result = await jobService.getAllJobsService(req.query , req.user.role);
    return sendResponse(res, 200, true, "Jobs fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getMyJobs = async (req, res, next) => {
  try {
    const result = await jobService.getJobsByEmployerService(
      req.user.id,
      req.query,
      req.user.role
    );
    return sendResponse(res, 200, true, "Your jobs fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getJobsByCompany = async (req, res, next) => {
  try {
    const result = await jobService.getJobsByCompanyService(
      req.params.companyId,
      req.query,
      req.user
    );
    return sendResponse(
      res,
      200,
      true,
      "Company jobs fetched successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const job = await jobService.getJobByIdService(req.params.id);
    return sendResponse(res, 200, true, "Job fetched successfully", job);
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJobService(req.params.id, req.body);
    return sendResponse(res, 200, true, "Job updated successfully", job);
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    await jobService.deleteJobService(req.params.id);
    return sendResponse(res, 200, true, "Job deleted successfully");
  } catch (error) {
    next(error);
  }
};