import mongoose from "mongoose";

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    profilePicture: {
      url: String,
      publicId: String,
    },

    basicInfo: {
      headline: {
        type: String,
        trim: true,
      },

      bio: {
        type: String,
        maxlength: 1500,
      },

      phone: String,

      location: {
        country: String,
        city: String,
      },

      socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
      },
    },

    skills: {
      type: [String],
      default: [],
    },

    experience: [
      {
        company: String,

        title: String,

        startDate: Date,

        endDate: Date,

        currentlyWorking: Boolean,

        description: String,
      },
    ],

    education: [
      {
        institution: String,

        degree: String,

        field: String,

        startYear: Number,

        endYear: Number,
      },
    ],

    resume: {
      url: String,

      publicId: String,

      fileName: String,

      uploadedAt: Date,

      parsedData: {
        skills: [String],
        experienceYears: Number,
        jobTitles: [String],
        summary: String,
      },
      parseStatus: {
        type: String,
        enum: ["none", "pending", "processing", "done", "failed"],
        default: "none",
      },
      parseError: String,
      parsedAt: Date,
    },

    profileCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
  },
  {
    timestamps: true,
  },
);

candidateProfileSchema.index({
  "resume.parsedData.skills": 1,
});

export default mongoose.model(
  "CandidateProfile",
  candidateProfileSchema
);