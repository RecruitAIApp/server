import mongoose from "mongoose";

const recommendationDetailSchema = new mongoose.Schema(
  {
    overview: {
      type: String,
      required: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    technicalQuestions: {
      type: [String],
      default: [],
    },
    behavioralQuestions: {
      type: [String],
      default: [],
    },
    hrQuestions: {
      type: [String],
      default: [],
    },
    skillGapAnalysis: {
      missingSkills: { type: [String], default: [] },
      weakAreas: { type: [String], default: [] },
      suggestedImprovements: { type: [String], default: [] },
    },
    preparationTips: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const interviewRecommendationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true, // One recommendation guide per application
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
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      index: true,
    },
    generatedByAI: {
      type: Boolean,
      default: true,
    },
    recommendations: {
      type: recommendationDetailSchema,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("InterviewRecommendation", interviewRecommendationSchema);
