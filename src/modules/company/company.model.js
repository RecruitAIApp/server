import { Schema, model, Types } from "mongoose";

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
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
      ref: "User", // references User directly
      required: [true, "Company owner is required"],
    },
    HRs: {
      type: [Types.ObjectId],
      ref: "User",
      default: [],
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
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "rejected"],
      default: "pending",
    },
    ActivationDate: Date,
    rejectionReason: {
      type: String,
      default: null,
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
companySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
});
companySchema.index({ owner: 1 });
companySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export default model("Company", companySchema);
