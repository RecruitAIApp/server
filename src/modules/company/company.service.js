import cloudinary from "../../config/cloud.config.js";
import Company from "./company.model.js";
import Job from "../jobs/job.model.js";
import EmployerProfile from "../auth/employerProfile.model.js";
import User from "../auth/user.model.js";
import HRInvitation from "./hrInvitation.model.js";
import { sendEmail } from "../../utils/email.js";
import crypto from "crypto";
import { buildInvitationEmail , buildAddedDirectlyEmail} from "../../utils/invitation.templetes.js";

export const createCompanyService = async (data, ownerId) => {
  const existing = await Company.findOne({
    name: { $regex: `^${data.name}$`, $options: "i" },
  });
  if (existing) {
    const error = new Error("A company with this name already exists");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.findById(ownerId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const company = await Company.create({ ...data, owner: ownerId });

  // Create EmployerProfile for the owner
  await EmployerProfile.create({
    userId: ownerId,
    companyId: company._id,
    role: "owner",
  });

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
    resource_type: "auto",
  };

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    filePath,
    options,
  );

  company.licenses = { secure_url, public_id };
  await company.save();
  return company;
};

export const getCompanyByIdService = async (id) => {
  const company = await Company.findById(id).populate("owner", "name email");

  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  if (company.status !== "active") {
    const error = new Error("Company not found"); // Intentionally vague — do not reveal existence
    error.statusCode = 404;
    throw error;
  }

  return company;
};

export const getMyCompaniesService = async (ownerId) => { 
  const profiles = await EmployerProfile.find({ userId: ownerId }).select("companyId");
  const companyIds = profiles.map(p => p.companyId);
  return Company.find({ _id: { $in: companyIds }, status: { $ne: "inactive" } }).sort({ createdAt: -1 });
};

export const updateCompanyService = async (id, data) => {
  const allowedFields = [
    "name",
    "description",
    "logo",
    "website",
    "industry",
    "size",
    "location",
    "socialLinks",
  ];
  const safeData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) safeData[key] = data[key];
  }
  const company = await Company.findByIdAndUpdate(
    id,
    { $set: safeData },
    { new: true, runValidators: true },
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
    { new: true },
  );
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }
  await Job.updateMany({ company: id, status: "open" }, { $set: { status: "closed" } });
  return company;
};

export const addHRService = async (companyId, hrUserId) => {
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

  // Check if EmployerProfile already exists
  let profile = await EmployerProfile.findOne({ userId: hrUserId, companyId });
  if (profile) {
    if (profile.role === "hr") {
      return company; // already HR, no action needed
    } else {
      const error = new Error("User is already owner of this company");
      error.statusCode = 400;
      throw error;
    }
  }

  // Create the profile
  await EmployerProfile.create({
    userId: hrUserId,
    companyId,
    role: "hr",
  });

  return company;
};

export const removeHRService = async (companyId, hrUserId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  const deleted = await EmployerProfile.findOneAndDelete({
    userId: hrUserId,
    companyId,
    role: "hr",
  });

  if (!deleted) {
    const error = new Error("HR member not found in this company");
    error.statusCode = 404;
    throw error;
  }

  return company;
};

export const inviteHRService = async ({
  companyId,
  invitedBy,
  email,
  origin,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check company exists
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Get inviter info
  const inviter = await User.findById(invitedBy);
  const inviterName = inviter?.email?.split("@")[0] || "Company Owner";

  // 3. Check if a user with this email already exists on the platform
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    // 3a. Check they aren't already a member of this company
    const existingProfile = await EmployerProfile.findOne({
      userId: existingUser._id,
      companyId,
    });

    if (existingProfile) {
      const error = new Error("User is already a member of this company");
      error.statusCode = 400;
      throw error;
    }

    // 3b. User exists but is not yet in this company — add them directly as HR
    await EmployerProfile.create({
      userId: existingUser._id,
      companyId,
      role: "hr",
    });

    // 3c. Send informational email (no token, no accept link needed)
    const html = buildAddedDirectlyEmail({ inviterName, company });

    const emailSent = await sendEmail({
      to: normalizedEmail,
      subject: `You've been added to ${company.name} on MASAR Recruiter`,
      html,
    });

    if (!emailSent) {
      // Roll back the profile creation if email fails
      await EmployerProfile.findOneAndDelete({
        userId: existingUser._id,
        companyId,
        role: "hr",
      });
      const error = new Error("Failed to send notification email");
      error.statusCode = 500;
      throw error;
    }

    return {
      email: normalizedEmail,
      addedDirectly: true, // let the controller know which path was taken
    };
  }

  // 4. User does NOT exist — send a standard invitation link

  // 4a. Prevent duplicate active invites
  const activeInvite = await HRInvitation.findOne({
    companyId,
    email: normalizedEmail,
    accepted: false,
    expiresAt: { $gt: new Date() },
  });

  if (activeInvite) {
    const error = new Error(
      "An active invitation has already been sent to this email address",
    );
    error.statusCode = 400;
    throw error;
  }

  // 4b. Generate secure token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 4c. Set expiration (48 hours)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // 4d. Save invitation record
  const invitation = await HRInvitation.create({
    companyId,
    invitedBy,
    email: normalizedEmail,
    token: hashedToken,
    expiresAt,
  });

  // 4e. Send invite email with accept link
  const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;
  const html = buildInvitationEmail({ inviterName, company, inviteUrl, expiresAt });

  const emailSent = await sendEmail({
    to: normalizedEmail,
    subject: `Join ${company.name} on MASAR Recruiter`,
    html,
  });

  if (!emailSent) {
    await HRInvitation.findByIdAndDelete(invitation._id);
    const error = new Error("Failed to send invitation email");
    error.statusCode = 500;
    throw error;
  }

  return {
    email: normalizedEmail,
    expiresAt,
    addedDirectly: false,
  };
};
