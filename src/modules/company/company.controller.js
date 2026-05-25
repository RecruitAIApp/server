import * as companyService from "./company.service.js";
import { sendResponse } from "../../utils/responseHandler.js";

export const createCompany = async (req, res, next) => {
  try {
    const company = await companyService.createCompanyService(
      req.body,
      req.user.id,
    );
    return sendResponse(
      res,
      201,
      true,
      "Company created successfully",
      company,
    );
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyByIdService(req.params.id);
    return sendResponse(
      res,
      200,
      true,
      "Company fetched successfully",
      company,
    );
  } catch (error) {
    next(error);
  }
};

export const getMyCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.getMyCompaniesService(req.user.id);
    return sendResponse(
      res,
      200,
      true,
      "Companies fetched successfully",
      companies,
    );
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const company = await companyService.updateCompanyService(
      req.params.id,
      req.body,
    );
    return sendResponse(
      res,
      200,
      true,
      "Company updated successfully",
      company,
    );
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    await companyService.deleteCompanyService(req.params.id);
    return sendResponse(res, 200, true, "Company deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const addLicenses = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, false, "License file is required");
    }

    const company = await companyService.addLicensesService(
      req.params.id,
      req.file.path,
    );
    return sendResponse(
      res,
      200,
      true,
      "License uploaded successfully. Awaiting admin approval — we will notify you by email.",
      company,
    );
  } catch (error) {
    next(error);
  }
};

export const removeHR = async (req, res, next) => {
  try {
    const company = await companyService.removeHRService(
      req.params.id,
      req.params.hrId,
    );
    return sendResponse(res, 200, true, "HR removed successfully", company);
  } catch (error) {
    next(error);
  }
};

export const inviteHR = async (req, res, next) => {
  try {
    const { email } = req.body;
    const companyId = req.params.id;
    const invitedBy = req.user.userId || req.user.id;

    const result = await companyService.inviteHRService({
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
