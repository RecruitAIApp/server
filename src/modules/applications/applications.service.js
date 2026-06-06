import * as applicationRepo from './application.repository.js';
import * as jobRepo from '../jobs/job.repository.js';
import * as screeningQueue from './queues/screening.queue.js';
import * as timelineHelper from './timeline.helper.js';
import { AppError } from '../../utils/error.js';
import EmployerProfile from '../auth/employerProfile.model.js';
import { enqueueFeedback } from './queues/feedback.queue.js';
import CandidateProfile from '../auth/candidateProfile.model.js';

/**
 * This is the main logic for applying to a job.
 * @param {*} applicationData 
 * @returns 
 */
export const applyToJob = async (applicationData) => {
  await applicationRepo.assertNoDuplicate(applicationData);
  await jobRepo.assertJobIsOpen(applicationData.jobId);

  const initialTimelineEntry = timelineHelper.buildStatusChangedTimelineEntry(
    applicationData.candidateId,
    null,
    'applied'
  );

  const newApplication = await applicationRepo.create(applicationData, initialTimelineEntry);

  try {
    await screeningQueue.enqueue(newApplication);
  } catch (error) {
    console.error("⚠️ Failed to enqueue AI screening, marking status as failed:", error.message);
    await applicationRepo.updateScreeningStatus(newApplication._id, 'failed');
    newApplication.aiScreening.status = 'failed';
  }

  return newApplication;
};

/**
 * Handles quick applying using the candidate's existing resume.
 * @param {string} jobId 
 * @param {string} candidateId 
 * @returns 
 */
export const quickApply = async (jobId, candidateId) => {
  const profile = await CandidateProfile.findOne({ userId: candidateId });
  if (!profile || !profile.resume || !profile.resume.url || !profile.resume.publicId || !profile.resume.fileName) {
    throw new AppError("Please upload a resume before using Quick Apply", 400);
  }

  const job = await jobRepo.assertJobIsOpen(jobId);
  const companyId = job.company || job.companyId;

  await applicationRepo.assertNoDuplicate({ jobId, candidateId });

  const initialTimelineEntry = timelineHelper.buildStatusChangedTimelineEntry(
    candidateId,
    null,
    'applied'
  );

  const newApplication = await applicationRepo.create({
    candidateId,
    companyId,
    jobId,
    appliedResume: {
      url: profile.resume.url,
      publicId: profile.resume.publicId,
      fileName: profile.resume.fileName
    }
  }, initialTimelineEntry);

  try {
    await screeningQueue.enqueue(newApplication);
  } catch (error) {
    console.error("⚠️ Failed to enqueue AI screening, marking status as failed:", error.message);
    await applicationRepo.updateScreeningStatus(newApplication._id, 'failed');
    newApplication.aiScreening.status = 'failed';
  }

  return newApplication;
};

/**
 * This is the main logic for updating the stage of an application.
 * @param {*} applicationId 
 * @param {*} stageData 
 * @returns 
 */
export const updateApplicationStage = async (applicationId, stageData) => {
  const { stage, notes, actorId } = stageData;

  const currentApplication = await applicationRepo.findByIdOrThrow(applicationId);

  const VALID_STAGES = ['applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'];
  if (!VALID_STAGES.includes(stage.key)) {
    throw new AppError('Invalid stage', 400);
  }

  const fromStage = currentApplication.stage.key;

  const timelineEntry = timelineHelper.buildStatusChangedTimelineEntry(
    actorId,
    fromStage,
    stage.key
  );

  const updatedApplication = await applicationRepo.updateStageAndTimeline(
    currentApplication,
    { stageKey: stage.key, notes, actorId },
    timelineEntry
  );

  const STAGES_THAT_TRIGGER_FEEDBACK = ['shortlisted', 'interview', 'offer', 'hired', 'rejected'];
  if (STAGES_THAT_TRIGGER_FEEDBACK.includes(stage.key)) {
    try {
      await enqueueFeedback(applicationId, notes);
      console.log(`[Service] Successfully enqueued stage feedback/notification for application ${applicationId} (Stage: ${stage.key})`);
    } catch (err) {
      console.error(`[Service] Failed to enqueue stage feedback/notification:`, err.message);
    }
  }

  return updatedApplication;
};

/**
 * This is the main logic for getting applications by job.
 * @param {*} jobId 
 * @param {*} companyId 
 * @returns 
 */
export const getApplicationsByJob = async (jobId, companyId, paginationOptions) => {
  await jobRepo.assertJobExistsAndBelongsToCompany(jobId, companyId);
  return await applicationRepo.findApplicationsByJob(jobId, companyId, paginationOptions);
};

/**
 * Retries enqueuing the AI screening for a failed or queued application.
 * @param {string} applicationId 
 * @param {string} userId 
 * @returns {object} Updated application document
 */
export const retryScreening = async (applicationId, userId) => {
  const application = await applicationRepo.findByIdOrThrow(applicationId);

  // Verify that the user belongs to the company of the application
  const profile = await EmployerProfile.findOne({
    userId,
    companyId: application.companyId,
  });

  if (!profile) {
    throw new AppError("Forbidden: You do not have permission to retry screening for this application", 403);
  }

  if (application.aiScreening.status === "completed" || application.aiScreening.status === "processing") {
    throw new AppError(`Cannot retry screening when status is ${application.aiScreening.status}`, 400);
  }

  // Update status to queued in DB
  await applicationRepo.updateScreeningStatus(applicationId, "queued");

  // Attempt to enqueue
  application.aiScreening.status = "queued";
  try {
    await screeningQueue.enqueue(application);
  } catch (error) {
    console.error("⚠️ Failed to retry enqueuing AI screening, marking status back to failed:", error.message);
    await applicationRepo.updateScreeningStatus(applicationId, "failed");
    application.aiScreening.status = "failed";
    throw new AppError(`Failed to queue screening task: ${error.message}`, 500);
  }

  return application;
};