import cloudinary from "../../config/cloud.config.js"; // ✅ was missing — caused crash
import Company from "./company.model.js";
import employerProfile from "../auth/employerProfile.model.js";

export const createCompanyService = async (data, ownerId) => {
  const existing = await Company.findOne({ name: data.name });
  if (existing) {
    const error = new Error("A company with this name already exists");
    error.statusCode = 409;
    throw error;
  }

  const user = await employerProfile.findById(ownerId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }


  const company = await Company.create({ ...data, owner: ownerId });
  user.role = "owner"; // ✅ set role to "owner" for the owner of the company
  await user.save();
  return company;
};

export const addLicensesService = async (id, filePath) => {
  const company = await Company.findById(id);

  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  const options = {
    folder: `RecruitAi/company/${company.name}/licenses`,
    resource_type: "auto", // supports PDF + images
  };

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    filePath,
    options
  );

  // ✅ correct field name from model: "licenses", not "liscences"
  company.licenses = { secure_url, public_id };
  // Status stays "pending" — admin must approve
  await company.save();
  return company;
};

export const getCompanyByIdService = async (id) => {
  const company = await Company.findById(id).populate("owner", "name email");

  // ✅ blocks both "inactive" AND "pending" — only "active" is public
  if (!company || company.status !== "active") {
    const error = new Error("Company not found or not yet approved");
    error.statusCode = 404;
    throw error;
  }

  return company;
};

export const getMyCompaniesService = async (ownerId) => {
  return Company.find({ owner: ownerId, status: { $ne: "inactive" } }).sort({
    createdAt: -1,
  });
};

export const updateCompanyService = async (id, data) => {
  const company = await Company.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  return company;
};

export const deleteCompanyService = async (id) => {
  const company = await Company.findByIdAndUpdate(
    id,
    { $set: { status: "inactive" } },
    { new: true }
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  return company;
};

export const addHRService = async (companyId, hrUserId) => {
  // Validate the HR isn't already the owner
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  if (company.owner.toString() === hrUserId) {
    const error = new Error("Owner cannot be added as an HR");
    error.statusCode = 400;
    throw error;
  }

  const updated = await Company.findByIdAndUpdate(
    companyId,
    { $addToSet: { HRs: hrUserId } }, // ✅ $addToSet prevents duplicates
    { new: true, runValidators: true }
  ).populate("HRs", "name email");

  return updated;
};

export const removeHRService = async (companyId, hrUserId) => {
  const company = await Company.findByIdAndUpdate(
    companyId,
    { $pull: { HRs: hrUserId } },
    { new: true }
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  return company;
};