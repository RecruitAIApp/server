import User from "./user.model.js";
import EmployerProfile from "./employerProfile.model.js";
import Company from "../company/company.model.js";
import { createError } from "../../utils/error.js";

/**
 * Create company + owner EmployerProfile for authenticated pending owner.
 */
export async function completeOwnerCompanyOnboarding(userId, companyData) {
  const user = await User.findById(userId);

  if (!user) {
    throw createError(404, "User not found.");
  }

  if (user.role !== "employer") {
    throw createError(403, "Only employer accounts can complete company onboarding.");
  }

  if (user.status !== "pending_approval") {
    throw createError(
      400,
      "Company onboarding is only available for pending owner accounts.",
    );
  }

  const existingProfile = await EmployerProfile.findOne({ userId: user._id });
  if (existingProfile) {
    throw createError(400, "Company onboarding has already been completed.");
  }

  const existingCompany = await Company.findOne({ owner: user._id });
  if (existingCompany) {
    throw createError(400, "A company is already registered for this account.");
  }

  const nameTaken = await Company.findOne({ name: companyData.name });
  if (nameTaken) {
    throw createError(409, "A company with this name already exists.");
  }

  const company = await Company.create({
    name: companyData.name,
    description: companyData.description,
    industry: companyData.industry,
    size: companyData.size,
    location: companyData.location,
    website: companyData.website,
    owner: user._id,
    status: "pending",
  });

  await EmployerProfile.create({
    userId: user._id,
    companyId: company._id,
    role: "owner",
  });

  return {
    user: user.toJSON(),
    company,
    pendingApproval: true,
    membership: await getEmployerMembership(user._id),
  };
}

/**
 * Resolve employer membership for login / me / redirect hints.
 */
export async function getEmployerMembership(userId) {
  const user = await User.findById(userId);
  if (!user || user.role !== "employer") {
    return null;
  }

  const profile = await EmployerProfile.findOne({ userId });
  if (!profile) {
    const isPendingOwner = user.status === "pending_approval";
    return {
      employerType: isPendingOwner ? "owner" : "hr",
      hasCompany: false,
      companyId: null,
      companyStatus: null,
      needsCompanyOnboarding: isPendingOwner,
      pendingApproval: isPendingOwner,
    };
  }

  const company = profile.companyId
    ? await Company.findById(profile.companyId)
    : null;

  return {
    employerType: profile.role,
    hasCompany: Boolean(company),
    companyId: company?._id?.toString() ?? null,
    companyStatus: company?.status ?? null,
    needsCompanyOnboarding: profile.role === "owner" && !company,
    pendingApproval: user.status === "pending_approval",
  };
}
