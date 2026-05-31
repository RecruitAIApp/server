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