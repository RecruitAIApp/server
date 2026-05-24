import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
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

    appliedResume: {
      url: String,

      publicId: String,

      fileName: String,
    },

    stage: {
      type: String,
      enum: [
        "applied",
        "screening",
        "shortlisted",
        "interview",
        "rejected",
        "hired",
      ],
      default: "applied",
      index: true,
    },

    // aiScreening: {
    //   status: {
    //     type: String,
    //     enum: [
    //       "queued",
    //       "processing",
    //       "completed",
    //       "failed",
    //     ],
    //     default: "queued",
    //   },

    //   score: Number,

    //   matchedSkills: [String],

    //   missingSkills: [String],

    //   summary: String,

    //   processedAt: Date,
    // },

    notes: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        content: String,

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

applicationSchema.index(
  {
    candidateId: 1,
    jobId: 1,
  },
  {
    unique: true,
  },
);

applicationSchema.index({
  jobId: 1,
  stage: 1,
});

export default mongoose.model("Application", applicationSchema);
