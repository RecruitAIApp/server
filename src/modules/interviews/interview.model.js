import mongoose from "mongoose";
import { INTERVIEW_STATUSES, INTERVIEW_TYPES, INTERVIEW_STATUS } from "./interview.constants.js";

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewType: {
      type: String,
      enum: INTERVIEW_TYPES,
      required: true,
    },
    interviewDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // duration in minutes
      required: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: INTERVIEW_STATUS.SCHEDULED,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
interviewSchema.index({ companyId: 1, interviewDate: -1 });
interviewSchema.index({ candidateId: 1, interviewDate: -1 });

export default mongoose.model("Interview", interviewSchema);
