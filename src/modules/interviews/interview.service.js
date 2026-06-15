import Interview from "./interview.model.js";
import Application from "../applications/application.model.js";
import User from "../auth/user.model.js";
import { AppError } from "../../utils/error.js";
import { QueueService } from "../../common/services/queue.service.js";
import { INTERVIEW_STATUS } from "./interview.constants.js";
import {
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
} from "./interview.email.js";
import notificationService from "../notifications/notification.service.js";

/**
 * Create a new interview
 */
export const createInterview = async (interviewData, schedulerId) => {
  const {
    applicationId,
    interviewDate,
    duration,
    timezone,
    interviewType,
    meetingLink,
    location,
    notes,
  } = interviewData;

  // 1. Fetch and validate Application
  const application = await Application.findById(applicationId)
    .populate("candidateId")
    .populate("jobId")
    .populate("companyId");

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  // 2. Validate Application Stage is 'interview'
  if (application.stage?.key?.toLowerCase() !== "interview") {
    throw new AppError("Application must be in the 'interview' stage to schedule an interview", 400);
  }

  const candidate = application.candidateId;
  if (!candidate) {
    throw new AppError("Candidate user associated with application not found", 404);
  }

  const companyId = application.companyId?._id || application.companyId;
  const jobId = application.jobId?._id || application.jobId;

  // 3. Create and save interview
  const newInterview = new Interview({
    applicationId,
    candidateId: candidate._id,
    companyId,
    jobId,
    scheduledBy: schedulerId,
    interviewType,
    interviewDate,
    duration,
    timezone,
    meetingLink: interviewType === "online" ? meetingLink : undefined,
    location: interviewType === "onsite" ? location : undefined,
    notes,
    status: INTERVIEW_STATUS.SCHEDULED,
  });

  await newInterview.save();

  // 4. Update application's interviewIds
  if (!application.interviewIds) {
    application.interviewIds = [];
  }
  application.interviewIds.push(newInterview._id);
  
  // Add timeline entry
  application.timeline.push({
    type: "interview_scheduled",
    actorId: schedulerId,
    metadata: {
      interviewId: newInterview._id,
      interviewDate,
      interviewType,
    },
    createdAt: new Date(),
  });

  await application.save();

  // 5. Send confirmation email to candidate
  await sendInterviewScheduledEmail({
    to: candidate.email,
    candidateName: candidate.fullName || candidate.name || "Candidate",
    companyName: application.companyId?.name || "the company",
    jobTitle: application.jobId?.title || "the position",
    interviewDate,
    duration,
    timezone,
    interviewType,
    meetingLink,
    location,
    notes,
  });

  // Send real-time notification to candidate
  try {
    await notificationService.notify(candidate._id, {
      type: "interview",
      title: "Interview Scheduled",
      message: `You have been invited to an interview for ${application.jobId?.title || "a position"} by ${application.companyId?.name || "a company"}.`,
      data: {
        interviewId: newInterview._id.toString(),
        applicationId: applicationId.toString(),
        jobId: jobId.toString(),
      }
    });
  } catch (err) {
    console.error("Failed to send interview notification", err);
  }

  // 6. Queue AI Recommendation generation job (async)
  try {
    await QueueService.addJob("background-tasks", "GENERATE_RECOMMENDATIONS", {
      type: "GENERATE_RECOMMENDATIONS",
      data: { applicationId: applicationId.toString() },
    });
    console.log(`[Queue] Successfully enqueued AI recommendations for Application: ${applicationId}`);
  } catch (err) {
    console.error(`[Queue] Failed to enqueue AI recommendations: ${err.message}`);
  }

  return newInterview;
};

/**
 * Get Candidate's own interviews
 */
export const getCandidateInterviews = async (candidateId) => {
  return await Interview.find({ candidateId })
    .populate({ path: "companyId", select: "name logo industry description" })
    .populate({ path: "jobId", select: "title description requirements skills" })
    .sort({ interviewDate: 1 });
};

/**
 * Get Company interviews with pagination, filtering, sorting
 */
export const getCompanyInterviews = async (companyId, options = {}) => {
  const { page = 1, limit = 10, status, search, type, sortBy = "interviewDate", sortOrder = "asc" } = options;

  const filter = { companyId };

  if (status) {
    filter.status = status;
  }
  if (type) {
    filter.interviewType = type;
  }

  // Handle pagination
  const skip = (page - 1) * limit;

  // Handle sorting
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  let query = Interview.find(filter);

  // If search query is present, we might want to populate and filter or search on notes/location.
  // Standard text search on fields:
  if (search) {
    filter.$or = [
      { location: { $regex: search, $options: "i" } },
      { notes: { $regex: search, $options: "i" } },
    ];
  }

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .populate({ path: "candidateId", select: "name fullName email phone" })
      .populate({ path: "jobId", select: "title" })
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Interview.countDocuments(filter),
  ]);

  return {
    interviews,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single interview details
 */
export const getInterviewDetails = async (id, user) => {
  const interview = await Interview.findById(id)
    .populate({ path: "companyId", select: "name logo industry description" })
    .populate({ path: "jobId", select: "title description requirements skills" })
    .populate({ path: "candidateId", select: "name fullName email phone" })
    .populate({ path: "scheduledBy", select: "name fullName email" });

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  // Security Check: Candidate or Company staff only
  const isCandidateUser = user.role === "candidate" && interview.candidateId._id.toString() === user.id.toString();
  const isCompanyUser = (user.role === "employer" || user.role === "hr" || user.role === "admin") && 
    interview.companyId._id.toString() === user.companyId?.toString();

  if (!isCandidateUser && !isCompanyUser && user.role !== "admin") {
    throw new AppError("Unauthorized access to interview details", 403);
  }

  return interview;
};

/**
 * Update / Reschedule an interview
 */
export const updateInterview = async (id, updateData, userId) => {
  const interview = await Interview.findById(id);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  // Update interview fields
  const updatableFields = [
    "interviewDate",
    "duration",
    "timezone",
    "interviewType",
    "meetingLink",
    "location",
    "notes",
  ];

  updatableFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      interview[field] = updateData[field];
    }
  });

  interview.status = INTERVIEW_STATUS.RESCHEDULED;
  await interview.save();

  // Populate candidate and job/company for email notification
  const populated = await Interview.findById(id)
    .populate("candidateId")
    .populate("jobId")
    .populate("companyId");

  // Update application timeline
  await Application.findByIdAndUpdate(interview.applicationId, {
    $push: {
      timeline: {
        type: "interview_rescheduled",
        actorId: userId,
        metadata: {
          interviewId: interview._id,
          interviewDate: interview.interviewDate,
        },
        createdAt: new Date(),
      },
    },
  });

  // Send email to candidate
  await sendInterviewRescheduledEmail({
    to: populated.candidateId.email,
    candidateName: populated.candidateId.fullName || populated.candidateId.name || "Candidate",
    companyName: populated.companyId.name,
    jobTitle: populated.jobId.title,
    interviewDate: interview.interviewDate,
    duration: interview.duration,
    timezone: interview.timezone,
    interviewType: interview.interviewType,
    meetingLink: interview.meetingLink,
    location: interview.location,
    notes: interview.notes,
  });

  // Send real-time notification to candidate
  try {
    await notificationService.notify(populated.candidateId._id, {
      type: "interview",
      title: "Interview Rescheduled",
      message: `Your interview for ${populated.jobId.title} at ${populated.companyId.name} has been rescheduled.`,
      data: {
        interviewId: interview._id.toString(),
      }
    });
  } catch (err) {
    console.error("Failed to send interview rescheduled notification", err);
  }

  // Re-trigger/queue recommendations generation
  try {
    await QueueService.addJob("background-tasks", "GENERATE_RECOMMENDATIONS", {
      type: "GENERATE_RECOMMENDATIONS",
      data: { applicationId: interview.applicationId.toString() },
    });
  } catch (err) {
    console.error(`[Queue] Failed to enqueue AI recommendations: ${err.message}`);
  }

  return populated;
};

/**
 * Cancel an interview
 */
export const cancelInterview = async (id, notes, userId) => {
  const interview = await Interview.findById(id)
    .populate("candidateId")
    .populate("jobId")
    .populate("companyId");

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  interview.status = INTERVIEW_STATUS.CANCELLED;
  if (notes) {
    interview.notes = notes;
  }
  await interview.save();

  // Update application timeline
  await Application.findByIdAndUpdate(interview.applicationId, {
    $push: {
      timeline: {
        type: "interview_cancelled",
        actorId: userId,
        metadata: {
          interviewId: interview._id,
          notes,
        },
        createdAt: new Date(),
      },
    },
  });

  // Send cancellation email
  await sendInterviewCancelledEmail({
    to: interview.candidateId.email,
    candidateName: interview.candidateId.fullName || interview.candidateId.name || "Candidate",
    companyName: interview.companyId.name,
    jobTitle: interview.jobId.title,
    notes,
  });

  // Send real-time notification to candidate
  try {
    await notificationService.notify(interview.candidateId._id, {
      type: "interview",
      title: "Interview Cancelled",
      message: `Your interview for ${interview.jobId.title} at ${interview.companyId.name} has been cancelled.`,
      data: {
        interviewId: interview._id.toString(),
      }
    });
  } catch (err) {
    console.error("Failed to send interview cancelled notification", err);
  }

  return interview;
};

/**
 * Complete an interview
 */
export const completeInterview = async (id, userId) => {
  const interview = await Interview.findById(id);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  interview.status = INTERVIEW_STATUS.COMPLETED;
  await interview.save();

  // Update application timeline
  await Application.findByIdAndUpdate(interview.applicationId, {
    $push: {
      timeline: {
        type: "interview_completed",
        actorId: userId,
        metadata: {
          interviewId: interview._id,
        },
        createdAt: new Date(),
      },
    },
  });

  return interview;
};
