import { Schema, model, Types } from "mongoose";

const jobSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
    },
    requirements: {
      type: [String],
      required: [true, "Requirements are required"],
      default: [],
    },
    salaryRange: {
      min: {
        type: Number,
        required: [true, "Minimum salary is required"],
        min: 0,
      },
      max: {
        type: Number,
        required: [true, "Maximum salary is required"],
        min: 0,
      },
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    company: {
      type: Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    postedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Posted by is required"],
    },
    jobType: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      required: [true, "Job type is required"],
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship", "freelance"],
      required: [true, "Employment type is required"],
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "executive"],
      default: "mid",
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "closed", "pending"],
      default: "open",
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ company: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ title: "text", description: "text", skills: "text" });

export default model("Job", jobSchema);