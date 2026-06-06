import * as applicationService from './applications.service.js';
import { sendResponse } from '../../utils/responseHandler.js';

export const applyToJobController = async (req, res) => {
  try {
    const applicationData = req.body;
    const newApplication = await applicationService.applyToJob(applicationData);

    return sendResponse(
      res, 
      201, 
      true, 
      'Application submitted successfully. AI screening is running in the background.', 
      newApplication
    );
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
}

export const updateApplicationStageController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const stageData = req.body;
    const actorId = req.user.id || req.user.userId;

    const updated = await applicationService.updateApplicationStage(applicationId, {
      ...stageData,
      actorId,
    });

    return sendResponse(
      res,
      200,
      true,
      'Application stage updated successfully',
      updated
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
}

export const getApplicationsByJobController = async (req, res) => {
  try {
    const jobId = req.params.id;
    const companyId = req.job.company;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const paginationOptions = { page, limit };

    const applications = await applicationService.getApplicationsByJob(jobId, companyId, paginationOptions);

    return sendResponse(
      res,
      200,
      true,
      'Applications fetched successfully',
      applications
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const retryScreeningController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id || req.user.userId;

    const updated = await applicationService.retryScreening(applicationId, userId);

    return sendResponse(
      res,
      200,
      true,
      'AI screening enqueued successfully',
      updated
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getApplicationDetailsController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const user = req.user;

    const application = await applicationService.getApplicationDetails(applicationId, user);

    return sendResponse(
      res,
      200,
      true,
      'Application details fetched successfully',
      application
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getJobKanbanController = async (req, res) => {
  try {
    const jobId = req.params.id;
    const companyId = req.job.company;

    const kanban = await applicationService.getJobKanban(jobId, companyId);

    return sendResponse(
      res,
      200,
      true,
      'Job Kanban fetched successfully',
      kanban
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addApplicationNoteController = async (req, res) => {
  try {
    const { id } = req.params;
    const noteData = req.body;
    const user = req.user;

    const updated = await applicationService.addApplicationNote(id, noteData, user);

    return sendResponse(
      res,
      200,
      true,
      'Note added successfully',
      updated
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCandidateApplicationsController = async (req, res) => {
  try {
    const candidateId = req.user.id || req.user.userId;

    const applications = await applicationService.getCandidateApplications(candidateId);

    return sendResponse(
      res,
      200,
      true,
      'My applications fetched successfully',
      applications
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
