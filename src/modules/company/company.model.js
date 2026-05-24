import { Schema, model, Types } from "mongoose";

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Company description is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    logo: {
      type: String,
      default: null,
    },
    owner: {
      type: Types.ObjectId,
      ref: "EmployerProfile", // should be employer role owner
      required: [true, "Company owner is required"],
    },
    website: {
      type: String,
      trim: true,
      default: null,
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
      trim: true,
    },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
      default: "1-10",
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    licenses: {
      type: {
        secure_url: { type: String },
        public_id: { type: String },
      },
      default: null,
      required: [true, "Licenses is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    ActivationDate: Date,
    HRs: {
      type: [Types.ObjectId],
      ref: "EmployerProfile", // should be employer role hr
      default: [],
    },
    socialLinks: {
      linkedin: String,
      facebook: String,
      twitter: String,
      instagram: String,
      website: String,
    },
  },
  {
    timestamps: true,
  },
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

companySchema.index({ owner: 1 });
companySchema.index({ name: "text", description: "text" });

export default model("Company", companySchema);
