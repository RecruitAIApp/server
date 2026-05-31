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
      key: {
        type: String,
        default: "applied",
      },

      changedAt: Date,

      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    aiScreening: {
      status: {
        type: String,
        enum: ["queued", "processing", "completed", "failed"],
        default: "queued",
      },

      overallScore: Number,

      confidence: Number,

      scoreBreakdown: {
        skills: Number,

        experience: Number,

        education: Number,

        cultureFit: Number,
      },

      matchedSkills: [String],

      missingSkills: [String],

      summary: String,

      redFlags: [
        {
          type: String,

          severity: {
            type: String,
            enum: ["low", "medium", "high"],
          },

          message: String,
        },
      ],

      processedAt: Date,
    },

    timeline: [
      {
        type: {
          type: String,
        },

        actorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        metadata: mongoose.Schema.Types.Mixed,

        createdAt: Date,
      },
    ],

    notes: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        content: String,

        createdAt: Date,
      },
    ],

    internalRating: {
      average: Number,

      votes: [
        {
          recruiterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },

          score: Number,
        },
      ],
    },

    interviewIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
      },
    ],

    deletedAt: Date,
  },
  {
    timestamps: true,
  },
);

applicationSchema.index(
  {
    jobId: 1,
    candidateId: 1,
  },
  {
    unique: true,
  },
);

applicationSchema.index({
  jobId: 1,
  "stage.key": 1,
});

applicationSchema.index({
  candidateId: 1,
  createdAt: -1,
});

applicationSchema.index({
  "aiScreening.overallScore": -1,
});

export default mongoose.model("Application", applicationSchema);
