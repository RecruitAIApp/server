import mongoose from "mongoose";

const aiEvalSchema = new mongoose.Schema(
  {
    // Which agent produced this output
    agentName: {
      type: String,
      required: true,
      enum: ["screening", "recommendation", "tracking", "retrieval"],
      index: true,
    },

    // The input that was sent to the agent
    inputSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // The raw output the agent returned
    outputSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // JSON structure checks
    isValidJSON: {
      type: Boolean,
      required: true,
    },
    schemaValid: {
      type: Boolean,
      required: true,
    },

    // Hallucination check result (0 = no hallucination, 1 = full hallucination)
    hallucinationScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // Overall quality score (0-10)
    qualityScore: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    // Pass or fail
    status: {
      type: String,
      enum: ["pass", "fail"],
      required: true,
      index: true,
    },

    // Why it failed (if it did)
    failureReason: {
      type: String,
      default: null,
    },

    // Optional: link to the application or job being evaluated
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

aiEvalSchema.index({ agentName: 1, createdAt: -1 });
aiEvalSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("AIEval", aiEvalSchema);
