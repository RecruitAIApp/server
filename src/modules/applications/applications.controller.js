import * as applicationService from './applications.service.js';
import { sendResponse } from '../../utils/responseHandler.js';
import { uploadCVToCloudinary } from '../auth/cv.service.js';
import Job from '../jobs/job.model.js';

export const applyToJobController = async (req, res) => {
  try {
    const applicationData = req.body;
    
    // Auto-fill candidateId from auth context
    if (!applicationData.candidateId && req.user) {
      applicationData.candidateId = req.user.id || req.user._id;
    }

    // Auto-fill companyId from Job
    if (!applicationData.companyId && applicationData.jobId) {
      const job = await Job.findById(applicationData.jobId);
      if (job) applicationData.companyId = job.company || job.companyId;
    }

    // If a file was uploaded (Standard Apply with new CV), upload it to Cloudinary
    if (req.file) {
      const { url, publicId, fileName } = await uploadCVToCloudinary(req.file.buffer, req.file.originalname);
      applicationData.appliedResume = { url, publicId, fileName };
    } else if (!applicationData.appliedResume) {
      return res.status(400).json({ success: false, message: "A resume must be provided (either uploaded file or appliedResume object)" });
    }

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

export const quickApplyController = async (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user.id || req.user._id;

    const newApplication = await applicationService.quickApply(jobId, userId);

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

export const getMyApplicationsController = async (req, res) => {
  try {
    const candidateId = req.user.id || req.user._id;
    const applications = await applicationService.getMyApplications(candidateId);
    
    return res.status(200).json({
      success: true,
      applications
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
  