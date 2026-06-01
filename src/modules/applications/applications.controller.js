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
    const actorId = req.user.userId;

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
    const userId = req.user.id;

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
  