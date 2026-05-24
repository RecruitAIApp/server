import mongoose from "mongoose";

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
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

    role: {
      type: String,
      enum: ["owner", "hr"],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

employerProfileSchema.index({ userId: 1, companyId: 1 }, { unique: true });

export default mongoose.model(
  "EmployerProfile",
  employerProfileSchema
);