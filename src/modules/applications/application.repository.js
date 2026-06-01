import Application from "./application.model.js";
import { AppError } from "../../utils/error.js";

/**
 * Asserts that a candidate has not already applied to the specified job.
 * Throws a 409 error if they have.
 */
export const assertNoDuplicate = async (data) => {
  const { jobId, candidateId } = data;
  const existingApplication = await Application.findOne({ jobId, candidateId });
  if (existingApplication) {
    throw new AppError("You've already applied to this job", 409);
  }
};

/**
 * Creates a new application record in the database.
 */
export const create = async (data, initialTimelineEntry) => {
  const { candidateId, companyId, jobId, appliedResume, coverLetter } = data;
  try {
    return await Application.create({
      candidateId,
      companyId,
      jobId,
      appliedResume,
      coverLetter,
      stage: {
        key: "applied",
        changedAt: new Date(),
        changedBy: candidateId,
      },
      aiScreening: {
        status: "queued",
      },
      timeline: [initialTimelineEntry],
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Already applied", 409);
    }
    throw error;
  }
};

/**
 * Finds an application by its ID.
 */
export const findById = async (applicationId) => {
  return await Application.findById(applicationId);
};

/**
 * Persists changes to an application document.
 */
export const save = async (applicationInstance) => {
  return await applicationInstance.save();
};

/**
 * Fetches applications for a job, populating candidate info.
 */
export const findApplicationsByJob = async (jobId, companyId, {page = 1, limit = 20} = {}) => {
  const applications = await Application.find({ jobId, companyId })
    .populate({ path: "candidateId", select: "name email profile.cvUrl" })
    .lean()
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Application.countDocuments({ jobId });

  return { applications, total };
};

/**
 * Finds an application by its ID, throwing a 404 error if not found.
 */
export const findByIdOrThrow = async (applicationId) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }
  return application;
};

/**
 * Updates stage and adds notes + timeline entry to an application document.
 */
export const updateStageAndTimeline = async (application, updateData, timelineEntry) => {
  const { stageKey, notes, actorId } = updateData;

  application.stage.key = stageKey;
  application.stage.changedBy = actorId;
  application.stage.changedAt = new Date();

  if (notes && notes.trim() !== "") {
    application.notes.push({
      authorId: actorId,
      content: notes,
      createdAt: new Date(),
    });
  }

  application.timeline.push(timelineEntry);

  return await application.save();
};

/**
 * Updates the AI screening status of an application.
 */
export const updateScreeningStatus = async (applicationId, status) => {
  return await Application.findByIdAndUpdate(
    applicationId,
    { $set: { "aiScreening.status": status } },
    { new: true }
  );
};


