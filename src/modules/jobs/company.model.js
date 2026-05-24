import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    logo: {
      url: String,
      publicId: String,
    },

    description: {
      type: String,
      maxlength: 3000,
    },

    industry: String,

    companySize: {
      type: String,
      enum: ["Startup", "Small", "Medium", "Enterprise"],
    },

    website: {
      type: String,
      trim: true,
    },

    socialLinks: {
      linkedin: String,
    },

    location: {
      country: String,
      city: String,
    },

    licenseDocument: {
      url: String,
      publicId: String,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

companySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  next();
});

export default mongoose.model("Company", companySchema);