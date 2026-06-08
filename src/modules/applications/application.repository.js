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
export const findApplicationsByJob = async (jobId, companyId, { page = 1, limit = 20 } = {}) => {
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



/**
 * Fetches applications for a job, populating candidate info, and returns grouped by stage key.
 */
export const getKanbanByJob = async (jobId, companyId) => {
  const applications = await Application.find({ jobId, companyId })
    .populate({ path: "candidateId", select: "name email profile.cvUrl" })
    .sort({ createdAt: -1 })
    .lean();

  const stages = {
    applied: [],
    shortlisted: [],
    interview: [],
    offer: [],
    hired: [],
    rejected: []
  };

  applications.forEach(app => {
    const stageKey = app.stage?.key || 'applied';
    if (stages[stageKey]) {
      stages[stageKey].push(app);
    } else {
      // In case of any custom stage keys
      if (!stages[stageKey]) {
        stages[stageKey] = [];
      }
      stages[stageKey].push(app);
    }
  });

  return stages;
};

/**
 * Adds a note and/or rating vote to an application.
 */
export const addNoteAndRating = async (applicationId, actorId, noteContent, ratingScore) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  // 1. Add Note if provided
  if (noteContent && noteContent.trim() !== "") {
    application.notes.push({
      authorId: actorId,
      content: noteContent,
      ratingScore: ratingScore,
      createdAt: new Date()
    });
  }

  // 2. Add or Update rating vote if provided
  if (typeof ratingScore === "number") {
    if (!application.internalRating) {
      application.internalRating = { average: 0, votes: [] };
    }

    const existingVoteIndex = application.internalRating.votes.findIndex(
      (v) => v.recruiterId.toString() === actorId.toString()
    );

    if (existingVoteIndex > -1) {
      application.internalRating.votes[existingVoteIndex].score = ratingScore;
    } else {
      application.internalRating.votes.push({
        recruiterId: actorId,
        score: ratingScore
      });
    }

    // Recalculate average
    const totalVotes = application.internalRating.votes.length;
    const sumVotes = application.internalRating.votes.reduce((sum, v) => sum + v.score, 0);
    application.internalRating.average = totalVotes > 0 ? sumVotes / totalVotes : 0;
  }

  return await application.save();
};

/**
 * Updates a note and recalculates the rating if changed.
 */
export const updateNote = async (applicationId, noteId, actorId, newContent, newRating) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  const note = application.notes.id(noteId);
  if (!note) {
    throw new AppError("Note not found", 404);
  }

  if (note.authorId.toString() !== actorId.toString()) {
    throw new AppError("Unauthorized to edit this note", 403);
  }

  if (newContent !== undefined) {
    note.content = newContent;
  }
  if (newRating !== undefined) {
    note.ratingScore = newRating;

    // Also update recruiter's vote in internalRating.votes
    if (!application.internalRating) {
      application.internalRating = { average: 0, votes: [] };
    }
    const voteIndex = application.internalRating.votes.findIndex(
      (v) => v.recruiterId.toString() === actorId.toString()
    );
    if (voteIndex > -1) {
      application.internalRating.votes[voteIndex].score = newRating;
    } else {
      application.internalRating.votes.push({ recruiterId: actorId, score: newRating });
    }
    const totalVotes = application.internalRating.votes.length;
    const sumVotes = application.internalRating.votes.reduce((sum, v) => sum + v.score, 0);
    application.internalRating.average = totalVotes > 0 ? sumVotes / totalVotes : 0;
  }

  return await application.save();
};

/**
 * Deletes a note and recalculates/removes recruiter rating if applicable.
 */
export const deleteNote = async (applicationId, noteId, actorId) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  const note = application.notes.id(noteId);
  if (!note) {
    throw new AppError("Note not found", 404);
  }

  if (note.authorId.toString() !== actorId.toString()) {
    throw new AppError("Unauthorized to delete this note", 403);
  }

  // Remove the recruiter's rating vote associated with this note if applicable
  if (note.ratingScore !== undefined) {
    if (application.internalRating && application.internalRating.votes) {
      application.internalRating.votes = application.internalRating.votes.filter(
        (v) => v.recruiterId.toString() !== actorId.toString()
      );
      const totalVotes = application.internalRating.votes.length;
      const sumVotes = application.internalRating.votes.reduce((sum, v) => sum + v.score, 0);
      application.internalRating.average = totalVotes > 0 ? sumVotes / totalVotes : 0;
    }
  }

  application.notes.pull(noteId);
  return await application.save();
};

/**
 * Finds all applications submitted by a specific candidate.
 */
export const findCandidateApplications = async (candidateId) => {
  return await Application.find({ candidateId })
    .populate({ path: "jobId", select: "title location jobType employmentType" })
    .populate({ path: "companyId", select: "name logo website" })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Finds an application by ID with fully populated candidate, job, and company info.
 */
export const findDetailsById = async (applicationId) => {
  return await Application.findById(applicationId)
    .populate({ path: "candidateId", select: "name email profile" })
    .populate({ path: "jobId", select: "title location jobType employmentType" })
    .populate({ path: "companyId", select: "name logo website" });
};
